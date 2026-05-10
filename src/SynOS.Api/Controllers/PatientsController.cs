using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using SynOS.Models.DTOs;
using SynOS.Services;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize(Policy = "ReceptionPolicy")]
    public class PatientsController : ControllerBase
    {
        private readonly IPatientService _patientService;
        private readonly IMapper _mapper;

        public PatientsController(IPatientService patientService, IMapper mapper)
        {
            _patientService = patientService;
            _mapper = mapper;
        }

        [HttpPost]
        
        public async Task<IActionResult> CreatePatient([FromBody] PatientCreateDto patientDto, [FromHeader(Name = "Idempotency-Key")] string idempotencyKey)
        {
            // In a real implementation, the idempotencyKey would be used to prevent duplicate requests.
            // For now, we'll just accept it.
            var patient = await _patientService.CreatePatientAsync(patientDto);
            return CreatedAtAction(nameof(GetPatientById), new { id = patient.PatientId }, new { patient.PatientId });
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PatientDto>>> SearchPatients([FromQuery] string q, [FromQuery] int limit = 20, [FromQuery] int offset = 0)
        {
            var patients = await _patientService.SearchPatientsAsync(q, limit, offset);
            return Ok(patients);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PatientDto>> GetPatientById(Guid id)
        {
            var patient = await _patientService.GetPatientByIdAsync(id);
            if (patient == null) return NotFound();
            return Ok(patient);
        }

        [HttpGet("{id}/phone-history")]
        public async Task<IActionResult> GetPatientPhoneHistory(Guid id)
        {
            var history = await _patientService.GetPatientPhoneHistoryAsync(id);
            return Ok(history);
        }

        [HttpGet("{id}/possible-duplicates")]
        public async Task<IActionResult> FindPossibleDuplicates(Guid id)
        {
            var duplicates = await _patientService.FindPossibleDuplicatesAsync(id);
            return Ok(duplicates);
        }

        [HttpPost("merge-preview")]
        [Authorize(Policy = "ReceptionPolicy")]
        
        public async Task<IActionResult> MergePreview([FromBody] MergeRequestDto request)
        {
            var preview = await _patientService.GetMergePreviewAsync(request.TargetId, request.SourceId);
            return Ok(preview);
        }

        [HttpPost("merge")]
        [Authorize(Policy = "ReceptionPolicy")]
        
        public async Task<IActionResult> Merge([FromBody] MergeRequestDto request, [FromHeader(Name = "Idempotency-Key")] string idempotencyKey)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "User ID not found or invalid." });
            }
            var success = await _patientService.MergePatientsAsync(request.TargetId, request.SourceId, userId);
            if (!success) return BadRequest(new { code = "MERGE_FAILED", message = "Patient merge failed." });
            return Ok();
        }
    }

    public class MergeRequestDto
    {
        public Guid TargetId { get; set; }
        public Guid SourceId { get; set; }
    }
}
