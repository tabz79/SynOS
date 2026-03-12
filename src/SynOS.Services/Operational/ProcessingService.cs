using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.Processing;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
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
            await _notifier.NotifyAssignmentUpdateAsync(
                resource.BranchId.ToString(),
                snapshot.DepartmentCode,
                processingAssignmentId,
                ProcessingAssignmentStatus.Claimed.ToString(),
                snapshot.VisitId.ToString());

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
            await _notifier.NotifyAssignmentUpdateAsync(
                resource.BranchId.ToString(),
                snapshot.DepartmentCode,
                processingAssignmentId,
                ProcessingAssignmentStatus.Completed.ToString(),
                snapshot.VisitId.ToString());

            return ProcessingResult.Success;
        }

        public async Task<ProcessingResult> ReopenAssignmentAsync(Guid assignmentId)
        {
            // 1. Validate Operational Mode
            if (_userContext.CurrentMode != "Operational") return ProcessingResult.NotOperationalMode;

            // 2. Retrieve Operational Resource
            var resource = await _db.OperationalResources
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId);

            if (resource == null) return ProcessingResult.NoOperationalResource;

            // 3. Snapshot for Validation
            var snapshot = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == assignmentId)
                .Select(a => new { a.Specimen.VisitId, a.BranchId, a.DepartmentCode, a.Status })
                .FirstOrDefaultAsync();

            if (snapshot == null) return ProcessingResult.NotFound;

            // 4. Validation
            if (snapshot.BranchId != resource.BranchId) return ProcessingResult.InvalidBranch;
            if (snapshot.DepartmentCode != resource.DepartmentCode) return ProcessingResult.InvalidDepartment;
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
                                a.Specimen.Visit.Patient.DateOfBirth
                            }
                        }
                    }
                })
                .FirstOrDefaultAsync();

            if (snapshot == null) return null;

            // 2. SECURITY HARDENING: Strict Branch + Department Isolation
            if (snapshot.BranchId != _userContext.CurrentBranchId || snapshot.DepartmentCode != _userContext.DepartmentCode)
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

            // Assemble DTO
            var detailDto = new ProcessingAssignmentDetailDto
            {
                ProcessingAssignmentId = snapshot.ProcessingAssignmentId,
                SpecimenId = snapshot.SpecimenId,
                DepartmentCode = snapshot.DepartmentCode,
                Status = snapshot.Status,
                Patient = new AssignmentPatientDto
                {
                    PatientId = patient.PatientId,
                    MRN = patient.MRN,
                    PatientName = $"{patient.FirstName} {patient.LastName}",
                    Sex = patient.Gender,
                    Age = (int)((DateTime.Today - patient.DateOfBirth).TotalDays / 365.25)
                },
                Specimen = new AssignmentSpecimenDto
                {
                    SpecimenId = snapshot.SpecimenId,
                    AccessionNumber = snapshot.Specimen.AccessionNumber,
                    SpecimenType = snapshot.Specimen.SpecimenTypeCode,
                    CollectionTime = snapshot.Specimen.CollectedAt
                },
                Tests = orders.Select(o =>
                {
                    var catalogTest = catalogTests.FirstOrDefault(t => t.TestCode == o.TestCode);
                    return new AssignmentTestDto
                    {
                        OrderId = o.OrderId,
                        TestCode = o.TestCode,
                        TestName = catalogTest?.TestName ?? o.TestCode,
                        SortOrder = 0,
                        Parameters = catalogTest?.Parameters
                            .OrderBy(p => p.SortOrder)
                            .Select(cp => new AssignmentParameterDto
                            {
                                ParameterCode = cp.ParameterCode,
                                ParameterName = cp.ParameterName,
                                DataType = cp.DataType,
                                Unit = cp.Unit,
                                ReferenceRange = cp.ReferenceRange,
                                SortOrder = cp.SortOrder,
                                IsRequired = cp.IsRequired,
                                EnumOptions = cp.EnumOptions,
                                ExistingResultValue = results.FirstOrDefault(r => r.OrderId == o.OrderId && r.ParameterCode == cp.ParameterCode)?.Value
                            }).ToList() ?? new List<AssignmentParameterDto>()
                    };
                })
                .OrderBy(t => t.SortOrder)
                .ToList()
            };

            return detailDto;
        }
    }
}
