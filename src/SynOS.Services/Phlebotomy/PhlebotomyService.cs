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

            // Find the pending or active WorkAssignment linked to this Visit
            var assignment = await _db.WorkAssignments
                .FirstOrDefaultAsync(a => a.SourceReferenceId == visitId && 
                                         (a.Status == WorkAssignmentStatus.PendingClaim || a.Status == WorkAssignmentStatus.Assigned || a.Status == WorkAssignmentStatus.Completed));

            var plan = await _groupingService.CreateSpecimenPlanAsync(visit.Orders);
            
            // Fetch Tube Names from Catalog
            var tubeCodes = plan.Select(p => p.TubeCode).Distinct().ToList();
            var tubeCatalog = await _db.CatalogTubeTypes
                .Where(t => tubeCodes.Contains(t.TubeCode))
                .ToDictionaryAsync(t => t.TubeCode, t => t.TubeName);

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
                Instructions = plan.Select(p => new CollectionInstructionDto
                {
                    TubeCode = p.TubeCode,
                    TubeName = tubeCatalog.TryGetValue(p.TubeCode, out var name) ? name : p.TubeCode,
                    SpecimenTypeCode = p.SpecimenTypeCode,
                    RequiredTubes = p.RequiredTubes,
                    Tests = p.Orders.Select(o => new PlannedTestDto
                    {
                        OrderId = o.OrderId,
                        TestCode = o.TestCode,
                        TestName = o.Test.TestName
                    }).ToList()
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

            // 6. ATOMIC CONDITIONAL UPDATE
            var utcNow = DateTime.UtcNow;
            
            var affectedRows = await _db.WorkAssignments
                .Where(a => a.AssignmentId == assignmentId 
                         && a.Status == WorkAssignmentStatus.PendingClaim 
                         && a.AssignedResourceId == null)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, WorkAssignmentStatus.Assigned)
                    .SetProperty(a => a.AssignedResourceId, resource.OperationalResourceId)
                    .SetProperty(a => a.ClaimedAt, utcNow));

            if (affectedRows == 0)
            {
                _logger.LogWarning("Race condition detected for Assignment {AssignmentId}. User {UserId} failed to claim.", assignmentId, _userContext.CurrentUserId);
                return ClaimResult.AlreadyClaimed;
            }

            _logger.LogInformation("Assignment {AssignmentId} successfully claimed by Resource {ResourceId}", assignmentId, resource.OperationalResourceId);

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

            // 4. Load Visit & Orders
            var visitId = assignment.SourceReferenceId;
            var branchInfo = await _db.Visits
                .Where(v => v.VisitId == visitId)
                .Select(v => new { v.BranchId, v.Branch.Code, v.Token })
                .FirstOrDefaultAsync();

            if (branchInfo?.BranchId == null || string.IsNullOrEmpty(branchInfo.Code)) return CollectResult.NotFound;

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

                foreach (var instr in plan)
                {
                    // 6. Generate Accession
                    var accessionNumber = await _accessionGenerator.GenerateAsync(branchInfo.BranchId.Value, branchInfo.Code);

                    // 7. Create Specimen
                    var specimen = new Specimen
                    {
                        SpecimenId = Guid.NewGuid(),
                        VisitId = visitId,
                        SpecimenTypeCode = instr.SpecimenTypeCode,
                        AccessionNumber = accessionNumber,
                        Status = SpecimenStatus.Collected,
                        CollectedAt = utcNow,
                        CollectedByUserId = _userContext.CurrentUserId,
                        CollectedBy = resource.OperationalResourceId,
                        CreatedAt = DateTimeOffset.UtcNow
                    };

                    _db.Specimens.Add(specimen);

                    // 8. Link Orders
                    foreach (var order in instr.Orders)
                    {
                        order.SpecimenId = specimen.SpecimenId;
                        order.Status = OrderStatus.Collected;
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

                    // 8b. Transactional Inventory Deduction
                    await _tubeConsumptionService.ConsumeStockForSpecimenAsync(specimen.SpecimenId, _userContext.CurrentUserId);
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
    }
}
