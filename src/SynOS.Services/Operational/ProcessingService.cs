using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.Processing;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Enums;
using SynOS.Services.Security;

namespace SynOS.Services.Operational
{
    public class ProcessingService : IProcessingService
    {
        private readonly SynOSDbContext _db;
        private readonly IUserContext _userContext;
        private readonly INotifier _notifier;
        private readonly ILogger<ProcessingService> _logger;

        public ProcessingService(
            SynOSDbContext db,
            IUserContext userContext,
            INotifier notifier,
            ILogger<ProcessingService> logger)
        {
            _db = db;
            _userContext = userContext;
            _notifier = notifier;
            _logger = logger;
        }

        public async Task<IEnumerable<ProcessingQueueItemDto>> GetQueueAsync()
        {
            // 1. Validate Mode
            if (_userContext.CurrentMode != "Operational") return Enumerable.Empty<ProcessingQueueItemDto>();

            // 2. Get Resource
            var resource = await _db.OperationalResources.FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId);
            if (resource == null) return Enumerable.Empty<ProcessingQueueItemDto>();

            // 3. Query Queue
            var items = await _db.ProcessingAssignments
                .Include(a => a.Specimen)
                .Where(a => a.BranchId == resource.BranchId && a.DepartmentCode == resource.DepartmentCode)
                .Where(a => a.Status == ProcessingAssignmentStatus.Pending || (a.Status == ProcessingAssignmentStatus.Claimed && a.AssignedResourceId == resource.OperationalResourceId))
                .Select(a => new ProcessingQueueItemDto
                {
                    ProcessingAssignmentId = a.ProcessingAssignmentId,
                    SpecimenId = a.SpecimenId,
                    AccessionNumber = a.Specimen.AccessionNumber,
                    SpecimenTypeCode = a.Specimen.SpecimenTypeCode,
                    DepartmentCode = a.DepartmentCode,
                    Status = a.Status,
                    CreatedAt = a.CreatedAt,
                    StartedAt = a.StartedAt,
                    AssignedResourceId = a.AssignedResourceId
                })
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return items;
        }

        public async Task<ProcessingResult> ClaimAssignmentAsync(Guid processingAssignmentId)
        {
            // 1. Validate Operational Mode
            if (_userContext.CurrentMode != "Operational") return ProcessingResult.NotOperationalMode;

            // 2. Retrieve Operational Resource
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId);

            if (resource == null) return ProcessingResult.NoOperationalResource;

            // 3. Snapshot for Validation & Context
            var snapshot = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId)
                .Select(a => new { a.Specimen.VisitId, a.BranchId, a.DepartmentCode, a.Status, a.AssignedResourceId })
                .FirstOrDefaultAsync();

            if (snapshot == null) return ProcessingResult.NotFound;

            // 4. Strict Isolation Validation
            if (snapshot.BranchId != resource.BranchId) return ProcessingResult.InvalidBranch;
            if (snapshot.DepartmentCode != resource.DepartmentCode) return ProcessingResult.InvalidDepartment;
            if (snapshot.Status != ProcessingAssignmentStatus.Pending) return ProcessingResult.Conflict;

            // 5. ATOMIC CONDITIONAL UPDATE
            var utcNow = DateTimeOffset.UtcNow;
            
            var affectedRows = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId 
                         && a.Status == ProcessingAssignmentStatus.Pending 
                         && a.BranchId == resource.BranchId
                         && a.DepartmentCode == resource.DepartmentCode)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, ProcessingAssignmentStatus.Claimed)
                    .SetProperty(a => a.AssignedResourceId, resource.OperationalResourceId)
                    .SetProperty(a => a.StartedAt, utcNow));

            if (affectedRows == 0)
            {
                _logger.LogWarning("Race condition detected for ProcessingAssignment {ProcessingAssignmentId}. User {UserId} failed to claim.", processingAssignmentId, _userContext.CurrentUserId);
                return ProcessingResult.Conflict;
            }

            // 6. Emit SignalR (Only on success)
            await _notifier.NotifyActionQueueDeltaAsync(resource.BranchId.ToString(), snapshot.VisitId.ToString());

            return ProcessingResult.Success;
        }

        public async Task<ProcessingResult> CompleteAssignmentAsync(Guid processingAssignmentId)
        {
            // 1. Validate Operational Mode
            if (_userContext.CurrentMode != "Operational") return ProcessingResult.NotOperationalMode;

            // 2. Retrieve Operational Resource
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId);

            if (resource == null) return ProcessingResult.NoOperationalResource;

            // 3. Snapshot for Validation & Context
            var snapshot = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId)
                .Select(a => new { a.Specimen.VisitId, a.BranchId, a.DepartmentCode, a.Status, a.AssignedResourceId })
                .FirstOrDefaultAsync();

            if (snapshot == null) return ProcessingResult.NotFound;

            // 4. Validation
            if (snapshot.BranchId != resource.BranchId) return ProcessingResult.InvalidBranch;
            if (snapshot.DepartmentCode != resource.DepartmentCode) return ProcessingResult.InvalidDepartment;
            if (snapshot.Status != ProcessingAssignmentStatus.Claimed) return ProcessingResult.Conflict;
            if (snapshot.AssignedResourceId != resource.OperationalResourceId) return ProcessingResult.Unauthorized;

            // 5. ATOMIC CONDITIONAL UPDATE
            var utcNow = DateTimeOffset.UtcNow;
            
            var affectedRows = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == processingAssignmentId 
                         && a.Status == ProcessingAssignmentStatus.Claimed 
                         && a.AssignedResourceId == resource.OperationalResourceId
                         && a.BranchId == resource.BranchId
                         && a.DepartmentCode == resource.DepartmentCode)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Status, ProcessingAssignmentStatus.Completed)
                    .SetProperty(a => a.CompletedAt, utcNow));

            if (affectedRows == 0)
            {
                return ProcessingResult.Conflict;
            }

            // 6. Emit SignalR (Only on success)
            await _notifier.NotifyActionQueueDeltaAsync(resource.BranchId.ToString(), snapshot.VisitId.ToString());

            return ProcessingResult.Success;
        }
    }
}
