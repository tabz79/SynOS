using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Catalog;
using SynOS.Models.Enums;
using SynOS.Services;
using SynOS.Services.Operational;
using SynOS.Services.Phlebotomy;
using SynOS.Services.Reporting;

namespace SynOS.Services.Dev
{
    public class DevWorkflowSimulator : IDevWorkflowSimulator
    {
        private readonly SynOSDbContext _db;
        private readonly IPatientService _patientService;
        private readonly IReceptionFlowService _receptionFlowService;
        private readonly IPhlebotomyService _phlebotomyService;
        private readonly IResultService _resultService;
        private readonly IProcessingService _processingService;
        private readonly IReportService _reportService;
        private readonly IReportingService _reportingEngine;
        private readonly ISimulatedUserScopeFactory _scopeFactory;
        private readonly ILogger<DevWorkflowSimulator> _logger;

        public DevWorkflowSimulator(
            SynOSDbContext db,
            IPatientService patientService,
            IReceptionFlowService receptionFlowService,
            IPhlebotomyService phlebotomyService,
            IResultService resultService,
            IProcessingService processingService,
            IReportService reportService,
            IReportingService reportingEngine,
            ISimulatedUserScopeFactory scopeFactory,
            ILogger<DevWorkflowSimulator> logger)
        {
            _db = db;
            _patientService = patientService;
            _receptionFlowService = receptionFlowService;
            _phlebotomyService = phlebotomyService;
            _resultService = resultService;
            _processingService = processingService;
            _reportService = reportService;
            _reportingEngine = reportingEngine;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public async Task<SimulateDevStateResponse> SimulateToStateAsync(SimulateDevStateRequest request)
        {
            var response = new SimulateDevStateResponse { TargetState = request.TargetState };
            
            try
            {
                // 1. RECEPTION STAGE
                var receptionUser = await GetUserByEmailAsync("reception@lab.com");
                Guid visitId = Guid.Empty;
                using (var scope = _scopeFactory.Create(receptionUser, "Receptionist"))
                {
                    var patient = await _db.Patients.FirstOrDefaultAsync(p => p.CurrentPhoneNumber == "9999999999");
                    
                    if (patient == null)
                    {
                        var patientDto = await _patientService.CreatePatientAsync(new PatientCreateDto
                        {
                            FirstName = "Simulated",
                            LastName = "Patient " + DateTime.Now.Ticks.ToString().Substring(10),
                            Gender = "Male",
                            DateOfBirth = DateTime.Now.AddYears(-30),
                            CurrentPhoneNumber = "9999999999"
                        });
                        patient = await _db.Patients.FindAsync(patientDto.PatientId);
                    }
                    
                    if (patient == null) throw new Exception("Failed to create or find simulator patient.");

                    var testCode = request.TestCode ?? "LFT";
                    var startVisitRequest = new ReceptionStartVisitRequest
                    {
                        PatientId = patient.PatientId,
                        Dept = "Pathology",
                        TestCodes = new[] { testCode }
                    };

                    var visitResponse = await _receptionFlowService.StartVisitAsync(startVisitRequest, receptionUser.UserId);
                    visitId = visitResponse.VisitId;

                    // Complete Payment to trigger work items (Specimen Plan + Assignment)
                    await _receptionFlowService.CompletePaymentAsync(new ReceptionCompletePaymentRequest
                    {
                        VisitId = visitId,
                        Amount = visitResponse.Invoice?.Total ?? 0,
                        Method = "Cash",
                        ReceiptNo = "SIM-" + DateTime.Now.Ticks.ToString().Substring(10)
                    }, receptionUser.UserId);
                    
                    response.Logs.Add(new SimulationLogEntry { Stage = "Reception", Status = "SUCCESS", Message = $"Patient created (MRN: {patient.MRN}), Visit started & paid (ID: {visitId})" });
                }

                // 2. PHLEBOTOMY STAGE
                var phleboUser = await GetUserByEmailAsync("phlebo@lab.com");
                using (var scope = _scopeFactory.Create(phleboUser, "Phlebotomist"))
                {
                    var assignment = await _db.WorkAssignments
                        .Where(a => a.SourceReferenceId == visitId && a.Status == WorkAssignmentStatus.PendingClaim)
                        .FirstOrDefaultAsync();

                    if (assignment == null) throw new Exception("Phlebotomy assignment not found.");

                    await _phlebotomyService.ClaimAssignmentAsync(assignment.AssignmentId);
                    await _phlebotomyService.CollectAssignmentAsync(assignment.AssignmentId);
                    
                    response.Logs.Add(new SimulationLogEntry { Stage = "Phlebotomy", Status = "SUCCESS", Message = "Sample collected and transitioned to Lab Processing." });
                }

                // 3. WORKBENCH STAGE
                var test = await _db.CatalogTests.Include(t => t.Parameters).FirstOrDefaultAsync(t => t.TestCode == (request.TestCode ?? "LFT"));
                if (test == null) throw new Exception("Test catalog not found.");

                var techUser = test.DepartmentCode.Contains("BIO") 
                    ? await GetUserByEmailAsync("bio.tech@synos.lab")
                    : await GetUserByEmailAsync("hemtech@synos.lab");

                using (var scope = _scopeFactory.Create(techUser, "LabTech"))
                {
                    var assignment = await _db.ProcessingAssignments
                        .Where(a => a.Specimen.VisitId == visitId && a.DepartmentCode == test.DepartmentCode && a.Status == ProcessingAssignmentStatus.Pending)
                        .FirstOrDefaultAsync();

                    if (assignment == null) throw new Exception("Processing assignment not found.");

                    await _processingService.ClaimAssignmentAsync(assignment.ProcessingAssignmentId);

                    // Dynamically enter results for ALL orders associated with this specimen
                    var ordersForSpecimen = await _db.Orders
                        .Where(o => o.SpecimenId == assignment.SpecimenId)
                        .ToListAsync();

                    if (!ordersForSpecimen.Any()) throw new Exception("No orders found for the claimed specimen.");

                    foreach (var o in ordersForSpecimen)
                    {
                        var ct = await _db.CatalogTests
                            .Include(ct => ct.Parameters)
                            .FirstOrDefaultAsync(ct => ct.TestCode == o.TestCode);
                            
                        if (ct == null || ct.Parameters == null || !ct.Parameters.Any()) continue;

                        var results = new List<ParameterResultDto>();
                        foreach (var param in ct.Parameters)
                        {
                            results.Add(new ParameterResultDto
                            {
                                OrderId = o.OrderId,
                                ParameterCode = param.ParameterCode,
                                Value = GenerateRealisticValue(param, param.ParameterCode.ToUpper().Contains("ALT") || param.ParameterCode.ToUpper().Contains("SGPT") || param.ParameterCode.ToUpper().Contains("BIL_T"))
                            });
                        }

                        await _resultService.EnterResultsAsync(techUser.UserId, new ResultEntryRequestDto
                        {
                            OrderId = o.OrderId,
                            SpecimenId = assignment.SpecimenId,
                            Results = results
                        });
                    }

                    await _processingService.CompleteAssignmentAsync(assignment.ProcessingAssignmentId);
                    
                    response.Logs.Add(new SimulationLogEntry { Stage = "Workbench", Status = "SUCCESS", Message = $"Results entered by {techUser.Name} and submitted for reporting." });
                }

                // 4. TYPIST STAGE
                var typistUser = await GetUserByEmailAsync("typist1@lab.com");
                using (var scope = _scopeFactory.Create(typistUser, "Typist"))
                {
                    var report = await _db.Reports
                        .Include(r => r.PathologyReport)
                        .Where(r => r.VisitId == visitId && r.Status == "Draft")
                        .FirstOrDefaultAsync();

                    if (report == null) throw new Exception("Report draft not found.");

                    // Ensure PathologyReport entity exists
                    if (report.PathologyReport == null)
                    {
                        report.PathologyReport = new PathologyReport { ReportId = report.ReportId, OrderId = report.SourceId };
                        await _db.PathologyReports.AddAsync(report.PathologyReport);
                    }

                    // Dynamic Interpretation based on flags
                    var dbResults = await _db.Results
                        .Where(r => r.OrderId == report.SourceId || r.Order.ParentOrderId == report.SourceId)
                        .ToListAsync();
                    
                    bool hasHighEnzymes = dbResults.Any(r => 
                        (r.ParameterCode.Contains("ALT") || r.ParameterCode.Contains("SGPT")) && 
                        double.TryParse(r.Value, out var val) && val > 40);

                    report.PathologyReport.Interpretation = hasHighEnzymes 
                        ? "Liver enzymes (ALT/SGPT) are significantly elevated. Findings suggest hepatocellular injury. Clinical correlation with patient's history and further diagnostic imaging (USG Abdomen) is recommended."
                        : "Liver Function Test parameters are within normal biological reference ranges. No acute hepatocellular dysfunction noted at this time.";

                    report.Status = "ReadyForVerification";
                    report.UpdatedAt = DateTimeOffset.UtcNow;
                    await _db.SaveChangesAsync();

                    response.ReportId = report.ReportId;
                    response.Logs.Add(new SimulationLogEntry { Stage = "Typist", Status = "SUCCESS", Message = "Report formatted with dynamic interpretation and submitted to Pathologist queue." });
                }

                if (request.TargetState == "READY_FOR_VERIFICATION") return response;

                // 5. PATHOLOGIST STAGE
                var pathologistUser = await GetUserByEmailAsync("pathologist@lab.com");
                using (var scope = _scopeFactory.Create(pathologistUser, "Pathologist"))
                {
                    var report = await _db.Reports
                        .Where(r => r.VisitId == visitId && r.Status == "ReadyForVerification")
                        .FirstOrDefaultAsync();

                    if (report == null) throw new Exception("Report ready for verification not found.");

                    await _reportService.SignReportAsync(report.ReportId, pathologistUser.UserId);
                    
                    response.Logs.Add(new SimulationLogEntry { Stage = "Pathologist", Status = "SUCCESS", Message = "Report digitally signed using doctor's forensic identity. Final snapshot frozen." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Simulation failed at stage {Stage}", response.Logs.LastOrDefault()?.Stage ?? "Initialization");
                response.Logs.Add(new SimulationLogEntry 
                { 
                    Stage = response.Logs.LastOrDefault()?.Stage ?? "Initialization", 
                    Status = "FAILED", 
                    Message = ex.Message 
                });
            }

            return response;
        }

        private async Task<User> GetUserByEmailAsync(string email)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) throw new Exception($"User {email} not found. Please ensure seed data is applied.");
            return user;
        }

        private string GenerateRealisticValue(CatalogParameter param, bool forceAbnormal)
        {
            if (param.DataType == "Enum")
            {
                var options = param.EnumOptions?.Split('|') ?? new[] { "Negative", "Positive" };
                return forceAbnormal ? options.Last() : options.First();
            }

            if (param.DataType == "Numeric" || !string.IsNullOrEmpty(param.ReferenceRange))
            {
                // Simple parser for "10-40" or "< 6.0"
                var range = param.ReferenceRange ?? "0-100";
                if (range.Contains("-"))
                {
                    var parts = range.Split('-');
                    if (double.TryParse(parts[0], out double min) && double.TryParse(parts[1], out double max))
                    {
                        return forceAbnormal ? (max + 10).ToString() : ((min + max) / 2).ToString();
                    }
                }
                else if (range.Contains("<"))
                {
                    var part = range.Replace("<", "").Trim();
                    if (double.TryParse(part, out double max))
                    {
                        return forceAbnormal ? (max + 2).ToString() : (max / 2).ToString();
                    }
                }
            }

            return "1.0"; // Fallback
        }
    }
}
