using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;
using SynOS.Services.Operational;
using SynOS.Services.Security;
using SynOS.Models.DTOs.Phlebotomy;

namespace SynOS.Services.Phlebotomy
{
    public class PhlebotomyService : IPhlebotomyService
    {
        private readonly SynOSDbContext _db;
        private readonly IUserContext _userContext;
        private readonly INotifier _notifier;
        private readonly IAccessionNumberGenerator _accessionGenerator;
        private readonly IBranchTimeProvider _timeProvider;
        private readonly ISpecimenGroupingService _groupingService;
        private readonly IOperationalEventWriter _operationalEventWriter;
        private readonly ITubeConsumptionService _tubeConsumptionService;
        private readonly ILogger<PhlebotomyService> _logger;

        public PhlebotomyService(
            SynOSDbContext db,
            IUserContext userContext,
            INotifier notifier,
            IAccessionNumberGenerator accessionGenerator,
            IBranchTimeProvider timeProvider,
            ISpecimenGroupingService groupingService,
            IOperationalEventWriter operationalEventWriter,
            ITubeConsumptionService tubeConsumptionService,
            ILogger<PhlebotomyService> logger)
        {
            _db = db;
            _userContext = userContext;
            _notifier = notifier;
            _accessionGenerator = accessionGenerator;
            _timeProvider = timeProvider;
            _groupingService = groupingService;
            _operationalEventWriter = operationalEventWriter;
            _tubeConsumptionService = tubeConsumptionService;
            _logger = logger;
        }

        public async Task<CollectionPlanDto?> GetCollectionPlanAsync(Guid visitId)
        {
            var visit = await _db.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders).ThenInclude(o => o.Test)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) return null;

            // 1. Guard: Check if already collected
            var alreadyCollected = await _db.Specimens.AnyAsync(s => s.VisitId == visitId && s.Status == SpecimenStatus.Collected);
            if (alreadyCollected)
            {
                // We return null or a specific DTO state? For now, let's return null to indicate nothing to collect.
                _logger.LogInformation("GetCollectionPlanAsync: Visit {VisitId} already has collected specimens. Returning null.", visitId);
                return null;
            }

            // Find the pending or active WorkAssignment linked to this Visit
            var assignment = await _db.WorkAssignments
                .FirstOrDefaultAsync(a => a.SourceReferenceId == visitId && 
                                         (a.Status == WorkAssignmentStatus.PendingClaim || a.Status == WorkAssignmentStatus.Assigned || a.Status == WorkAssignmentStatus.Completed));

            var plan = await _groupingService.CreateSpecimenPlanAsync(visit.Orders);
            
            // Fetch Tube Details from Catalog
            var tubeCodes = plan.Select(p => p.TubeCode).Distinct().ToList();
            var tubeCatalog = await _db.CatalogTubeTypes
                .Where(t => tubeCodes.Contains(t.TubeCode))
                .ToDictionaryAsync(t => t.TubeCode, t => t);

            // Fetch Specimen Names from Catalog
            var specCodes = plan.Select(p => p.SpecimenTypeCode).Distinct().ToList();
            var specCatalog = await _db.CatalogSpecimenTypes
                .Where(s => specCodes.Contains(s.SpecimenCode))
                .ToDictionaryAsync(s => s.SpecimenCode, s => s.SpecimenName);

            // Fetch Reserved Accessions if any
            var reservedMap = assignment != null 
                ? await _db.WorkAssignmentAccessions
                    .Where(ra => ra.WorkAssignmentId == assignment.AssignmentId)
                    .ToListAsync()
                : new List<WorkAssignmentAccession>();

