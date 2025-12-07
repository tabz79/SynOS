using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services;
using System;
using System.Threading.Tasks;
using System.Security.Claims; // Added for ClaimTypes
using SynOS.Models.DTOs; // Added for DTOs

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/radiology/reports")]
    [Authorize(Roles = "Radiologist,Admin")]
    public class RadiologyReportsController : ControllerBase
    {
        private readonly IRadiologyService _radiologyService;

        public RadiologyReportsController(IRadiologyService radiologyService)
        {
            _radiologyService = radiologyService;
        }

        [HttpGet("worklist")]
        public async Task<IActionResult> GetRadiologistWorklist()
        {
            var worklist = await _radiologyService.GetRadiologistWorklistAsync();
            return Ok(worklist);
        }

        [HttpGet("{studyId}")]
        public async Task<IActionResult> GetStudyDetails(Guid studyId)
        {
            var details = await _radiologyService.GetStudyDetailsAsync(studyId);
            return Ok(details);
        }

        [HttpPost("draft")]
        public async Task<IActionResult> DraftReport([FromBody] RadiologyReportDraftDto request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var reportDto = await _radiologyService.DraftReportAsync(request, userId);
            return Ok(reportDto);
        }

        [HttpPost("sign")]
        public async Task<IActionResult> SignReport([FromBody] SignRadiologyReportRequestDto request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var reportDto = await _radiologyService.SignReportAsync(request.StudyId, userId);
            return Ok(reportDto);
        }
    }
}
