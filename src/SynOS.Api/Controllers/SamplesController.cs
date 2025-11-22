using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/samples")]
    [Authorize] // Or use a more specific authorization policy
    public class SamplesController : ControllerBase
    {
        private readonly ISampleService _sampleService;

        public SamplesController(ISampleService sampleService)
        {
            _sampleService = sampleService;
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

        [HttpGet("{id}/label")]
        public async Task<IActionResult> GetSampleLabel(Guid id)
        {
            try
            {
                var zplString = await _sampleService.GetZplLabelForSampleAsync(id);
                // Return as plain text, which can be sent to a ZPL printer
                return Content(zplString, "text/plain");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
