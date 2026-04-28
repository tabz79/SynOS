using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs.Phlebotomy;
using SynOS.Services.Phlebotomy;
using SynOS.Services.Utils;
using SynOS.Models.DTOs;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SynOS.Services.Operational;
using SynOS.Data;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/phlebotomy")]
    [Authorize] // Requires valid JWT
    public class PhlebotomyController : ControllerBase
    {
        private readonly IPhlebotomyService _phlebotomyService;
        private readonly SynOSDbContext _db;
        private readonly INotifier _notifier;

        public PhlebotomyController(IPhlebotomyService phlebotomyService, SynOSDbContext db, INotifier notifier)
        {
            _phlebotomyService = phlebotomyService;
            _db = db;
            _notifier = notifier;
        }

        [HttpPost("claim")]
        public async Task<IActionResult> ClaimAssignment([FromBody] ClaimAssignmentRequest request)
        {
            if (request == null || request.AssignmentId == Guid.Empty)
            {
                return BadRequest("Invalid assignment ID");
            }

            var result = await _phlebotomyService.ClaimAssignmentAsync(request.AssignmentId);

            return result switch
            {
                ClaimResult.Success => Ok(new { success = true }),
                ClaimResult.NotFound => NotFound("Assignment not found"),
                ClaimResult.AlreadyClaimed => Conflict("Assignment already claimed or unavailable"),
                ClaimResult.InvalidBranch => Forbid(), // Branch mismatch
                ClaimResult.NotOperationalMode => Forbid(), // Must be in operational mode
                ClaimResult.NoOperationalResource => Unauthorized("No operational resource found for user"),
                _ => StatusCode(500, "An unexpected error occurred")
            };
        }
        [HttpGet("plan/{visitId}")]
        public async Task<IActionResult> GetCollectionPlan(Guid visitId)
        {
            var plan = await _phlebotomyService.GetCollectionPlanAsync(visitId);
            if (plan == null) return NotFound("Visit not found or already collected");
            return Ok(plan);
        }

        [HttpGet("collection-summary/{visitId}")]
        public async Task<IActionResult> GetCollectionSummary(Guid visitId)
        {
            var summary = await _phlebotomyService.GetCollectionSummaryAsync(visitId);
            if (summary == null) return NotFound("Visit not found");
            return Ok(summary);
        }

        [HttpPost("collect")]
        public async Task<IActionResult> Collect([FromBody] CollectAssignmentRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _phlebotomyService.CollectAssignmentAsync(request.AssignmentId);

            return result switch
            {
                CollectResult.Success => Ok(new { message = "Specimens collected successfully." }),
                CollectResult.NotFound => NotFound("Assignment not found."),
                CollectResult.NotOperationalMode => BadRequest("User is not in Operational Mode."),
                CollectResult.NoOperationalResource => BadRequest("Operational Resource not found."),
                CollectResult.Unauthorized => Forbid(),
                CollectResult.InvalidState => Conflict("Assignment is not in 'Assigned' state."),
                CollectResult.NoOrdersFound => BadRequest("No pending orders found for this visit."),
                CollectResult.MissingBranchConfiguration => UnprocessableEntity(new { 
                    error = "Branch configuration missing", 
                    message = "Branch Code must be configured to generate accession numbers." 
                }),
                _ => StatusCode(500, "An unexpected error occurred.")
            };
        }

        [HttpPost("print-labels")]
        public async Task<IActionResult> PrintLabels([FromBody] PrintLabelsRequest request)
        {
            if (request == null || request.VisitId == Guid.Empty) return BadRequest("Invalid VisitId");

            var visit = await _db.Visits
                .Include(v => v.Patient)
                .Include(v => v.Specimens).ThenInclude(s => s.Orders).ThenInclude(o => o.Test)
                .FirstOrDefaultAsync(v => v.VisitId == request.VisitId);

            if (visit == null) return NotFound("Visit not found");

            var labelDataList = new List<ZplLabelDataDto>();
            var patientName = !string.IsNullOrEmpty(visit.Patient.DisplayName) 
                ? visit.Patient.DisplayName 
                : $"{visit.Patient.FirstName} {visit.Patient.LastName}";

            if (visit.Specimens.Any())
            {
                foreach (var specimen in visit.Specimens)
                {
                    labelDataList.Add(new ZplLabelDataDto
                    {
                        BarcodePayload = specimen.AccessionNumber,
                        PatientName = patientName,
                        TokenNumber = visit.Token,
                        TubeType = specimen.TubeName ?? specimen.TubeCode ?? "UNKNOWN",
                        TestName = string.Join(", ", specimen.Orders.Select(o => o.Test.TestName).Distinct())
                    });
                }
            }
            else
            {
                // Load Reserved Accessions
                var reserved = await _db.WorkAssignmentAccessions
                    .Where(ra => ra.WorkAssignment.SourceReferenceId == request.VisitId)
                    .ToListAsync();

                if (!reserved.Any()) return BadRequest("No labels reserved or specimens collected for this visit.");

                // For reserved ones, we need to find the approximate test list per tube
                // (This is a bit complex since many tests share a tube, we'll just show Tube and SpecimenType)
                foreach (var ra in reserved)
                {
                    labelDataList.Add(new ZplLabelDataDto
                    {
                        BarcodePayload = ra.AccessionNumber,
                        PatientName = patientName,
                        TokenNumber = visit.Token,
                        TubeType = ra.TubeCode,
                        TestName = ra.SpecimenType // Fallback when orders aren't linked yet
                    });
                }
            }

            foreach (var data in labelDataList)
            {
                var zpl = ZplLabelGenerator.GenerateLabel(data);
                await _notifier.NotifyPrintJobAsync(visit.BranchId.ToString(), "BarcodeZebra", zpl);
            }

            return Ok(new { success = true, labelsCount = labelDataList.Count });
        }
    }

    public class PrintLabelsRequest
    {
        public Guid VisitId { get; set; }
    }
}
