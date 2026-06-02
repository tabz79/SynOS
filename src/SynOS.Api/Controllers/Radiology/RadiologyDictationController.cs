using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services;

namespace SynOS.Api.Controllers.Radiology
{
    [ApiController]
    [Route("api/v1/radiology")]
    [Authorize]
    public class RadiologyDictationController : ControllerBase
    {
        private readonly IDictationSessionService _sessionService;

        public RadiologyDictationController(IDictationSessionService sessionService)
        {
            _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        }

        [HttpPost("studies/{studyId}/claim")]
        [Authorize(Roles = "Radiologist,Admin")]
        public async Task<IActionResult> ClaimStudy(Guid studyId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                var study = await _sessionService.ClaimStudyAsync(studyId, userId);
                return Ok(new { studyId = study.RadiologyStudyId, status = study.Status, claimedBy = study.ClaimedByUserId, claimedAt = study.ClaimedAt });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("studies/{studyId}/release")]
        [Authorize(Roles = "Radiologist,Admin")]
        public async Task<IActionResult> ForceReleaseStudy(Guid studyId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            bool isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");

            try
            {
                var study = await _sessionService.ForceReleaseStudyAsync(studyId, userId, isAdmin);
                return Ok(new { studyId = study.RadiologyStudyId, status = study.Status });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("studies/{studyId}/session/start")]
        [Authorize(Roles = "Radiologist,Admin")]
        public async Task<IActionResult> StartSession(Guid studyId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                var session = await _sessionService.StartSessionAsync(studyId, userId);
                return Ok(new { sessionId = session.SessionId, studyId = session.StudyId, status = session.SessionStatus });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("session/{sessionId}/join")]
        [Authorize(Roles = "Typist,Admin")]
        public async Task<IActionResult> JoinSessionAsTypist(Guid sessionId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                var session = await _sessionService.JoinSessionAsTypistAsync(sessionId, userId);
                return Ok(new { sessionId = session.SessionId, studyId = session.StudyId, status = session.SessionStatus });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("session/{sessionId}/end")]
        [Authorize(Roles = "Radiologist,Admin,Typist")]
        public async Task<IActionResult> EndSession(Guid sessionId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                await _sessionService.EndSessionAsync(sessionId, userId);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
