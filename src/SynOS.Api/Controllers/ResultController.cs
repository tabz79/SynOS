using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper; // Added for IMapper
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Api.Authorization;
using SynOS.Models.DTOs;
using SynOS.Services;
using System.Collections.Generic; // Added for IReadOnlyList

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/results")]
    [Authorize(Roles = "Pathologist,LabTech,Admin")] // Updated roles as per prompt
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
        [Authorize(Policy = "OperationalModeOnly")]
        public async Task<IActionResult> EnterResults([FromBody] ResultEntryRequestDto requestDto)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
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

        [HttpPost("autosave")]
        [Authorize(Policy = "OperationalModeOnly")]
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
        [Authorize(Policy = "OperationalModeOnly")]
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
        [Authorize(Policy = "OperationalModeOnly")]
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
