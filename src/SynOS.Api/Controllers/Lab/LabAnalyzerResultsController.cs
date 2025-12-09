using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Services;

namespace SynOS.Api.Controllers.Lab
{
    [ApiController]
    [Route("api/v1/lab/analyzers/{analyzerId}/results")]
    [Authorize(Roles = "Admin,LabTech,Pathologist")] // Adjust roles as per your RBAC
    public class LabAnalyzerResultsController : ControllerBase
    {
        private readonly ILabAnalyzerService _labAnalyzerService;
        private readonly IMapper _mapper;

        public LabAnalyzerResultsController(ILabAnalyzerService labAnalyzerService, IMapper mapper)
        {
            _labAnalyzerService = labAnalyzerService;
            _mapper = mapper;
        }

        [HttpPost("manual")]
        public async Task<ActionResult<ManualResultEnqueueResponseDto>> EnqueueManualResult(
            Guid analyzerId,
            [FromBody] ManualAnalyzerResultDto dto)
        {
            var currentUserId = GetCurrentUserId(); // Implement this method to get user ID from claims
            var inboxItem = await _labAnalyzerService.EnqueueManualResultAsync(analyzerId, dto, currentUserId);
            return Ok(_mapper.Map<ManualResultEnqueueResponseDto>(inboxItem));
        }

        [HttpGet("inbox")]
        [Authorize(Roles = "Admin,LabTech,Pathologist")] // Debug/testing endpoint
        public async Task<ActionResult<IReadOnlyList<ManualResultEnqueueResponseDto>>> GetInboxItems(Guid analyzerId, [FromQuery] int limit = 50)
        {
            var inboxItems = await _labAnalyzerService.GetInboxItemsAsync(analyzerId, limit);
            return Ok(_mapper.Map<IReadOnlyList<ManualResultEnqueueResponseDto>>(inboxItems));
        }

        // Helper to get current user ID (assuming JWT setup)
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }
            // Fallback for development or if user ID is not in claims
            return Guid.Empty; // Should ideally throw if user is authorized but ID is missing
        }
    }
}
