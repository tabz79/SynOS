using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // Added for .Include()
using SynOS.Data; // Added for SynOSDbContext
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Models.Entities;
using SynOS.Services;

namespace SynOS.Api.Controllers.Lab
{
    [ApiController]
    [Route("api/v1/lab/analyzers/{analyzerId}/mappings")]
    [Authorize(Roles = "Admin")] // Mapping management is Admin-only
    public class LabAnalyzerMappingsController : ControllerBase
    {
        private readonly SynOSDbContext _context; // Inject context to directly query mappings
        private readonly IMapper _mapper;
        private readonly ILogger<LabAnalyzerMappingsController> _logger;

        public LabAnalyzerMappingsController(SynOSDbContext context, IMapper mapper, ILogger<LabAnalyzerMappingsController> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        [HttpPost]
        public async Task<ActionResult<AnalyzerTestMappingSummaryDto>> CreateMapping(Guid analyzerId, [FromBody] CreateAnalyzerTestMappingDto dto)
        {
            var analyzer = await _context.LabAnalyzers.FindAsync(analyzerId);
            if (analyzer == null)
            {
                return NotFound($"LabAnalyzer with ID {analyzerId} not found.");
            }

            // Check for existing mapping to prevent duplicates for the same analyzer and test code
            var existingMapping = await _context.LabAnalyzerTestMappings
                .FirstOrDefaultAsync(m => m.AnalyzerId == analyzerId && m.AnalyzerTestCode == dto.AnalyzerTestCode);

            if (existingMapping != null)
            {
                return Conflict($"Mapping for AnalyzerTestCode '{dto.AnalyzerTestCode}' already exists for analyzer '{analyzer.Name}'.");
            }

            var mapping = _mapper.Map<LabAnalyzerTestMapping>(dto);
            mapping.MappingId = Guid.NewGuid();
            mapping.AnalyzerId = analyzerId;
            mapping.CreatedAt = DateTimeOffset.UtcNow;
            mapping.CreatedBy = GetCurrentUserId(); // Assuming user ID can be extracted

            _context.LabAnalyzerTestMappings.Add(mapping);
            await _context.SaveChangesAsync();

            _logger.LogInformation("LabAnalyzerTestMapping created: {MappingId} for Analyzer {AnalyzerId} by {UserId}", mapping.MappingId, analyzerId, mapping.CreatedBy);
            return Ok(_mapper.Map<AnalyzerTestMappingSummaryDto>(mapping));
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<AnalyzerTestMappingSummaryDto>>> GetMappings(Guid analyzerId)
        {
            var mappings = await _context.LabAnalyzerTestMappings
                                         .Where(m => m.AnalyzerId == analyzerId)
                                         .Include(m => m.Analyzer) // Include Analyzer to map AnalyzerName
                                         .AsNoTracking()
                                         .ToListAsync();
            return Ok(_mapper.Map<IReadOnlyList<AnalyzerTestMappingSummaryDto>>(mappings));
        }

        [HttpPut("{mappingId}")]
        public async Task<ActionResult<AnalyzerTestMappingSummaryDto>> UpdateMapping(Guid analyzerId, Guid mappingId, [FromBody] UpdateAnalyzerTestMappingDto dto)
        {
            var mapping = await _context.LabAnalyzerTestMappings
                                        .Where(m => m.AnalyzerId == analyzerId && m.MappingId == mappingId)
                                        .Include(m => m.Analyzer) // Include Analyzer to map AnalyzerName
                                        .FirstOrDefaultAsync();
            if (mapping == null)
            {
                return NotFound($"Mapping with ID {mappingId} for Analyzer {analyzerId} not found.");
            }
            
            // Check if AnalyzerTestCode is changed and conflicts with another existing mapping
            if (mapping.AnalyzerTestCode != dto.AnalyzerTestCode)
            {
                var existingMapping = await _context.LabAnalyzerTestMappings
                    .FirstOrDefaultAsync(m => m.AnalyzerId == analyzerId && m.AnalyzerTestCode == dto.AnalyzerTestCode && m.MappingId != mappingId);
                
                if (existingMapping != null)
                {
                    return Conflict($"Mapping for AnalyzerTestCode '{dto.AnalyzerTestCode}' already exists for analyzer '{mapping.Analyzer.Name}'.");
                }
            }

            _mapper.Map(dto, mapping);
            mapping.UpdatedAt = DateTimeOffset.UtcNow;
            mapping.UpdatedBy = GetCurrentUserId();

            await _context.SaveChangesAsync();

            _logger.LogInformation("LabAnalyzerTestMapping updated: {MappingId} for Analyzer {AnalyzerId} by {UserId}", mappingId, analyzerId, mapping.UpdatedBy);
            return Ok(_mapper.Map<AnalyzerTestMappingSummaryDto>(mapping));
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
