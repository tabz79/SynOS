using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers.Radiology
{
    [ApiController]
    [Route("api/v1/radiology/pacs")]
    [Authorize(Roles = "Admin,Radiologist,XRayTech,MriTech,CTTech,USTech")]
    public class PacsController : ControllerBase
    {
        private readonly IPacsService _pacsService;

        public PacsController(IPacsService pacsService)
        {
            _pacsService = pacsService;
        }

        [HttpPost("{radiologyStudyId:guid}/upload")]
        public async Task<IActionResult> UploadDicom(Guid radiologyStudyId, [FromForm] IFormFileCollection files)
        {
            if (files == null || !files.Any())
            {
                return BadRequest("No files uploaded.");
            }
            
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var result = await _pacsService.UploadDicomAsync(radiologyStudyId, files, userId);

            // Use the first created instance ID for the location header.
            var firstInstanceId = result.InstanceIds.FirstOrDefault();

            return CreatedAtAction(nameof(GetDicom), new { instanceId = firstInstanceId }, result);
        }

        [HttpGet("instances/{instanceId:guid}/file")]
        public async Task<IActionResult> GetDicom(Guid instanceId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();
            
            var (stream, contentType) = await _pacsService.GetDicomStreamAsync(instanceId, userId);

            // Suggest a filename for the download
            var fileDownloadName = $"{instanceId}.dcm";

            return File(stream, contentType, fileDownloadName);
        }

        [HttpPost("{radiologyStudyId:guid}/reindex")]
        [Authorize(Roles = "Admin,Radiologist")]
        public async Task<IActionResult> ReindexStudy(Guid radiologyStudyId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();
            var result = await _pacsService.ReindexStudyAsync(radiologyStudyId, userId);
            return Ok(result);
        }

        [HttpGet("studies/{radiologyStudyId:guid}/series-tree")]
        [Authorize(Roles = "Admin,Radiologist,XRayTech,MriTech,CTTech,USTech")]
        public async Task<IActionResult> GetSeriesTree(Guid radiologyStudyId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();
            
            var request = HttpContext.Request;
            var apiBaseUrl = $"{request.Scheme}://{request.Host.ToUriComponent()}";

            var result = await _pacsService.GetSeriesTreeAsync(radiologyStudyId, userId, apiBaseUrl);
            
            return Ok(result);
        }
    }
}