            // SELF-HEALING: If already assigned but no accessions reserved (likely due to migration lag or previous error)
            if (assignment != null && assignment.Status == WorkAssignmentStatus.Assigned && !reservedMap.Any() && visit.Orders.Any())
            {
                _logger.LogWarning("GetCollectionPlanAsync: Self-healing missing accessions for Visit {VisitId}", visitId);
                var branchInfo = await _db.Visits
                    .Where(v => v.VisitId == visitId)
                    .Select(v => new { v.BranchId, v.Branch.Code })
                    .FirstOrDefaultAsync();

                if (branchInfo?.BranchId != null)
                {
                    foreach (var instr in plan)
                    {
                        for (int i = 1; i <= instr.RequiredTubes; i++)
                        {
                            var accession = await _accessionGenerator.GenerateAsync(branchInfo.BranchId.Value, branchInfo.Code);
                            var reserved = new WorkAssignmentAccession
                            {
                                Id = Guid.NewGuid(),
                                WorkAssignmentId = assignment.AssignmentId,
                                TubeCode = instr.TubeCode,
                                SpecimenType = instr.SpecimenTypeCode,
                                TubeCount = instr.RequiredTubes,
                                AccessionNumber = accession,
                                Sequence = i,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _db.WorkAssignmentAccessions.Add(reserved);
                            reservedMap.Add(reserved);
                        }
                    }
                    await _db.SaveChangesAsync();
                }
            }

            var dto = new CollectionPlanDto
            {
                VisitId = visitId,
                AssignmentId = assignment?.AssignmentId ?? Guid.Empty,
                Patient = new PhlebotomyPatientDto
                {
                    PatientId = visit.PatientId,
                    MRN = visit.Patient.MRN,
                    Name = !string.IsNullOrEmpty(visit.Patient.DisplayName) ? visit.Patient.DisplayName : $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    Age = visit.Patient.IsDateOfBirthKnown ? DateTime.UtcNow.Year - visit.Patient.DateOfBirth.Year : 0,
                    Sex = visit.Patient.Gender
                },
                Instructions = plan.Select(p => {
                    var reserved = reservedMap.Where(r => r.TubeCode == p.TubeCode && r.SpecimenType == p.SpecimenTypeCode).OrderBy(r => r.Sequence).ToList();
                    return new CollectionInstructionDto
                    {
                        TubeCode = p.TubeCode,
                        TubeName = tubeCatalog.TryGetValue(p.TubeCode, out var tube) ? tube.TubeName : p.TubeCode,
                        TubeColor = tubeCatalog.TryGetValue(p.TubeCode, out var tc) ? (tc.Color ?? "Grey") : "Grey",
                        SpecimenTypeCode = p.SpecimenTypeCode,
                        SpecimenName = specCatalog.TryGetValue(p.SpecimenTypeCode, out var sName) ? sName : p.SpecimenTypeCode,
                        RequiredTubes = p.RequiredTubes,
                        AccessionNumber = reserved.FirstOrDefault()?.AccessionNumber, // Primary accession for UI display
                        Sequence = reserved.FirstOrDefault()?.Sequence,
                        Tests = p.Orders.Select(o => new PlannedTestDto
                        {
                            OrderId = o.OrderId,
                            TestCode = o.TestCode,
                            TestName = o.Test.TestName
                        }).ToList()
                    };
                }).ToList()
            };

            return dto;
        }

