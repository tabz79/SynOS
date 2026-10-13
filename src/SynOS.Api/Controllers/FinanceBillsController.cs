using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/finance/bills")]
    public class FinanceBillsController : ControllerBase
    {
        private readonly SynOSDbContext _context;

        public FinanceBillsController(SynOSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetFinanceBills(
            [FromQuery] Guid? branchId = null,
            [FromQuery] string? department = null,
            [FromQuery] string? modality = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? preset = null,
            [FromQuery] string? status = null,
            [FromQuery] string? category = null)
        {
            var now = DateTime.UtcNow;

            // Handle date presets if provided
            if (!string.IsNullOrEmpty(preset))
            {
                var p = preset.Trim().ToLower();
                if (p == "today")
                {
                    startDate = now.Date;
                    endDate = now.Date.AddDays(1).AddTicks(-1);
                }
                else if (p == "yesterday")
                {
                    startDate = now.Date.AddDays(-1);
                    endDate = now.Date.AddTicks(-1);
                }
                else if (p == "this week" || p == "week")
                {
                    startDate = now.Date.AddDays(-7);
                    endDate = now.Date.AddDays(1).AddTicks(-1);
                }
                else if (p == "this month" || p == "month")
                {
                    startDate = new DateTime(now.Year, now.Month, 1);
                    endDate = now.Date.AddDays(1).AddTicks(-1);
                }
            }

            var query = _context.Invoices
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Patient)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Branch)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.ReferralPartner)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Orders)
                        .ThenInclude(o => o.Test)
                            .ThenInclude(t => t.ModalityMaster)
                .Include(i => i.Payments)
                .AsNoTracking();

            // Date filtering
            if (startDate.HasValue)
            {
                query = query.Where(i => i.CreatedAt >= startDate.Value);
            }
            if (endDate.HasValue)
            {
                query = query.Where(i => i.CreatedAt <= endDate.Value);
            }

            // Branch filtering
            if (branchId.HasValue && branchId.Value != Guid.Empty)
            {
                query = query.Where(i => i.Visit != null && i.Visit.BranchId == branchId.Value);
            }

            var rawInvoices = await query
                .OrderByDescending(i => i.CreatedAt)
                .Take(500)
                .ToListAsync();

            // Fetch referral commission facts for matched visits
            var visitIds = rawInvoices.Select(i => i.VisitId).Distinct().ToList();
            var referralFacts = await _context.ReferralPayableFacts
                .AsNoTracking()
                .Where(f => visitIds.Contains(f.SourceVisitId))
                .GroupBy(f => f.SourceVisitId)
                .Select(g => new { VisitId = g.Key, Commission = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.VisitId, x => x.Commission);

            var result = new List<object>();

            foreach (var inv in rawInvoices)
            {
                var payments = inv.Payments ?? new List<SynOS.Models.Entities.Payment>();
                var totalCollected = payments.Sum(p => p.Amount);
                var totalDue = Math.Max(0, inv.Total - totalCollected);

                // Payment mode breakdown
                decimal cashAmount = 0;
                decimal onlineAmount = 0;
                decimal prepaidAmount = 0;

                foreach (var p in payments)
                {
                    var method = (p.Method ?? "").ToLower().Trim();
                    if (method.Contains("cash"))
                    {
                        cashAmount += p.Amount;
                    }
                    else if (method.Contains("prepaid") || method.Contains("wallet") || method.Contains("token") || method.Contains("deposit"))
                    {
                        prepaidAmount += p.Amount;
                    }
                    else
                    {
                        onlineAmount += p.Amount;
                    }
                }

                // If collected > 0 but payments table had no explicit methods, classify residual as cash/online
                if (totalCollected > (cashAmount + onlineAmount + prepaidAmount))
                {
                    var residual = totalCollected - (cashAmount + onlineAmount + prepaidAmount);
                    onlineAmount += residual;
                }

                // Referral commission cut
                decimal referralCut = 0;
                if (referralFacts.TryGetValue(inv.VisitId, out var comm))
                {
                    referralCut = comm;
                }

                // Determine primary department and modality from orders
                var orders = inv.Visit?.Orders ?? new List<SynOS.Models.Entities.Order>();
                var deptSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var modalitySet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var testNames = new List<string>();

                foreach (var ord in orders)
                {
                    if (!string.IsNullOrEmpty(ord.Department)) deptSet.Add(ord.Department);
                    if (ord.Test != null)
                    {
                        testNames.Add(ord.Test.TestName);
                        if (!string.IsNullOrEmpty(ord.Test.Category)) deptSet.Add(ord.Test.Category);
                        if (ord.Test.ModalityMaster != null && !string.IsNullOrEmpty(ord.Test.ModalityMaster.Name))
                        {
                            modalitySet.Add(ord.Test.ModalityMaster.Name);
                        }
                    }
                    else if (!string.IsNullOrEmpty(ord.TestCode))
                    {
                        testNames.Add(ord.TestCode);
                    }
                }

                // Synthesize department classification
                var isRadiology = deptSet.Any(d => d.Contains("Radiology", StringComparison.OrdinalIgnoreCase)) 
                                  || modalitySet.Any(m => m.Contains("XR", StringComparison.OrdinalIgnoreCase) || m.Contains("CT", StringComparison.OrdinalIgnoreCase) || m.Contains("MR", StringComparison.OrdinalIgnoreCase) || m.Contains("US", StringComparison.OrdinalIgnoreCase));

                var deptClass = isRadiology ? "Radiology" : "Pathology";

                // Synthesize primary modality
                string modalityClass = "General";
                if (isRadiology)
                {
                    var combinedRad = $"{string.Join(" ", deptSet)} {string.Join(" ", modalitySet)} {string.Join(" ", testNames)}".ToLower();
                    if (combinedRad.Contains("mri") || combinedRad.Contains("magnetic") || combinedRad.Contains(" mr ")) modalityClass = "MRI";
                    else if (combinedRad.Contains("ct") || combinedRad.Contains("computed")) modalityClass = "CT Scan";
                    else if (combinedRad.Contains("usg") || combinedRad.Contains("ultra") || combinedRad.Contains("echo")) modalityClass = "Ultrasound";
                    else if (combinedRad.Contains("x-ray") || combinedRad.Contains("xray") || combinedRad.Contains("xr")) modalityClass = "X-Ray";
                    else modalityClass = "X-Ray";
                }
                else
                {
                    var combinedPath = $"{string.Join(" ", deptSet)} {string.Join(" ", modalitySet)} {string.Join(" ", testNames)}".ToLower();
                    if (combinedPath.Contains("biochem")) modalityClass = "Biochemistry";
                    else if (combinedPath.Contains("hemat") || combinedPath.Contains("haemat") || combinedPath.Contains("cbc")) modalityClass = "Hematology";
                    else if (combinedPath.Contains("microbio") || combinedPath.Contains("culture")) modalityClass = "Microbiology";
                    else if (combinedPath.Contains("histo") || combinedPath.Contains("biopsy")) modalityClass = "Histopathology";
                    else modalityClass = "Biochemistry";
                }

                // Department filter evaluation
                if (!string.IsNullOrEmpty(department) && !department.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (!deptClass.Equals(department, StringComparison.OrdinalIgnoreCase) && 
                        !deptSet.Any(d => d.Contains(department, StringComparison.OrdinalIgnoreCase)))
                    {
                        continue;
                    }
                }

                // Modality filter evaluation
                if (!string.IsNullOrEmpty(modality) && !modality.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    var mTarget = modality.ToLower();
                    var matchMod = modalityClass.ToLower().Contains(mTarget) || 
                                   modalitySet.Any(m => m.ToLower().Contains(mTarget)) ||
                                   deptSet.Any(d => d.ToLower().Contains(mTarget));
                    if (!matchMod) continue;
                }

                // Partner category classification
                var partnerName = inv.Visit?.ReferralPartner != null ? inv.Visit.ReferralPartner.Name : "Direct Patient";
                var partnerCategory = "Direct";
                if (inv.Visit?.ReferralPartner != null) partnerCategory = "Partner";
                if ((inv.Visit?.PaymentCollectionModel ?? "").Contains("Insurance", StringComparison.OrdinalIgnoreCase) || partnerName.Contains("Insur", StringComparison.OrdinalIgnoreCase)) partnerCategory = "Insurance";
                if ((inv.Visit?.PaymentCollectionModel ?? "").Contains("Corporate", StringComparison.OrdinalIgnoreCase) || partnerName.Contains("Corp", StringComparison.OrdinalIgnoreCase)) partnerCategory = "Corporate";

                if (!string.IsNullOrEmpty(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (!partnerCategory.Equals(category, StringComparison.OrdinalIgnoreCase)) continue;
                }

                // Status classification
                var normalizedStatus = inv.Status?.ToUpper() ?? "PENDING";
                if (totalDue <= 0) normalizedStatus = "PAID";
                else if (totalCollected > 0) normalizedStatus = "PARTIALLYPAID";
                else normalizedStatus = "PENDINGPAYMENT";

                if (!string.IsNullOrEmpty(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    var sMap = status.ToUpper();
                    if (sMap == "SETTLED" && normalizedStatus != "PAID") continue;
                    if (sMap == "PARTIAL" && normalizedStatus != "PARTIALLYPAID") continue;
                    if (sMap == "PENDING" && normalizedStatus != "PENDINGPAYMENT") continue;
                }

                var patientName = inv.Visit?.Patient != null 
                    ? $"{inv.Visit.Patient.FirstName} {inv.Visit.Patient.LastName}".Trim() 
                    : "Walk-in Patient";

                result.Add(new
                {
                    BillId = inv.InvoiceId,
                    BillNumber = $"BILL-{inv.CreatedAt:yyyyMMdd}-{inv.InvoiceId.ToString().Substring(0, 4).ToUpper()}",
                    VisitId = inv.VisitId,
                    Token = inv.Visit?.Token ?? "",
                    PatientName = patientName,
                    BranchId = inv.Visit?.BranchId,
                    BranchName = inv.Visit?.Branch?.Name ?? "Main Facility",
                    PartnerName = partnerName,
                    PartnerCategory = partnerCategory,
                    Department = deptClass,
                    Modality = modalityClass,
                    TotalAmount = inv.Total,
                    CollectedAmount = totalCollected,
                    PendingAmount = totalDue,
                    CashAmount = cashAmount,
                    OnlineAmount = onlineAmount,
                    PrepaidAmount = prepaidAmount,
                    ReferralCommissionCut = referralCut,
                    Status = normalizedStatus == "PAID" ? "Settled" : (normalizedStatus == "PARTIALLYPAID" ? "Partial" : "Pending"),
                    Date = inv.CreatedAt,
                    TestItems = testNames
                });
            }

            return Ok(result);
        }
    }
}
