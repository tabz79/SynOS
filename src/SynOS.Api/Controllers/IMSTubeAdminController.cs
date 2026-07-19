using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.IMS;
using SynOS.Models.Entities.IMS;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/ims")]
    [Authorize(Roles = "Admin,LabTech")] // As per prompt
    public class IMSTubeAdminController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<IMSTubeAdminController> _logger;

        public IMSTubeAdminController(SynOSDbContext context, ILogger<IMSTubeAdminController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("tubes")]
        public async Task<IActionResult> CreateTube([FromBody] TubeCreateDto tubeDto)
        {
            if (await _context.ImsTubeMasters.AnyAsync(t => t.Code == tubeDto.Code))
            {
                return Conflict(new { message = $"A tube with code '{tubeDto.Code}' already exists." });
            }

            var newTube = new ImsTubeMaster
            {
                TubeId = Guid.NewGuid(),
                Code = tubeDto.Code,
                Name = tubeDto.Name,
                UnitOfMeasure = tubeDto.UnitOfMeasure,
                IsActive = true
            };

            await _context.ImsTubeMasters.AddAsync(newTube);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTubeById), new { tubeId = newTube.TubeId }, newTube);
        }

        // Helper endpoint to retrieve a tube, useful for CreatedAtAction
        [HttpGet("tubes/{tubeId}")]
        public async Task<IActionResult> GetTubeById(Guid tubeId)
        {
            var tube = await _context.ImsTubeMasters.FindAsync(tubeId);
            if (tube == null) return NotFound();
            return Ok(tube);
        }

        [HttpPut("tubes/{tubeId}")]
        public async Task<IActionResult> UpdateTube(Guid tubeId, [FromBody] TubeUpdateDto tubeDto)
        {
            var tube = await _context.ImsTubeMasters.FindAsync(tubeId);
            if (tube == null)
            {
                return NotFound(new { message = $"Tube with ID '{tubeId}' not found." });
            }

            tube.Name = tubeDto.Name;
            tube.UnitOfMeasure = tubeDto.UnitOfMeasure;
            tube.IsActive = tubeDto.IsActive;

            await _context.SaveChangesAsync();
            return Ok(tube);
        }

        [HttpPost("tubes/test-map")]
        public async Task<IActionResult> CreateTestTubeMapping([FromBody] TestTubeMapDto mapDto)
        {
            if (!await _context.Tests.AnyAsync(t => t.TestId == mapDto.TestId))
            {
                return NotFound(new { message = $"Test with ID '{mapDto.TestId}' not found." });
            }

            if (!await _context.ImsTubeMasters.AnyAsync(t => t.TubeId == mapDto.TubeId))
            {
                return NotFound(new { message = $"Tube with ID '{mapDto.TubeId}' not found." });
            }
            
            if (await _context.ImsTestTubeMaps.AnyAsync(m => m.TestId == mapDto.TestId && m.TubeId == mapDto.TubeId))
            {
                return Conflict(new { message = "This test-to-tube mapping already exists." });
            }

            var newMap = new ImsTestTubeMap
            {
                MapId = Guid.NewGuid(),
                TestId = mapDto.TestId,
                TubeId = mapDto.TubeId,
                QuantityPerSample = mapDto.QuantityPerSample
            };

            await _context.ImsTestTubeMaps.AddAsync(newMap);
            await _context.SaveChangesAsync();
            
            return Ok(newMap);
        }

        [HttpGet("tubes")]
        public async Task<IActionResult> GetAllTubes()
        {
            var tubes = await _context.ImsTubeMasters.Where(t => t.IsActive).ToListAsync();
            return Ok(tubes);
        }

        [HttpGet("tubes/test-map/{testId}")]
        public async Task<IActionResult> GetTestTubeMappings(Guid testId)
        {
            var mappings = await _context.ImsTestTubeMaps
                .Where(m => m.TestId == testId)
                .Include(m => m.Tube)
                .ToListAsync();
            return Ok(mappings);
        }

        [HttpDelete("tubes/test-map/{mapId}")]
        public async Task<IActionResult> DeleteTestTubeMapping(Guid mapId)
        {
            var mapping = await _context.ImsTestTubeMaps.FindAsync(mapId);
            if (mapping == null) return NotFound();

            _context.ImsTestTubeMaps.Remove(mapping);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
