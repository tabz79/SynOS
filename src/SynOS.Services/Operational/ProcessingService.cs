using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Processing;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;
using SynOS.Services.Security;
using SynOS.Models.Events;

namespace SynOS.Services.Operational
{
    public class ProcessingService : IProcessingService
    {
        private readonly SynOSDbContext _db;
        private readonly IUserContext _userContext;
        private readonly INotifier _notifier;
        private readonly IResultService _resultService;
        private readonly ILogger<ProcessingService> _logger;
        private readonly IMiddlewareOutboxService _outboxService;

        public ProcessingService(
            SynOSDbContext db,
            IUserContext userContext,
            INotifier notifier,
            IResultService resultService,
            ILogger<ProcessingService> logger,
            IMiddlewareOutboxService outboxService)
        {
            _db = db;
            _userContext = userContext;
            _notifier = notifier;
            _resultService = resultService;
            _logger = logger;
            _outboxService = outboxService;
        }

        public async Task<IEnumerable<ProcessingQueueItemDto>> GetQueueAsync(bool includeHistory = false)
        {
            // 1. Validate Mode
            if (!string.Equals(_userContext.CurrentMode, "operational", StringComparison.OrdinalIgnoreCase)) return Enumerable.Empty<ProcessingQueueItemDto>();

            // 2. Get Resource (Branch-aware)
            var resource = await _db.OperationalResources.FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId && r.BranchId == _userContext.CurrentBranchId);
            var isAdmin = _userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin";
            if (resource == null && !isAdmin) return Enumerable.Empty<ProcessingQueueItemDto>();

            // 3. Query Queue (Live / History Window)
            var today = DateTimeOffset.UtcNow.Date;
            var startDate = includeHistory ? today.AddDays(-7) : today;
            var nextDay = today.AddDays(1);

            var query = _db.ProcessingAssignments
                .Include(a => a.Specimen)
                    .ThenInclude(s => s.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(a => a.AssignedResource)
                    .ThenInclude(r => r.User)
                .Where(a => a.BranchId == _userContext.CurrentBranchId);

            if (!isAdmin)
            {
                query = query.Where(a => a.DepartmentCode == resource!.DepartmentCode);
            }

            IQueryable<ProcessingAssignment> filteredQuery;
            if (!includeHistory)
            {
                // Live View: show Pending/Claimed assignments from last 7 days + Completed assignments completed today
                filteredQuery = query.Where(a => 
                    (a.Status != ProcessingAssignmentStatus.Completed && a.CreatedAt >= today.AddDays(-7)) ||
                    (a.Status == ProcessingAssignmentStatus.Completed && a.CompletedAt >= today && a.CompletedAt < nextDay)
                );
            }
            else
            {
                // History View: show Completed assignments from last 7 days
                filteredQuery = query.Where(a => 
                    a.Status == ProcessingAssignmentStatus.Completed && a.CompletedAt >= startDate && a.CompletedAt < nextDay
                );
            }

            var items = await filteredQuery
                .Select(a => new ProcessingQueueItemDto
                {
                    ProcessingAssignmentId = a.ProcessingAssignmentId,
                    SpecimenId = a.SpecimenId,
                    AccessionNumber = a.Specimen.AccessionNumber,
                    PatientName = a.Specimen.Visit.Patient.FirstName + " " + a.Specimen.Visit.Patient.LastName,
                    TestName = a.Specimen.Visit.Orders.Where(o => o.Department == a.DepartmentCode).Select(o => o.TestCode).FirstOrDefault() ?? "LAB",
                    SpecimenTypeCode = a.Specimen.SpecimenTypeCode,
                    Priority = "Routine",
                    DepartmentCode = a.DepartmentCode,
                    Status = a.Status,
                    CreatedAt = a.CreatedAt,
                    StartedAt = a.StartedAt,
                    AssignedResourceId = a.AssignedResourceId,
                    AssignedTechnicianName = a.AssignedResource != null ? a.AssignedResource.User.Name : null
                })
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return items;
        }

        public async Task<ProcessingResult> ClaimAssignmentAsync(Guid processingAssignmentId)
        {
            // 1. Validate Operational Mode
            if (!string.Equals(_userContext.CurrentMode, "operational", StringComparison.OrdinalIgnoreCase)) return ProcessingResult.NotOperationalMode;

            // 2. Retrieve Operational Resource (Branch-aware)
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId && r.BranchId == _userContext.CurrentBranchId);

            if (resource == null) return ProcessingResult.NoOperationalResource;

