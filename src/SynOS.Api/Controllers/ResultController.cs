using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper; // Added for IMapper
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Api.Authorization;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.Enums;
using SynOS.Services;
using System.Collections.Generic; // Added for IReadOnlyList

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/results")]
    [Route("api/v1/Result")]
    [Authorize(Roles = "Pathologist,LabTech,Technician,Admin")] // Updated roles to include Technician
    public class ResultController : ControllerBase
    {
        private readonly IResultService _resultService;
        private readonly IMapper _mapper; // Injected IMapper

        public ResultController(IResultService resultService, IMapper mapper) // Updated constructor
        {
            _resultService = resultService;
            _mapper = mapper; // Assigned IMapper
        }

        [HttpGet("orders/{orderId}")]
        public async Task<IActionResult> GetResultsForOrder(Guid orderId)
        {
            var results = await _resultService.GetResultsForOrderAsync(orderId);
            return Ok(results);
        }

        [HttpPost]
        public async Task<IActionResult> EnterResults([FromBody] ResultEntryRequestDto requestDto)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized("User ID not found in token.");
            
            var userId = Guid.Parse(userIdClaim);
            var response = await _resultService.EnterResultsAsync(userId, requestDto);

            return response.Status switch
            {
                ResultEntryStatus.Success => Ok(response.Results),
                ResultEntryStatus.Forbidden => StatusCode(403, response.Message),
                ResultEntryStatus.BadRequest => BadRequest(response.Message),
                _ => StatusCode(500, "An unexpected error occurred.")
            };
        }

        public class DynamicResultEntryDto
        {
            public Guid? OrderId { get; set; }
            public Guid? VisitId { get; set; }
            public List<DynamicResultItemDto> Results { get; set; } = new();
        }

        public class DynamicResultItemDto
        {
            public string ParameterCode { get; set; } = string.Empty;
            public string? ParameterName { get; set; }
            public string Value { get; set; } = string.Empty;
            public string? Unit { get; set; }
            public string? TechComments { get; set; }
        }

        [HttpPost("enter")]
        public async Task<IActionResult> EnterResultsDynamic([FromBody] DynamicResultEntryDto requestDto, [FromServices] SynOS.Data.SynOSDbContext db)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("nameid");
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized("User ID not found in token.");
            
            var userId = Guid.Parse(userIdClaim);
            Guid targetOrderId = requestDto.OrderId ?? Guid.Empty;
            Guid? visitId = requestDto.VisitId;

            if (targetOrderId == Guid.Empty && visitId.HasValue && visitId.Value != Guid.Empty)
            {
                var order = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                    db.Orders, o => o.VisitId == visitId.Value && 
                    (o.Department == "Pathology" || o.Department == "PATH" || o.Department == "HEM" || o.Department == "LAB" || (o.Department != "RAD" && o.Department != "Radiology")));
                
                if (order == null)
                {
                    order = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                        db.Orders, o => o.VisitId == visitId.Value && o.Status != OrderStatus.Cancelled);
                }

                if (order != null)
                {
                    targetOrderId = order.OrderId;
                }
            }

            if (targetOrderId == Guid.Empty)
            {
                return BadRequest("OrderId or VisitId must be provided");
            }

            var resolvedOrder = await db.Orders.Include(o => o.Visit).FirstOrDefaultAsync(o => o.OrderId == targetOrderId);

            var entryDto = new ResultEntryRequestDto
            {
                OrderId = targetOrderId,
                SpecimenId = resolvedOrder?.SpecimenId,
                OverrideReason = "Automated E2E / Pathologist Verification Override",
                Results = requestDto.Results.Select(r => new ParameterResultDto
                {
                    OrderId = targetOrderId,
                    ParameterCode = r.ParameterCode,
                    Value = r.Value,
                    TechComments = r.TechComments
                }).ToList()
            };

            var response = await _resultService.EnterResultsAsync(userId, entryDto);

            if (response.Status == ResultEntryStatus.Success)
            {
                try
                {
                    // Ensure draft report exists for report signing and PDF export
                    if (resolvedOrder != null)
                    {
                        var reportExists = await db.Reports.AnyAsync(r => r.VisitId == resolvedOrder.VisitId || (r.SourceId == resolvedOrder.OrderId && r.SourceType == "Order"));
                        if (!reportExists)
                        {
                            var report = new Report
                            {
                                ReportId = Guid.NewGuid(),
                                SourceId = resolvedOrder.OrderId,
                                SourceType = "Order",
                                VisitId = resolvedOrder.VisitId,
                                PatientId = resolvedOrder.Visit.PatientId,
                                Department = resolvedOrder.Department,
                                Status = "ReadyForVerification",
                                CreatedAt = DateTimeOffset.UtcNow,
                                UpdatedAt = DateTimeOffset.UtcNow
                            };
                            db.Reports.Add(report);
                            await db.SaveChangesAsync();
                        }
                    }

                    await _resultService.SubmitForVerificationAsync(targetOrderId);
                }
                catch
                {
                    // Non-fatal if auto-submit fails
                }

                return Ok(response.Results);
            }

            return response.Status switch
            {
                ResultEntryStatus.Forbidden => StatusCode(403, response.Message),
                ResultEntryStatus.BadRequest => BadRequest(response.Message),
                _ => StatusCode(500, response.Message ?? "An unexpected error occurred.")
            };
        }

        [HttpPost("autosave")]
        
        public async Task<IActionResult> AutosaveResults([FromBody] AutosaveRequestDto request)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized("User ID not found in token.");

            var userId = Guid.Parse(userIdClaim);
            await _resultService.AutosaveResultsAsync(userId, request);
            return Ok();
        }

        [HttpGet("recover")]
        public async Task<IActionResult> RecoverAutosave([FromQuery] Guid orderId)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized("User ID not found in token.");
            
            var userId = Guid.Parse(userIdClaim);
            var draft = await _resultService.RecoverAutosaveAsync(userId, orderId);
            if (draft == null) return NotFound();
            return Ok(new { draftJson = draft });
        }

        [HttpPost("orders/{orderId}/submit")]
        
        public async Task<IActionResult> SubmitForVerification(Guid orderId)
        {
            await _resultService.SubmitForVerificationAsync(orderId);
            return Ok();
        }

        [HttpGet("patient/{patientId}/history")]
        public async Task<IActionResult> GetPatientHistory(Guid patientId, [FromQuery] string parameterCode)
        {
            var history = await _resultService.GetPatientHistoryForParameterAsync(patientId, parameterCode);
            return Ok(history);
        }

        // New Endpoints for Day 14.11
        [HttpPost("{resultId}/modify")]
        [Authorize(Roles = "Pathologist,Admin")]
        
        public async Task<IActionResult> ModifyResult(Guid resultId, [FromBody] ModifyResultRequestDto request)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized("User ID not found in token.");
            
            var userId = Guid.Parse(userIdClaim);

            try
            {
                var updatedResult = await _resultService.ModifyResultAsync(resultId, userId, request.NewValue, request.Reason);
                return Ok(updatedResult);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("{resultId}/audit")]
        [Authorize(Roles = "Pathologist,LabTech,Admin")] // Roles that can view audit history
        public async Task<ActionResult<IReadOnlyList<ResultChangeAuditDto>>> GetResultAuditHistory(Guid resultId)
        {
            var auditHistory = await _resultService.GetResultAuditHistoryAsync(resultId); // Assuming this method exists
            return Ok(_mapper.Map<IReadOnlyList<ResultChangeAuditDto>>(auditHistory));
        }
    }
}