        public async Task<ClaimResult> ClaimAssignmentAsync(Guid assignmentId)
        {
            // 1. Validate Operational Mode
            if (!string.Equals(_userContext.CurrentMode, "Operational", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("User {UserId} attempted to claim assignment {AssignmentId} but is not in Operational mode (Mode: {Mode})", 
                    _userContext.CurrentUserId, assignmentId, _userContext.CurrentMode);
                return ClaimResult.NotOperationalMode;
            }

            // 2. Retrieve Operational Resource
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId);

            if (resource == null)
            {
                return ClaimResult.NoOperationalResource;
            }

            // 3. Lightweight Pre-validation Snapshot
            var snapshot = await _db.WorkAssignments
                .Where(x => x.AssignmentId == assignmentId)
                .Select(x => new { x.AssignmentId, x.BranchId, x.Status, x.AssignedResourceId, x.SourceReferenceId })
                .FirstOrDefaultAsync();

            if (snapshot == null)
            {
                return ClaimResult.NotFound;
            }

            // 4. Validate Branch
            if (snapshot.BranchId != resource.BranchId)
            {
                return ClaimResult.InvalidBranch;
            }

            // 5. Validate Status & Ownership (Snapshot check)
            if (snapshot.Status != WorkAssignmentStatus.PendingClaim || snapshot.AssignedResourceId != null)
            {
                return ClaimResult.AlreadyClaimed;
            }

            // --- PERSIST CLAIM STATE ---
            var assignment = await _db.WorkAssignments.FirstOrDefaultAsync(a => a.AssignmentId == assignmentId);
            if (assignment == null) return ClaimResult.NotFound;

            assignment.Status = WorkAssignmentStatus.Assigned;
            assignment.AssignedResourceId = resource.OperationalResourceId;
            assignment.ClaimedAt = DateTime.UtcNow;

            _logger.LogInformation("Assignment {AssignmentId} successfully claimed by Resource {ResourceId}. Now generating reserved accessions.", assignmentId, resource.OperationalResourceId);

            // 6.5. PRE-GENERATE ACCESSION NUMBERS
            // We need to load orders to generate the plan
            var visitOrders = await _db.Orders
                .Include(o => o.Test)
                .Where(o => o.VisitId == snapshot.SourceReferenceId && o.SpecimenId == null && o.Status != OrderStatus.Cancelled)
                .ToListAsync();

            if (visitOrders.Any())
            {
                var plan = await _groupingService.CreateSpecimenPlanAsync(visitOrders);
                var branchInfo = await _db.Visits
                    .Where(v => v.VisitId == snapshot.SourceReferenceId)
                    .Select(v => new { v.BranchId, v.Branch.Code })
                    .FirstOrDefaultAsync();

                if (branchInfo?.BranchId != null)
                {
                    foreach (var instr in plan)
                    {
                        // Some tubes might require multiple accessions (ReservedAccession per tube)
                        for (int i = 1; i <= instr.RequiredTubes; i++)
                        {
                            var accession = await _accessionGenerator.GenerateAsync(branchInfo.BranchId.Value, branchInfo.Code);
                            var reserved = new WorkAssignmentAccession
                            {
                                Id = Guid.NewGuid(),
                                WorkAssignmentId = assignmentId,
                                TubeCode = instr.TubeCode,
                                SpecimenType = instr.SpecimenTypeCode,
                                TubeCount = instr.RequiredTubes,
                                AccessionNumber = accession,
                                Sequence = i,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _db.WorkAssignmentAccessions.Add(reserved);
                        }
                    }
                }
            }

            await _db.SaveChangesAsync();

            // 7. Emit SignalR Queue Delta (Only on success)
            await _notifier.NotifyActionQueueDeltaAsync(resource.BranchId.ToString(), snapshot.SourceReferenceId.ToString());

            return ClaimResult.Success;
        }

        public async Task<CollectResult> CollectAssignmentAsync(Guid assignmentId)
        {
            // 1. Validate Operational Mode
            if (!string.Equals(_userContext.CurrentMode, "Operational", StringComparison.OrdinalIgnoreCase))
            {
                return CollectResult.NotOperationalMode;
            }

            // 2. Retrieve Operational Resource
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId);

            if (resource == null)
            {
                return CollectResult.NoOperationalResource;
            }

            // 3. Load WorkAssignment (Locked) with Strict Ownership
            var assignment = await _db.WorkAssignments
                .FirstOrDefaultAsync(a => a.AssignmentId == assignmentId);

            if (assignment == null) return CollectResult.NotFound;
            
            // ENFORCE Strict Ownership
            if (assignment.Status != WorkAssignmentStatus.Assigned) return CollectResult.InvalidState;
            if (assignment.AssignedResourceId != resource.OperationalResourceId) return CollectResult.Unauthorized;

            // 4. Load Visit & Branch Info for Accession Context
            var visitId = assignment.SourceReferenceId;
            var branchInfo = await _db.Visits
                .Where(v => v.VisitId == visitId)
                .Select(v => new { v.BranchId, v.Branch.Code, v.Token, v.PatientId })
                .FirstOrDefaultAsync();

            if (branchInfo?.BranchId == null) return CollectResult.NotFound;
            if (string.IsNullOrEmpty(branchInfo.Code))
            {
                _logger.LogError("CollectAssignmentAsync: Branch Code is missing for Branch {BranchId}. Cannot proceed with collection for Visit {VisitId}.", branchInfo.BranchId, visitId);
                return CollectResult.MissingBranchConfiguration;
            }

            // Load orders using SpecimenId == null check
            var orders = await _db.Orders
                .Include(o => o.Test)
                .Where(o => o.VisitId == visitId && o.SpecimenId == null && o.Status != OrderStatus.Cancelled)
                .ToListAsync();

            if (!orders.Any()) return CollectResult.NoOrdersFound;

            // NOW Start Transaction
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                // 5. Use Deterministic Grouping Service
                var plan = await _groupingService.CreateSpecimenPlanAsync(orders);

                if (!plan.Any())
                {
                     _logger.LogWarning("CollectAssignmentAsync: No specimen plan generated for Assignment {AssignmentId}.", assignmentId);
                     return CollectResult.NoOrdersFound;
                }

                var utcNow = DateTime.UtcNow;

                // Load Reserved Accessions
                var reservedAccessions = await _db.WorkAssignmentAccessions
                    .Where(ra => ra.WorkAssignmentId == assignmentId)
                    .ToListAsync();

                await _db.SaveChangesAsync();

                foreach (var instr in plan)
                {
                    // Find reserved accessions for this instruction
                    var reservedForInstr = reservedAccessions
                        .Where(ra => ra.TubeCode == instr.TubeCode && ra.SpecimenType == instr.SpecimenTypeCode)
                        .OrderBy(ra => ra.Sequence)
                        .ToList();

                    for (int i = 0; i < instr.RequiredTubes; i++)
                    {
                        string accessionNumber;
                        if (i < reservedForInstr.Count)
                        {
                            accessionNumber = reservedForInstr[i].AccessionNumber;
                        }
                        else
                        {
                            _logger.LogWarning("CollectAssignmentAsync: Missing reserved accession for {TubeCode} tube {Index}. Generating new.", instr.TubeCode, i + 1);
                            accessionNumber = await _accessionGenerator.GenerateAsync(branchInfo.BranchId.Value, branchInfo.Code);
                        }

                        // Fetch Details for Snapshot
                        var tubeCatalog = await _db.CatalogTubeTypes.FirstOrDefaultAsync(t => t.TubeCode == instr.TubeCode);
                        var specType = await _db.CatalogSpecimenTypes.FirstOrDefaultAsync(s => s.SpecimenCode == instr.SpecimenTypeCode);

                        // 7. Create Specimen
                        var specimen = new Specimen
                        {
                            SpecimenId = Guid.NewGuid(),
                            VisitId = visitId,
                            SpecimenTypeCode = instr.SpecimenTypeCode,
                            SpecimenTypeName = specType?.SpecimenName ?? instr.SpecimenTypeCode,
                            TubeCode = instr.TubeCode,
                            TubeName = tubeCatalog?.TubeName ?? instr.TubeCode,
                            TubeCount = instr.RequiredTubes,
                            AccessionNumber = accessionNumber,
                            Status = SpecimenStatus.Collected,
                            CollectedAt = utcNow,
                            CollectedByUserId = _userContext.CurrentUserId,
                            CollectedBy = resource.OperationalResourceId,
                            CreatedAt = DateTimeOffset.UtcNow
                        };

                        _db.Specimens.Add(specimen);

                        // 8. Link Orders (Only once per instruction group, but handled within instr.Orders loop)
                        if (i == 0)
                        {
                            foreach (var order in instr.Orders)
                            {
                                order.SpecimenId = specimen.SpecimenId;
                                order.Status = OrderStatus.Collected;
                            }
                        }

                        // 8a. Spawn ProcessingAssignments
                        var distinctDepartments = instr.Orders
                            .Select(o => string.IsNullOrWhiteSpace(o.Department) ? "PATH" : o.Department)
                            .Distinct();

                        foreach (var deptCode in distinctDepartments)
                        {
                            var processingAssignment = new ProcessingAssignment
                            {
                                ProcessingAssignmentId = Guid.NewGuid(),
                                SpecimenId = specimen.SpecimenId,
                                DepartmentCode = deptCode,
                                BranchId = branchInfo.BranchId.Value,
                                Status = ProcessingAssignmentStatus.Pending,
                                CreatedAt = DateTimeOffset.UtcNow
                            };
                            _db.ProcessingAssignments.Add(processingAssignment);
                        }
                    }
                }

                // SAVE specimens and assignments before consuming inventory
                await _db.SaveChangesAsync();

                // Now consume inventory (The specimens now exist in DB)
                foreach (var instr in plan)
                {
                    var reservedForInstr = reservedAccessions
                        .Where(ra => ra.TubeCode == instr.TubeCode && ra.SpecimenType == instr.SpecimenTypeCode)
                        .OrderBy(ra => ra.Sequence)
                        .ToList();

                    for (int i = 0; i < instr.RequiredTubes; i++)
                    {
                        string accessionNumber = (i < reservedForInstr.Count) 
                            ? reservedForInstr[i].AccessionNumber 
                            : String.Empty; // Should be in DB now if generated above

                        if (string.IsNullOrEmpty(accessionNumber)) continue;

                        var specimenInstance = await _db.Specimens.FirstOrDefaultAsync(s => s.AccessionNumber == accessionNumber && s.VisitId == visitId);
                        if (specimenInstance != null)
                        {
                            await _tubeConsumptionService.ConsumeStockForSpecimenAsync(specimenInstance.SpecimenId, _userContext.CurrentUserId);
                        }
                    }
                }

                // Create draft reports for all root pathology orders in this visit
                var rootOrders = orders.Where(o => o.ParentOrderId == null && string.Equals(o.Department, "Pathology", StringComparison.OrdinalIgnoreCase)).ToList();
                foreach (var rootOrder in rootOrders)
                {
                    var existingReport = await _db.Reports.AnyAsync(r => r.SourceId == rootOrder.OrderId && r.SourceType == "Order" && r.VisitId == visitId);
                    if (!existingReport)
                    {
                        var report = new Report
                        {
                            ReportId = Guid.NewGuid(),
                            SourceId = rootOrder.OrderId,
                            SourceType = "Order",
                            VisitId = visitId,
                            PatientId = branchInfo.PatientId,
                            Department = rootOrder.Department,
                            ReportTemplateId = rootOrder.Test?.ReportTemplateId,
                            Status = "Draft",
                            CreatedAt = DateTimeOffset.UtcNow,
                            UpdatedAt = DateTimeOffset.UtcNow
                        };
                        await _db.Reports.AddAsync(report);
                    }
                }

                // 9. Update Assignment
                assignment.Status = WorkAssignmentStatus.Completed;
                if (assignment.StartedAt == null) assignment.StartedAt = utcNow;
                assignment.CompletedAt = utcNow;

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                // 10. EMIT EVENT: Notify subscribers of specimen collection (updates dashboard)
                await _operationalEventWriter.WriteEventAsync(
                    BranchEventType.SPECIMEN_COLLECTED,
                    branchInfo.BranchId.Value.ToString(),
                    visitId.ToString(),
                    branchInfo.Token,
                    $"Collection completed for {orders.Count} tests.",
                    "Phlebotomist",
                    null,
                    false,
                    visitId,
                    "Visit",
                    Models.ReadModels.TimelineVisibility.Surface
                );

                // 11. Emit Notification (After Commit)
                await _notifier.NotifyActionQueueDeltaAsync(branchInfo.BranchId.ToString(), visitId.ToString());

                return CollectResult.Success;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to collect specimens for Assignment {AssignmentId}", assignmentId);
                throw;
            }
        }
        public async Task<CollectionSummaryDto?> GetCollectionSummaryAsync(Guid visitId)
        {
            var visit = await _db.Visits
                .Include(v => v.Patient)
                .Include(v => v.Specimens)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) return null;

            // Load specimens with orders and tests for detail
            var specimens = await _db.Specimens
                .Where(s => s.VisitId == visitId)
                .ToListAsync();

            var specimenIds = specimens.Select(s => s.SpecimenId).ToList();
            var orders = await _db.Orders
                .Include(o => o.Test)
                .Where(o => specimenIds.Contains(o.SpecimenId ?? Guid.Empty))
                .ToListAsync();

            var collectedBy = specimens.FirstOrDefault()?.CollectedByUserId;
            string collectedByName = "System";
            if (collectedBy.HasValue)
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == collectedBy.Value);
                collectedByName = user?.Name ?? "Unknown";
            }

            return new CollectionSummaryDto
            {
                VisitId = visitId,
                Patient = new PhlebotomyPatientDto
                {
                    PatientId = visit.PatientId,
                    MRN = visit.Patient.MRN,
                    Name = !string.IsNullOrEmpty(visit.Patient.DisplayName) ? visit.Patient.DisplayName : $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                    Age = visit.Patient.IsDateOfBirthKnown ? DateTime.UtcNow.Year - visit.Patient.DateOfBirth.Year : 0,
                    Sex = visit.Patient.Gender
                },
                Specimens = specimens.Select(s => new CollectedSpecimenDto
                {
                    SpecimenId = s.SpecimenId,
                    AccessionNumber = s.AccessionNumber,
                    TubeName = s.TubeName ?? "Unknown",
                    SpecimenTypeName = s.SpecimenTypeName ?? "Unknown",
                    Status = s.Status.ToString(),
                    Tests = orders.Where(o => o.SpecimenId == s.SpecimenId).Select(o => o.Test.TestName).ToList()
                }).ToList(),
                CollectedAt = specimens.OrderByDescending(s => s.CollectedAt).FirstOrDefault()?.CollectedAt,
                CollectedByName = collectedByName
            };
        }
    }
}
