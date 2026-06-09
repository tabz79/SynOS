using Microsoft.AspNetCore.Mvc;
using SynOS.Services;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using SynOS.Models.DTOs;
using System.Security.Claims;
using SynOS.Services.Storage; // Added for IFileStorageService

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/radiology")]
    [Authorize]
    public class RadiologyController : ControllerBase
    {
        private readonly IRadiologyService _radiologyService;
        private readonly IFileStorageService _fileStorageService;

        public RadiologyController(IRadiologyService radiologyService, IFileStorageService fileStorageService)
        {
            _radiologyService = radiologyService;
            _fileStorageService = fileStorageService;
        }

        [HttpPost("studies/create-for-visit")]
        [Authorize(Roles = "Admin,Technician,XRayTech,MriTech,CTTech,USTech,Receptionist")]
        
        public async Task<IActionResult> CreateStudiesForVisit([FromBody] CreateRadiologyStudiesRequestDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var studies = await _radiologyService.CreateRadiologyStudiesForVisitAsync(request.VisitId, userId);
            return Ok(studies);
        }

        [HttpGet("studies/queue")]
        [Authorize(Roles = "Admin,Technician,XRayTech,MriTech,CTTech,USTech,Radiologist,Typist")]
        public async Task<IActionResult> GetTechnicianQueue([FromQuery] string[] status)
        {
            var queue = await _radiologyService.GetTechnicianQueueAsync(status);
            return Ok(queue);
        }

        [HttpPost("studies/assign")]
        [Authorize(Roles = "Admin,Technician,XRayTech,MriTech,CTTech,USTech")]
        
        public async Task<IActionResult> AssignStudy([FromBody] AssignStudyRequestDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            await _radiologyService.AssignStudyAsync(request.StudyId, userId);
            return NoContent();
        }

        [HttpPost("studies/{studyId}/attachments")]
        [Authorize(Roles = "Admin,Technician,XRayTech,MriTech,CTTech,USTech")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 524288000)]
        public async Task<IActionResult> UploadAttachment(Guid studyId, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded.");
            }

            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();
            
            // Define constraints
            const long maxFileSize = 500 * 1024 * 1024; // 500 MB
            var allowedMimeTypes = new HashSet<string> { "application/pdf", "application/zip", "application/x-zip-compressed" };

            if (!allowedMimeTypes.Contains(file.ContentType))
            {
                return BadRequest($"Invalid file type. Allowed types are: {string.Join(", ", allowedMimeTypes)}");
            }

            string attachmentType = file.ContentType switch
            {
                "application/pdf" => "ImagePdf",
                "application/zip" => "ImageZip",
                "application/x-zip-compressed" => "ImageZip",
                _ => "Unknown"
            };

            // The IFileStorageService will handle the actual saving
            var fileUrl = await _fileStorageService.SaveFileAsync(file, allowedMimeTypes, maxFileSize, "radiology-attachments");

            var attachmentDto = await _radiologyService.AddAttachmentToStudyAsync(studyId, userId, file.FileName, fileUrl, attachmentType);

            return Ok(attachmentDto);
        }

        [HttpPost("studies/set-external-mapping")]
        [Authorize(Roles = "Admin,Technician,XRayTech,MriTech,CTTech,USTech")]
        
        public async Task<IActionResult> SetExternalMapping([FromBody] RadiologyStudyExternalMappingDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            await _radiologyService.SetExternalMappingAsync(request, userId);
            return NoContent();
        }

        [HttpPost("studies/mark-imaging-completed")]
        [Authorize(Roles = "Admin,Technician,XRayTech,MriTech,CTTech,USTech")]
        
        public async Task<IActionResult> MarkImagingCompleted([FromBody] AssignStudyRequestDto request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            await _radiologyService.MarkImagingCompletedAsync(request.StudyId, userId);
            return NoContent();
        }
    }
}
