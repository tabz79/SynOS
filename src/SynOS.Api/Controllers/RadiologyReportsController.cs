using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services;
using SynOS.Services.Operational; // ADDED
using SynOS.Services.Security; // ADDED
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
        private readonly IOperationalStatsProjector _projector; // ADDED
        private readonly IUserContext _userContext; // ADDED

        public RadiologyReportsController(IRadiologyService radiologyService, IOperationalStatsProjector projector, IUserContext userContext)
        {
            _radiologyService = radiologyService;
            _projector = projector;
            _userContext = userContext;
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
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();
            var reportDto = await _radiologyService.DraftReportAsync(request, userId);
            return Ok(reportDto);
        }

        [HttpPost("sign")]
        public async Task<IActionResult> SignReport([FromBody] SignRadiologyReportRequestDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();
            var reportDto = await _radiologyService.SignReportAsync(request.StudyId, userId);
            
            // Trigger live projection
            await _projector.ProjectPendingEventsAsync();

            return Ok(reportDto);
        }
    }
}
