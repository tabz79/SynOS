using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;
using SynOS.Services.Operational;
using SynOS.Services.Security;

namespace SynOS.Services.Phlebotomy
{
    public class PhlebotomyService : IPhlebotomyService
    {
        private readonly SynOSDbContext _db;
        private readonly IUserContext _userContext;
        private readonly INotifier _notifier;
        private readonly IAccessionNumberGenerator _accessionGenerator;
        private readonly IBranchTimeProvider _timeProvider;
        private readonly ILogger<PhlebotomyService> _logger;

        public PhlebotomyService(
            SynOSDbContext db,
            IUserContext userContext,
            INotifier notifier,
            IAccessionNumberGenerator accessionGenerator,
            IBranchTimeProvider timeProvider,
            ILogger<PhlebotomyService> logger)
        {
            _db = db;
            _userContext = userContext;
            _notifier = notifier;
            _accessionGenerator = accessionGenerator;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task<ClaimResult> ClaimAssignmentAsync(Guid assignmentId)
        {
            // 1. Validate Operational Mode
            if (_userContext.CurrentMode != "Operational")
            {
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
            if (_userContext.CurrentMode != "Operational")
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
                .Select(v => new { v.BranchId, v.Branch.Code })
                .FirstOrDefaultAsync();

            if (branchInfo?.BranchId == null || string.IsNullOrEmpty(branchInfo.Code)) return CollectResult.NotFound;

            // Load orders using SpecimenId == null check
            var orders = await _db.Orders
                .Include(o => o.Test)
                .Where(o => o.VisitId == visitId && o.SpecimenId == null)
                .ToListAsync();

            if (!orders.Any()) return CollectResult.NoOrdersFound;

            // NOW Start Transaction (short duration)
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                // 5. Group by SpecimenType
                var orderGroups = orders
                    .GroupBy(o => o.Test.SpecimenTypeCode ?? "UNKNOWN")
                    .ToList();

                var utcNow = DateTime.UtcNow;

                foreach (var group in orderGroups)
                {
                    var specimenTypeCode = group.Key;
                    
                    // 6. Generate Accession (Inherits ambient transaction)
                    var accessionNumber = await _accessionGenerator.GenerateAsync(branchInfo.BranchId.Value, branchInfo.Code);

                    // 7. Create Specimen
                    var specimen = new Specimen
                    {
                        SpecimenId = Guid.NewGuid(),
                        VisitId = visitId,
                        SpecimenTypeCode = specimenTypeCode,
                        AccessionNumber = accessionNumber,
                        Status = SpecimenStatus.Collected,
                        CollectedAt = utcNow,
                        CollectedByUserId = _userContext.CurrentUserId, // UserId
                        CollectedBy = resource.OperationalResourceId,  // Workforce tracking (OperationalResourceId)
                        CreatedAt = DateTimeOffset.UtcNow
                    };

                    _db.Specimens.Add(specimen);

                    // 8. Link Orders
                    foreach (var order in group)
                    {
                        order.SpecimenId = specimen.SpecimenId;
                        order.Status = OrderStatus.Collected;
                    }

                    // 8a. Spawn ProcessingAssignments per Department
                    var distinctDepartments = group
                        .Select(o => string.IsNullOrWhiteSpace(o.Department) ? "PATH" : o.Department)
                        .Distinct();

                    foreach (var deptCode in distinctDepartments)
                    {
                        if (deptCode == "PATH" && group.Any(o => string.IsNullOrWhiteSpace(o.Department)))
                        {
                             _logger.LogWarning("Specimen {SpecimenId} has orders with missing Department. Defaulting one assignment to 'PATH'.", specimen.SpecimenId);
                        }

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

                // 9. Update Assignment
                assignment.Status = WorkAssignmentStatus.Completed;
                if (assignment.StartedAt == null) assignment.StartedAt = utcNow;
                assignment.CompletedAt = utcNow;

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                // 10. Emit Notification (After Commit)
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
