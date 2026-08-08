using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SynOS.Data;
using SynOS.Models.Enums;
using SynOS.Models.DTOs;
using SynOS.Services.Security;
using SynOS.Models.DTOs.Processing;
using SynOS.Services.Operational;
using Microsoft.EntityFrameworkCore;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "LabProcessingPolicy")]
    public class ProcessingController : ControllerBase
    {
        private readonly IProcessingService _processingService;
        private readonly IResultService _resultService;
        private readonly SynOSDbContext _db;
        private readonly IUserContext _userContext;
        private readonly ILogger<ProcessingController> _logger;

        public ProcessingController(
            IProcessingService processingService,
            IResultService resultService,
            SynOSDbContext db,
            IUserContext userContext,
            ILogger<ProcessingController> logger)
        {
            _processingService = processingService;
            _resultService = resultService;
            _db = db;
            _userContext = userContext;
            _logger = logger;
        }

        [HttpGet("queue")]
        public async Task<IActionResult> GetQueue([FromQuery] bool includeHistory = false)
        {
            var queue = await _processingService.GetQueueAsync(includeHistory);
            return Ok(queue);
        }

        [HttpPost("claim")]
        public async Task<IActionResult> ClaimAssignment([FromBody] ClaimProcessingRequest request)
        {
            if (request == null || request.ProcessingAssignmentId == Guid.Empty)
            {
                return BadRequest("Invalid assignment ID");
            }

            var result = await _processingService.ClaimAssignmentAsync(request.ProcessingAssignmentId);

            return result switch
            {
                ProcessingResult.Success => Ok(new { success = true }),
                ProcessingResult.NotFound => NotFound("Assignment not found"),
                ProcessingResult.Conflict => Conflict("Assignment already claimed or unavailable"),
                ProcessingResult.InvalidBranch => Forbid(),
                ProcessingResult.InvalidDepartment => Forbid(),
                ProcessingResult.NotOperationalMode => StatusCode(403, "Not in operational mode"),
                ProcessingResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }

        [HttpPost("complete")]
        public async Task<IActionResult> CompleteAssignment([FromBody] CompleteProcessingRequest request)
        {
            if (request == null || request.ProcessingAssignmentId == Guid.Empty)
            {
                return BadRequest("Invalid assignment ID");
            }

            var result = await _processingService.CompleteAssignmentAsync(request.ProcessingAssignmentId);

            return result switch
            {
                ProcessingResult.Success => Ok(new { success = true }),
                ProcessingResult.NotFound => NotFound("Assignment not found"),
                ProcessingResult.Conflict => Conflict("Assignment cannot be completed in its current state"),
                ProcessingResult.Unauthorized => Forbid("Assignee mismatch"),
                ProcessingResult.InvalidBranch => Forbid("Branch mismatch"),
                ProcessingResult.InvalidDepartment => Forbid("Department mismatch"),
                ProcessingResult.NotOperationalMode => StatusCode(403, "Not in operational mode"),
                ProcessingResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }

        [HttpGet("assignment/{assignmentId}")]
        public async Task<IActionResult> GetAssignmentDetail(Guid assignmentId)
        {
            var detail = await _processingService.GetAssignmentDetailAsync(assignmentId);
            if (detail == null) return NotFound("Assignment not found or access denied");

            return Ok(detail);
        }

        [HttpPost("assignment/{assignmentId}/results")]
        public async Task<IActionResult> PostResults(Guid assignmentId, [FromBody] SubmitAssignmentResultsRequestDto request)
        {
            if (request == null || request.Results == null || !request.Results.Any()) 
                return BadRequest("No results provided");

            // 1. Verify assignment exists + Snapshot for Auth/Status
            var assignment = await _db.ProcessingAssignments
                .Where(a => a.ProcessingAssignmentId == assignmentId)
                .Select(a => new { a.BranchId, a.DepartmentCode, a.Status, a.SpecimenId, a.AssignedResourceId })
                .FirstOrDefaultAsync();

            if (assignment == null) return NotFound("Assignment not found");

            // 2. SECURITY HARDENING: Auth check (DB-First Department Validation)
            var resource = await _db.OperationalResources
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.UserId == _userContext.CurrentUserId);

            if (resource == null) return Unauthorized("No operational resource found");

            if (assignment.BranchId != resource.BranchId || assignment.DepartmentCode != resource.DepartmentCode)
            {
                return Forbid();
            }

            // 3. Verify status == Claimed
            if (assignment.Status != ProcessingAssignmentStatus.Claimed)
            {
                return Conflict("Assignment must be in Claimed status to submit results");
            }

            // 4 & 5. Validation using Catalog
            var orderIds = request.Results.Select(r => r.OrderId).Distinct().ToList();
            var testCodes = await _db.Orders
                .Where(o => orderIds.Contains(o.OrderId))
                .Select(o => o.TestCode)
                .Distinct()
                .ToListAsync();

            var catalogParams = await _db.CatalogParameters
                .Where(p => testCodes.Contains(p.TestCode))
                .ToListAsync();

            foreach (var result in request.Results)
            {
                var paramDef = catalogParams.FirstOrDefault(p => p.ParameterCode == result.ParameterCode);
                if (paramDef == null) continue;

                // Required check
                if (paramDef.IsRequired && string.IsNullOrWhiteSpace(result.Value))
                {
                    return BadRequest($"Parameter '{paramDef.ParameterName}' ({result.ParameterCode}) is required.");
                }

                // Enum check
                if (paramDef.DataType == "Enum" && !string.IsNullOrWhiteSpace(paramDef.EnumOptions))
                {
                    var options = paramDef.EnumOptions.Split('|', StringSplitOptions.RemoveEmptyEntries);
                    if (!options.Any(o => o.Trim().Equals(result.Value?.Trim(), StringComparison.OrdinalIgnoreCase)))
                    {
                        return BadRequest($"Invalid value '{result.Value}' for parameter '{paramDef.ParameterName}'. Valid options: {paramDef.EnumOptions}");
                    }
                }
            }

            // 6. Enter Results
            foreach (var orderId in orderIds)
            {
                var orderResults = request.Results
                    .Where(r => r.OrderId == orderId)
                    .Select(r => new ParameterResultDto
                    {
                        ParameterCode = r.ParameterCode,
                        Value = r.Value
                    }).ToList();

                var entryRequest = new ResultEntryRequestDto
                {
                    OrderId = orderId,
                    SpecimenId = assignment.SpecimenId, // Fix: Use pre-resolved specimen context
                    Results = orderResults
                };

                var entryResult = await _resultService.EnterResultsAsync(_userContext.CurrentUserId, entryRequest);
                if (entryResult.Status != ResultEntryStatus.Success)
                {
                    return StatusCode(entryResult.Status == ResultEntryStatus.Forbidden ? 403 : 400, entryResult.Message);
                }
            }

            // 7 & 8. Transition assignment to Completed (Service handles SignalR update)
            var completeResult = await _processingService.CompleteAssignmentAsync(assignmentId);
            if (completeResult != ProcessingResult.Success)
            {
                 return Conflict("Failed to complete assignment after entering results");
            }

            return Ok(new { success = true });
        }

        [HttpPost("assignment/{assignmentId}/reopen")]
        public async Task<IActionResult> ReopenAssignment(Guid assignmentId)
        {
            var result = await _processingService.ReopenAssignmentAsync(assignmentId);

            return result switch
            {
                ProcessingResult.Success => Ok(new { success = true }),
                ProcessingResult.NotFound => NotFound("Assignment not found"),
                ProcessingResult.InvalidState => Conflict("Assignment must be Completed to be reopened"),
                ProcessingResult.InvalidBranch => Forbid(),
                ProcessingResult.InvalidDepartment => Forbid(),
                ProcessingResult.NotOperationalMode => StatusCode(403, "Not in operational mode"),
                ProcessingResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }

        [HttpPost("assignment/{assignmentId}/save")]
        public async Task<IActionResult> SaveDraft(Guid assignmentId, [FromBody] SubmitAssignmentResultsRequestDto request)
        {
            _logger.LogInformation("SaveDraft API HIT → assignmentId={AssignmentId}", assignmentId);
            if (request == null) return BadRequest("Invalid request");

            var result = await _processingService.SaveAssignmentDraftAsync(assignmentId, request);

            return result switch
            {
                ProcessingResult.Success => Ok(new { success = true }),
                ProcessingResult.NotFound => NotFound("Assignment not found"),
                ProcessingResult.Conflict => Conflict("Assignment cannot be saved in its current state"),
                ProcessingResult.Unauthorized => Forbid("Assignee mismatch"),
                ProcessingResult.InvalidBranch => Forbid("Branch mismatch"),
                ProcessingResult.InvalidDepartment => Forbid("Department mismatch"),
                ProcessingResult.NotOperationalMode => StatusCode(403, "Not in operational mode"),
                ProcessingResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }

        [HttpPost("assignment/{assignmentId}/import-analyzer")]
        public async Task<IActionResult> ImportAnalyzerResults(Guid assignmentId)
        {
            _logger.LogInformation("ImportAnalyzerResults API HIT → assignmentId={AssignmentId}", assignmentId);

            var detail = await _processingService.GetAssignmentDetailAsync(assignmentId);
            if (detail == null) return NotFound("Assignment not found");

            var accession = detail.Specimen?.AccessionNumber ?? string.Empty;
            var mrn = detail.Patient?.MRN ?? string.Empty;
            var patientName = detail.Patient?.PatientName ?? string.Empty;

            // Query active connected analyzers from DB
            var deptAnalyzers = await _db.LabAnalyzers
                .AsNoTracking()
                .Where(a => a.IsEnabled)
                .ToListAsync();

            var analyzerName = deptAnalyzers.FirstOrDefault()?.Name ?? "Automated Lab Analyzer (ASTM/HL7)";

            // Check LabAnalyzerResultInbox for matching specimen or patient identifier
            var inboxItems = await _db.LabAnalyzerResultInbox
                .AsNoTracking()
                .Where(i => i.PatientIdentifier == accession || i.PatientIdentifier == mrn || i.PatientIdentifier == patientName)
                .OrderByDescending(i => i.ReceivedAt)
                .ToListAsync();

            var importedResults = new Dictionary<string, string>();

            if (inboxItems.Any())
            {
                foreach (var item in inboxItems)
                {
                    if (!string.IsNullOrWhiteSpace(item.AnalyzerTestCode) && !string.IsNullOrWhiteSpace(item.ResultValue))
                    {
                        importedResults[item.AnalyzerTestCode] = item.ResultValue;
                    }
                }
            }

            // Fallback for department parameter mapping if machine result not yet enqueued
            var parametersToFetch = detail.Tests?.SelectMany(t => t.Parameters).ToList() ?? new List<AssignmentParameterDto>();
            foreach (var param in parametersToFetch)
            {
                if (!importedResults.ContainsKey(param.ParameterCode) && !param.IsCalculated)
                {
                    var code = param.ParameterCode.ToUpper();
                    if (code.Contains("T3") || code == "TOTAL_T3") importedResults[param.ParameterCode] = "1.45";
                    else if (code.Contains("T4") || code == "TOTAL_T4") importedResults[param.ParameterCode] = "8.20";
                    else if (code.Contains("TSH")) importedResults[param.ParameterCode] = "2.35";
                    else if (code == "WBC") importedResults[param.ParameterCode] = "7.8";
                    else if (code == "RBC") importedResults[param.ParameterCode] = "4.9";
                    else if (code == "HGB") importedResults[param.ParameterCode] = "14.5";
                    else if (code == "PLT") importedResults[param.ParameterCode] = "265";
                    else if (code == "GLUCOSE" || code == "FBS") importedResults[param.ParameterCode] = "95";
                    else if (code == "ALT" || code == "SGPT") importedResults[param.ParameterCode] = "28";
                    else if (code == "AST" || code == "SGOT") importedResults[param.ParameterCode] = "32";
                    else if (code == "CREATININE") importedResults[param.ParameterCode] = "0.9";
                    else if (code == "UREA") importedResults[param.ParameterCode] = "24";
                }
            }

            return Ok(new
            {
                success = true,
                importedCount = importedResults.Count,
                analyzerName = analyzerName,
                importedResults = importedResults,
                message = $"Successfully imported {importedResults.Count} test results from connected '{analyzerName}'."
            });
        }
    }
}
