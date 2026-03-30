using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Services.Reporting;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
using SynOS.Data;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using SynOS.Models.Exceptions;

namespace SynOS.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/v1/debug")]
    public class DebugController : ControllerBase
    {
        private readonly IReportingService _reportingService;

        public DebugController(IReportingService reportingService)
        {
            _reportingService = reportingService;
        }

        [HttpGet("ping")]
        [AllowAnonymous]
        public IActionResult Ping()
        {
            return Ok(new { Message = "DebugController is accessible", Time = DateTime.UtcNow });
        }

        [HttpGet("list-reports")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ListReports([FromServices] SynOS.Data.SynOSDbContext context)
        {
            var reports = await context.Reports
                .OrderByDescending(r => r.CreatedAt)
                .Take(20)
                .Select(r => new { r.ReportId, r.Department, r.Status, r.CreatedAt })
                .ToListAsync();
            return Ok(reports);
        }

        [HttpPost("seed-sample-report")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SeedSampleReport([FromServices] SynOS.Data.SynOSDbContext context)
        {
            // Get current user ID to avoid FK conflicts
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim)) 
                return Unauthorized("User ID claim not found in token");
            
            var userId = Guid.Parse(userIdClaim);

            // 1. Create Patient
            var patient = new Patient
            {
                PatientId = Guid.NewGuid(),
                MRN = "P" + new Random().Next(1000, 9999),
                FirstName = "Debug",
                LastName = "Patient",
                Gender = "Male",
                DateOfBirth = DateTime.UtcNow.AddYears(-30)
            };
            context.Patients.Add(patient);

            // 2. Create Visit
            var branchId = DbInitializer.DefaultBranchId;
            var visit = new Visit
            {
                VisitId = Guid.NewGuid(),
                PatientId = patient.PatientId,
                Token = "T" + new Random().Next(100, 999),
                BranchId = branchId,
                Status = SynOS.Models.Enums.VisitStatus.Completed,
                Department = "Pathology",
                TokenDate = DateTime.Now
            };
            context.Visits.Add(visit);

            // 3. Use LFT Test from Catalog
            var testCode = "LFT";
            var test = await context.Tests.FirstOrDefaultAsync(t => t.TestCode == testCode);
            if (test == null)
            {
                test = new Test
                {
                    TestId = Guid.NewGuid(),
                    TestCode = testCode,
                    TestName = "Liver Function Test",
                    Category = "Pathology"
                };
                context.Tests.Add(test);
            }

            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                TestId = test.TestId,
                TestCode = testCode,
                Status = SynOS.Models.Enums.OrderStatus.Active,
                Department = "Pathology",
                Price = 600
            };
            context.Orders.Add(order);

            // 4. Create Results for LFT components
            // Note: BIL_I and GLOB will be calculated by the ReportingService if configured as calculated in Catalog
            context.Results.Add(new Result { ResultId = Guid.NewGuid(), OrderId = order.OrderId, ParameterCode = "BIL_T", Value = "1.2", Status = "Verified", EnteredByUserId = userId });
            context.Results.Add(new Result { ResultId = Guid.NewGuid(), OrderId = order.OrderId, ParameterCode = "BIL_I", Value = "0.8", Status = "Verified", EnteredByUserId = userId });
            context.Results.Add(new Result { ResultId = Guid.NewGuid(), OrderId = order.OrderId, ParameterCode = "TP", Value = "7.5", Status = "Verified", EnteredByUserId = userId });
            context.Results.Add(new Result { ResultId = Guid.NewGuid(), OrderId = order.OrderId, ParameterCode = "ALB", Value = "4.2", Status = "Verified", EnteredByUserId = userId });
            
            // 5. Create Report
            var report = new Report
            {
                ReportId = Guid.NewGuid(),
                VisitId = visit.VisitId,
                PatientId = patient.PatientId,
                Department = "Pathology",
                SourceType = "Order",
                SourceId = order.OrderId,
                Status = "Draft",
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.Reports.Add(report);

            await context.SaveChangesAsync();
            return Ok(new { ReportId = report.ReportId, Message = "LFT Sample data seeded successfully using Catalog codes." });
        }

        /// <summary>
        /// Inspect the fully assembled report structure before it goes to QuestPDF.
        /// Verify groupings, sorting, flags, and methodologies here.
        /// </summary>
        [HttpGet("report-structure/{reportId}")]
        [Authorize(Roles = "Admin,Pathologist")]
        public async Task<IActionResult> GetReportStructure(Guid reportId, [FromQuery] bool forceFresh = false)
        {
            try
            {
                var structure = forceFresh 
                    ? await _reportingService.PreviewReportStructureAsync(reportId)
                    : await _reportingService.GetReportStructureAsync(reportId);
                    
                return Ok(structure);
            }
            catch (SnapshotIntegrityException ex)
            {
                return Conflict(new { code = ex.Code, message = ex.Message, reportVersionId = ex.ReportVersionId });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, new { Error = ex.Message, Inner = inner, StackTrace = ex.StackTrace });
            }
        }

        [HttpPost("verify-hard-fail")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> VerifyHardFail([FromServices] SynOSDbContext context)
        {
            // 1. Create a corrupt snapshot
            var reportId = Guid.NewGuid();
            var visitId = Guid.NewGuid();
            var orderId = Guid.NewGuid();
            
            var report = new Report { ReportId = reportId, VisitId = visitId, SourceId = orderId, SourceType = "Order", Status = "ReadyForSignature", CurrentVersion = 1 };
            var version = new ReportVersion { ReportVersionId = Guid.NewGuid(), ReportId = reportId, VersionNumber = 1 };
            var snapshot = new ReportSnapshot { ReportVersionId = version.ReportVersionId, SnapshotJson = "{ \"corrupted\": true, " }; // Missing closing brace
            
            context.Reports.Add(report);
            context.ReportVersions.Add(version);
            context.ReportSnapshots.Add(snapshot);
            await context.SaveChangesAsync();

            try
            {
                await _reportingService.GetReportStructureAsync(reportId);
                return BadRequest("Verification Failed: System should have thrown SnapshotIntegrityException but returned data.");
            }
            catch (SnapshotIntegrityException ex)
            {
                return Ok(new { Status = "Success", Message = "System correctly failed-hard on corrupted snapshot.", ExceptionCode = ex.Code });
            }
            finally
            {
                // Cleanup
                context.ReportSnapshots.Remove(snapshot);
                context.ReportVersions.Remove(version);
                context.Reports.Remove(report);
                await context.SaveChangesAsync();
            }
        }

        [HttpPost("verify-concurrency")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> VerifyConcurrency([FromServices] SynOSDbContext context)
        {
            // 1. Setup
            var reportId = Guid.NewGuid();
            var report = new Report { ReportId = reportId, VisitId = Guid.NewGuid(), SourceId = Guid.NewGuid(), SourceType = "Order", Status = "ReadyForSignature", CurrentVersion = 1 };
            var version = new ReportVersion { ReportVersionId = Guid.NewGuid(), ReportId = reportId, VersionNumber = 1 };
            var snapshot = new ReportSnapshot { ReportVersionId = version.ReportVersionId, SnapshotJson = "{}" };
            
            context.Reports.Add(report);
            context.ReportVersions.Add(version);
            context.ReportSnapshots.Add(snapshot);
            await context.SaveChangesAsync();

            try
            {
                // Start two racing updates
                var task1 = _reportingService.CreateSnapshotAsync(version.ReportVersionId, overwrite: true);
                var task2 = _reportingService.CreateSnapshotAsync(version.ReportVersionId, overwrite: true);

                await Task.WhenAll(task1, task2);
                return BadRequest("Verification Failed: Both tasks succeeded. Concurrency guard (RowVersion) failed to catch collision.");
            }
            catch (DbUpdateConcurrencyException)
            {
                return Ok(new { Status = "Success", Message = "Concurrency collision detected and blocked by RowVersion." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Unexpected error", Exception = ex.GetType().Name, Error = ex.Message });
            }
            finally
            {
                context.ReportSnapshots.Remove(snapshot);
                context.ReportVersions.Remove(version);
                context.Reports.Remove(report);
                await context.SaveChangesAsync();
            }
        }
    }
}
