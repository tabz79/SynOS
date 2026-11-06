using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Payments;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Enums;
using SynOS.Models.DTOs.Finance;
using SynOS.Services.Revenue;
using SynOS.Services.Time;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/finance/bills")]
    public class FinanceBillsController : ControllerBase
    {
        private readonly SynOSDbContext _context;
        private readonly IRevenueFactWriter _revenueFactWriter;
        private readonly ILabTimeProvider _labTimeProvider;

        public FinanceBillsController(
            SynOSDbContext context, 
            IRevenueFactWriter revenueFactWriter,
            ILabTimeProvider labTimeProvider)
        {
            _context = context;
            _revenueFactWriter = revenueFactWriter;
            _labTimeProvider = labTimeProvider;
        }

        private (DateTime? startUtc, DateTime? endUtc) ResolvePresetDateRange(string? preset, DateTime? explicitStart, DateTime? explicitEnd)
        {
            if (explicitStart.HasValue || explicitEnd.HasValue)
            {
                var adjustedEnd = explicitEnd;
                if (adjustedEnd.HasValue && adjustedEnd.Value.TimeOfDay == TimeSpan.Zero)
                {
                    adjustedEnd = adjustedEnd.Value.AddDays(1).AddTicks(-1);
                }
                return (explicitStart, adjustedEnd);
            }

            if (string.IsNullOrWhiteSpace(preset))
            {
                return (null, null);
            }

            var p = preset.Trim().ToLowerInvariant();
            var istZone = _labTimeProvider.GetLabTimeZone();
            var istNow = _labTimeProvider.GetLabNow();
            var istToday = istNow.Date; // 00:00:00 IST

            DateTime istStart;
            DateTime istEnd;

            switch (p)
            {
                case "today":
                    istStart = istToday;
                    istEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "yesterday":
                    istStart = istToday.AddDays(-1);
                    istEnd = istToday.AddTicks(-1);
                    break;
                case "this week":
                case "week":
                    istStart = istToday.AddDays(-6);
                    istEnd = istToday.AddDays(1).AddTicks(-1);
                    break;
                case "this month":
                case "month":
                    istStart = new DateTime(istToday.Year, istToday.Month, 1);
                    istEnd = istStart.AddMonths(1).AddTicks(-1);
                    break;
                case "this quarter":
                case "quarter":
                case string q when q.StartsWith("q"):
                    var quarter = (istToday.Month - 1) / 3 + 1;
                    var qStartMonth = (quarter - 1) * 3 + 1;
                    istStart = new DateTime(istToday.Year, qStartMonth, 1);
                    istEnd = istStart.AddMonths(3).AddTicks(-1);
                    break;
                case "this year":
                case "year":
                case "fy":
                    var fyStartYear = istToday.Month >= 4 ? istToday.Year : istToday.Year - 1;
                    istStart = new DateTime(fyStartYear, 4, 1);
                    istEnd = istStart.AddYears(1).AddTicks(-1);
                    break;
                case "all":
                case "all time":
                    return (null, null);
                default:
                    return (null, null);
            }

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istStart, DateTimeKind.Unspecified), istZone);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(istEnd, DateTimeKind.Unspecified), istZone);
            return (startUtc, endUtc);
        }

        public static string FormatBillNumber(string? token, string? branchCode, DateTime date)
        {
            var cleanToken = !string.IsNullOrWhiteSpace(token)
                ? token.Replace("-", "").Trim().ToUpper()
                : $"{(string.IsNullOrWhiteSpace(branchCode) ? "MAI" : branchCode.Trim().ToUpper())}000";
            return $"{cleanToken}-{date:yyMMdd}";
        }

        private static PaymentMode MapPaymentMethod(string method)
        {
            var m = (method ?? "").ToLower().Trim();
            return m switch
            {
                "cash" => PaymentMode.Cash,
                "upi" => PaymentMode.UPI,
                "card" => PaymentMode.Card,
                "banktransfer" or "bank" or "neft" or "rtgs" or "cheque" => PaymentMode.BankTransfer,
                _ => PaymentMode.Other
            };
        }

        public class ClassifiedOrderTest
        {
            public string Name { get; set; } = string.Empty;
            public string Code { get; set; } = string.Empty;
            public string Department { get; set; } = "Pathology"; // Macro: Pathology, Radiology, General
            public string Modality { get; set; } = "General"; // Modality or Discipline: Biochemistry, Hematology, etc.
        }

        public static ClassifiedOrderTest ClassifyOrder(Order ord)
        {
            var result = new ClassifiedOrderTest();
            var tName = ord.Test?.TestName?.Trim() ?? ord.TestCode?.Trim() ?? "Investigation";
            var tCode = ord.Test?.TestCode?.Trim() ?? ord.TestCode?.Trim() ?? "";
            result.Name = tName;
            result.Code = tCode;

            // 1. Relational Authority: Check Test's ModalityMaster & DepartmentMaster
            var modMaster = ord.Test?.ModalityMaster;
            var deptMaster = ord.Test?.DepartmentMaster;

            if (modMaster != null && !string.IsNullOrWhiteSpace(modMaster.Name))
            {
                result.Department = "Radiology";
                result.Modality = modMaster.Name.Trim();
                return result;
            }

            if (deptMaster != null)
            {
                var macro = deptMaster.MacroDepartment?.Trim();
                var dName = deptMaster.Name?.Trim() ?? "General";

                if (macro != null && macro.Equals("Radiology", StringComparison.OrdinalIgnoreCase))
                {
                    result.Department = "Radiology";
                    result.Modality = modMaster?.Name?.Trim() ?? ResolveRadiologyModality(tName, tCode);
                    return result;
                }

                if (macro != null && macro.Equals("Pathology", StringComparison.OrdinalIgnoreCase))
                {
                    result.Department = "Pathology";
                    result.Modality = dName;
                    return result;
                }
            }

            // 2. Order-level Department fallback
            var ordDept = (ord.Department ?? "").Trim();
            if (ordDept.Equals("RAD", StringComparison.OrdinalIgnoreCase) ||
                ordDept.Equals("Radiology", StringComparison.OrdinalIgnoreCase) ||
                ordDept.Equals("XRY", StringComparison.OrdinalIgnoreCase) ||
                ordDept.Equals("MRI", StringComparison.OrdinalIgnoreCase) ||
                ordDept.Equals("CT", StringComparison.OrdinalIgnoreCase) ||
                ordDept.Equals("USG", StringComparison.OrdinalIgnoreCase))
            {
                result.Department = "Radiology";
                result.Modality = ResolveRadiologyModality(tName, ordDept);
                return result;
            }

            if (ordDept.Equals("BIO", StringComparison.OrdinalIgnoreCase) || ordDept.Equals("Biochemistry", StringComparison.OrdinalIgnoreCase))
            {
                result.Department = "Pathology";
                result.Modality = "Biochemistry";
                return result;
            }

            if (ordDept.Equals("HEM", StringComparison.OrdinalIgnoreCase) || ordDept.Equals("Hematology", StringComparison.OrdinalIgnoreCase))
            {
                result.Department = "Pathology";
                result.Modality = "Hematology";
                return result;
            }

            if (ordDept.Equals("MICRO", StringComparison.OrdinalIgnoreCase) || ordDept.Equals("Microbiology", StringComparison.OrdinalIgnoreCase))
            {
                result.Department = "Pathology";
                result.Modality = "Microbiology";
                return result;
            }

            if (ordDept.Equals("HISTO", StringComparison.OrdinalIgnoreCase) || ordDept.Equals("Histopathology", StringComparison.OrdinalIgnoreCase))
            {
                result.Department = "Pathology";
                result.Modality = "Histopathology";
                return result;
            }

            // 3. Clinical Dictionary Classification based on Test Name/Code
            var lower = $"{tName} {tCode}".ToLower();

            // Radiology Modalities
            if (lower.Contains("mri") || lower.Contains("magnetic") || lower.Contains("brain plain") || lower.Contains("angiogram") || lower.Contains("cervical spine"))
            {
                result.Department = "Radiology";
                result.Modality = "MRI";
                return result;
            }
            if (lower.Contains("ct scan") || lower.Contains("computed") || lower.Contains("hrct") || lower.Contains("ct "))
            {
                result.Department = "Radiology";
                result.Modality = "CT Scan";
                return result;
            }
            if (lower.Contains("ultrasound") || lower.Contains("usg") || lower.Contains("u/s") || lower.Contains("echo") || lower.Contains("sonography") || lower.Contains("doppler"))
            {
                result.Department = "Radiology";
                result.Modality = "Ultrasound";
                return result;
            }
            if (lower.Contains("x-ray") || lower.Contains("xray") || lower.Contains("radiograph") || lower.Contains("chest pa") || lower.Contains("c.spine") || lower.Contains("views") || lower.Contains("routine xray"))
            {
                result.Department = "Radiology";
                result.Modality = "X-Ray";
                return result;
            }

            // Pathology Disciplines
            if (lower.Contains("cbp") || lower.Contains("cbc") || lower.Contains("blood count") || lower.Contains("hemogram") ||
                lower.Contains("haemogram") || lower.Contains("haemoglobin") || lower.Contains("hemoglobin") || lower.Contains("platelet") ||
                lower.Contains("esr") || lower.Contains("aec") || lower.Contains("blood group") || lower.Contains("rh typing") ||
                lower.Contains("wbc") || lower.Contains("rbc") || lower.Contains("peripheral smear") || lower.Contains("reticulocyte") ||
                lower.Contains("pt/inr") || lower.Contains("prothrombin") || lower.Contains("tc,dc") || lower.Contains("tc dc"))
            {
                result.Department = "Pathology";
                result.Modality = "Hematology";
                return result;
            }

            if (lower.Contains("culture") || lower.Contains("sensitivity") || lower.Contains("c/s") || lower.Contains("fungal") ||
                lower.Contains("afb") || lower.Contains("sputum") || lower.Contains("gram stain") || lower.Contains("mantoux") ||
                lower.Contains("pyogenic"))
            {
                result.Department = "Pathology";
                result.Modality = "Microbiology";
                return result;
            }

            if (lower.Contains("biopsy") || lower.Contains("fnac") || lower.Contains("pap smear") || lower.Contains("histopath") || lower.Contains("cytology"))
            {
                result.Department = "Pathology";
                result.Modality = "Histopathology";
                return result;
            }

            if (lower.Contains("stool") || lower.Contains("urine routine") || lower.Contains("r.u.a") || lower.Contains("occult") ||
                lower.Contains("widal") || lower.Contains("typhoid") || lower.Contains("dengue") || lower.Contains("malaria") ||
                lower.Contains("hiv") || lower.Contains("hbsag") || lower.Contains("hcv") || lower.Contains("vdrl") ||
                lower.Contains("crp") || lower.Contains("aso") || lower.Contains("streptolysin") || lower.Contains("ra factor") || lower.Contains("rafactor"))
            {
                result.Department = "Pathology";
                result.Modality = "Clinical Pathology";
                return result;
            }

            if (lower.Contains("lft") || lower.Contains("liver") || lower.Contains("bilirubin") || lower.Contains("sgot") ||
                lower.Contains("sgpt") || lower.Contains("kft") || lower.Contains("rft") || lower.Contains("renal") ||
                lower.Contains("urea") || lower.Contains("creatinine") || lower.Contains("uric acid") || lower.Contains("lipid") ||
                lower.Contains("cholesterol") || lower.Contains("triglyceride") || lower.Contains("glucose") || lower.Contains("fbs") ||
                lower.Contains("ppbs") || lower.Contains("rbs") || lower.Contains("hba1c") || lower.Contains("thyroid") ||
                lower.Contains("t3") || lower.Contains("t4") || lower.Contains("tsh") || lower.Contains("calcium") ||
                lower.Contains("electrolytes") || lower.Contains("sodium") || lower.Contains("potassium") || lower.Contains("amylase") ||
                lower.Contains("lipase") || lower.Contains("vitamin") || lower.Contains("b12") || lower.Contains("d3") ||
                lower.Contains("ferritin") || lower.Contains("iron") || lower.Contains("bun") || lower.Contains("biochem"))
            {
                result.Department = "Pathology";
                result.Modality = "Biochemistry";
                return result;
            }

            // Cardiology
            if (lower.Contains("ecg") || lower.Contains("tmt") || lower.Contains("echo"))
            {
                result.Department = "Diagnostics";
                result.Modality = "Cardiology";
                return result;
            }

            result.Department = "Pathology";
            result.Modality = "General";
            return result;
        }

        private static string ResolveRadiologyModality(string testName, string? hint)
        {
            var combined = $"{testName} {hint}".ToLower();
            if (combined.Contains("mri") || combined.Contains("magnetic") || combined.Contains("brain plain") || combined.Contains("angiogram") || combined.Contains("cervical spine")) return "MRI";
            if (combined.Contains("ct") || combined.Contains("computed")) return "CT Scan";
            if (combined.Contains("usg") || combined.Contains("ultra") || combined.Contains("u/s") || combined.Contains("echo")) return "Ultrasound";
            return "X-Ray";
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
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);

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
                            .ThenInclude(t => t.DepartmentMaster)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Orders)
                        .ThenInclude(o => o.Test)
                            .ThenInclude(t => t.ModalityMaster)
                                .ThenInclude(m => m.DepartmentMaster)
                .Include(i => i.Payments)
                .Where(i => i.Visit != null && 
                            i.Visit.Status != VisitStatus.Draft && 
                            (i.Visit.Token == null || !i.Visit.Token.StartsWith("D-")) &&
                            i.Status != "Draft")
                .AsNoTracking();

            // Date filtering
            if (startUtc.HasValue)
            {
                query = query.Where(i => i.CreatedAt >= startUtc.Value);
            }
            if (endUtc.HasValue)
            {
                query = query.Where(i => i.CreatedAt <= endUtc.Value);
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

            // Fetch B2B partner receivables for matched visits (SSOT authority)
            var receivableVisitIds = await _context.ReceivableFacts
                .AsNoTracking()
                .Where(r => visitIds.Contains(r.SourceVisitId))
                .Select(r => r.SourceVisitId)
                .Distinct()
                .ToListAsync();
            var receivableVisitSet = new HashSet<Guid>(receivableVisitIds);

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

                // Payment method residual classification
                if (totalCollected > (cashAmount + onlineAmount + prepaidAmount))
                {
                    var residual = totalCollected - (cashAmount + onlineAmount + prepaidAmount);
                    onlineAmount += residual;
                }

                // Determine orders and classify each test with relational authority
                var allOrders = inv.Visit?.Orders ?? new List<SynOS.Models.Entities.Order>();
                
                // Track only billable/root test orders. If an order has a ParentOrderId, it is a sub-component of a panel.
                var orders = allOrders.Any(o => o.ParentOrderId != null)
                    ? allOrders.Where(o => o.ParentOrderId == null).ToList()
                    : (allOrders.Any(o => o.Price > 0) ? allOrders.Where(o => o.Price > 0).ToList() : allOrders);

                var classifiedOrders = orders.Select(ClassifyOrder).ToList();

                // If any test is a panel/profile (e.g. LFT, Lipid, CBC, KFT), suppress known component parameters from display
                var rawTestNames = classifiedOrders.Select(t => t.Name).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                var hasLft = rawTestNames.Any(t => t.Contains("LFT", StringComparison.OrdinalIgnoreCase) || t.Contains("Liver", StringComparison.OrdinalIgnoreCase));
                var hasLipid = rawTestNames.Any(t => t.Contains("Lipid", StringComparison.OrdinalIgnoreCase));
                var hasCbc = rawTestNames.Any(t => t.Contains("CBC", StringComparison.OrdinalIgnoreCase) || t.Contains("Blood Count", StringComparison.OrdinalIgnoreCase) || t.Contains("Hemogram", StringComparison.OrdinalIgnoreCase));
                var hasKft = rawTestNames.Any(t => t.Contains("KFT", StringComparison.OrdinalIgnoreCase) || t.Contains("RFT", StringComparison.OrdinalIgnoreCase) || t.Contains("Renal", StringComparison.OrdinalIgnoreCase) || t.Contains("Kidney", StringComparison.OrdinalIgnoreCase));

                var testDetails = classifiedOrders.Where(t =>
                {
                    var name = t.Name;
                    if (hasLft && (name.Contains("Albumin", StringComparison.OrdinalIgnoreCase) || name.Contains("Globulin", StringComparison.OrdinalIgnoreCase) || name.Contains("Bilirubin", StringComparison.OrdinalIgnoreCase) || name.Contains("SGOT", StringComparison.OrdinalIgnoreCase) || name.Contains("SGPT", StringComparison.OrdinalIgnoreCase) || name.Contains("Alkaline Phos", StringComparison.OrdinalIgnoreCase) || name.Contains("Total Protein", StringComparison.OrdinalIgnoreCase)))
                    {
                        return false;
                    }
                    if (hasLipid && (name.Contains("Cholesterol", StringComparison.OrdinalIgnoreCase) || name.Contains("Triglyceride", StringComparison.OrdinalIgnoreCase) || name.Contains("HDL", StringComparison.OrdinalIgnoreCase) || name.Contains("LDL", StringComparison.OrdinalIgnoreCase) || name.Contains("VLDL", StringComparison.OrdinalIgnoreCase)))
                    {
                        return false;
                    }
                    if (hasCbc && (name.Contains("Hemoglobin", StringComparison.OrdinalIgnoreCase) || name.Contains("Platelet", StringComparison.OrdinalIgnoreCase) || name.Contains("WBC", StringComparison.OrdinalIgnoreCase) || name.Contains("RBC", StringComparison.OrdinalIgnoreCase) || name.Contains("PCV", StringComparison.OrdinalIgnoreCase) || name.Contains("MCV", StringComparison.OrdinalIgnoreCase) || name.Contains("ESR", StringComparison.OrdinalIgnoreCase)))
                    {
                        return false;
                    }
                    if (hasKft && (name.Contains("Urea", StringComparison.OrdinalIgnoreCase) || name.Contains("Creatinine", StringComparison.OrdinalIgnoreCase) || name.Contains("Uric Acid", StringComparison.OrdinalIgnoreCase)))
                    {
                        return false;
                    }
                    return true;
                }).ToList();

                if (testDetails.Count == 0) testDetails = classifiedOrders;

                var testNames = testDetails.Select(t => t.Name).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                var departments = testDetails.Select(t => t.Department).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                var modalities = testDetails.Select(t => t.Modality).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

                var deptClass = departments.Contains("Pathology", StringComparer.OrdinalIgnoreCase) ? "Pathology" : (departments.FirstOrDefault() ?? "Pathology");
                var modalityClass = modalities.FirstOrDefault() ?? "General";

                // Department filter evaluation: Does ANY order on this bill belong to the requested department?
                if (!string.IsNullOrEmpty(department) && !department.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    var matchesDept = testDetails.Any(t => t.Department.Equals(department, StringComparison.OrdinalIgnoreCase));
                    if (!matchesDept) continue;
                }

                // Modality filter evaluation: Does ANY order on this bill belong to the requested modality?
                if (!string.IsNullOrEmpty(modality) && !modality.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    var matchesMod = testDetails.Any(t => t.Modality.Equals(modality, StringComparison.OrdinalIgnoreCase) ||
                                                          t.Modality.IndexOf(modality, StringComparison.OrdinalIgnoreCase) >= 0);
                    if (!matchesMod) continue;
                }

                // Canonical Bill Type / Payer Classification (SSOT Authority)
                var v = inv.Visit;
                var rp = v?.ReferralPartner;
                var pcm = v?.PaymentCollectionModel ?? "";
                var bt = v?.BillingType;
                var partnerName = rp != null 
                    ? rp.Name 
                    : (!string.IsNullOrWhiteSpace(v?.ReferrerText) ? v.ReferrerText : "Direct Patient");
                bool hasCounterDeskPayment = totalCollected > 0;

                bool isInsurance = false;
                bool isCorporateB2B = false;

                if (bt == BillingType.Insurance || 
                    pcm.Contains("Insurance", StringComparison.OrdinalIgnoreCase) || 
                    partnerName.Contains("Insur", StringComparison.OrdinalIgnoreCase))
                {
                    isInsurance = true;
                }
                else if (!hasCounterDeskPayment && 
                         !string.Equals(partnerName, "SELF", StringComparison.OrdinalIgnoreCase) &&
                         (bt == BillingType.PrepaidPartner || 
                          bt == BillingType.Corporate || 
                          pcm.Equals("PartnerCollects", StringComparison.OrdinalIgnoreCase) || 
                          pcm.Equals("CorporateB2B", StringComparison.OrdinalIgnoreCase) || 
                          pcm.Equals("PartnerMonthlyBilling", StringComparison.OrdinalIgnoreCase) ||
                          receivableVisitSet.Contains(inv.VisitId) ||
                          (v?.B2BDiscountAmount != null && v.B2BDiscountAmount > 0 && v.ReferralPartnerId != null) ||
                          (rp != null && (rp.PartnerType == SynOS.Models.Enums.Referral.PartnerType.Hospital || 
                                          rp.PartnerType == SynOS.Models.Enums.Referral.PartnerType.Clinic || 
                                          string.Equals(rp.PaymentCollectionModel, "PartnerCollects", StringComparison.OrdinalIgnoreCase) ||
                                          rp.Name.Contains("Hospital", StringComparison.OrdinalIgnoreCase) ||
                                          rp.Name.Contains("Clinic", StringComparison.OrdinalIgnoreCase)))))
                {
                    isCorporateB2B = true;
                }

                string partnerCategory = isCorporateB2B ? "Corporate" : (isInsurance ? "Insurance" : "Direct");
                string canonicalPayerMode = isCorporateB2B ? "Corporate B2B" : (isInsurance ? "Insurance" : "Standard / Direct");

                // Cancellation check: In ERP standards, a cancelled visit has strictly zero outstanding claim.
                bool isCancelled = string.Equals(inv.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) || 
                                   (inv.Visit != null && inv.Visit.Status == VisitStatus.Cancelled);

                if (isCancelled)
                {
                    totalDue = 0m;
                }

                // Strict invariant: Referral cut applies ONLY to Standard / Direct bills where patient pays at counter.
                // Corporate B2B, Insurance, Cancelled, and SELF bills have strictly ₹0 referral cut.
                decimal referralCut = 0;
                if (!isCancelled && !isCorporateB2B && !isInsurance && 
                    !string.Equals(partnerName, "SELF", StringComparison.OrdinalIgnoreCase) &&
                    referralFacts.TryGetValue(inv.VisitId, out var comm))
                {
                    referralCut = comm;
                }

                if (!string.IsNullOrEmpty(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (category.Equals("Standard", StringComparison.OrdinalIgnoreCase) || 
                        category.Equals("Direct", StringComparison.OrdinalIgnoreCase) || 
                        category.Equals("Standard/Direct", StringComparison.OrdinalIgnoreCase) ||
                        category.Equals("Standard / Direct", StringComparison.OrdinalIgnoreCase))
                    {
                        if (isCorporateB2B || isInsurance) continue;
                    }
                    else if (category.Equals("Corporate", StringComparison.OrdinalIgnoreCase) || 
                             category.Equals("Partner", StringComparison.OrdinalIgnoreCase) || 
                             category.Equals("Corporate B2B", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!isCorporateB2B) continue;
                    }
                    else if (category.Equals("Insurance", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!isInsurance) continue;
                    }
                    else if (!partnerCategory.Equals(category, StringComparison.OrdinalIgnoreCase)) continue;
                }

                // Status classification
                var normalizedStatus = "PENDINGPAYMENT";
                if (isCancelled) normalizedStatus = "CANCELLED";
                else if (totalDue <= 0) normalizedStatus = "PAID";
                else if (totalCollected > 0) normalizedStatus = "PARTIALLYPAID";
                else normalizedStatus = "PENDINGPAYMENT";

                if (!string.IsNullOrEmpty(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    var sMap = status.ToUpper();
                    if (sMap == "SETTLED" && normalizedStatus != "PAID") continue;
                    if (sMap == "PARTIAL" && normalizedStatus != "PARTIALLYPAID") continue;
                    if (sMap == "PENDING" && (normalizedStatus != "PENDINGPAYMENT" || isCancelled)) continue;
                    if (sMap == "CANCELLED" && !isCancelled) continue;
                }

                var patientName = inv.Visit?.Patient != null 
                    ? $"{inv.Visit.Patient.FirstName} {inv.Visit.Patient.LastName}".Trim() 
                    : "Walk-in Patient";

                var billNo = FormatBillNumber(inv.Visit?.Token, inv.Visit?.Branch?.Code, inv.CreatedAt);

                result.Add(new
                {
                    BillId = inv.InvoiceId,
                    BillNumber = billNo,
                    VisitId = inv.VisitId,
                    Token = inv.Visit?.Token ?? "",
                    Mrn = inv.Visit?.Patient?.MRN ?? "",
                    PatientName = patientName,
                    BranchId = inv.Visit?.BranchId,
                    BranchName = inv.Visit?.Branch?.Name ?? "Main Facility",
                    PartnerId = inv.Visit?.ReferralPartnerId ?? inv.Visit?.ReferralPartner?.ReferralPartnerId,
                    PartnerName = partnerName,
                    PartnerCategory = partnerCategory,
                    BillingType = canonicalPayerMode,
                    PayerMode = canonicalPayerMode,
                    DebtorType = isCorporateB2B ? "InstitutionalPartner" : (isInsurance ? "InsuranceTPA" : "PatientCounter"),
                    DebtorName = isCorporateB2B || isInsurance ? partnerName : "Direct Patient",
                    PaymentCollectionModel = pcm,
                    Department = deptClass,
                    Modality = modalityClass,
                    Departments = departments,
                    Modalities = modalities,
                    TotalAmount = inv.Total,
                    CollectedAmount = totalCollected,
                    PendingAmount = totalDue,
                    CashAmount = cashAmount,
                    OnlineAmount = onlineAmount,
                    PrepaidAmount = prepaidAmount,
                    ReferralCommissionCut = referralCut,
                    IsCancelled = isCancelled,
                    Status = isCancelled ? "Cancelled" : (normalizedStatus == "PAID" ? "Settled" : (normalizedStatus == "PARTIALLYPAID" ? "Partial" : "Pending")),
                    Date = inv.CreatedAt,
                    TestItems = testNames,
                    TestDetails = testDetails.Select(t => new {
                        Name = t.Name,
                        Code = t.Code,
                        Department = t.Department,
                        Modality = t.Modality
                    }).ToList()
                });
            }

            return Ok(result);
        }

        #region Due Bills & Counter Collections

        [HttpGet("due-bills")]
        public async Task<ActionResult<IEnumerable<object>>> GetDueBills(
            [FromQuery] Guid? branchId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? preset = null,
            [FromQuery] string? search = null)
        {
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);

            // Institutional / Partner receivables must NEVER spam patient due bills.
            // Due Bills is strictly for patient walk-in bills with partial payments (TotalPaid > 0 && BalanceDue > 0).
            var partnerVisitIdsWithReceivables = await _context.ReceivableFacts
                .Where(r => r.SettledAt == null)
                .Select(r => r.SourceVisitId)
                .Distinct()
                .ToListAsync();

            var query = _context.Invoices
                .Include(i => i.Visit).ThenInclude(v => v!.Patient)
                .Include(i => i.Visit).ThenInclude(v => v!.Branch)
                .Include(i => i.Visit).ThenInclude(v => v!.ReferralPartner)
                .Include(i => i.Visit).ThenInclude(v => v!.Orders).ThenInclude(o => o.Test)
                .Include(i => i.Payments)
                .Include(i => i.PartialPayments)
                .Where(i => i.Visit != null && 
                            i.Visit.Status != VisitStatus.Draft && 
                            (i.Visit.Token == null || !i.Visit.Token.StartsWith("D-")) &&
                            i.Status != "Draft" &&
                            i.Status != "Cancelled" && 
                            i.Visit.PaymentCollectionModel != "PartnerMonthlyBilling" &&
                            i.Visit.PaymentCollectionModel != "PrepaidPartner" &&
                            i.Visit.PaymentCollectionModel != "PartnerCollects" &&
                            i.Visit.BillingType != BillingType.PrepaidPartner &&
                            i.Visit.BillingType != BillingType.Insurance &&
                            !partnerVisitIdsWithReceivables.Contains(i.VisitId))
                .AsNoTracking();

            if (branchId.HasValue && branchId.Value != Guid.Empty)
            {
                query = query.Where(i => i.Visit!.BranchId == branchId.Value);
            }

            if (startUtc.HasValue)
            {
                query = query.Where(i => i.CreatedAt >= startUtc.Value);
            }
            if (endUtc.HasValue)
            {
                query = query.Where(i => i.CreatedAt <= endUtc.Value);
            }

            var rawInvoices = await query
                .OrderByDescending(i => i.CreatedAt)
                .Take(500)
                .ToListAsync();

            var dueBills = rawInvoices
                .Select(i => {
                    var totalPaid = (i.Payments?.Sum(p => p.Amount) ?? 0) + (i.PartialPayments?.Sum(p => p.Amount) ?? 0);
                    var balanceDue = i.Total - totalPaid;
                    var lastPayment = i.Payments?.OrderByDescending(p => p.ReceivedAt).FirstOrDefault();
                    return new {
                        Invoice = i,
                        TotalPaid = totalPaid,
                        BalanceDue = balanceDue,
                        LastPayment = lastPayment
                    };
                })
                .Where(x => x.BalanceDue > 0)
                .Select(x => new {
                    InvoiceId = x.Invoice.InvoiceId,
                    BillNumber = FormatBillNumber(x.Invoice.Visit?.Token, x.Invoice.Visit?.Branch?.Code, x.Invoice.CreatedAt),
                    VisitId = x.Invoice.VisitId,
                    Token = x.Invoice.Visit?.Token ?? "UNKNOWN",
                    PatientName = x.Invoice.Visit?.Patient != null ? $"{x.Invoice.Visit.Patient.FirstName} {x.Invoice.Visit.Patient.LastName}".Trim() : "Walk-in Patient",
                    PatientMobile = x.Invoice.Visit?.Patient?.CurrentPhoneNumber ?? "",
                    PatientMrn = x.Invoice.Visit?.Patient?.MRN ?? "",
                    PatientGender = x.Invoice.Visit?.Patient?.Gender ?? "",
                    PatientAge = x.Invoice.Visit?.Patient != null && x.Invoice.Visit.Patient.DateOfBirth != default ? Math.Max(0, DateTime.UtcNow.Year - x.Invoice.Visit.Patient.DateOfBirth.Year) : 0,
                    BranchId = x.Invoice.Visit?.BranchId,
                    BranchName = x.Invoice.Visit?.Branch?.Name ?? "Main Facility",
                    ReferralDoctor = x.Invoice.Visit?.ReferralPartner?.Name ?? "Direct Patient",
                    CreatedAt = x.Invoice.CreatedAt,
                    DueDate = x.Invoice.DueDate,
                    GrossAmount = x.Invoice.GrossAmount,
                    DiscountAmount = x.Invoice.DiscountAmount,
                    TotalAmount = x.Invoice.Total,
                    TotalPaid = x.TotalPaid,
                    BalanceDue = x.BalanceDue,
                    Status = x.TotalPaid > 0 ? "Partial" : "Pending",
                    LastPaymentDate = x.LastPayment?.ReceivedAt,
                    LastPaymentMethod = x.LastPayment?.Method ?? (x.TotalPaid > 0 ? "Cash" : "Unpaid / Credit"),
                    Tests = x.Invoice.Visit?.Orders?.Select(o => o.Test?.TestName ?? o.TestCode).Where(t => !string.IsNullOrEmpty(t)).ToList() ?? new List<string>()
                });

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                dueBills = dueBills.Where(b => 
                    (b.PatientName?.ToLower().Contains(q) ?? false) ||
                    (b.Token?.ToLower().Contains(q) ?? false) ||
                    (b.PatientMobile?.Contains(q) ?? false)
                );
            }

            return Ok(dueBills.ToList());
        }

        [HttpPost("{invoiceId}/collect-due")]
        public async Task<IActionResult> CollectDue(Guid invoiceId, [FromBody] CollectDueRequestDto request)
        {
            if (request == null || request.Amount <= 0)
            {
                return BadRequest(new { message = "Valid payment amount greater than zero is required." });
            }

            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .Include(i => i.PartialPayments)
                .Include(i => i.Visit).ThenInclude(v => v!.Patient)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null)
            {
                return NotFound(new { message = "Invoice not found." });
            }

            if (string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Invoice is already fully settled." });
            }

            var currentPaid = (invoice.Payments?.Sum(p => p.Amount) ?? 0) + (invoice.PartialPayments?.Sum(p => p.Amount) ?? 0);
            var remainingDue = invoice.Total - currentPaid;

            if (remainingDue <= 0)
            {
                invoice.Status = "Paid";
                if (invoice.Visit != null) invoice.Visit.Status = VisitStatus.Paid;
                await _context.SaveChangesAsync();
                return BadRequest(new { message = "Invoice has no outstanding balance." });
            }

            var amountToRecord = Math.Min(request.Amount, remainingDue);

            // Resolve userId
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid userId = Guid.Empty;
            if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedId))
            {
                userId = parsedId;
            }
            else
            {
                userId = await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();
            }

            var payment = new Payment
            {
                PaymentId = Guid.NewGuid(),
                InvoiceId = invoice.InvoiceId,
                Amount = amountToRecord,
                Method = !string.IsNullOrWhiteSpace(request.Method) ? request.Method : "Cash",
                ReceiptNo = !string.IsNullOrWhiteSpace(request.ReceiptNo) 
                    ? request.ReceiptNo 
                    : $"RCP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                ReceivedAt = DateTime.UtcNow,
                ReceivedByUserId = userId
            };
            _context.Payments.Add(payment);

            // CORR-07: Record formal balance due waiver if partial clearance occurred with authorized write-off
            if (request.WaiverAmount.HasValue && request.WaiverAmount.Value > 0)
            {
                var remainingAfterPayment = Math.Max(0m, remainingDue - amountToRecord);
                var waiver = Math.Min(request.WaiverAmount.Value, remainingAfterPayment);
                if (waiver > 0)
                {
                    invoice.DiscountAmount += waiver;
                    invoice.Total = Math.Max(0m, invoice.GrossAmount - invoice.DiscountAmount);

                    var waiverReason = !string.IsNullOrWhiteSpace(request.WaiverReason)
                        ? request.WaiverReason.Trim()
                        : "Balance Due Waiver";

                    var waiverFact = new SynOS.Models.Entities.Revenue.DiscountFact
                    {
                        DiscountFactId = Guid.NewGuid(),
                        InvoiceId = invoice.InvoiceId,
                        DiscountDefinitionId = Guid.Empty,
                        Type = SynOS.Models.Enums.DiscountType.Flat,
                        Value = waiver,
                        GrossAmount = invoice.GrossAmount,
                        DiscountAmount = invoice.DiscountAmount,
                        NetAmountAfterDiscount = invoice.Total,
                        AppliedBy = $"{waiverReason} [Due Clearance Waiver: -₹{waiver}]",
                        AppliedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.DiscountFacts.Add(waiverFact);
                }
            }

            var newTotalPaid = currentPaid + amountToRecord;
            if (newTotalPaid >= invoice.Total)
            {
                invoice.Status = "Paid";
                if (invoice.Visit != null)
                {
                    invoice.Visit.Status = VisitStatus.Paid;
                }
            }
            else
            {
                invoice.Status = "PartialPayment";
                if (invoice.Visit != null)
                {
                    invoice.Visit.Status = VisitStatus.PartialPayment;
                }
            }

            // Ledger Confirmation Fact
            var fact = new PaymentConfirmedFact(
                Guid.NewGuid(),
                PaymentDirection.In,
                payment.Amount,
                invoice.Visit?.PatientId ?? Guid.Empty,
                DateTimeOffset.UtcNow,
                DateTimeOffset.UtcNow,
                payment.PaymentId,
                payment.Method
            );
            _context.PaymentConfirmedFacts.Add(fact);

            // Synchronize with AR.ReceivableFacts if an open receivable exists
            var openReceivable = await _context.ReceivableFacts
                .FirstOrDefaultAsync(r => r.SourceVisitId == invoice.VisitId && r.SettledAt == null);
            if (openReceivable != null)
            {
                openReceivable.AmountReceived += amountToRecord;
                if (openReceivable.AmountReceived >= openReceivable.Amount)
                {
                    openReceivable.SettledAt = DateTimeOffset.UtcNow;
                    openReceivable.ClaimReference = payment.ReceiptNo;
                }
                _context.ReceivableFacts.Update(openReceivable);
            }

            await _context.SaveChangesAsync();

            // Declare Truth Revenue Fact for Cash / Digital Drawer
            await _revenueFactWriter.DeclareRevenueFactAsync(new SynOS.Models.DTOs.Revenue.DeclareRevenueFactCommand
            {
                OccurredAt = payment.ReceivedAt,
                Amount = payment.Amount,
                Currency = "INR",
                Direction = RevenueDirection.Inflow,
                SourceType = RevenueSourceType.Patient,
                SourceReferenceId = payment.PaymentId.ToString(),
                PaymentMode = MapPaymentMethod(payment.Method),
                DeclaredByUserId = userId,
                Notes = $"Due bill collection for Invoice {invoice.InvoiceId}",
                ExternalTransactionId = payment.ReceiptNo
            });

            return Ok(new
            {
                success = true,
                message = newTotalPaid >= invoice.Total ? "Bill fully settled." : $"Partial payment of ₹{amountToRecord} recorded. Remaining due: ₹{invoice.Total - newTotalPaid}.",
                paymentId = payment.PaymentId,
                receiptNo = payment.ReceiptNo,
                amountPaid = amountToRecord,
                totalPaid = newTotalPaid,
                balanceDue = invoice.Total - newTotalPaid,
                status = invoice.Status
            });
        }

        #endregion

        #region Visit Corrections Audit Feed

        [HttpGet("corrections")]
        [HttpGet("/api/v1/finance/corrections")]
        public async Task<ActionResult<IEnumerable<object>>> GetVisitCorrections(
            [FromQuery] Guid? branchId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? preset = null,
            [FromQuery] string? search = null)
        {
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);

            var query = _context.CorrectionFacts.AsNoTracking();

            if (startUtc.HasValue)
            {
                query = query.Where(c => c.CreatedAt >= startUtc.Value);
            }
            if (endUtc.HasValue)
            {
                query = query.Where(c => c.CreatedAt <= endUtc.Value);
            }

            var corrections = await query.OrderByDescending(c => c.CreatedAt).Take(500).ToListAsync();

            var visitIds = corrections.Select(c => c.VisitId).Distinct().ToList();
            var userIds = corrections.Select(c => c.CreatedBy).Distinct().ToList();

            var visits = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Branch)
                .Include(v => v.ReferralPartner)
                .Where(v => visitIds.Contains(v.VisitId))
                .AsNoTracking()
                .ToDictionaryAsync(v => v.VisitId);

            var users = await _context.Users
                .Where(u => userIds.Contains(u.UserId))
                .AsNoTracking()
                .ToDictionaryAsync(u => u.UserId, u => !string.IsNullOrEmpty(u.Name) ? u.Name : u.Username);

            var result = corrections.Select(c =>
            {
                visits.TryGetValue(c.VisitId, out var visit);
                users.TryGetValue(c.CreatedBy, out var staffName);

                var changeSummary = new List<string>();
                object? detailedDiff = null;
                try
                {
                    if (!string.IsNullOrWhiteSpace(c.PayloadJson))
                    {
                        using var doc = JsonDocument.Parse(c.PayloadJson);
                        var root = doc.RootElement;

                        // Check if rich ChangeSummary was already compiled
                        if (root.TryGetProperty("ChangeSummary", out var csProp) && csProp.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var item in csProp.EnumerateArray())
                            {
                                var s = item.GetString();
                                if (!string.IsNullOrWhiteSpace(s)) changeSummary.Add(s);
                            }
                        }

                        if (root.TryGetProperty("DetailedDiff", out var ddProp))
                        {
                            detailedDiff = JsonSerializer.Deserialize<object>(ddProp.GetRawText());
                        }

                        // Fallback parsing for legacy records
                        if (!changeSummary.Any())
                        {
                            if (root.TryGetProperty("AddTestCodes", out var addCodes) && addCodes.ValueKind == JsonValueKind.Array)
                            {
                                var codes = addCodes.EnumerateArray().Select(x => x.GetString()).Where(s => !string.IsNullOrEmpty(s)).ToList();
                                if (codes.Any())
                                {
                                    changeSummary.Add($"+Tests: {string.Join(", ", codes)}");
                                }
                            }

                            if (root.TryGetProperty("RemoveOrderIds", out var remOrders) && remOrders.ValueKind == JsonValueKind.Array)
                            {
                                var remCount = remOrders.GetArrayLength();
                                if (remCount > 0)
                                {
                                    changeSummary.Add($"-{remCount} Test{(remCount > 1 ? "s" : "")} Cancelled");
                                }
                            }

                            if (root.TryGetProperty("DoctorChange", out var docChange))
                            {
                                changeSummary.Add($"Doctor: {docChange.GetString()}");
                            }
                            else if (visit?.ReferralPartner != null)
                            {
                                changeSummary.Add($"Doctor: {visit.ReferralPartner.Name}");
                            }

                            if (root.TryGetProperty("BillingMode", out var bMode))
                            {
                                changeSummary.Add($"Mode: {bMode.GetString()}");
                            }

                            if (root.TryGetProperty("SettlementAction", out var setAct) && setAct.GetString() != "None")
                            {
                                var actStr = setAct.GetString();
                                if (actStr == "RefundIssued") changeSummary.Add("Refund Issued at Desk");
                                else if (actStr == "AdditionalPaymentRecorded") changeSummary.Add("Additional Payment Collected");
                            }
                        }
                    }
                }
                catch
                {
                    // Fallback to basic reason
                }

                if (!changeSummary.Any() && visit?.ReferralPartner != null)
                {
                    changeSummary.Add($"Doctor: {visit.ReferralPartner.Name}");
                }

                return new
                {
                    CorrectionId = c.CorrectionId,
                    BillNumber = FormatBillNumber(visit?.Token, visit?.Branch?.Code, c.CreatedAt),
                    VisitId = c.VisitId,
                    InvoiceId = c.InvoiceId,
                    CreatedAt = c.CreatedAt,
                    CreatedByName = staffName ?? "Front Desk Staff",
                    VisitToken = visit?.Token ?? "UNKNOWN",
                    PatientName = visit?.Patient != null ? $"{visit.Patient.FirstName} {visit.Patient.LastName}".Trim() : "Unknown Patient",
                    PatientPhone = visit?.Patient?.CurrentPhoneNumber ?? "",
                    PatientMrn = visit?.Patient?.MRN ?? "",
                    BranchId = visit?.BranchId,
                    BranchName = visit?.Branch?.Name ?? "Main Facility",
                    ReferralPartnerName = visit?.ReferralPartner?.Name,
                    CorrectionType = c.CorrectionType.ToString(),
                    PreviousAmount = c.PreviousAmount,
                    NewAmount = c.NewAmount,
                    DifferenceAmount = c.NewAmount - c.PreviousAmount,
                    Reason = c.Reason ?? "Administrative visit amendment",
                    PayloadJson = c.PayloadJson,
                    ChangeSummary = changeSummary,
                    DetailedDiff = detailedDiff,
                    IsReversal = c.IsReversal
                };
            });

            if (branchId.HasValue && branchId.Value != Guid.Empty)
            {
                result = result.Where(r => r.BranchId == branchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                result = result.Where(r => 
                    (r.VisitToken?.ToLower().Contains(q) ?? false) ||
                    (r.PatientName?.ToLower().Contains(q) ?? false) ||
                    (r.CreatedByName?.ToLower().Contains(q) ?? false) ||
                    (r.Reason?.ToLower().Contains(q) ?? false)
                );
            }

            return Ok(result.ToList());
        }

        [HttpGet("cancellations")]
        public async Task<ActionResult<IEnumerable<object>>> GetVisitCancellations(
            [FromQuery] Guid? branchId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? preset = null,
            [FromQuery] string? search = null)
        {
            var (startUtc, endUtc) = ResolvePresetDateRange(preset, startDate, endDate);

            var query = _context.VisitCancellations
                .Include(c => c.CancelledBy)
                .Include(c => c.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(c => c.Visit)
                    .ThenInclude(v => v.Branch)
                .Include(c => c.Visit)
                    .ThenInclude(v => v.ReferralPartner)
                .Include(c => c.Visit)
                    .ThenInclude(v => v.Invoices)
                        .ThenInclude(i => i.Payments)
                .AsNoTracking();

            if (startUtc.HasValue)
            {
                query = query.Where(c => c.CancelledAt >= startUtc.Value);
            }
            if (endUtc.HasValue)
            {
                query = query.Where(c => c.CancelledAt <= endUtc.Value);
            }

            var list = await query.OrderByDescending(c => c.CancelledAt).Take(500).ToListAsync();

            var cancellationItems = list.Select(c =>
            {
                var visit = c.Visit;
                var invoices = visit?.Invoices ?? new List<Invoice>();
                var payments = invoices.SelectMany(i => i.Payments).ToList();
                var totalPaid = payments.Where(p => p.Amount > 0).Sum(p => p.Amount);
                var refunds = payments.Where(p => p.Amount < 0).Sum(p => Math.Abs(p.Amount));
                var refundMethod = payments.FirstOrDefault(p => p.Amount < 0)?.Method ?? (refunds > 0 ? "Cash" : "None");
                var totalBilled = invoices.Sum(i => i.Total);

                return new
                {
                    CancelId = c.CancelId,
                    ClaimType = "CANCELLATION",
                    BillNumber = FormatBillNumber(visit?.Token, visit?.Branch?.Code, c.CancelledAt),
                    VisitId = c.VisitId,
                    CancelledAt = c.CancelledAt,
                    Reason = c.Reason,
                    Notes = c.Notes,
                    CancelledByName = c.CancelledBy != null && !string.IsNullOrEmpty(c.CancelledBy.Name) ? c.CancelledBy.Name : (c.CancelledBy?.Username ?? "Staff Desk"),
                    VisitToken = visit?.Token ?? "UNKNOWN",
                    PatientName = visit?.Patient != null ? $"{visit.Patient.FirstName} {visit.Patient.LastName}".Trim() : "Direct Patient",
                    PatientPhone = visit?.Patient?.CurrentPhoneNumber ?? "",
                    PatientMrn = visit?.Patient?.MRN ?? "",
                    BranchId = visit?.BranchId,
                    BranchName = visit?.Branch?.Name ?? "Main Facility",
                    ReferralPartnerName = visit?.ReferralPartner?.Name,
                    TotalBilled = totalBilled,
                    TotalAmountPaid = c.TotalAmountPaid > 0 ? c.TotalAmountPaid : totalPaid,
                    RefundedAmount = refunds > 0 ? refunds : c.ImmediateRefundPaid,
                    ImmediateRefundPaid = c.ImmediateRefundPaid > 0 ? c.ImmediateRefundPaid : refunds,
                    BalancePendingRefund = c.BalancePendingRefund > 0 
                        ? c.BalancePendingRefund 
                        : (c.RefundStatus == "Pending" || (string.IsNullOrEmpty(c.RefundStatus) && totalPaid > 0 && refunds < totalPaid) ? Math.Max(0m, totalPaid - refunds) : 0m),
                    RefundStatus = !string.IsNullOrEmpty(c.RefundStatus) && c.RefundStatus != "None"
                        ? c.RefundStatus 
                        : (refunds >= totalPaid && totalPaid > 0 ? "Settled" : (refunds > 0 ? "PartiallySettled" : (totalPaid > 0 ? "Pending" : "None"))),
                    RefundMethod = refundMethod,
                    HasRefund = refunds > 0 || c.BalancePendingRefund > 0 || totalPaid > 0,
                    FinalSettledAt = c.FinalSettledAt,
                    SettlementReceiptNo = c.SettlementReceiptNo,
                    SettlementNotes = c.SettlementNotes
                };
            }).ToList();

            // 2. Also query active retail direct visits where totalPaid > totalBilled (Change Due / Overpaid visits)
            var overpaidVisitsQuery = _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Branch)
                .Include(v => v.ReferralPartner)
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.Payments)
                        .ThenInclude(p => p.ReceivedBy)
                .Where(v => v.Status != VisitStatus.Cancelled 
                         && v.Status != VisitStatus.Draft
                         && (v.Token == null || !v.Token.StartsWith("D-"))
                         && v.BillingType != BillingType.PrepaidPartner
                         && v.PaymentCollectionModel != "PartnerCollects")
                .AsNoTracking();

            if (startUtc.HasValue)
            {
                overpaidVisitsQuery = overpaidVisitsQuery.Where(v => v.CreatedAt >= startUtc.Value);
            }
            if (endUtc.HasValue)
            {
                overpaidVisitsQuery = overpaidVisitsQuery.Where(v => v.CreatedAt <= endUtc.Value);
            }

            var candidateVisits = await overpaidVisitsQuery.OrderByDescending(v => v.CreatedAt).Take(200).ToListAsync();

            var changeDueItems = candidateVisits
                .Where(v =>
                {
                    var invoices = v.Invoices ?? new List<Invoice>();
                    var payments = invoices.SelectMany(i => i.Payments).ToList();
                    var totalPaid = payments.Where(p => p.Amount > 0).Sum(p => p.Amount);
                    var refunds = payments.Where(p => p.Amount < 0).Sum(p => Math.Abs(p.Amount));
                    var totalBilled = invoices.Sum(i => i.Total);
                    var netExcess = totalPaid - totalBilled - refunds;
                    return netExcess > 0;
                })
                .Select(v =>
                {
                    var invoices = v.Invoices ?? new List<Invoice>();
                    var payments = invoices.SelectMany(i => i.Payments).ToList();
                    var totalPaid = payments.Where(p => p.Amount > 0).Sum(p => p.Amount);
                    var refunds = payments.Where(p => p.Amount < 0).Sum(p => Math.Abs(p.Amount));
                    var totalBilled = invoices.Sum(i => i.Total);
                    var netExcess = totalPaid - totalBilled - refunds;
                    var lastPayment = payments.OrderByDescending(p => p.ReceivedAt).FirstOrDefault();

                    return new
                    {
                        CancelId = v.VisitId, // Use VisitId as identifier for Change Due
                        ClaimType = "CHANGE_DUE",
                        BillNumber = FormatBillNumber(v.Token, v.Branch?.Code, v.CreatedAt),
                        VisitId = v.VisitId,
                        CancelledAt = lastPayment?.ReceivedAt ?? v.CreatedAt,
                        Reason = "Counter Cash Tender Change Due (Drawer Shortage)",
                        Notes = lastPayment?.ReceiptNo != null ? $"Cash Tender Receipt: {lastPayment.ReceiptNo}" : "Patient tendered cash; change retained as due",
                        CancelledByName = lastPayment?.ReceivedBy?.Name ?? "Desk Cashier",
                        VisitToken = v.Token ?? "WALK-IN",
                        PatientName = v.Patient != null ? $"{v.Patient.FirstName} {v.Patient.LastName}".Trim() : "Direct Patient",
                        PatientPhone = v.Patient?.CurrentPhoneNumber ?? "",
                        PatientMrn = v.Patient?.MRN ?? "",
                        BranchId = v.BranchId,
                        BranchName = v.Branch?.Name ?? "Main Facility",
                        ReferralPartnerName = v.ReferralPartner?.Name,
                        TotalBilled = totalBilled,
                        TotalAmountPaid = totalPaid,
                        RefundedAmount = refunds,
                        ImmediateRefundPaid = refunds,
                        BalancePendingRefund = Math.Max(0m, netExcess),
                        RefundStatus = netExcess <= 0 ? "Settled" : "Pending",
                        RefundMethod = "Cash",
                        HasRefund = true,
                        FinalSettledAt = (DateTime?)null,
                        SettlementReceiptNo = (string?)null,
                        SettlementNotes = (string?)null
                    };
                }).ToList();

            var combined = cancellationItems.Concat(changeDueItems).OrderByDescending(r => r.CancelledAt).AsEnumerable();

            if (branchId.HasValue && branchId.Value != Guid.Empty)
            {
                combined = combined.Where(r => r.BranchId == branchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                combined = combined.Where(r =>
                    (r.VisitToken?.ToLower().Contains(q) ?? false) ||
                    (r.PatientName?.ToLower().Contains(q) ?? false) ||
                    (r.CancelledByName?.ToLower().Contains(q) ?? false) ||
                    (r.Reason?.ToLower().Contains(q) ?? false) ||
                    (r.PatientPhone?.Contains(q) ?? false)
                );
            }

            return Ok(combined.ToList());
        }

        [HttpPost("cancellations/{cancelId}/disburse-refund")]
        public async Task<IActionResult> DisburseCancellationRefund(
            Guid cancelId,
            [FromBody] DisburseRefundRequestDto request)
        {
            var cancellation = await _context.VisitCancellations
                .Include(c => c.Visit)
                    .ThenInclude(v => v.Patient)
                .Include(c => c.Visit)
                    .ThenInclude(v => v.Invoices)
                        .ThenInclude(i => i.Payments)
                .FirstOrDefaultAsync(c => c.CancelId == cancelId);

            if (cancellation == null)
            {
                // Check if cancelId is a direct VisitId for Change Due / Overpaid visits
                var overpaidVisit = await _context.Visits
                    .Include(v => v.Patient)
                    .Include(v => v.Invoices)
                        .ThenInclude(i => i.Payments)
                    .FirstOrDefaultAsync(v => v.VisitId == cancelId);

                if (overpaidVisit != null)
                {
                    var overpaidInvoice = overpaidVisit.Invoices.FirstOrDefault();
                    if (overpaidInvoice == null)
                    {
                        return BadRequest(new { message = "Associated invoice not found for this visit." });
                    }

                    var pms = overpaidInvoice.Payments.ToList();
                    var tp = pms.Where(p => p.Amount > 0).Sum(p => p.Amount);
                    var rf = pms.Where(p => p.Amount < 0).Sum(p => Math.Abs(p.Amount));
                    var tb = overpaidInvoice.Total;
                    var pendingChange = Math.Max(0m, tp - tb - rf);

                    if (pendingChange <= 0)
                    {
                        return BadRequest(new { message = "This visit has no pending change due balance to disburse." });
                    }

                    var amtToDisburse = request.Amount > 0 ? Math.Min(request.Amount, pendingChange) : pendingChange;
                    var uIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                                      ?? User.FindFirst("sub")?.Value;
                    Guid uId = Guid.Empty;
                    if (uIdClaim != null && Guid.TryParse(uIdClaim, out var pId)) uId = pId;
                    else uId = await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();

                    var meth = !string.IsNullOrWhiteSpace(request.PaymentMethod) ? request.PaymentMethod : "Cash";
                    var rNo = $"CHG-DISB-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

                    var changeDisbPayment = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        InvoiceId = overpaidInvoice.InvoiceId,
                        Amount = -amtToDisburse,
                        Method = meth,
                        ReceiptNo = rNo,
                        ReceivedAt = DateTime.UtcNow,
                        ReceivedByUserId = uId
                    };
                    _context.Payments.Add(changeDisbPayment);

                    await _revenueFactWriter.DeclareRevenueFactAsync(new SynOS.Models.DTOs.Revenue.DeclareRevenueFactCommand
                    {
                        OccurredAt = DateTimeOffset.UtcNow,
                        Amount = amtToDisburse,
                        Currency = "INR",
                        Direction = RevenueDirection.Reversal,
                        SourceType = RevenueSourceType.Patient,
                        SourceReferenceId = overpaidVisit.VisitId.ToString(),
                        PaymentMode = meth.IndexOf("Cash", StringComparison.OrdinalIgnoreCase) >= 0 
                            ? PaymentMode.Cash 
                            : PaymentMode.UPI,
                        DeclaredByUserId = uId,
                        Notes = $"Disbursed counter change due for visit {overpaidVisit.Token}: {request.Notes}",
                        ExternalTransactionId = rNo
                    });

                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        success = true,
                        receiptNo = rNo,
                        amountDisbursed = amtToDisburse,
                        remainingBalance = Math.Max(0m, pendingChange - amtToDisburse),
                        refundStatus = (pendingChange - amtToDisburse) <= 0 ? "Settled" : "PartiallySettled",
                        paymentMethod = meth,
                        disbursedAt = DateTime.UtcNow,
                        claimType = "CHANGE_DUE"
                    });
                }

                return NotFound(new { message = $"Refund or change due record {cancelId} not found." });
            }

            var visit = cancellation.Visit;
            if (visit == null)
            {
                return BadRequest(new { message = "Associated visit not found." });
            }

            var invoice = visit.Invoices.FirstOrDefault();
            if (invoice == null)
            {
                return BadRequest(new { message = "Associated invoice not found." });
            }

            // Determine current pending balance
            var payments = invoice.Payments.ToList();
            var totalPaid = payments.Where(p => p.Amount > 0).Sum(p => p.Amount);
            var alreadyRefunded = payments.Where(p => p.Amount < 0).Sum(p => Math.Abs(p.Amount));
            var maxRefundable = Math.Max(0m, totalPaid - alreadyRefunded);

            var effectivePending = cancellation.BalancePendingRefund > 0 ? cancellation.BalancePendingRefund : maxRefundable;
            if (effectivePending <= 0)
            {
                return BadRequest(new { message = "This cancellation has no pending refund balance to disburse." });
            }

            var amountToDisburse = request.Amount > 0 ? Math.Min(request.Amount, effectivePending) : effectivePending;
            if (amountToDisburse <= 0)
            {
                return BadRequest(new { message = "Disbursement amount must be greater than zero." });
            }

            // Resolve actor userId
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                              ?? User.FindFirst("sub")?.Value;
            Guid userId = Guid.Empty;
            if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedId))
            {
                userId = parsedId;
            }
            else
            {
                userId = await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();
            }

            var method = !string.IsNullOrWhiteSpace(request.PaymentMethod) ? request.PaymentMethod : "Cash";
            var receiptNo = $"REF-DISB-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

            var refundPayment = new Payment
            {
                PaymentId = Guid.NewGuid(),
                InvoiceId = invoice.InvoiceId,
                Amount = -amountToDisburse,
                Method = method,
                ReceiptNo = receiptNo,
                ReceivedAt = DateTime.UtcNow,
                ReceivedByUserId = userId
            };
            _context.Payments.Add(refundPayment);

            // Update cancellation record
            cancellation.TotalAmountPaid = totalPaid;
            cancellation.ImmediateRefundPaid = alreadyRefunded + amountToDisburse;
            cancellation.BalancePendingRefund = Math.Max(0m, effectivePending - amountToDisburse);
            cancellation.RefundStatus = cancellation.BalancePendingRefund <= 0 ? "Settled" : "PartiallySettled";
            cancellation.FinalSettledAt = DateTime.UtcNow;
            cancellation.FinalSettledByUserId = userId;
            cancellation.SettlementReceiptNo = receiptNo;
            if (!string.IsNullOrWhiteSpace(request.Notes))
            {
                cancellation.SettlementNotes = string.IsNullOrWhiteSpace(cancellation.SettlementNotes)
                    ? request.Notes
                    : $"{cancellation.SettlementNotes}; {request.Notes}";
            }

            // Declare Outflow RevenueFact
            await _revenueFactWriter.DeclareRevenueFactAsync(new SynOS.Models.DTOs.Revenue.DeclareRevenueFactCommand
            {
                OccurredAt = DateTimeOffset.UtcNow,
                Amount = amountToDisburse,
                Currency = "INR",
                Direction = RevenueDirection.Reversal,
                SourceType = RevenueSourceType.Patient,
                SourceReferenceId = cancellation.CancelId.ToString(),
                PaymentMode = method.IndexOf("Cash", StringComparison.OrdinalIgnoreCase) >= 0 
                    ? PaymentMode.Cash 
                    : PaymentMode.UPI,
                DeclaredByUserId = userId,
                Notes = $"Disbursed pending refund for cancelled visit {visit.Token}: {request.Notes}",
                ExternalTransactionId = receiptNo
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                receiptNo = receiptNo,
                amountDisbursed = amountToDisburse,
                remainingBalance = cancellation.BalancePendingRefund,
                refundStatus = cancellation.RefundStatus,
                paymentMethod = method,
                disbursedAt = DateTime.UtcNow
            });
        }

        [HttpGet("cash-drawer/my-ledger")]
        public async Task<IActionResult> GetMyCashDrawerLedger(
            [FromQuery] DateTime? date = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? preset = null,
            [FromQuery] string? range = null,
            [FromQuery] Guid? userId = null)
        {
            // 1. Resolve user ID
            Guid effectiveUserId = Guid.Empty;
            if (userId.HasValue && userId.Value != Guid.Empty)
            {
                effectiveUserId = userId.Value;
            }
            else
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                                  ?? User.FindFirst("sub")?.Value;
                if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedId))
                {
                    effectiveUserId = parsedId;
                }
                else
                {
                    effectiveUserId = await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();
                }
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == effectiveUserId);
            var userName = user != null && !string.IsNullOrEmpty(user.Name) ? user.Name : (user?.Username ?? "Desk Cashier");

            // 2. Resolve date range
            DateTime startUtc;
            DateTime endUtc;
            var targetDate = date ?? _labTimeProvider.GetLabNow();

            var effectivePreset = preset ?? range;
            if (!string.IsNullOrWhiteSpace(effectivePreset) || startDate.HasValue || endDate.HasValue)
            {
                var (resolvedStart, resolvedEnd) = ResolvePresetDateRange(effectivePreset, startDate, endDate);
                startUtc = resolvedStart ?? _labTimeProvider.GetLabNow().Date.ToUniversalTime();
                endUtc = resolvedEnd ?? startUtc.AddDays(1);
            }
            else
            {
                startUtc = targetDate.Date.ToUniversalTime();
                endUtc = startUtc.AddDays(1);
            }

            // 3. Query all Cash Payments received by this user today
            var cashPayments = await _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                        .ThenInclude(v => v.ReferralPartner)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                        .ThenInclude(v => v.Orders)
                            .ThenInclude(o => o.Test)
                .Where(p => p.ReceivedByUserId == effectiveUserId 
                         && p.Method.ToLower().Contains("cash")
                         && p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc)
                .OrderBy(p => p.ReceivedAt)
                .AsNoTracking()
                .ToListAsync();

            // 4. Query all Cash Daily Expenses recorded by this user today
            var userPayables = await _context.OverheadPayableFacts
                .Where(p => p.CreatedBy == effectiveUserId
                         && p.CreatedAt >= startUtc && p.CreatedAt < endUtc
                         && p.Status != SynOS.Models.Enums.Payables.VendorPayableStatus.Cancelled)
                .OrderBy(p => p.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            List<SpendFact> userSpendFacts = new();
            if (userPayables.Any())
            {
                var userPrefixes = userPayables.Select(p => $"OHP-{p.OverheadPayableId.ToString().Substring(0, 8)}").ToList();
                userSpendFacts = await _context.SpendFacts
                    .Where(s => userPrefixes.Any(pfx => s.TransactionReference.StartsWith(pfx)))
                    .AsNoTracking()
                    .ToListAsync();
            }

            // 5. Build unified transaction items
            var transactions = new List<CashDrawerLedgerItemDto>();

            foreach (var p in cashPayments)
            {
                var visit = p.Invoice?.Visit;
                var patientName = visit?.Patient != null ? $"{visit.Patient.FirstName} {visit.Patient.LastName}".Trim() : "Direct Patient";
                var isRefund = p.Amount < 0;
                var isB2B = visit != null && (visit.PaymentCollectionModel == "PartnerCollects" || (visit.ReferralPartnerId != null && (p.ReceiptNo.StartsWith("RCP-B2B") || p.ReceiptNo.StartsWith("REC-B2B"))));
                var testNames = visit?.Orders?.Select(o => o.Test?.TestName).Where(n => !string.IsNullOrEmpty(n)).Take(2).ToList() ?? new List<string?>();
                var testSummary = testNames.Any() ? string.Join(", ", testNames) : "Clinical Investigation";

                string type;
                string category;
                string particulars;

                if (isRefund)
                {
                    type = "PATIENT_REFUND";
                    category = "Outflow";
                    particulars = $"Refund to {patientName} (Token: {visit?.Token ?? "Cancelled"})";
                }
                else if (isB2B)
                {
                    type = "B2B_CASH";
                    category = "Inflow";
                    particulars = $"B2B Partner Inflow: {visit?.ReferralPartner?.Name ?? "Referral Partner"} ({patientName})";
                }
                else
                {
                    type = "PATIENT_CASH";
                    category = "Inflow";
                    if (p.TenderedAmount.HasValue && p.TenderedAmount.Value > p.Amount)
                    {
                        var changeRet = p.ChangeReturned ?? (p.TenderedAmount.Value - p.Amount);
                        particulars = $"{patientName} • {testSummary} (Tendered: ₹{p.TenderedAmount.Value:N2}, Change: ₹{changeRet:N2})";
                    }
                    else
                    {
                        particulars = $"{patientName} • {testSummary} ({visit?.Token ?? "Walk-In"})";
                    }
                }

                transactions.Add(new CashDrawerLedgerItemDto
                {
                    Id = p.PaymentId.ToString(),
                    Timestamp = p.ReceivedAt,
                    Type = type,
                    Category = category,
                    ReferenceNo = p.ReceiptNo,
                    Token = visit?.Token,
                    Particulars = particulars,
                    Amount = Math.Abs(p.Amount),
                    TenderedAmount = p.TenderedAmount,
                    ChangeReturned = p.ChangeReturned,
                    InflowAmount = p.Amount > 0 ? p.Amount : 0m,
                    OutflowAmount = p.Amount < 0 ? Math.Abs(p.Amount) : 0m,
                    PaymentMethod = "Cash",
                    Notes = p.ReceiptNo
                });
            }

            foreach (var up in userPayables)
            {
                var pfx = $"OHP-{up.OverheadPayableId.ToString().Substring(0, 8)}";
                var sf = userSpendFacts.FirstOrDefault(s => s.TransactionReference.StartsWith(pfx));
                bool isCashExpense = (sf != null && sf.PaymentMethod == PaymentMethod.Cash) || (sf == null && up.AmountPaid > 0);
                if (isCashExpense)
                {
                    transactions.Add(new CashDrawerLedgerItemDto
                    {
                        Id = up.OverheadPayableId.ToString(),
                        Timestamp = up.CreatedAt,
                        Type = "DAILY_EXPENSE",
                        Category = "Outflow",
                        ReferenceNo = $"EXP-{up.OverheadPayableId.ToString()[..8].ToUpper()}",
                        Token = null,
                        Particulars = $"Expense: {(!string.IsNullOrEmpty(up.Description) ? up.Description : "Petty Cash")} • {up.Category}",
                        Amount = up.AmountPaid,
                        InflowAmount = 0m,
                        OutflowAmount = up.AmountPaid,
                        PaymentMethod = "Cash",
                        Notes = up.Description
                    });
                }
            }

            // Sort chronologically ascending
            transactions = transactions.OrderBy(t => t.Timestamp).ToList();

            // Compute running balance
            decimal running = 0m;
            foreach (var t in transactions)
            {
                running += (t.InflowAmount - t.OutflowAmount);
                t.RunningBalance = running;
            }

            var totalInflow = transactions.Sum(t => t.InflowAmount);
            var totalOutflow = transactions.Sum(t => t.OutflowAmount);
            var patientCashTotal = transactions.Where(t => t.Type == "PATIENT_CASH").Sum(t => t.InflowAmount);
            var b2bCashTotal = transactions.Where(t => t.Type == "B2B_CASH").Sum(t => t.InflowAmount);
            var expenseOutflowTotal = transactions.Where(t => t.Type == "DAILY_EXPENSE").Sum(t => t.OutflowAmount);
            var refundOutflowTotal = transactions.Where(t => t.Type == "PATIENT_REFUND").Sum(t => t.OutflowAmount);
            var netCash = Math.Max(0m, totalInflow - totalOutflow);

            return Ok(new
            {
                userId = effectiveUserId,
                userName = userName,
                shiftDate = targetDate.ToString("yyyy-MM-dd"),
                openingFloat = 0.00m,
                totalInflow = totalInflow,
                totalOutflow = totalOutflow,
                netCashInDrawer = netCash,
                inflowBreakdown = new
                {
                    patientDeskCash = patientCashTotal,
                    b2bPartnerCash = b2bCashTotal,
                    otherInflows = totalInflow - (patientCashTotal + b2bCashTotal)
                },
                outflowBreakdown = new
                {
                    dailyExpensesCash = expenseOutflowTotal,
                    refundsCash = refundOutflowTotal,
                    otherOutflows = totalOutflow - (expenseOutflowTotal + refundOutflowTotal)
                },
                transactionCount = transactions.Count,
                transactions = transactions
            });
        }

        /// <summary>
        /// GET /api/v1/finance/bills/cash-drawer/my-shift-closing
        /// Returns a pre-filled, comprehensive cashier shift closing summary covering billing activity, inflows, outflows, and drawer reconciliation.
        /// </summary>
        [HttpGet("cash-drawer/my-shift-closing")]
        [Authorize]
        public async Task<IActionResult> GetMyShiftClosingSummary([FromQuery] DateOnly? date)
        {
            var rawUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(rawUserId) || !Guid.TryParse(rawUserId, out var currentUserId))
            {
                return Unauthorized(new { message = "User identity claim not found or invalid." });
            }

            var todayLab = _labTimeProvider.GetLabNow();
            var targetDate = date.HasValue ? date.Value.ToDateTime(TimeOnly.MinValue) : todayLab.Date;
            var startUtc = targetDate.Date.ToUniversalTime();
            var endUtc = startUtc.AddDays(1);

            var userRecord = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == currentUserId);
            var userName = userRecord?.Name ?? "Reception Cashier";

            Guid branchId = Guid.Empty;
            if (Request.Headers.TryGetValue("X-Branch-Id", out var headerBranch) && Guid.TryParse(headerBranch, out var bId))
            {
                branchId = bId;
            }
            else
            {
                var ubr = await _context.UserBranchRoles.AsNoTracking().FirstOrDefaultAsync(ub => ub.UserId == currentUserId);
                branchId = ubr?.BranchId ?? Guid.Empty;
            }

            // 1. Check existing submission
            var existingSubmission = await _context.CashierShiftClosings
                .Where(s => s.UserId == currentUserId && s.ShiftDate.Date == targetDate.Date)
                .OrderByDescending(s => s.SubmittedAt)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            // 2. Cashier payments today
            var cashierPayments = await _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Visit)
                        .ThenInclude(v => v.ReferralPartner)
                .Where(p => p.ReceivedByUserId == currentUserId
                         && p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc)
                .AsNoTracking()
                .ToListAsync();

            // 3. Visits handled/created by cashier today
            var visitsToday = await _context.Visits
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.Payments)
                .Include(v => v.ReferralPartner)
                .Include(v => v.Patient)
                .Where(v => (v.CreatedByUserId == currentUserId || v.Invoices.Any(i => i.Payments.Any(p => p.ReceivedByUserId == currentUserId)))
                         && v.Status != VisitStatus.Cancelled
                         && v.Status != VisitStatus.Draft
                         && (v.TokenDate.Date == targetDate.Date || (v.CreatedAt >= startUtc && v.CreatedAt < endUtc)))
                .AsNoTracking()
                .ToListAsync();

            // Standard / Retail Walk-in Visits
            var standardVisits = visitsToday.Where(v => v.PaymentCollectionModel != "PartnerCollects" 
                                                     && v.BillingType != BillingType.PrepaidPartner 
                                                     && v.BillingType != BillingType.Insurance).ToList();
            var standardGross = standardVisits.Sum(v => v.Invoices?.FirstOrDefault()?.GrossAmount ?? 0m);
            var standardDiscount = standardVisits.Sum(v => v.Invoices?.FirstOrDefault()?.DiscountAmount ?? 0m);
            var standardNet = standardVisits.Sum(v => v.Invoices?.FirstOrDefault()?.Total ?? 0m);
            var standardDue = standardVisits.Sum(v => {
                var inv = v.Invoices?.FirstOrDefault();
                if (inv == null) return 0m;
                var paid = inv.Payments?.Sum(p => p.Amount) ?? 0m;
                return Math.Max(0m, inv.Total - paid);
            });

            var standardCashPayments = cashierPayments.Where(p => p.Method.ToLower().Contains("cash") 
                                                               && p.Amount > 0 
                                                               && !p.ReceiptNo.StartsWith("RCP-B2B")
                                                               && !p.ReceiptNo.StartsWith("REC-B2B")).ToList();
            var standardCashCollected = standardCashPayments.Sum(p => p.Amount);

            var standardUpiPayments = cashierPayments.Where(p => (p.Method.ToLower().Contains("upi") || p.Method.ToLower().Contains("online") || p.Method.ToLower().Contains("qr")) 
                                                              && p.Amount > 0).ToList();
            var standardUpiCollected = standardUpiPayments.Sum(p => p.Amount);

            var standardCardPayments = cashierPayments.Where(p => (p.Method.ToLower().Contains("card") || p.Method.ToLower().Contains("bank")) 
                                                               && p.Amount > 0).ToList();
            var standardCardCollected = standardCardPayments.Sum(p => p.Amount);

            // Corporate B2B (Prepaid Partner)
            var b2bVisits = visitsToday.Where(v => v.PaymentCollectionModel == "PartnerCollects" || v.BillingType == BillingType.PrepaidPartner).ToList();
            var b2bGross = b2bVisits.Sum(v => v.Invoices?.FirstOrDefault()?.GrossAmount ?? 0m);
            var b2bPartnerBilled = b2bVisits.Sum(v => v.Invoices?.FirstOrDefault()?.Total ?? 0m);

            // Insurance / TPA
            var insuranceVisits = visitsToday.Where(v => v.BillingType == BillingType.Insurance).ToList();
            var insuranceClaims = insuranceVisits.Count;
            var insurancePreAuthGross = insuranceVisits.Sum(v => v.Invoices?.FirstOrDefault()?.Total ?? 0m);
            var insuranceCoPayCash = cashierPayments.Where(p => p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.BillingType == BillingType.Insurance && p.Method.ToLower().Contains("cash")).Sum(p => p.Amount);

            // Mid-Shift Desk Inflows: B2B Debt Recoveries at Desk
            var b2bCashSettlements = cashierPayments.Where(p => p.Method.ToLower().Contains("cash") && (p.ReceiptNo.StartsWith("RCP-B2B") || p.ReceiptNo.StartsWith("REC-B2B"))).ToList();
            var b2bCashRecovered = b2bCashSettlements.Sum(p => p.Amount);

            // Mid-Shift Desk Outflows: Daily Expenses & Refunds
            var userExpenses = await _context.OverheadPayableFacts
                .Where(p => p.CreatedBy == currentUserId
                         && p.CreatedAt >= startUtc && p.CreatedAt < endUtc
                         && p.Status != SynOS.Models.Enums.Payables.VendorPayableStatus.Cancelled)
                .AsNoTracking()
                .ToListAsync();
            var dailyExpensesCash = userExpenses.Sum(e => e.AmountPaid);

            var userRefunds = cashierPayments.Where(p => p.Amount < 0).ToList();
            var cashRefundsDisbursed = Math.Abs(userRefunds.Where(p => p.Method.ToLower().Contains("cash")).Sum(p => p.Amount));

            // Drawer Balance Calculations
            decimal openingFloat = existingSubmission?.OpeningFloat ?? 0.00m;
            decimal totalCashInflow = standardCashCollected + b2bCashRecovered + insuranceCoPayCash;
            decimal totalCashOutflow = dailyExpensesCash + cashRefundsDisbursed;
            decimal systemExpectedCash = Math.Max(0m, openingFloat + totalCashInflow - totalCashOutflow);

            var supervisors = await _context.Users
                .AsNoTracking()
                .Where(u => u.IsActive && u.UserId != currentUserId)
                .OrderBy(u => u.Name)
                .Select(u => new { u.UserId, u.Name, designation = u.Designation ?? "Staff / Supervisor" })
                .ToListAsync();

            return Ok(new
            {
                userId = currentUserId,
                userName = userName,
                shiftDate = targetDate.ToString("yyyy-MM-dd"),
                supervisors = supervisors,
                isAlreadySubmitted = existingSubmission != null,
                existingSubmission = existingSubmission != null ? new
                {
                    shiftClosingId = existingSubmission.ShiftClosingId,
                    shiftDate = existingSubmission.ShiftDate.ToString("yyyy-MM-dd"),
                    shiftName = existingSubmission.ShiftName,
                    openingFloat = existingSubmission.OpeningFloat,
                    systemExpectedCash = existingSubmission.SystemExpectedCash,
                    physicalCountedCash = existingSubmission.PhysicalCountedCash,
                    variance = existingSubmission.Variance,
                    status = existingSubmission.Status,
                    handoverNotes = existingSubmission.HandoverNotes,
                    submittedAt = existingSubmission.SubmittedAt,
                    denominations = !string.IsNullOrEmpty(existingSubmission.DenominationsJson) ? JsonSerializer.Deserialize<object>(existingSubmission.DenominationsJson) : null
                } : null,
                retailActivity = new
                {
                    billsCount = standardVisits.Count,
                    grossTariff = standardGross,
                    discountAmount = standardDiscount,
                    netBilled = standardNet,
                    cashCollected = standardCashCollected,
                    upiCollected = standardUpiCollected,
                    cardCollected = standardCardCollected,
                    remainingDue = standardDue
                },
                b2bActivity = new
                {
                    billsCount = b2bVisits.Count,
                    grossTariff = b2bGross,
                    partnerBilled = b2bPartnerBilled,
                    deskCash = 0.00m
                },
                insuranceActivity = new
                {
                    claimsCount = insuranceClaims,
                    preAuthGross = insurancePreAuthGross,
                    coPayCashCollected = insuranceCoPayCash
                },
                inflows = new
                {
                    b2bCashRecovered = b2bCashRecovered,
                    b2bSettlementsCount = b2bCashSettlements.Count,
                    settlements = b2bCashSettlements.Select(s => new
                    {
                        receiptNo = s.ReceiptNo,
                        partnerName = s.Invoice?.Visit?.ReferralPartner?.Name ?? "Referral Partner",
                        amount = s.Amount,
                        time = s.ReceivedAt.ToString("HH:mm")
                    }).ToList()
                },
                outflows = new
                {
                    dailyExpensesCash = dailyExpensesCash,
                    expensesCount = userExpenses.Count,
                    refundsCash = cashRefundsDisbursed,
                    refundsCount = userRefunds.Count,
                    expenses = userExpenses.Select(e => new
                    {
                        reference = $"EXP-{e.OverheadPayableId.ToString()[..8].ToUpper()}",
                        description = e.Description,
                        category = e.Category,
                        amount = e.AmountPaid,
                        time = e.CreatedAt.ToString("HH:mm")
                    }).ToList()
                },
                reconciliation = new
                {
                    openingFloat = openingFloat,
                    patientDeskCash = standardCashCollected + insuranceCoPayCash,
                    b2bRecoveriesCash = b2bCashRecovered,
                    totalInflowCash = totalCashInflow,
                    expensesCash = dailyExpensesCash,
                    refundsCash = cashRefundsDisbursed,
                    totalOutflowCash = totalCashOutflow,
                    systemExpectedCash = systemExpectedCash
                }
            });
        }

        /// <summary>
        /// POST /api/v1/finance/bills/cash-drawer/submit-shift-closing
        /// Commits the cashier's shift closing record with physical denomination counts and calculated variance.
        /// </summary>
        [HttpPost("cash-drawer/submit-shift-closing")]
        [Authorize]
        public async Task<IActionResult> SubmitShiftClosing([FromBody] SubmitShiftClosingRequestDto request)
        {
            var rawUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(rawUserId) || !Guid.TryParse(rawUserId, out var currentUserId))
            {
                return Unauthorized(new { message = "User identity claim not found or invalid." });
            }

            var targetDate = _labTimeProvider.GetLabNow().Date;
            var startUtc = targetDate.ToUniversalTime();
            var endUtc = startUtc.AddDays(1);

            var userRecord = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == currentUserId);
            Guid branchId = Guid.Empty;
            if (Request.Headers.TryGetValue("X-Branch-Id", out var headerBranch) && Guid.TryParse(headerBranch, out var bId))
            {
                branchId = bId;
            }
            else
            {
                var ubr = await _context.UserBranchRoles.AsNoTracking().FirstOrDefaultAsync(ub => ub.UserId == currentUserId);
                branchId = ubr?.BranchId ?? Guid.Empty;
            }

            // Calculate live system expected cash
            var cashierPayments = await _context.Payments
                .Where(p => p.ReceivedByUserId == currentUserId 
                         && p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc
                         && p.Method.ToLower().Contains("cash"))
                .AsNoTracking()
                .ToListAsync();

            var userExpenses = await _context.OverheadPayableFacts
                .Where(p => p.CreatedBy == currentUserId
                         && p.CreatedAt >= startUtc && p.CreatedAt < endUtc
                         && p.Status != SynOS.Models.Enums.Payables.VendorPayableStatus.Cancelled)
                .AsNoTracking()
                .ToListAsync();

            decimal totalInflow = cashierPayments.Where(p => p.Amount > 0).Sum(p => p.Amount);
            decimal refundsOutflow = Math.Abs(cashierPayments.Where(p => p.Amount < 0).Sum(p => p.Amount));
            decimal expensesOutflow = userExpenses.Sum(e => e.AmountPaid);
            decimal totalOutflow = expensesOutflow + refundsOutflow;
            decimal baseSystemExpected = Math.Max(0m, request.OpeningFloat + totalInflow - totalOutflow);
            decimal systemExpected = request.AdjustedExpectedCash.HasValue && request.AdjustedExpectedCash.Value >= 0 
                ? request.AdjustedExpectedCash.Value 
                : baseSystemExpected;

            decimal physicalCounted = request.Denominations != null ? request.Denominations.CalculateTotal() : request.PhysicalCountedCash;
            decimal variance = physicalCounted - systemExpected;

            var shiftClosing = new CashierShiftClosing
            {
                ShiftClosingId = Guid.NewGuid(),
                BranchId = branchId,
                UserId = currentUserId,
                ShiftDate = targetDate,
                ShiftName = !string.IsNullOrWhiteSpace(request.ShiftName) ? request.ShiftName : "Day",
                OpeningFloat = request.OpeningFloat,
                SystemExpectedCash = systemExpected,
                PhysicalCountedCash = physicalCounted,
                Variance = variance,
                DenominationsJson = request.Denominations != null ? JsonSerializer.Serialize(request.Denominations) : null,
                ActivitySummaryJson = request.ActivitySummaryJson ?? (request.CorrectionsJson != null ? JsonSerializer.Serialize(new { corrections = request.CorrectionsJson, baseSystemExpected }) : null),
                Status = Math.Abs(variance) < 0.01m ? "Submitted" : "Discrepancy",
                HandoverNotes = !string.IsNullOrWhiteSpace(request.OpeningFloatSource)
                    ? $"[Opening Float from: {request.OpeningFloatSource.Trim()}] {request.HandoverNotes}".Trim()
                    : request.HandoverNotes,
                SubmittedAt = DateTimeOffset.UtcNow,
                VerifiedByUserId = request.SupervisorUserId
            };

            _context.CashierShiftClosings.Add(shiftClosing);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Shift closing handover submitted successfully.",
                shiftClosingId = shiftClosing.ShiftClosingId,
                shiftDate = shiftClosing.ShiftDate.ToString("yyyy-MM-dd"),
                cashierName = userRecord?.Name ?? "Reception Cashier",
                openingFloat = shiftClosing.OpeningFloat,
                systemExpectedCash = shiftClosing.SystemExpectedCash,
                physicalCountedCash = shiftClosing.PhysicalCountedCash,
                variance = shiftClosing.Variance,
                status = shiftClosing.Status,
                handoverNotes = shiftClosing.HandoverNotes,
                submittedAt = shiftClosing.SubmittedAt
            });
        }

        /// <summary>
        /// POST /api/v1/finance/bills/cash-drawer/verify-shift-closing/{id}
        /// Supervisor/Owner acknowledgment of physical cash envelope handover.
        /// Stamped with verified timestamp, supervisor ID, and status 'Verified'.
        /// </summary>
        [HttpPost("cash-drawer/verify-shift-closing/{id}")]
        [Authorize]
        public async Task<IActionResult> VerifyShiftClosing(Guid id, [FromBody] VerifyShiftClosingRequestDto? request)
        {
            var closing = await _context.CashierShiftClosings.FindAsync(id);
            if (closing == null)
            {
                return NotFound(new { message = "Shift closing handover record not found." });
            }

            var rawUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("sub")?.Value;
            Guid supervisorId = Guid.Empty;
            if (!string.IsNullOrEmpty(rawUserId) && Guid.TryParse(rawUserId, out var parsedId))
            {
                supervisorId = parsedId;
            }

            closing.VerifiedByUserId = supervisorId;
            closing.VerifiedAt = DateTimeOffset.UtcNow;
            closing.Status = "Verified";

            if (!string.IsNullOrWhiteSpace(request?.Notes))
            {
                closing.HandoverNotes = string.IsNullOrWhiteSpace(closing.HandoverNotes)
                    ? $"[Verified: {request.Notes}]"
                    : $"{closing.HandoverNotes} | [Verified: {request.Notes}]";
            }

            await _context.SaveChangesAsync();

            var supervisor = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == supervisorId);

            return Ok(new
            {
                success = true,
                message = "Shift cash handover acknowledged and verified successfully.",
                shiftClosingId = closing.ShiftClosingId,
                status = closing.Status,
                verifiedBy = supervisor?.Name ?? "Supervisor",
                verifiedAt = closing.VerifiedAt
            });
        }

        #endregion

        #region Stationery & Billing Settings

        private static string GetConfigFilePath(string fileName)
        {
            try
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
                if (!string.IsNullOrEmpty(appData))
                {
                    var dir = System.IO.Path.Combine(appData, "SynOS", "Config");
                    if (!System.IO.Directory.Exists(dir))
                    {
                        System.IO.Directory.CreateDirectory(dir);
                    }
                    var persistentPath = System.IO.Path.Combine(dir, fileName);

                    // If file already exists in persistent storage, use it
                    if (System.IO.File.Exists(persistentPath))
                    {
                        return persistentPath;
                    }

                    // If it exists in BaseDirectory (from previous session), migrate to persistent storage
                    var legacyPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, fileName);
                    if (System.IO.File.Exists(legacyPath))
                    {
                        try
                        {
                            System.IO.File.Copy(legacyPath, persistentPath, overwrite: true);
                        }
                        catch { }
                    }

                    return persistentPath;
                }
            }
            catch { }

            return System.IO.Path.Combine(System.AppContext.BaseDirectory, fileName);
        }

        [HttpGet("stationery-settings")]
        public async Task<IActionResult> GetStationerySettings()
        {
            var path = GetConfigFilePath("billing_stationery_settings.json");
            var lab = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var defaultSettings = new Dictionary<string, object>
            {
                ["labLegalName"] = !string.IsNullOrEmpty(lab?.Name) ? lab.Name : "SynOS Diagnostic Centre & Laboratory",
                ["labTradeName"] = !string.IsNullOrEmpty(lab?.Tagline) ? lab.Tagline : "Advanced Pathology & Imaging Services",
                ["address"] = !string.IsNullOrEmpty(lab?.Address) ? lab.Address : "Central Diagnostic Facility Complex",
                ["phone"] = !string.IsNullOrEmpty(lab?.Phone) ? lab.Phone : "+91 98765 43210",
                ["email"] = !string.IsNullOrEmpty(lab?.Email) ? lab.Email : "billing@synoslab.in",
                ["website"] = !string.IsNullOrEmpty(lab?.Website) ? lab.Website : "www.synoslab.in",
                ["gstin"] = "36AAAAA0000A1Z5",
                ["pan"] = "AAAAA0000A",
                ["bankName"] = "HDFC Bank",
                ["accountNumber"] = "50200012345678",
                ["ifscCode"] = "HDFC0001234",
                ["branch"] = !string.IsNullOrEmpty(lab?.LabCity) ? $"{lab.LabCity} Branch" : "Main Branch",
                ["accountHolderName"] = !string.IsNullOrEmpty(lab?.Name) ? lab.Name : "SynOS Healthcare Diagnostic Services",
                ["upiId"] = !string.IsNullOrEmpty(lab?.UpiId) ? lab.UpiId : "synoslab@hdfcbank",
                ["enableUpiQr"] = true,
                ["customQrImage"] = "",
                ["defaultLetterheadMode"] = "digital", // "digital" | "preprinted"
                ["topMarginMm"] = lab?.HeaderHeightMm > 0 ? lab.HeaderHeightMm : 40,
                ["bottomMarginMm"] = lab?.FooterMarginMm > 0 ? lab.FooterMarginMm : 15,
                ["termsAndConditions"] = "1. All disputes are subject to local jurisdiction.\n2. Payment terms: Due within 15 days of invoice date.\n3. In case of online payment, please mention invoice or statement reference number.\n4. Cheques are subject to realization.",
                ["signatoryTitle"] = "Authorised Signatory / Accounts Desk"
            };

            if (!System.IO.File.Exists(path))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(defaultSettings, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                await System.IO.File.WriteAllTextAsync(path, json);
                try
                {
                    var legacyPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, "billing_stationery_settings.json");
                    await System.IO.File.WriteAllTextAsync(legacyPath, json);
                }
                catch { }
                return Content(json, "application/json");
            }

            var existing = await System.IO.File.ReadAllTextAsync(path);
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(existing);
                if (!doc.RootElement.TryGetProperty("labLegalName", out _))
                {
                    // If file exists but is corrupted or dummy test json, merge with defaults
                    foreach (var prop in doc.RootElement.EnumerateObject())
                    {
                        defaultSettings[prop.Name] = prop.Value.ToString();
                    }
                    var mergedJson = System.Text.Json.JsonSerializer.Serialize(defaultSettings, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                    return Content(mergedJson, "application/json");
                }
            }
            catch {}

            return Content(existing, "application/json");
        }

        [HttpPost("stationery-settings")]
        public async Task<IActionResult> SaveStationerySettings([FromBody] System.Text.Json.JsonElement settings)
        {
            var path = GetConfigFilePath("billing_stationery_settings.json");
            var json = settings.ToString();
            await System.IO.File.WriteAllTextAsync(path, json);
            try
            {
                var legacyPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, "billing_stationery_settings.json");
                await System.IO.File.WriteAllTextAsync(legacyPath, json);
            }
            catch { }

            try
            {
                var lab = await _context.LabProfiles.FirstOrDefaultAsync();
                if (lab != null)
                {
                    if (settings.TryGetProperty("labLegalName", out var lName) && !string.IsNullOrWhiteSpace(lName.GetString()))
                        lab.Name = lName.GetString()!;
                    if (settings.TryGetProperty("labTradeName", out var tName) && !string.IsNullOrWhiteSpace(tName.GetString()))
                        lab.Tagline = tName.GetString()!;
                    if (settings.TryGetProperty("address", out var addr) && !string.IsNullOrWhiteSpace(addr.GetString()))
                        lab.Address = addr.GetString()!;
                    if (settings.TryGetProperty("phone", out var ph) && !string.IsNullOrWhiteSpace(ph.GetString()))
                        lab.Phone = ph.GetString()!;
                    if (settings.TryGetProperty("email", out var em) && !string.IsNullOrWhiteSpace(em.GetString()))
                        lab.Email = em.GetString()!;
                    if (settings.TryGetProperty("upiId", out var upi) && !string.IsNullOrWhiteSpace(upi.GetString()))
                        lab.UpiId = upi.GetString()!;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Serilog.Log.Warning(ex, "Failed to sync LabProfiles table during SaveStationerySettings");
            }

            return Ok(new { message = "Billing stationery settings successfully saved as system default." });
        }

        [HttpGet("document-mappings")]
        public async Task<IActionResult> GetDocumentMappings()
        {
            var defaultSlots = new[]
            {
                new {
                    slotId = "patient_tax_invoice",
                    module = "Counter",
                    moduleCode = "reception",
                    slotName = "Patient Bill",
                    triggerDescription = "Printed at patient counter checkout and billing history reprints.",
                    assignedTemplateId = "template_patient_a4_modern",
                    templateName = "Patient Bill (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = true,
                    enableBankDetails = true,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "patient_thermal_receipt",
                    module = "Counter",
                    moduleCode = "reception",
                    slotName = "Counter Slip",
                    triggerDescription = "Printed directly on 80mm thermal POS printer for quick counter token & payment slip.",
                    assignedTemplateId = "template_thermal_pos_80mm",
                    templateName = "Counter Slip (80mm POS)",
                    letterheadMode = "raw_thermal",
                    topMarginMm = 0,
                    enableUpiQr = true,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "prepaid_patient_a4_slip",
                    module = "Corporate B2B",
                    moduleCode = "corporate",
                    slotName = "Prepaid Patient Slip (A4)",
                    triggerDescription = "Generated for corporate B2B and prepaid partner visits in A4 format (zero patient pricing disclosed).",
                    assignedTemplateId = "template_prepaid_patient_a4",
                    templateName = "Prepaid Patient Slip (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "patient_thermal_prepaid_slip",
                    module = "Corporate B2B",
                    moduleCode = "corporate",
                    slotName = "Prepaid Slip",
                    triggerDescription = "Printed on 80mm thermal POS printer for corporate B2B and prepaid partner visits (zero prices disclosed).",
                    assignedTemplateId = "template_thermal_prepaid_80mm",
                    templateName = "Prepaid Slip (80mm POS)",
                    letterheadMode = "raw_thermal",
                    topMarginMm = 0,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "patient_thermal_prepaid_billed_doctor",
                    module = "Corporate B2B",
                    moduleCode = "corporate",
                    slotName = "Prepaid Slip Thermal Billed to Doctor",
                    triggerDescription = "Printed on 80mm thermal POS printer for corporate B2B visits disclosing Billed to Doctor for accounts.",
                    assignedTemplateId = "template_thermal_prepaid_billed_doctor_80mm",
                    templateName = "Prepaid Slip Thermal Billed to Doctor (80mm POS)",
                    letterheadMode = "raw_thermal",
                    topMarginMm = 0,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "partner_b2b_invoice",
                    module = "Doctors",
                    moduleCode = "referral",
                    slotName = "Doctor Bill",
                    triggerDescription = "Generated for referring clinics and partner doctors for testing dues.",
                    assignedTemplateId = "template_partner_b2b_a4",
                    templateName = "Doctor Bill (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = true,
                    enableBankDetails = true,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "referral_payout_voucher",
                    module = "Doctors",
                    moduleCode = "referral",
                    slotName = "Doctor Payout",
                    triggerDescription = "Generated for doctor referral commission disbursement with TDS.",
                    assignedTemplateId = "template_referral_voucher_a4",
                    templateName = "Doctor Payout Voucher (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = false,
                    enableBankDetails = true,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "corporate_b2b_invoice",
                    module = "Corporate B2B",
                    moduleCode = "corporate",
                    slotName = "Prepaid B2B Bill",
                    triggerDescription = "Generated for referral partner accounts (Corporate B2B) where patient pays ₹0.00 at desk.",
                    assignedTemplateId = "template_corporate_b2b_a4",
                    templateName = "Prepaid B2B Bill (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = true,
                    enableBankDetails = true,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "insurance_thermal_receipt",
                    module = "Insurance",
                    moduleCode = "insurance",
                    slotName = "Insurance Thermal Slip",
                    triggerDescription = "80mm POS slip for insurance pre-auth, TPA cashless claims and patient co-pay.",
                    assignedTemplateId = "template_thermal_insurance_80mm",
                    templateName = "80mm Insurance Slip",
                    letterheadMode = "raw_thermal",
                    topMarginMm = 0,
                    enableUpiQr = true,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "insurance_tpa_claim",
                    module = "Insurance",
                    moduleCode = "insurance",
                    slotName = "Insurance Bill",
                    triggerDescription = "Generated for insurance providers and TPA cashless claims.",
                    assignedTemplateId = "template_insurance_tpa_a4",
                    templateName = "Insurance Bill (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = true,
                    enableBankDetails = true,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "outsourced_lab_manifest",
                    module = "Outsource",
                    moduleCode = "outsource",
                    slotName = "Outsource Slip",
                    triggerDescription = "Generated when dispatching samples to external reference labs.",
                    assignedTemplateId = "template_outsource_manifest_a4",
                    templateName = "Outsource Manifest (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 35,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "procurement_po",
                    module = "Stores",
                    moduleCode = "inventory",
                    slotName = "Purchase Order",
                    triggerDescription = "Generated when placing orders with reagent and kit suppliers.",
                    assignedTemplateId = "template_procurement_po_a4",
                    templateName = "Purchase Order (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = false,
                    enableBankDetails = true,
                    customTerms = "1. Goods must have minimum 12 months shelf life.\n2. Cold-chain items must be delivered at 2°C - 8°C.\n3. Defective lots subject to immediate replacement.",
                    isSystemDefault = true
                },
                new {
                    slotId = "procurement_grn",
                    module = "Stores",
                    moduleCode = "inventory",
                    slotName = "GRN Slip",
                    triggerDescription = "Generated upon receiving and checking in inward store materials.",
                    assignedTemplateId = "template_grn_a4",
                    templateName = "Material GRN (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 35,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "workforce_payslip",
                    module = "Staff",
                    moduleCode = "workforce",
                    slotName = "Salary Slip",
                    triggerDescription = "Generated during monthly staff payroll processing.",
                    assignedTemplateId = "template_payslip_a4",
                    templateName = "Salary Slip (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 40,
                    enableUpiQr = false,
                    enableBankDetails = true,
                    customTerms = "Computer-generated salary slip and requires no physical signature.",
                    isSystemDefault = true
                },
                new {
                    slotId = "overhead_expense_voucher",
                    module = "Expenses",
                    moduleCode = "finance",
                    slotName = "Expense Voucher",
                    triggerDescription = "Generated when paying daily petty cash and lab operating expenses.",
                    assignedTemplateId = "template_expense_voucher_a4",
                    templateName = "Expense Voucher (A5)",
                    letterheadMode = "digital",
                    topMarginMm = 25,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "summary_bills_daybook",
                    module = "Summaries",
                    moduleCode = "summary",
                    slotName = "Bills Daybook",
                    triggerDescription = "Daily bills and collections daybook report.",
                    assignedTemplateId = "template_summary_daybook_a4",
                    templateName = "Bills Daybook (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 35,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "summary_doctor_dues",
                    module = "Summaries",
                    moduleCode = "summary",
                    slotName = "Doctor Dues Summary",
                    triggerDescription = "Doctor-wise pending receivables and commissions statement.",
                    assignedTemplateId = "template_summary_doctor_dues_a4",
                    templateName = "Doctor Dues Summary (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 35,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "summary_corporate",
                    module = "Corporate B2B",
                    moduleCode = "corporate",
                    slotName = "B2B Corporate Summary",
                    triggerDescription = "Summary statement for referring doctor/partner detailing patient investigations, standard tariffs, partner charges, and total dues.",
                    assignedTemplateId = "template_summary_corporate_a4",
                    templateName = "B2B Corporate Summary (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 35,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "summary_insurance",
                    module = "Summaries",
                    moduleCode = "summary",
                    slotName = "Insurance Summary",
                    triggerDescription = "Insurance / TPA cashless claims and receivables summary.",
                    assignedTemplateId = "template_summary_insurance_a4",
                    templateName = "Insurance Summary (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 35,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                },
                new {
                    slotId = "summary_outsource",
                    module = "Summaries",
                    moduleCode = "summary",
                    slotName = "Outsource Summary",
                    triggerDescription = "Outsourced lab tests and partner lab payable summary.",
                    assignedTemplateId = "template_summary_outsource_a4",
                    templateName = "Outsource Summary (A4)",
                    letterheadMode = "digital",
                    topMarginMm = 35,
                    enableUpiQr = false,
                    enableBankDetails = false,
                    customTerms = (string?)null,
                    isSystemDefault = true
                }
            };

            var path = GetConfigFilePath("document_mappings_registry.json");
            if (!System.IO.File.Exists(path))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(defaultSlots, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                await System.IO.File.WriteAllTextAsync(path, json);
                try
                {
                    var legacyPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, "document_mappings_registry.json");
                    await System.IO.File.WriteAllTextAsync(legacyPath, json);
                }
                catch { }
                return Content(json, "application/json");
            }

            var existing = await System.IO.File.ReadAllTextAsync(path);
            try
            {
                // Check if any default slots are missing from existing JSON, if so append them while preserving user customizations
                using var doc = System.Text.Json.JsonDocument.Parse(existing);
                if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    var existingSlotIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var elem in doc.RootElement.EnumerateArray())
                    {
                        if (elem.TryGetProperty("slotId", out var sid))
                        {
                            var s = sid.GetString();
                            if (!string.IsNullOrEmpty(s)) existingSlotIds.Add(s);
                        }
                    }

                    var missingSlots = defaultSlots.Where(ds => !existingSlotIds.Contains(ds.slotId)).ToList();
                    var userMappings = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(existing) ?? new();
                    bool mutated = false;

                    foreach (var m in userMappings)
                    {
                        if (m.TryGetValue("slotId", out var sidObj) && sidObj?.ToString() == "corporate_b2b_invoice")
                        {
                            if (m.TryGetValue("slotName", out var sn) && sn?.ToString() == "Corporate Bill")
                            {
                                m["slotName"] = "Prepaid B2B Bill";
                                m["module"] = "Corporate B2B";
                                if (m.TryGetValue("templateName", out var tn) && tn?.ToString() == "Corporate Bill (A4)")
                                {
                                    m["templateName"] = "Prepaid B2B Bill (A4)";
                                }
                                mutated = true;
                            }
                        }
                        if (m.TryGetValue("slotId", out var sidObj2) && sidObj2?.ToString() == "summary_corporate")
                        {
                            if (m.TryGetValue("slotName", out var sn2) && sn2?.ToString() == "Corporate Summary")
                            {
                                m["slotName"] = "B2B Corporate Summary";
                                m["module"] = "Corporate B2B";
                                m["moduleCode"] = "corporate";
                                if (m.TryGetValue("templateName", out var tn2) && tn2?.ToString() == "Corporate Summary (A4)")
                                {
                                    m["templateName"] = "B2B Corporate Summary (A4)";
                                }
                                mutated = true;
                            }
                        }
                    }

                    if (missingSlots.Any())
                    {
                        // Append missing slots without overwriting user's customized templates & customLayout
                        foreach (var ms in missingSlots)
                        {
                            var dict = new Dictionary<string, object>
                            {
                                ["slotId"] = ms.slotId,
                                ["module"] = ms.module,
                                ["moduleCode"] = ms.moduleCode,
                                ["slotName"] = ms.slotName,
                                ["triggerDescription"] = ms.triggerDescription,
                                ["assignedTemplateId"] = ms.assignedTemplateId,
                                ["templateName"] = ms.templateName,
                                ["letterheadMode"] = ms.letterheadMode,
                                ["topMarginMm"] = ms.topMarginMm,
                                ["enableUpiQr"] = ms.enableUpiQr,
                                ["enableBankDetails"] = ms.enableBankDetails,
                                ["customTerms"] = ms.customTerms ?? "",
                                ["isSystemDefault"] = ms.isSystemDefault
                            };
                            userMappings.Add(dict);
                        }
                        mutated = true;
                    }

                    if (mutated)
                    {
                        var updatedJson = System.Text.Json.JsonSerializer.Serialize(userMappings, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                        await System.IO.File.WriteAllTextAsync(path, updatedJson);
                        try
                        {
                            var legacyPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, "document_mappings_registry.json");
                            await System.IO.File.WriteAllTextAsync(legacyPath, updatedJson);
                        }
                        catch { }
                        return Content(updatedJson, "application/json");
                    }
                }
            }
            catch { }

            return Content(existing, "application/json");
        }

        [HttpPost("document-mappings")]
        public async Task<IActionResult> SaveDocumentMappings([FromBody] System.Text.Json.JsonElement mappings)
        {
            var path = GetConfigFilePath("document_mappings_registry.json");
            var json = mappings.ToString();
            await System.IO.File.WriteAllTextAsync(path, json);
            try
            {
                var legacyPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, "document_mappings_registry.json");
                await System.IO.File.WriteAllTextAsync(legacyPath, json);
            }
            catch { }
            return Ok(new { message = "Document mappings registry successfully saved as system default." });
        }

        #endregion

        #region Patient Tax Invoice Document

        [HttpGet("{invoiceId}/document")]
        public async Task<IActionResult> GetInvoiceDocument(Guid invoiceId)
        {
            var inv = await _context.Invoices
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Patient)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Branch)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.ReferralPartner)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.CorporateAccount)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.InsuranceCompany)
                .Include(i => i.Visit)
                    .ThenInclude(v => v!.Orders)
                        .ThenInclude(o => o.Test)
                            .ThenInclude(t => t.ModalityMaster)
                .Include(i => i.Payments)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (inv == null)
            {
                // Fallback attempt: find invoice by VisitId
                inv = await _context.Invoices
                    .Include(i => i.Visit)
                        .ThenInclude(v => v!.Patient)
                    .Include(i => i.Visit)
                        .ThenInclude(v => v!.Branch)
                    .Include(i => i.Visit)
                        .ThenInclude(v => v!.ReferralPartner)
                    .Include(i => i.Visit)
                        .ThenInclude(v => v!.CorporateAccount)
                    .Include(i => i.Visit)
                        .ThenInclude(v => v!.InsuranceCompany)
                    .Include(i => i.Visit)
                        .ThenInclude(v => v!.Orders)
                            .ThenInclude(o => o.Test)
                                .ThenInclude(t => t.ModalityMaster)
                    .Include(i => i.Payments)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.VisitId == invoiceId);
            }

            if (inv == null) return NotFound(new { message = $"Invoice {invoiceId} not found." });

            var lab = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var settings = await GetStationerySettingsInternalAsync(lab);

            var payments = inv.Payments ?? new List<SynOS.Models.Entities.Payment>();
            var totalCollected = payments.Sum(p => p.Amount);
            var balanceDue = Math.Max(0, inv.Total - totalCollected);

            var orders = inv.Visit?.Orders ?? new List<SynOS.Models.Entities.Order>();
            var lineItems = new List<object>();
            int itemIndex = 1;

            foreach (var ord in orders)
            {
                var testTitle = ord.Test?.TestName ?? ord.TestCode ?? "Diagnostic Investigation";
                var dept = ord.Department ?? ord.Test?.Category ?? "Pathology";
                var price = ord.Price;

                lineItems.Add(new
                {
                    Index = itemIndex++,
                    Code = ord.TestCode ?? ord.Test?.TestCode ?? "SRV",
                    Name = testTitle,
                    Department = dept,
                    SacCode = "999312", // Standard GST SAC code for Medical & Healthcare Diagnostics
                    Price = price,
                    Discount = 0m,
                    TaxPercent = 0m,
                    Amount = price,
                    IsOutsourced = ord.IsOutsourced,
                    ReferenceLabName = ord.ReferenceLabName ?? ""
                });
            }

            var patient = inv.Visit?.Patient;
            string patientName = patient != null ? $"{patient.FirstName} {patient.LastName}".Trim() : "Walk-in Patient";
            string ageGender = "";
            if (patient != null)
            {
                if (patient.DateOfBirth != default)
                {
                    int age = DateTime.UtcNow.Year - patient.DateOfBirth.Year;
                    ageGender = $"{age} Yrs / {patient.Gender}";
                }
                else
                {
                    ageGender = patient.Gender ?? "";
                }
            }

            var cleanToken = !string.IsNullOrWhiteSpace(inv.Visit?.Token)
                ? inv.Visit.Token.Replace("-", "").Trim().ToUpper()
                : $"{inv.Visit?.Branch?.Code?.Trim().ToUpper() ?? "MAI"}000";
            var billNo = $"{cleanToken}-{inv.CreatedAt:yyMMdd}";
            var upiPayload = $"upi://pay?pa={settings.UpiId}&pn={Uri.EscapeDataString(settings.LabLegalName)}&am={balanceDue:F2}&cu=INR&tn={billNo}";

            var visit = inv.Visit;
            var isCorporate = visit?.BillingType == SynOS.Models.Enums.BillingType.Corporate || visit?.CorporateAccountId != null;
            var isInsurance = visit?.BillingType == SynOS.Models.Enums.BillingType.Insurance || visit?.InsuranceCompanyId != null;
            var isPartner = visit?.BillingType == SynOS.Models.Enums.BillingType.PrepaidPartner || visit?.PaymentCollectionModel == "PartnerCollects" || visit?.ReferralPartnerId != null;

            return Ok(new
            {
                InvoiceId = inv.InvoiceId,
                BillNumber = billNo,
                Date = inv.CreatedAt,
                DueDate = inv.DueDate != default ? inv.DueDate : inv.CreatedAt.AddDays(15),
                Status = balanceDue <= 0 ? "Paid" : (totalCollected > 0 ? "Partial" : "Pending"),
                Currency = "INR",
                
                // Stationery & Lab Profile
                Lab = settings,

                // Context-Aware Billing & Payer Metadata
                BillingContext = new
                {
                    BillingType = visit?.BillingType.ToString() ?? "Standard",
                    PaymentCollectionModel = visit?.PaymentCollectionModel ?? "LabCollects",
                    // Corporate B2B
                    IsCorporate = isCorporate,
                    CorporateName = visit?.CorporateAccount?.CompanyName ?? "",
                    CorporateCode = visit?.CorporateAccount?.CorporateCode ?? "",
                    EmployeeId = visit?.EmployeeId ?? "",
                    // Insurance / TPA
                    IsInsurance = isInsurance,
                    InsuranceCompanyName = visit?.InsuranceCompany?.Name ?? "",
                    InsuranceTpaName = visit?.InsuranceCompany?.TpaName ?? "",
                    PolicyNumber = visit?.PolicyNumber ?? "",
                    PreAuthApprovalNumber = visit?.PreAuthApprovalNumber ?? "",
                    InsuranceCoPayAmount = visit?.InsuranceCoPayAmount ?? 0,
                    // Referral Partner
                    IsReferred = isPartner,
                    ReferralPartnerName = visit?.ReferralPartner?.Name ?? "",
                    ReferralPartnerClinic = visit?.ReferralPartner?.ClinicName ?? "",
                    ReferralPartnerCode = visit?.ReferralPartner != null ? visit.ReferralPartner.ReferralPartnerId.ToString().Substring(0, 8).ToUpper() : "",
                    // Outsourced
                    HasOutsourcedTests = orders.Any(o => o.IsOutsourced || !string.IsNullOrEmpty(o.ReferenceLabName)),
                    OutsourcedLabNames = orders.Where(o => o.IsOutsourced && !string.IsNullOrEmpty(o.ReferenceLabName)).Select(o => o.ReferenceLabName).Distinct().ToList()
                },

                // Patient Profile (enriched with context)
                Patient = new
                {
                    Name = patientName,
                    Uhid = patient?.MRN ?? patient?.PatientId.ToString().Substring(0, 8).ToUpper() ?? "WALK-IN",
                    AgeGender = ageGender,
                    Phone = patient?.CurrentPhoneNumber ?? "N/A",
                    Email = "",
                    Token = visit?.Token ?? "",
                    ReferringDoctor = visit?.ReferralPartner?.Name ?? "Direct Patient",
                    PaymentCollectionModel = visit?.PaymentCollectionModel ?? "LabCollects",
                    BranchName = visit?.Branch?.Name ?? "Main Facility",
                    CorporateName = visit?.CorporateAccount?.CompanyName ?? "",
                    CorporateCode = visit?.CorporateAccount?.CorporateCode ?? "",
                    EmployeeId = visit?.EmployeeId ?? "",
                    InsuranceCompanyName = visit?.InsuranceCompany?.Name ?? "",
                    InsuranceTpaName = visit?.InsuranceCompany?.TpaName ?? "",
                    PolicyNumber = visit?.PolicyNumber ?? "",
                    PreAuthNumber = visit?.PreAuthApprovalNumber ?? "",
                    BillingMode = visit?.BillingType.ToString() ?? "Standard"
                },

                // Line Items
                Items = lineItems,

                // Financial Totals
                Financial = new
                {
                    GrossSubtotal = inv.GrossAmount > 0 ? inv.GrossAmount : inv.Total,
                    DiscountAmount = inv.DiscountAmount,
                    TaxableAmount = inv.NetAmount > 0 ? inv.NetAmount : inv.Total,
                    CgstPercent = 0m,
                    SgstPercent = 0m,
                    CgstAmount = 0m,
                    SgstAmount = 0m,
                    TotalAmount = inv.Total,
                    TotalCollected = totalCollected,
                    BalanceDue = balanceDue,
                    AmountInWords = NumberToIndianWords(inv.Total),
                    BalanceInWords = NumberToIndianWords(balanceDue)
                },

                // Recorded Payments Breakdown
                Payments = payments.Select(p => new
                {
                    PaymentId = p.PaymentId,
                    Amount = p.Amount,
                    Method = p.Method ?? "Cash",
                    Date = p.ReceivedAt,
                    Reference = !string.IsNullOrEmpty(p.ReceiptNo) ? p.ReceiptNo : "Drawer Cash"
                }).ToList(),

                UpiQrString = upiPayload
            });
        }

        #endregion

        #region B2B Partner Claim Statement Document

        public class PartnerClaimStatementRequest
        {
            public Guid PartnerId { get; set; }
            public List<Guid>? VisitIds { get; set; }
            public List<Guid>? ReceivableFactIds { get; set; }
            public DateTime? StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            public bool OnlyUnsettled { get; set; } = true;
        }

        [HttpPost("partner-claim-statement")]
        public async Task<IActionResult> GetPartnerClaimStatement([FromBody] PartnerClaimStatementRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Valid PartnerClaimStatementRequest is required." });
            }

            // Infer PartnerId from VisitIds if not provided
            if (request.PartnerId == Guid.Empty && request.VisitIds != null && request.VisitIds.Count > 0)
            {
                var inferredPartnerId = await _context.Visits
                    .Where(v => request.VisitIds.Contains(v.VisitId))
                    .Select(v => v.SecondaryReferralPartnerId ?? v.ReferralPartnerId)
                    .FirstOrDefaultAsync();

                if (inferredPartnerId.HasValue && inferredPartnerId.Value != Guid.Empty)
                {
                    request.PartnerId = inferredPartnerId.Value;
                }
            }

            if (request.PartnerId == Guid.Empty)
            {
                return BadRequest(new { message = "Valid PartnerId is required." });
            }

            var partner = await _context.ReferralPartners
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ReferralPartnerId == request.PartnerId);

            if (partner == null)
            {
                return NotFound(new { message = "Referral Partner not found." });
            }

            var lab = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var settings = await GetStationerySettingsInternalAsync(lab);

            // Query ReceivableFacts directly for this partner
            var factQuery = _context.ReceivableFacts
                .AsNoTracking()
                .Where(r => r.ReferralPartnerId == request.PartnerId);

            if (request.ReceivableFactIds != null && request.ReceivableFactIds.Count > 0)
            {
                factQuery = factQuery.Where(r => request.ReceivableFactIds.Contains(r.ReceivableFactId));
            }
            else if (request.VisitIds != null && request.VisitIds.Count > 0)
            {
                factQuery = factQuery.Where(r => request.VisitIds.Contains(r.SourceVisitId));
            }
            else
            {
                // Default: strictly open / unsettled dues (never settled historical visits!)
                if (request.OnlyUnsettled)
                {
                    factQuery = factQuery.Where(r => r.SettledAt == null && (r.Amount - r.AmountReceived) > 0);
                }
                if (request.StartDate.HasValue) factQuery = factQuery.Where(r => r.OccurredAt >= request.StartDate.Value);
                if (request.EndDate.HasValue) factQuery = factQuery.Where(r => r.OccurredAt <= request.EndDate.Value);
            }

            var facts = await factQuery.OrderByDescending(r => r.OccurredAt).ToListAsync();

            // Load matching visits for clinical & patient context
            var visitIds = facts.Select(f => f.SourceVisitId).Distinct().ToList();
            var visits = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.ReferralPartner)
                .Include(v => v.SecondaryReferralPartner)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Include(v => v.Invoices)
                    .ThenInclude(i => i.Payments)
                .Where(v => visitIds.Contains(v.VisitId))
                .AsNoTracking()
                .ToDictionaryAsync(v => v.VisitId);

            var items = new List<object>();
            decimal totalStandardTariff = 0;
            decimal totalDiscount = 0;
            decimal totalBilled = 0;
            decimal totalReceived = 0;
            decimal totalNetDue = 0;

            int lineIndex = 1;
            foreach (var fact in facts)
            {
                visits.TryGetValue(fact.SourceVisitId, out var visit);
                var orders = visit?.Orders ?? new List<SynOS.Models.Entities.Order>();
                var tests = orders.Select(o => o.Test?.TestName ?? o.TestCode ?? "Investigation").ToList();
                string testSummary = tests.Count > 0 ? string.Join(", ", tests) : "Routine Lab Investigation";

                var pt = visit?.Patient;
                string ptName = pt != null ? $"{pt.FirstName} {pt.LastName}".Trim() : "Patient";
                string ageGen = "";
                if (pt != null)
                {
                    if (pt.DateOfBirth != default)
                    {
                        int age = DateTime.UtcNow.Year - pt.DateOfBirth.Year;
                        ageGen = $"{age}Y/{pt.Gender}";
                    }
                    else
                    {
                        ageGen = pt.Gender ?? "";
                    }
                }

                var inv = visit?.Invoices?.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                decimal standardTariff = inv != null && inv.GrossAmount > 0
                    ? inv.GrossAmount
                    : orders.Sum(o => o.Price);

                var billAmount = fact.Amount;
                if (standardTariff < billAmount) standardTariff = billAmount;
                decimal discount = Math.Max(0, standardTariff - billAmount);
                var rec = fact.AmountReceived;
                var due = Math.Max(0, fact.Amount - fact.AmountReceived);

                totalStandardTariff += standardTariff;
                totalDiscount += discount;
                totalBilled += billAmount;
                totalReceived += rec;
                totalNetDue += due;

                string displayToken = !string.IsNullOrEmpty(visit?.Token)
                    ? visit.Token
                    : (visit != null ? $"T-{visit.VisitId.ToString().Substring(0, 4).ToUpper()}" : fact.ReceivableFactId.ToString().Substring(0, 8).ToUpper());

                var cleanToken = visit != null && !string.IsNullOrWhiteSpace(visit.Token)
                    ? visit.Token.Replace("-", "").Trim().ToUpper()
                    : "MAI000";
                var billNo = visit != null ? $"{cleanToken}-{visit.CreatedAt:yyMMdd}" : fact.ReceivableFactId.ToString().Substring(0, 8).ToUpper();

                items.Add(new
                {
                    Index = lineIndex++,
                    ReceivableFactId = fact.ReceivableFactId,
                    VisitId = fact.SourceVisitId,
                    BillNumber = billNo,
                    Token = displayToken,
                    VisitToken = displayToken,
                    Date = fact.OccurredAt.DateTime,
                    PatientName = ptName,
                    PrescribingDoctor = visit?.ReferralPartner?.Name ?? partner.Name,
                    AgeGender = ageGen,
                    Investigations = testSummary,
                    GrossAmount = standardTariff,
                    GrossBilled = standardTariff,
                    LabStandardCharge = standardTariff,
                    LabBilled = standardTariff,
                    StandardPrice = standardTariff,
                    Discount = discount,
                    Rate = billAmount,
                    AmountReceived = rec,
                    Received = rec,
                    NetPayableToLab = due,
                    NetClaimDue = due,
                    OutstandingAmount = due,
                    NetDue = due
                });
            }

            // Fallback: If no ledger facts found but specific visitIds were requested
            if (facts.Count == 0 && request.VisitIds != null && request.VisitIds.Count > 0)
            {
                var directVisits = await _context.Visits
                    .Include(v => v.Patient)
                    .Include(v => v.ReferralPartner)
                    .Include(v => v.SecondaryReferralPartner)
                    .Include(v => v.Orders).ThenInclude(o => o.Test)
                    .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                    .Where(v => request.VisitIds.Contains(v.VisitId))
                    .AsNoTracking()
                    .ToListAsync();

                foreach (var v in directVisits)
                {
                    var orders = v.Orders ?? new List<SynOS.Models.Entities.Order>();
                    var tests = orders.Select(o => o.Test?.TestName ?? o.TestCode ?? "Investigation").ToList();
                    string testSummary = tests.Count > 0 ? string.Join(", ", tests) : "Routine Lab Investigation";

                    var pt = v.Patient;
                    string ptName = pt != null ? $"{pt.FirstName} {pt.LastName}".Trim() : "Patient";
                    string ageGen = "";
                    if (pt != null)
                    {
                        if (pt.DateOfBirth != default)
                        {
                            int age = DateTime.UtcNow.Year - pt.DateOfBirth.Year;
                            ageGen = $"{age}Y/{pt.Gender}";
                        }
                        else
                        {
                            ageGen = pt.Gender ?? "";
                        }
                    }

                    var inv = v.Invoices?.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
                    decimal standardTariff = inv != null && inv.GrossAmount > 0 
                        ? inv.GrossAmount 
                        : orders.Sum(o => o.Price);

                    decimal billAmount = inv?.Total ?? orders.Sum(o => o.Price);
                    if (standardTariff < billAmount) standardTariff = billAmount;
                    decimal discount = Math.Max(0, standardTariff - billAmount);

                    decimal rec = inv?.Payments?.Sum(p => p.Amount) ?? 0m;
                    decimal due = Math.Max(0, billAmount - rec);

                    totalStandardTariff += standardTariff;
                    totalDiscount += discount;
                    totalBilled += billAmount;
                    totalReceived += rec;
                    totalNetDue += due;

                    string displayToken = !string.IsNullOrEmpty(v.Token)
                        ? v.Token
                        : $"T-{v.VisitId.ToString().Substring(0, 4).ToUpper()}";

                    var cleanToken = !string.IsNullOrWhiteSpace(v.Token)
                        ? v.Token.Replace("-", "").Trim().ToUpper()
                        : "MAI000";
                    var billNo = $"{cleanToken}-{v.CreatedAt:yyMMdd}";

                    items.Add(new
                    {
                        Index = lineIndex++,
                        ReceivableFactId = Guid.NewGuid(),
                        VisitId = v.VisitId,
                        BillNumber = billNo,
                        Token = displayToken,
                        VisitToken = displayToken,
                        Date = v.CreatedAt,
                        PatientName = ptName,
                        PrescribingDoctor = v.ReferralPartner?.Name ?? partner.Name,
                        AgeGender = ageGen,
                        Investigations = testSummary,
                        GrossAmount = standardTariff,
                        GrossBilled = standardTariff,
                        LabStandardCharge = standardTariff,
                        LabBilled = standardTariff,
                        StandardPrice = standardTariff,
                        Discount = discount,
                        Rate = billAmount,
                        AmountReceived = rec,
                        Received = rec,
                        NetPayableToLab = due,
                        NetClaimDue = due,
                        OutstandingAmount = due,
                        NetDue = due
                    });
                }
            }

            var now = DateTime.UtcNow;
            var safePartner = (partner.Name ?? "PRT").Replace(" ", "");
            var pCode = safePartner.Substring(0, Math.Min(3, safePartner.Length)).ToUpper();
            var statementNo = $"CLM-{now:yyyyMM}-{pCode}{now:ddHHmm}";

            var upiPayload = $"upi://pay?pa={settings.UpiId}&pn={Uri.EscapeDataString(settings.LabLegalName)}&am={totalNetDue:F2}&cu=INR&tn={statementNo}";

            var rawPartnerId = partner.ReferralPartnerId;
            var partnerNameClean = System.Text.RegularExpressions.Regex.Replace(partner.Name ?? "PRT", @"[^A-Za-z0-9]+", "-").Trim('-').ToUpper();
            if (partnerNameClean.Length > 16) partnerNameClean = partnerNameClean.Substring(0, 16);
            var cleanPartnerId = $"PART-{partnerNameClean}";

            string prescribingDoctorName = (facts.Count > 0 
                ? visits.Values.Select(v => v.ReferralPartner?.Name).FirstOrDefault(n => !string.IsNullOrEmpty(n)) 
                : null) ?? partner.Name;

            return Ok(new
            {
                StatementNumber = statementNo,
                StatementNo = statementNo,
                GeneratedAt = now,
                Date = now,
                DueDate = now.AddDays(15),
                PrescribingDoctorName = prescribingDoctorName,
                BilledToDoctorName = partner.Name,
                BillingPeriod = request.StartDate.HasValue && request.EndDate.HasValue 
                    ? $"{request.StartDate.Value:dd MMM yyyy} to {request.EndDate.Value:dd MMM yyyy}" 
                    : $"Transactions as of {now:dd MMM yyyy}",
                
                Lab = settings,

                Partner = new
                {
                    PartnerId = cleanPartnerId,
                    ReferralPartnerId = rawPartnerId,
                    Code = cleanPartnerId,
                    PartnerCode = cleanPartnerId,
                    Name = partner.Name,
                    ClinicName = !string.IsNullOrEmpty(partner.ClinicName) ? partner.ClinicName : $"{partner.Name}'s Clinic / Practice",
                    Address = !string.IsNullOrEmpty(partner.Location) ? partner.Location : "Registered Medical Practice",
                    Phone = partner.ContactInfo ?? "N/A",
                    Email = "N/A",
                    CommissionModel = partner.PaymentCollectionModel ?? "PartnerCollects"
                },

                Items = items,

                Summary = new
                {
                    TotalVisits = items.Count,
                    TotalVisitsCount = items.Count,
                    GrossBilled = totalStandardTariff > 0 ? totalStandardTariff : totalBilled,
                    TotalGrossBilled = totalStandardTariff > 0 ? totalStandardTariff : totalBilled,
                    TotalDiagnosticCharges = totalStandardTariff > 0 ? totalStandardTariff : totalBilled,
                    TotalDiscount = totalDiscount,
                    TotalCommissionCut = 0m,
                    AmountReceived = totalReceived,
                    TotalPaid = totalReceived,
                    TotalReceived = totalReceived,
                    NetClaimDue = totalNetDue,
                    BalanceDue = totalNetDue,
                    AmountInWords = NumberToIndianWords(totalNetDue)
                },

                UpiQrString = upiPayload
            });
        }

        #endregion

        #region Referral Commission Payout Voucher

        public class ReferralPayoutVoucherRequest
        {
            public Guid PartnerId { get; set; }
            public List<Guid>? FactIds { get; set; }
            public List<Guid>? VisitIds { get; set; }
            public DateTime? StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            public bool OnlyUnsettled { get; set; } = true;
            public decimal TdsPercentage { get; set; } = 0; // TDS under Section 194H
        }

        [HttpPost("referral-payout-voucher")]
        public async Task<IActionResult> GetReferralPayoutVoucher([FromBody] ReferralPayoutVoucherRequest request)
        {
            if (request == null || request.PartnerId == Guid.Empty)
            {
                return BadRequest(new { message = "Valid PartnerId is required." });
            }

            var partner = await _context.ReferralPartners
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ReferralPartnerId == request.PartnerId);

            if (partner == null)
            {
                return NotFound(new { message = "Referral Partner not found." });
            }

            var lab = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var settings = await GetStationerySettingsInternalAsync(lab);

            var query = _context.ReferralPayableFacts
                .AsNoTracking()
                .Where(f => f.ReferralPartnerId == request.PartnerId);

            if (request.FactIds != null && request.FactIds.Count > 0)
            {
                query = query.Where(f => request.FactIds.Contains(f.ReferralPayableFactId));
            }
            else if (request.VisitIds != null && request.VisitIds.Count > 0)
            {
                query = query.Where(f => request.VisitIds.Contains(f.SourceVisitId));
            }
            else
            {
                if (request.OnlyUnsettled)
                {
                    query = query.Where(f => f.SettledAt == null && (f.Amount - f.AmountPaid) > 0);
                }
                if (request.StartDate.HasValue) query = query.Where(f => f.OccurredAt >= request.StartDate.Value);
                if (request.EndDate.HasValue) query = query.Where(f => f.OccurredAt <= request.EndDate.Value);
            }

            var facts = await query.OrderByDescending(f => f.OccurredAt).ToListAsync();

            var visitIds = facts.Select(f => f.SourceVisitId).Distinct().ToList();
            var visits = await _context.Visits
                .Include(v => v.Patient)
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Where(v => visitIds.Contains(v.VisitId))
                .AsNoTracking()
                .ToDictionaryAsync(v => v.VisitId);

            var items = new List<object>();
            decimal grossPayout = 0;

            int lineIndex = 1;
            foreach (var fact in facts)
            {
                visits.TryGetValue(fact.SourceVisitId, out var visit);
                var orders = visit?.Orders ?? new List<SynOS.Models.Entities.Order>();
                var tests = orders.Select(o => o.Test?.TestName ?? o.TestCode ?? "Investigation").ToList();
                string testSummary = tests.Count > 0 ? string.Join(", ", tests) : "Routine Lab Investigation";

                var pt = visit?.Patient;
                string ptName = pt != null ? $"{pt.FirstName} {pt.LastName}".Trim() : "Patient";
                string ageGen = "";
                if (pt != null)
                {
                    if (pt.DateOfBirth != default)
                    {
                        int age = DateTime.UtcNow.Year - pt.DateOfBirth.Year;
                        ageGen = $"{age}Y/{pt.Gender}";
                    }
                    else
                    {
                        ageGen = pt.Gender ?? "";
                    }
                }

                decimal visitBilled = orders.Sum(o => o.Price);
                decimal commissionAmount = fact.Amount - fact.AmountPaid;
                grossPayout += commissionAmount;

                items.Add(new
                {
                    Index = lineIndex++,
                    FactId = fact.ReferralPayableFactId,
                    VisitId = fact.SourceVisitId,
                    Token = visit?.Token ?? fact.ReferralPayableFactId.ToString().Substring(0, 8),
                    Date = fact.OccurredAt,
                    PatientName = ptName,
                    AgeGender = ageGen,
                    Investigations = testSummary,
                    PatientBilledAmount = visitBilled,
                    CommissionAmount = commissionAmount
                });
            }

            decimal tdsAmount = Math.Round(grossPayout * (request.TdsPercentage / 100m), 2);
            decimal netDisbursed = Math.Max(0, grossPayout - tdsAmount);

            var now = DateTime.UtcNow;
            var safePartner = (partner.Name ?? "DR").Replace(" ", "").Replace(".", "");
            var pCode = safePartner.Substring(0, Math.Min(3, safePartner.Length)).ToUpper();
            var voucherNo = $"VCH-{now:yyyyMM}-{pCode}{now:ddHHmm}";

            return Ok(new
            {
                VoucherNumber = voucherNo,
                Date = now,
                BillingPeriod = request.StartDate.HasValue && request.EndDate.HasValue 
                    ? $"{request.StartDate.Value:dd MMM yyyy} to {request.EndDate.Value:dd MMM yyyy}" 
                    : $"Settlement as of {now:dd MMM yyyy}",
                
                Lab = settings,

                Doctor = new
                {
                    PartnerId = partner.ReferralPartnerId,
                    Name = partner.Name,
                    ClinicName = !string.IsNullOrEmpty(partner.ClinicName) ? partner.ClinicName : $"{partner.Name}'s Clinic / Practice",
                    Address = !string.IsNullOrEmpty(partner.Location) ? partner.Location : "Registered Medical Practice",
                    Phone = partner.ContactInfo ?? "N/A",
                    PartnerType = partner.PartnerType.ToString()
                },

                Items = items,

                Summary = new
                {
                    TotalVisitsCount = items.Count,
                    GrossCommission = grossPayout,
                    TdsPercentage = request.TdsPercentage,
                    TdsAmount = tdsAmount,
                    NetDisbursed = netDisbursed,
                    AmountInWords = NumberToIndianWords(netDisbursed)
                }
            });
        }

        #endregion

        #region Internal Stationery Helper & Number to Indian Words

        private class InternalStationerySettings
        {
            public string LabLegalName { get; set; } = "SynOS Diagnostic Centre & Laboratory";
            public string LabTradeName { get; set; } = "Advanced Pathology & Imaging Services";
            public string Address { get; set; } = "Central Diagnostic Facility, Hyderabad, Telangana";
            public string Phone { get; set; } = "+91 98765 43210";
            public string Email { get; set; } = "billing@synoslab.in";
            public string Website { get; set; } = "www.synoslab.in";
            public string Gstin { get; set; } = "36AAAAA0000A1Z5";
            public string Pan { get; set; } = "AAAAA0000A";
            public string BankName { get; set; } = "HDFC Bank";
            public string AccountNumber { get; set; } = "50200012345678";
            public string IfscCode { get; set; } = "HDFC0001234";
            public string Branch { get; set; } = "Main Branch, Khammam";
            public string AccountHolderName { get; set; } = "SynOS Healthcare Diagnostic Services";
            public string UpiId { get; set; } = "synoslab@hdfcbank";
            public bool EnableUpiQr { get; set; } = true;
            public string CustomQrImage { get; set; } = "";
            public string DefaultLetterheadMode { get; set; } = "digital";
            public int TopMarginMm { get; set; } = 40;
            public int BottomMarginMm { get; set; } = 15;
            public string TermsAndConditions { get; set; } = "1. All disputes are subject to local jurisdiction.\n2. Payment terms: Due within 15 days of invoice date.";
            public string SignatoryTitle { get; set; } = "Authorised Signatory / Accounts Desk";
        }

        private async Task<InternalStationerySettings> GetStationerySettingsInternalAsync(SynOS.Models.Entities.LabProfile? lab)
        {
            var res = new InternalStationerySettings();
            if (lab != null)
            {
                if (!string.IsNullOrEmpty(lab.Name)) res.LabLegalName = lab.Name;
                if (!string.IsNullOrEmpty(lab.Tagline)) res.LabTradeName = lab.Tagline;
                if (!string.IsNullOrEmpty(lab.Address)) res.Address = lab.Address;
                if (!string.IsNullOrEmpty(lab.Phone)) res.Phone = lab.Phone;
                if (!string.IsNullOrEmpty(lab.Email)) res.Email = lab.Email;
                if (!string.IsNullOrEmpty(lab.Website)) res.Website = lab.Website;
                if (!string.IsNullOrEmpty(lab.UpiId)) res.UpiId = lab.UpiId;
                if (lab.HeaderHeightMm > 0) res.TopMarginMm = lab.HeaderHeightMm;
            }

            var path = GetConfigFilePath("billing_stationery_settings.json");
            if (System.IO.File.Exists(path))
            {
                try
                {
                    var content = await System.IO.File.ReadAllTextAsync(path);
                    using var doc = System.Text.Json.JsonDocument.Parse(content);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("labLegalName", out var v) && v.GetString() is string s1 && !string.IsNullOrEmpty(s1)) res.LabLegalName = s1;
                    if (root.TryGetProperty("labTradeName", out v) && v.GetString() is string s2 && !string.IsNullOrEmpty(s2)) res.LabTradeName = s2;
                    if (root.TryGetProperty("address", out v) && v.GetString() is string s3 && !string.IsNullOrEmpty(s3)) res.Address = s3;
                    if (root.TryGetProperty("phone", out v) && v.GetString() is string s4 && !string.IsNullOrEmpty(s4)) res.Phone = s4;
                    if (root.TryGetProperty("email", out v) && v.GetString() is string s5 && !string.IsNullOrEmpty(s5)) res.Email = s5;
                    if (root.TryGetProperty("gstin", out v) && v.GetString() is string s6 && !string.IsNullOrEmpty(s6)) res.Gstin = s6;
                    if (root.TryGetProperty("pan", out v) && v.GetString() is string s7 && !string.IsNullOrEmpty(s7)) res.Pan = s7;
                    if (root.TryGetProperty("bankName", out v) && v.GetString() is string s8 && !string.IsNullOrEmpty(s8)) res.BankName = s8;
                    if (root.TryGetProperty("accountNumber", out v) && v.GetString() is string s9 && !string.IsNullOrEmpty(s9)) res.AccountNumber = s9;
                    if (root.TryGetProperty("ifscCode", out v) && v.GetString() is string s10 && !string.IsNullOrEmpty(s10)) res.IfscCode = s10;
                    if (root.TryGetProperty("branch", out v) && v.GetString() is string s11 && !string.IsNullOrEmpty(s11)) res.Branch = s11;
                    if (root.TryGetProperty("accountHolderName", out v) && v.GetString() is string s12 && !string.IsNullOrEmpty(s12)) res.AccountHolderName = s12;
                    if (root.TryGetProperty("upiId", out v) && v.GetString() is string s13 && !string.IsNullOrEmpty(s13)) res.UpiId = s13;
                    if (root.TryGetProperty("customQrImage", out v) && v.GetString() is string sQr && !string.IsNullOrEmpty(sQr)) res.CustomQrImage = sQr;
                    if (root.TryGetProperty("enableUpiQr", out v) && v.ValueKind == System.Text.Json.JsonValueKind.True) res.EnableUpiQr = true;
                    if (root.TryGetProperty("defaultLetterheadMode", out v) && v.GetString() is string s14 && !string.IsNullOrEmpty(s14)) res.DefaultLetterheadMode = s14;
                    if (root.TryGetProperty("topMarginMm", out v) && v.TryGetInt32(out var num)) res.TopMarginMm = num;
                    if (root.TryGetProperty("termsAndConditions", out v) && v.GetString() is string s15 && !string.IsNullOrEmpty(s15)) res.TermsAndConditions = s15;
                    if (root.TryGetProperty("signatoryTitle", out v) && v.GetString() is string s16 && !string.IsNullOrEmpty(s16)) res.SignatoryTitle = s16;
                }
                catch { }
            }

            return res;
        }

        private static string NumberToIndianWords(decimal number)
        {
            if (number == 0) return "Zero Rupees Only";
            long whole = (long)Math.Floor(number);
            int fraction = (int)Math.Round((number - whole) * 100);

            string words = ConvertWholeNumberToIndianWords(whole) + " Rupees";
            if (fraction > 0)
            {
                words += " and " + ConvertWholeNumberToIndianWords(fraction) + " Paise";
            }
            return words + " Only";
        }

        private static string ConvertWholeNumberToIndianWords(long n)
        {
            if (n == 0) return "";
            if (n < 0) return "Minus " + ConvertWholeNumberToIndianWords(Math.Abs(n));

            string[] units = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
                               "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
            string[] tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

            if (n < 20) return units[n];
            if (n < 100) return (tens[n / 10] + " " + units[n % 10]).Trim();
            if (n < 1000) return (units[n / 100] + " Hundred " + ConvertWholeNumberToIndianWords(n % 100)).Trim();
            if (n < 100000) return (ConvertWholeNumberToIndianWords(n / 1000) + " Thousand " + ConvertWholeNumberToIndianWords(n % 1000)).Trim();
            if (n < 10000000) return (ConvertWholeNumberToIndianWords(n / 100000) + " Lakh " + ConvertWholeNumberToIndianWords(n % 100000)).Trim();
            return (ConvertWholeNumberToIndianWords(n / 10000000) + " Crore " + ConvertWholeNumberToIndianWords(n % 10000000)).Trim();
        }

        #endregion
    }

    public class CollectDueRequestDto
    {
        public decimal Amount { get; set; }
        public string Method { get; set; } = "Cash";
        public string? ReceiptNo { get; set; }
        public string? Notes { get; set; }
        public decimal? WaiverAmount { get; set; }
        public string? WaiverReason { get; set; }
    }
}
