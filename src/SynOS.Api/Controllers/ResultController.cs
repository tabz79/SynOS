using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Api.Authorization;
using SynOS.Models.DTOs;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/results")]
    [Authorize(Policy = "PhlebotomyPolicy")]
    public class ResultController : ControllerBase
    {
        private readonly IResultService _resultService;

        public ResultController(IResultService resultService)
        {
            _resultService = resultService;
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
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized("User ID not found in token.");
            
            var userId = Guid.Parse(userIdClaim);
            var results = await _resultService.EnterResultsAsync(userId, requestDto);
            return Ok(results);
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
    }
}