            // 3. Snapshot for Validation & Context
            var snapshot = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId)
                .Select(a => new { a.SpecimenId, a.Specimen.VisitId, a.BranchId, a.DepartmentCode, a.Status, a.AssignedResourceId })
                .FirstOrDefaultAsync();

            if (snapshot == null) return ProcessingResult.NotFound;

            // 4. Strict Isolation Validation
            if (snapshot.BranchId != resource.BranchId) return ProcessingResult.InvalidBranch;
            var isAdmin = _userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin";
            if (snapshot.DepartmentCode != resource.DepartmentCode && !isAdmin) return ProcessingResult.InvalidDepartment;
            if (snapshot.Status != ProcessingAssignmentStatus.Pending) return ProcessingResult.Conflict;

            // 5. ATOMIC CONDITIONAL UPDATE
            var utcNow = DateTimeOffset.UtcNow;
            
            var updateQuery = _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId 
                         && a.Status == ProcessingAssignmentStatus.Pending 
                         && a.BranchId == resource.BranchId);

            if (!isAdmin)
            {
                updateQuery = updateQuery.Where(a => a.DepartmentCode == resource.DepartmentCode);
            }

            var affectedRows = await updateQuery
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, ProcessingAssignmentStatus.Claimed)
                    .SetProperty(a => a.AssignedResourceId, resource.OperationalResourceId)
                    .SetProperty(a => a.StartedAt, utcNow));

            if (affectedRows == 0)
            {
                _logger.LogWarning("Race condition detected for ProcessingAssignment {ProcessingAssignmentId}. User {UserId} failed to claim.", processingAssignmentId, _userContext.CurrentUserId);
                return ProcessingResult.Conflict;
            }

            // Enqueue ProcessingStartedEvent for each order on the specimen
            var orders = await _db.Orders
                .Include(o => o.Test)
                .Where(o => o.SpecimenId == snapshot.SpecimenId && o.Status != OrderStatus.Cancelled)
                .ToListAsync();

            // Resolve demographics and referral dimensions for event
            var visit = await _db.Visits.FindAsync(snapshot.VisitId);
            Guid? patientId = visit?.PatientId;
            string? gender = null;
            DateTime? dob = null;
            Guid? referrerId = null;
            string? referrerName = null;
            Guid? referralPartnerId = null;
            string? referralPartnerName = null;
            string? referralPartnerLocation = null;

            if (patientId.HasValue)
            {
                var patient = await _db.Patients.FindAsync(patientId.Value);
                gender = patient?.Gender;
                dob = patient?.DateOfBirth;
            }

            if (visit != null)
            {
                referrerId = visit.ReferrerId;
                if (referrerId.HasValue)
                {
                    var referrer = await _db.Referrers.FindAsync(referrerId.Value);
                    referrerName = referrer?.ProviderName;
                }

                referralPartnerId = visit.ReferralPartnerId;
                if (referralPartnerId.HasValue)
                {
                    var partner = await _db.ReferralPartners.FindAsync(referralPartnerId.Value);
                    referralPartnerName = partner?.Name;
                    referralPartnerLocation = partner?.Location;
                }
            }

            foreach (var order in orders)
            {
                _outboxService.Enqueue(new ProcessingStartedEvent(
                    order.OrderId,
                    snapshot.VisitId,
                    order.TestId,
                    order.TestCode,
                    order.Department ?? "Pathology",
                    "Active",
                    DateTime.UtcNow,
                    snapshot.BranchId,
                    gender,
                    dob,
                    referrerId,
                    referrerName,
                    referralPartnerId,
                    referralPartnerName,
                    referralPartnerLocation,
                    null, // PatientLocation
                    null, // PatientPincode
                    patientId // PatientId
                ));
            }
            await _db.SaveChangesAsync();

            // 6. Emit SignalR (Only on success)
            await _notifier.NotifyAssignmentUpdateAsync(
                resource.BranchId.ToString(),
                snapshot.DepartmentCode,
                processingAssignmentId,
                ProcessingAssignmentStatus.Claimed.ToString(),
                snapshot.VisitId.ToString(),
                resource.OperationalResourceId,
                _userContext.UserName);

            return ProcessingResult.Success;
        }

        public async Task<ProcessingResult> CompleteAssignmentAsync(Guid processingAssignmentId)
        {
            // 1. Validate Operational Mode
            if (!string.Equals(_userContext.CurrentMode, "operational", StringComparison.OrdinalIgnoreCase)) return ProcessingResult.NotOperationalMode;

            // 2. Retrieve Operational Resource (Branch-aware)
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId && r.BranchId == _userContext.CurrentBranchId);

            if (resource == null) return ProcessingResult.NoOperationalResource;

            // 3. Snapshot for Validation & Context
            var snapshot = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId)
                .Select(a => new { a.Specimen.VisitId, a.BranchId, a.DepartmentCode, a.Status, a.AssignedResourceId, a.SpecimenId })
                .FirstOrDefaultAsync();

            if (snapshot == null) return ProcessingResult.NotFound;

            // 4. Validation
            if (snapshot.BranchId != resource.BranchId) return ProcessingResult.InvalidBranch;
            var isAdmin = _userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin";
            if (snapshot.DepartmentCode != resource.DepartmentCode && !isAdmin) return ProcessingResult.InvalidDepartment;
            if (snapshot.Status != ProcessingAssignmentStatus.Claimed) return ProcessingResult.Conflict;
            if (snapshot.AssignedResourceId != resource.OperationalResourceId) return ProcessingResult.Unauthorized;

            // 5. ATOMIC CONDITIONAL UPDATE
            var utcNow = DateTimeOffset.UtcNow;
            
            var updateQuery = _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId 
                         && a.Status == ProcessingAssignmentStatus.Claimed 
                         && a.AssignedResourceId == resource.OperationalResourceId
                         && a.BranchId == resource.BranchId);

            if (!isAdmin)
            {
                updateQuery = updateQuery.Where(a => a.DepartmentCode == resource.DepartmentCode);
            }

            var affectedRows = await updateQuery
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, ProcessingAssignmentStatus.Completed)
                    .SetProperty(a => a.CompletedAt, utcNow));

            if (affectedRows == 0)
            {
                return ProcessingResult.Conflict;
            }

            // 6. Trace Order(s) and Trigger Verification
            try
            {
                var ordersToVerify = await _db.Orders
                    .Where(o => o.SpecimenId == snapshot.SpecimenId && o.Department == snapshot.DepartmentCode)
                    .Select(o => o.OrderId)
                    .ToListAsync();

                foreach (var orderId in ordersToVerify)
                {
                    await _resultService.SubmitForVerificationAsync(orderId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to trigger automatic verification for assignment {AssignmentId}", processingAssignmentId);
                // We don't fail the whole operation since the atomic update succeeded
            }

            // 7. Emit SignalR (Only on success)
            await _notifier.NotifyAssignmentUpdateAsync(
                resource.BranchId.ToString(),
                snapshot.DepartmentCode,
                processingAssignmentId,
                ProcessingAssignmentStatus.Completed.ToString(),
                snapshot.VisitId.ToString(),
                resource.OperationalResourceId,
                _userContext.UserName);

            return ProcessingResult.Success;
        }

        public async Task<ProcessingResult> ReopenAssignmentAsync(Guid assignmentId)
        {
            // 1. Validate Operational Mode
            if (!string.Equals(_userContext.CurrentMode, "operational", StringComparison.OrdinalIgnoreCase)) return ProcessingResult.NotOperationalMode;

            // 2. Retrieve Operational Resource (Branch-aware)
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId && r.BranchId == _userContext.CurrentBranchId);

            if (resource == null) return ProcessingResult.NoOperationalResource;

            // 3. Snapshot for Validation
            var snapshot = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == assignmentId)
                .Select(a => new { a.Specimen.VisitId, a.BranchId, a.DepartmentCode, a.Status })
                .FirstOrDefaultAsync();

            if (snapshot == null) return ProcessingResult.NotFound;

            // 4. Validation
            if (snapshot.BranchId != resource.BranchId) return ProcessingResult.InvalidBranch;
            var isAdmin = _userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin";
            if (snapshot.DepartmentCode != resource.DepartmentCode && !isAdmin) return ProcessingResult.InvalidDepartment;
            if (snapshot.Status != ProcessingAssignmentStatus.Completed) return ProcessingResult.InvalidState;

            // 5. ATOMIC UPDATE
            var affectedRows = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == assignmentId 
                         && a.Status == ProcessingAssignmentStatus.Completed)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, ProcessingAssignmentStatus.Reopened));

            if (affectedRows == 0) return ProcessingResult.Conflict;

            // 6. SignalR
            await _notifier.NotifyAssignmentUpdateAsync(
                resource.BranchId.ToString(),
                snapshot.DepartmentCode,
                assignmentId,
                ProcessingAssignmentStatus.Reopened.ToString(),
                snapshot.VisitId.ToString());

            return ProcessingResult.Success;
        }

        public async Task<ProcessingAssignmentDetailDto?> GetAssignmentDetailAsync(Guid assignmentId)
        {
            // 1. Projection query for core data (Performance fix for deep Include chains)
            var snapshot = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == assignmentId)
                .Select(a => new
                {
                    a.ProcessingAssignmentId,
                    a.BranchId,
                    a.DepartmentCode,
                    a.Status,
                    a.AssignedResourceId,
                    a.SpecimenId,
                    Specimen = new
                    {
                        a.Specimen.AccessionNumber,
                        a.Specimen.SpecimenTypeCode,
                        a.Specimen.CollectedAt,
                        a.Specimen.VisitId,
                        Visit = new
                        {
                            a.Specimen.Visit.PatientId,
                            Patient = new
                            {
                                a.Specimen.Visit.Patient.PatientId,
                                a.Specimen.Visit.Patient.MRN,
                                a.Specimen.Visit.Patient.FirstName,
                                a.Specimen.Visit.Patient.LastName,
                                a.Specimen.Visit.Patient.Gender,
                                a.Specimen.Visit.Patient.DateOfBirth,
                                a.Specimen.Visit.Patient.IsDateOfBirthKnown
                            }
                        }
                    }
                })
                .FirstOrDefaultAsync();

            if (snapshot == null) return null;

            // 2. SECURITY HARDENING: Strict Branch + Department Isolation
            var isAdmin = _userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin";
            if (snapshot.BranchId != _userContext.CurrentBranchId || (snapshot.DepartmentCode != _userContext.DepartmentCode && !isAdmin))
            {
                _logger.LogWarning("Access Denied for Assignment {AssignmentId}. Branch:{SnapshotBranch} vs {UserBranch}, Dept:{SnapshotDept} vs {UserDept}", 
                    assignmentId, snapshot.BranchId, _userContext.CurrentBranchId, snapshot.DepartmentCode, _userContext.DepartmentCode);
                return null;
            }

            var visitId = snapshot.Specimen.VisitId;
            var patient = snapshot.Specimen.Visit.Patient;

            // Filter orders by department
            var orders = await _db.Orders
                .Where(o => o.VisitId == visitId && o.Department == snapshot.DepartmentCode)
                .ToListAsync();

            var testCodes = orders.Select(o => o.TestCode).Distinct().ToList();

            // Fetch Catalog metadata
            var catalogTests = await _db.CatalogTests
                .Include(t => t.Parameters)
                .Where(t => testCodes.Contains(t.TestCode))
                .ToListAsync();

            var orderIds = orders.Select(o => o.OrderId).ToList();

            // Fetch existing results
            var results = await _db.Results
                .Where(r => orderIds.Contains(r.OrderId))
                .ToListAsync();

            // Retrieve ProfileMaps to know child sequences
            var parentIds = orders.Where(o => o.ParentOrderId != null).Select(o => o.ParentOrderId!.Value).Distinct().ToList();
            var profileMaps = await _db.ProfileMaps
                .Where(m => parentIds.Contains(m.ParentTestId))
                .ToListAsync();

            var rootOrders = orders.Where(o => o.ParentOrderId == null).OrderBy(o => o.TestCode).ToList();
            var orderWeights = new Dictionary<Guid, int>();
            int baseWeight = 100;
            foreach (var root in rootOrders)
            {
                orderWeights[root.OrderId] = baseWeight;
                
                var children = orders.Where(o => o.ParentOrderId == root.OrderId).ToList();
                if (children.Any())
                {
                    var sortedChildren = children
                        .OrderBy(c => {
                            var map = profileMaps.FirstOrDefault(m => m.ParentTestId == root.TestId && m.ChildTestId == c.TestId);
                            return map?.Sequence ?? 999;
                        })
                        .ToList();
                    
                    int childOffset = 1;
                    foreach (var child in sortedChildren)
                    {
                        orderWeights[child.OrderId] = baseWeight + childOffset++;
                    }
                }
                baseWeight += 100;
            }

            foreach (var o in orders)
            {
                if (!orderWeights.ContainsKey(o.OrderId))
                {
                    orderWeights[o.OrderId] = baseWeight++;
                }
            }

            var testDtos = new List<AssignmentTestDto>();
            foreach (var o in orders)
            {
                var catalogTest = catalogTests.FirstOrDefault(t => t.TestCode == o.TestCode);
                var parameterDtos = new List<AssignmentParameterDto>();
                if (catalogTest?.Parameters != null)
                {
                    foreach (var cp in catalogTest.Parameters.Where(p => p.IsActive).OrderBy(p => p.SortOrder))
                    {
                        var resolvedRange = await Utils.ReferenceRangeResolver.ResolveRangeAsync(
                            _db, 
                            cp.ParameterCode, 
                            patient.Gender, 
                            patient.DateOfBirth, 
                            snapshot.Specimen.CollectedAt ?? DateTime.UtcNow
                        );

                        if (string.IsNullOrEmpty(resolvedRange))
                        {
                            resolvedRange = cp.ReferenceRange;
                        }

                        parameterDtos.Add(new AssignmentParameterDto
                        {
                            ParameterCode = cp.ParameterCode,
                            ParameterName = cp.ParameterName,
                            DataType = cp.DataType,
                            Unit = cp.Unit,
                            ReferenceRange = resolvedRange,
                            SortOrder = cp.SortOrder,
                            IsRequired = cp.IsRequired,
                            EnumOptions = cp.EnumOptions,
                            ExistingResultValue = results.FirstOrDefault(r => r.OrderId == o.OrderId && r.ParameterCode == cp.ParameterCode)?.Value,
                            IsCalculated = cp.IsCalculated || !string.IsNullOrWhiteSpace(cp.Formula),
                            Formula = cp.Formula,
                            HasFormula = cp.IsCalculated || !string.IsNullOrWhiteSpace(cp.Formula)
                        });
                    }
                }

                testDtos.Add(new AssignmentTestDto
                {
                    OrderId = o.OrderId,
                    TestCode = o.TestCode,
                    TestName = catalogTest?.TestName ?? o.TestCode,
                    SortOrder = orderWeights.TryGetValue(o.OrderId, out var weight) ? weight : 0,
                    Parameters = parameterDtos
                });
            }

            // Assemble DTO
            var detailDto = new ProcessingAssignmentDetailDto
            {
                ProcessingAssignmentId = snapshot.ProcessingAssignmentId,
                SpecimenId = snapshot.SpecimenId,
                DepartmentCode = snapshot.DepartmentCode,
                Status = snapshot.Status,
                AssignedResourceId = snapshot.AssignedResourceId,
                Patient = new AssignmentPatientDto
                {
                    PatientId = patient.PatientId,
                    MRN = patient.MRN,
                    PatientName = $"{patient.FirstName} {patient.LastName}",
                    Sex = patient.Gender,
                    Age = (int)((DateTime.Today - patient.DateOfBirth).TotalDays / 365.25),
                    DateOfBirth = patient.DateOfBirth,
                    IsDateOfBirthKnown = patient.IsDateOfBirthKnown
                },
                Specimen = new AssignmentSpecimenDto
                {
                    SpecimenId = snapshot.SpecimenId,
                    AccessionNumber = snapshot.Specimen.AccessionNumber,
                    SpecimenType = snapshot.Specimen.SpecimenTypeCode,
                    CollectionTime = snapshot.Specimen.CollectedAt
                },
                Tests = testDtos.OrderBy(t => t.SortOrder).ToList()
            };

            return detailDto;
        }
        
        public async Task<ProcessingResult> SaveAssignmentDraftAsync(Guid assignmentId, SubmitAssignmentResultsRequestDto request)
        {
            try 
            {
                _logger.LogInformation("ENTER SaveAssignmentDraftAsync → assignmentId={AssignmentId}, userId={UserId}", assignmentId, _userContext.CurrentUserId);

                // 1. Validate Operational Mode
                if (!string.Equals(_userContext.CurrentMode, "operational", StringComparison.OrdinalIgnoreCase)) 
                {
                    _logger.LogWarning("RETURNING NotOperationalMode for assignment {AssignmentId}. CurrentMode={Mode}", assignmentId, _userContext.CurrentMode);
                    return ProcessingResult.NotOperationalMode;
                }

                // 2. Retrieve Operational Resource (Branch-aware)
                var resource = await _db.OperationalResources
                    .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId && r.BranchId == _userContext.CurrentBranchId);

                if (resource == null) 
                {
                    _logger.LogWarning("RETURNING NoOperationalResource for user {UserId} on Branch {BranchId}", _userContext.CurrentUserId, _userContext.CurrentBranchId);
                    return ProcessingResult.NoOperationalResource;
                }

                // 3. Snapshot for Validation & Context
                var assignment = await _db.ProcessingAssignments
                    .Where(a => a.ProcessingAssignmentId == assignmentId)
                    .Select(a => new { a.Specimen.VisitId, a.BranchId, a.DepartmentCode, a.Status, a.AssignedResourceId, a.SpecimenId })
                    .FirstOrDefaultAsync();

                if (assignment == null) 
                {
                    _logger.LogWarning("RETURNING NotFound for assignment {AssignmentId}", assignmentId);
                    return ProcessingResult.NotFound;
                }

                _logger.LogInformation("Assignment Details → Status={Status}, Branch={Branch}, Dept={Dept}, AssignedResource={AssignedResource}, UserResource={UserResource}", 
                    assignment.Status, assignment.BranchId, assignment.DepartmentCode, assignment.AssignedResourceId, resource.OperationalResourceId);

                // 4. Validation
                if (assignment.BranchId != resource.BranchId) 
                {
                    _logger.LogWarning("RETURNING InvalidBranch for assignment {AssignmentId}. SnapshotBranch:{SnapshotBranch} vs ResourceBranch:{ResourceBranch}", 
                        assignmentId, assignment.BranchId, resource.BranchId);
                    return ProcessingResult.InvalidBranch;
                }
                var isAdmin = _userContext.CurrentRole == "Admin" || _userContext.CurrentRole == "SystemAdmin";
                if (assignment.DepartmentCode != resource.DepartmentCode && !isAdmin) 
                {
                    _logger.LogWarning("RETURNING InvalidDepartment for assignment {AssignmentId}. SnapshotDept:{SnapshotDept} vs ResourceDept:{ResourceDept}", 
                        assignmentId, assignment.DepartmentCode, resource.DepartmentCode);
                    return ProcessingResult.InvalidDepartment;
                }
                
                // CRITICAL 409 CHECK: Status
                if (assignment.Status != ProcessingAssignmentStatus.Claimed) 
                {
                    _logger.LogWarning("RETURNING 409 FROM HERE → reason=Assignment is {Status}, not Claimed", assignment.Status);
                    return ProcessingResult.Conflict;
                }
                
                // CRITICAL AUTH CHECK: Ownership
                if (assignment.AssignedResourceId != resource.OperationalResourceId) 
                {
                    _logger.LogWarning("RETURNING Unauthorized for assignment {AssignmentId}. reason=Ownership mismatch. Assigned:{Assigned} vs Resource:{Resource}", 
                        assignmentId, assignment.AssignedResourceId, resource.OperationalResourceId);
                    return ProcessingResult.Unauthorized;
                }

                // 5. Enter Results (without completion)
                if (request.Results != null && request.Results.Any())
                {
                    var orderIds = request.Results.Select(r => r.OrderId).Distinct().ToList();

                    foreach (var orderId in orderIds)
                    {
                        var orderResults = request.Results
                            .Where(r => r.OrderId == orderId)
                            .Select(r => new ParameterResultDto
                            {
                                OrderId = orderId,
                                ParameterCode = r.ParameterCode,
                                Value = r.Value
                            }).ToList();

                        var entryRequest = new ResultEntryRequestDto
                        {
                            OrderId = orderId,
                            SpecimenId = assignment.SpecimenId, // Fix: Use pre-resolved specimen context
                            Results = orderResults
                        };

                        _logger.LogInformation("Calling EnterResultsAsync for Order {OrderId}", orderId);
                        var entryResult = await _resultService.EnterResultsAsync(_userContext.CurrentUserId, entryRequest);
                        
                        if (entryResult.Status != ResultEntryStatus.Success)
                        {
                            _logger.LogWarning("RETURNING 409 FROM HERE → reason=ResultService rejected entry. Status={Status}, Message={Message}", 
                                entryResult.Status, entryResult.Message);
                            return ProcessingResult.Conflict; 
                        }
                        _logger.LogInformation("EnterResultsAsync success for Order {OrderId}", orderId);
                    }
                }

                // 6. SignalR Notification (Notify that draft was saved)
                await _notifier.NotifyAssignmentUpdateAsync(
                    resource.BranchId.ToString(),
                    assignment.DepartmentCode,
                    assignmentId,
                    "DraftSaved",
                    assignment.VisitId.ToString());

                return ProcessingResult.Success;
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "EXCEPTION in SaveAssignmentDraftAsync for assignment {AssignmentId}. Message: {Message}", assignmentId, ex.Message);
                throw;
            }
        }
    }
}
