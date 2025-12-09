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
    [Route("api/v1/lab/analyzers")]
    [Authorize(Roles = "Admin")] // All analyzer management is Admin-only
    public class LabAnalyzersController : ControllerBase
    {
        private readonly ILabAnalyzerService _labAnalyzerService;
        private readonly IMapper _mapper;

        public LabAnalyzersController(ILabAnalyzerService labAnalyzerService, IMapper mapper)
        {
            _labAnalyzerService = labAnalyzerService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<ActionResult<LabAnalyzerSummaryDto>> CreateAnalyzer([FromBody] CreateLabAnalyzerDto dto)
        {
            var currentUserId = GetCurrentUserId(); // Implement this method to get user ID from claims
            var analyzer = await _labAnalyzerService.CreateAnalyzerAsync(dto, currentUserId);
            return Ok(_mapper.Map<LabAnalyzerSummaryDto>(analyzer));
        }

        [HttpPut("{analyzerId}")]
        public async Task<ActionResult<LabAnalyzerSummaryDto>> UpdateAnalyzer(Guid analyzerId, [FromBody] UpdateLabAnalyzerDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var updatedAnalyzer = await _labAnalyzerService.UpdateAnalyzerAsync(analyzerId, dto, currentUserId);
            return Ok(_mapper.Map<LabAnalyzerSummaryDto>(updatedAnalyzer));
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<LabAnalyzerSummaryDto>>> GetAnalyzers()
        {
            var analyzers = await _labAnalyzerService.GetAnalyzersAsync();
            return Ok(_mapper.Map<IReadOnlyList<LabAnalyzerSummaryDto>>(analyzers));
        }

        [HttpGet("{analyzerId}")]
        public async Task<ActionResult<LabAnalyzerSummaryDto>> GetAnalyzer(Guid analyzerId)
        {
            var analyzer = await _labAnalyzerService.GetAnalyzerAsync(analyzerId);
            if (analyzer == null)
            {
                return NotFound();
            }
            return Ok(_mapper.Map<LabAnalyzerSummaryDto>(analyzer));
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
            return Guid.Empty;
        }
    }
}
