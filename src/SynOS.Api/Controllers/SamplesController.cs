using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging; // Added for ILogger
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Services;
using SynOS.Services.Operational; // ADDED
using SynOS.Services.Security; // ADDED

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/samples")]
    [Authorize(Policy = "PhlebotomyPolicy")]
    public class SamplesController : ControllerBase
    {
        private readonly ISampleService _sampleService;
        private readonly ILogger<SamplesController> _logger;
        private readonly IOperationalStatsProjector _projector; // ADDED
        private readonly IUserContext _userContext; // ADDED

        public SamplesController(ISampleService sampleService, ILogger<SamplesController> logger, IOperationalStatsProjector projector, IUserContext userContext)
        {
            _sampleService = sampleService;
            _logger = logger;
            _projector = projector;
            _userContext = userContext;
        }

        [HttpPost("create-for-visit")]
        public async Task<IActionResult> CreateSamplesForVisit([FromBody] CreateSamplesRequestDto request)
        {
            var samples = await _sampleService.CreateSamplesForVisitAsync(request.VisitId);
            return Ok(samples);
        }

        [HttpPost("{id}/collect")]
        public async Task<IActionResult> CollectSample(Guid id, [FromBody] CollectSampleRequestDto request)
        {
            var sample = await _sampleService.CollectSampleAsync(id, request.CollectedByUserId);
            
            // Trigger live projection
            await _projector.ProjectPendingEventsAsync(_userContext.CurrentBranchId);

            return Ok(sample);
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectSample(Guid id, [FromBody] RejectSampleRequestDto request)
        {
            var sample = await _sampleService.RejectSampleAsync(id, request);
            return Ok(sample);
        }

        [HttpGet("worklist")]
        public async Task<IActionResult> GetSampleWorklist([FromQuery] SampleStatus status = SampleStatus.Pending)
        {
            var worklist = await _sampleService.GetSampleWorklistAsync(status);
            return Ok(worklist);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSampleById(Guid id)
        {
            var sample = await _sampleService.GetSampleByIdAsync(id);
            if (sample == null) return NotFound();
            return Ok(sample);
        }

        [HttpGet("{id}/barcode")]
        public async Task<IActionResult> GetSampleBarcode(Guid id)
        {
            try
            {
                var printDto = await _sampleService.GetSampleBarcodeForPrintingAsync(id);
                return Ok(new ApiResponse<SampleBarcodePrintDto>(printDto));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { code = "NOT_FOUND", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred while generating barcode for sample ID {SampleId}.", id);
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = "An internal error occurred." });
            }
        }
    }
}
