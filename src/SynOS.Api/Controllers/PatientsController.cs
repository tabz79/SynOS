using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        private readonly SynOS.Data.SynOSDbContext _context;

        public PatientsController(IPatientService patientService, IMapper mapper, SynOS.Data.SynOSDbContext context)
        {
            _patientService = patientService;
            _mapper = mapper;
            _context = context;
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
        public async Task<ActionResult<IEnumerable<PatientDto>>> SearchPatients([FromQuery] string? q = null, [FromQuery] int limit = 20, [FromQuery] int offset = 0)
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

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePatient(Guid id, [FromBody] PatientUpdateDto updateDto)
        {
            if (updateDto == null || !ModelState.IsValid) return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid? actorUserId = null;
            if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedId))
            {
                actorUserId = parsedId;
            }

            var updatedPatient = await _patientService.UpdatePatientAsync(id, updateDto, actorUserId);
            if (updatedPatient == null) return NotFound();
            return Ok(updatedPatient);
        }

        [HttpGet("{id}/visits")]
        public async Task<IActionResult> GetPatientVisits(Guid id)
        {
            var visits = await _context.Visits
                .Where(v => v.PatientId == id)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.Payments)
                .OrderByDescending(v => v.TokenDate)
                .ToListAsync();

            var result = visits.Select(v => {
                var total = v.Invoices.Sum(i => i.Total);
                var paid = v.Invoices.Sum(i => i.Payments.Sum(p => p.Amount));
                return new
                {
                    v.VisitId,
                    TokenNumber = v.Token,
                    v.TokenDate,
                    Status = v.Status.ToString(),
                    TotalAmount = total,
                    AmountPaid = paid,
                    OutstandingBalance = total - paid,
                    Tests = v.Orders.Select(o => new
                    {
                        o.OrderId,
                        o.TestCode,
                        TestName = o.Test != null ? o.Test.TestName : o.TestCode,
                        Status = o.Status.ToString()
                    }).ToList()
                };
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}/financials")]
        public async Task<IActionResult> GetPatientFinancials(Guid id)
        {
            var invoices = await _context.Invoices
                .Where(i => i.Visit != null && i.Visit.PatientId == id)
                .Include(i => i.Payments)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var invoiceResults = invoices.Select(i => {
                var paid = i.Payments.Sum(p => p.Amount);
                return new
                {
                    i.InvoiceId,
                    InvoiceNumber = i.InvoiceId.ToString().Substring(0, 8).ToUpper(),
                    GrossAmount = i.GrossAmount,
                    i.TaxAmount,
                    i.DiscountAmount,
                    TotalAmount = i.Total,
                    PaidAmount = paid,
                    OutstandingAmount = i.Total - paid,
                    i.Status,
                    i.CreatedAt
                };
            }).ToList();

            var payments = await _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                .Where(p => p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.PatientId == id)
                .OrderByDescending(p => p.ReceivedAt)
                .Select(p => new
                {
                    p.PaymentId,
                    ReceiptNumber = p.ReceiptNo,
                    p.Amount,
                    PaymentMode = p.Method,
                    ReceivedByUserId = p.ReceivedByUserId,
                    CreatedAt = p.ReceivedAt
                })
                .ToListAsync();

            return Ok(new
            {
                invoices = invoiceResults,
                payments
            });
        }
    }

    public class MergeRequestDto
    {
        public Guid TargetId { get; set; }
        public Guid SourceId { get; set; }
    }
}
