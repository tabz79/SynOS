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

        private bool TryGetUserId(out Guid userId)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (Guid.TryParse(userIdString, out userId)) return true;

            var queryToken = Request.Query["token"].FirstOrDefault() ?? Request.Query["access_token"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(queryToken))
            {
                try
                {
                    var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                    var jwt = handler.ReadJwtToken(queryToken);
                    var sub = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "sub" || c.Type == "nameid")?.Value;
                    if (Guid.TryParse(sub, out userId)) return true;
                }
                catch { }
            }

            userId = Guid.Empty;
            return false;
        }

        [HttpPost("{radiologyStudyId:guid}/upload")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 524288000)]
        public async Task<IActionResult> UploadDicom(Guid radiologyStudyId, [FromForm] List<IFormFile> files)
        {
            IReadOnlyList<IFormFile> uploadFiles = (files != null && files.Any()) ? files : Request.Form.Files.ToList();
            if (uploadFiles == null || !uploadFiles.Any())
            {
                return BadRequest(new { message = "No files received. Please select a .dcm or .zip file." });
            }
            
            if (!TryGetUserId(out var userId)) return Unauthorized();

            try
            {
                var result = await _pacsService.ImportDicomEnterpriseAsync(radiologyStudyId, uploadFiles, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{radiologyStudyId:guid}/import-enterprise")]
        public async Task<IActionResult> ImportDicomEnterprise(Guid radiologyStudyId, [FromForm] List<IFormFile> files)
        {
            IReadOnlyList<IFormFile> uploadFiles = (files != null && files.Any()) ? files : Request.Form.Files.ToList();
            if (uploadFiles == null || !uploadFiles.Any())
            {
                return BadRequest(new { message = "No files received. Please select a .dcm or .zip file." });
            }
            
            if (!TryGetUserId(out var userId)) return Unauthorized();

            try
            {
                var result = await _pacsService.ImportDicomEnterpriseAsync(radiologyStudyId, uploadFiles, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{radiologyStudyId:guid}/acquire")]
        public async Task<IActionResult> AcquirePacsStudy(Guid radiologyStudyId)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            try
            {
                var result = await _pacsService.AcquirePacsStudyAsync(radiologyStudyId, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("instances/{instanceId:guid}/file")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDicom(Guid instanceId)
        {
            TryGetUserId(out var userId);
            
            try
            {
                var (stream, contentType) = await _pacsService.GetDicomStreamAsync(instanceId, userId);
                var fileDownloadName = $"{instanceId}.dcm";
                return File(stream, contentType, fileDownloadName);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (FileNotFoundException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{radiologyStudyId:guid}/reindex")]
        [Authorize(Roles = "Admin,Radiologist")]
        public async Task<IActionResult> ReindexStudy(Guid radiologyStudyId)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            var result = await _pacsService.ReindexStudyAsync(radiologyStudyId, userId);
            return Ok(result);
        }

        [HttpGet("studies/{radiologyStudyId:guid}/series-tree")]
        [Authorize(Roles = "Admin,Radiologist,XRayTech,MriTech,CTTech,USTech,Pathologist,LabTech,Technician")]
        public async Task<IActionResult> GetSeriesTree(Guid radiologyStudyId)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            
            var request = HttpContext.Request;
            var apiBaseUrl = $"{request.Scheme}://{request.Host.ToUriComponent()}";

            var result = await _pacsService.GetSeriesTreeAsync(radiologyStudyId, userId, apiBaseUrl);
            
            return Ok(result);
        }

        [HttpGet("studies/{radiologyStudyId:guid}/download-zip")]
        [Authorize(Roles = "Admin,SuperAdmin,Radiologist,XRayTech,MriTech,CTTech,USTech,Pathologist,LabTech,Technician,Receptionist,Typist")]
        public async Task<IActionResult> DownloadStudyZip(Guid radiologyStudyId)
        {
            TryGetUserId(out var userId);
            try
            {
                var (zipBytes, fileName) = await _pacsService.CreateStudyZipAsync(radiologyStudyId, userId);
                return File(zipBytes, "application/zip", fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
