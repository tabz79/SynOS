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
                    PartnerId = inv.Visit?.ReferralPartnerId ?? inv.Visit?.ReferralPartner?.ReferralPartnerId,
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

        #region Stationery & Billing Settings

        [HttpGet("stationery-settings")]
        public async Task<IActionResult> GetStationerySettings()
        {
            var path = System.IO.Path.Combine(System.AppContext.BaseDirectory, "billing_stationery_settings.json");
            if (!System.IO.File.Exists(path))
            {
                var lab = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
                var defaultSettings = new
                {
                    labLegalName = lab?.Name ?? "SynOS Diagnostic Centre & Laboratory",
                    labTradeName = !string.IsNullOrEmpty(lab?.Tagline) ? lab.Tagline : "Advanced Pathology & Imaging Services",
                    address = lab?.Address ?? "Central Diagnostic Facility, Hyderabad, Telangana",
                    phone = lab?.Phone ?? "+91 98765 43210",
                    email = lab?.Email ?? "billing@synoslab.in",
                    website = lab?.Website ?? "www.synoslab.in",
                    gstin = "36AAAAA0000A1Z5",
                    pan = "AAAAA0000A",
                    bankName = "HDFC Bank",
                    accountNumber = "50200012345678",
                    ifscCode = "HDFC0001234",
                    branch = "Main Branch, Khammam",
                    accountHolderName = lab?.Name ?? "SynOS Healthcare Diagnostic Services",
                    upiId = !string.IsNullOrEmpty(lab?.UpiId) ? lab.UpiId : "synoslab@hdfcbank",
                    enableUpiQr = true,
                    defaultLetterheadMode = "digital", // "digital" | "preprinted"
                    topMarginMm = 40,
                    bottomMarginMm = 15,
                    termsAndConditions = "1. All disputes are subject to local jurisdiction.\n2. Payment terms: Due within 15 days of invoice date.\n3. In case of online payment, please mention invoice or statement reference number.\n4. Cheques are subject to realization.",
                    signatoryTitle = "Authorised Signatory / Accounts Desk"
                };
                var json = System.Text.Json.JsonSerializer.Serialize(defaultSettings, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                await System.IO.File.WriteAllTextAsync(path, json);
                return Content(json, "application/json");
            }

            var existing = await System.IO.File.ReadAllTextAsync(path);
            return Content(existing, "application/json");
        }

        [HttpPost("stationery-settings")]
        public async Task<IActionResult> SaveStationerySettings([FromBody] System.Text.Json.JsonElement settings)
        {
            var path = System.IO.Path.Combine(System.AppContext.BaseDirectory, "billing_stationery_settings.json");
            var json = settings.ToString();
            await System.IO.File.WriteAllTextAsync(path, json);
            return Ok(new { message = "Billing stationery settings successfully saved." });
        }

        [HttpGet("document-mappings")]
        public async Task<IActionResult> GetDocumentMappings()
        {
            var path = System.IO.Path.Combine(System.AppContext.BaseDirectory, "document_mappings_registry.json");
            if (!System.IO.File.Exists(path))
            {
                var defaultSlots = new[]
                {
                    new {
                        slotId = "patient_tax_invoice",
                        module = "Reception & Billing",
                        moduleCode = "reception",
                        slotName = "Patient Tax Invoice (A4)",
                        triggerDescription = "Generated upon patient visit checkout, formal OPD billing receipt, and past invoice reprints.",
                        assignedTemplateId = "template_patient_a4_modern",
                        templateName = "Modern GST Tax Invoice (A4)",
                        letterheadMode = "digital",
                        topMarginMm = 40,
                        enableUpiQr = true,
                        enableBankDetails = true,
                        customTerms = (string?)null,
                        isSystemDefault = true
                    },
                    new {
                        slotId = "patient_thermal_receipt",
                        module = "Reception & Cash Desk",
                        moduleCode = "reception",
                        slotName = "Counter Quick Token / Cash Slip (80mm POS)",
                        triggerDescription = "Printed directly on thermal POS roll printer for quick counter tokens and cash collections.",
                        assignedTemplateId = "template_thermal_pos_80mm",
                        templateName = "Thermal 80mm Cash Slip",
                        letterheadMode = "raw_thermal",
                        topMarginMm = 0,
                        enableUpiQr = true,
                        enableBankDetails = false,
                        customTerms = (string?)null,
                        isSystemDefault = true
                    },
                    new {
                        slotId = "partner_b2b_invoice",
                        module = "Referral Terminal",
                        moduleCode = "referral",
                        slotName = "Partner B2B Diagnostic Service Invoice",
                        triggerDescription = "Generated when billing outsourced doctor clinics and partner healthcare centers for diagnostic dues.",
                        assignedTemplateId = "template_partner_b2b_a4",
                        templateName = "B2B Diagnostic Tax Invoice (A4)",
                        letterheadMode = "digital",
                        topMarginMm = 40,
                        enableUpiQr = true,
                        enableBankDetails = true,
                        customTerms = (string?)null,
                        isSystemDefault = true
                    },
                    new {
                        slotId = "referral_payout_voucher",
                        module = "Referral Terminal",
                        moduleCode = "referral",
                        slotName = "Doctor Commission Payout Voucher",
                        triggerDescription = "Generated when disbursing referral incentives to doctors with TDS Sec 194H deduction and formal acknowledgment.",
                        assignedTemplateId = "template_referral_voucher_a4",
                        templateName = "Doctor Commission Payout Voucher (A4)",
                        letterheadMode = "digital",
                        topMarginMm = 40,
                        enableUpiQr = false,
                        enableBankDetails = true,
                        customTerms = (string?)null,
                        isSystemDefault = true
                    },
                    new {
                        slotId = "procurement_po",
                        module = "Inventory & Procurement",
                        moduleCode = "inventory",
                        slotName = "Vendor Purchase Order (PO)",
                        triggerDescription = "Generated when releasing formal purchase orders for lab reagents, test kits, radiology films, and capital equipment.",
                        assignedTemplateId = "template_procurement_po_a4",
                        templateName = "Commercial Purchase Order (A4)",
                        letterheadMode = "digital",
                        topMarginMm = 40,
                        enableUpiQr = false,
                        enableBankDetails = true,
                        customTerms = "1. Goods must have minimum 12 months shelf life.\n2. Cold-chain items must be delivered at 2°C - 8°C.\n3. Defective lots subject to immediate replacement.",
                        isSystemDefault = true
                    },
                    new {
                        slotId = "procurement_grn",
                        module = "Inventory & Stores",
                        moduleCode = "inventory",
                        slotName = "Goods Receipt Note (GRN)",
                        triggerDescription = "Generated by the storekeeper upon inspecting and checking in delivered items at the receiving dock.",
                        assignedTemplateId = "template_grn_a4",
                        templateName = "Material Inward / GRN (A4)",
                        letterheadMode = "digital",
                        topMarginMm = 35,
                        enableUpiQr = false,
                        enableBankDetails = false,
                        customTerms = (string?)null,
                        isSystemDefault = true
                    },
                    new {
                        slotId = "workforce_payslip",
                        module = "Workforce & HR",
                        moduleCode = "workforce",
                        slotName = "Employee Monthly Salary Slip",
                        triggerDescription = "Generated during monthly payroll processing with earnings, statutory PF/ESI, deductions, and net salary in words.",
                        assignedTemplateId = "template_payslip_a4",
                        templateName = "Confidential Salary Pay Slip (A4)",
                        letterheadMode = "digital",
                        topMarginMm = 40,
                        enableUpiQr = false,
                        enableBankDetails = true,
                        customTerms = "This is a computer-generated salary slip and requires no physical signature.",
                        isSystemDefault = true
                    },
                    new {
                        slotId = "overhead_expense_voucher",
                        module = "Overheads & Expenses",
                        moduleCode = "finance",
                        slotName = "Petty Cash & Expense Payment Voucher",
                        triggerDescription = "Generated when disbursing daily operating expenses, maintenance, courier, utilities, and tea/coffee supplies.",
                        assignedTemplateId = "template_expense_voucher_a4",
                        templateName = "Payment & Debit Voucher (A5 / Half-Sheet)",
                        letterheadMode = "digital",
                        topMarginMm = 25,
                        enableUpiQr = false,
                        enableBankDetails = false,
                        customTerms = (string?)null,
                        isSystemDefault = true
                    }
                };

                var json = System.Text.Json.JsonSerializer.Serialize(defaultSlots, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                await System.IO.File.WriteAllTextAsync(path, json);
                return Content(json, "application/json");
            }

            var existing = await System.IO.File.ReadAllTextAsync(path);
            return Content(existing, "application/json");
        }

        [HttpPost("document-mappings")]
        public async Task<IActionResult> SaveDocumentMappings([FromBody] System.Text.Json.JsonElement mappings)
        {
            var path = System.IO.Path.Combine(System.AppContext.BaseDirectory, "document_mappings_registry.json");
            var json = mappings.ToString();
            await System.IO.File.WriteAllTextAsync(path, json);
            return Ok(new { message = "Document mappings registry successfully saved." });
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

            var billNo = $"BILL-{inv.CreatedAt:yyyyMMdd}-{inv.InvoiceId.ToString().Substring(0, 4).ToUpper()}";
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
                    .Select(v => v.ReferralPartnerId)
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
                .Include(v => v.Orders)
                    .ThenInclude(o => o.Test)
                .Where(v => visitIds.Contains(v.VisitId))
                .AsNoTracking()
                .ToDictionaryAsync(v => v.VisitId);

            var items = new List<object>();
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

                var billAmount = fact.Amount;
                var rec = fact.AmountReceived;
                var due = Math.Max(0, fact.Amount - fact.AmountReceived);

                totalBilled += billAmount;
                totalReceived += rec;
                totalNetDue += due;

                items.Add(new
                {
                    Index = lineIndex++,
                    ReceivableFactId = fact.ReceivableFactId,
                    VisitId = fact.SourceVisitId,
                    BillNumber = visit != null ? $"BILL-{visit.CreatedAt:yyyyMMdd}-{visit.VisitId.ToString().Substring(0, 4).ToUpper()}" : fact.ReceivableFactId.ToString().Substring(0, 8).ToUpper(),
                    Token = visit?.Token ?? fact.ReceivableFactId.ToString().Substring(0, 8),
                    Date = fact.OccurredAt.DateTime,
                    PatientName = ptName,
                    AgeGender = ageGen,
                    Investigations = testSummary,
                    GrossAmount = billAmount,
                    Rate = billAmount,
                    AmountReceived = rec,
                    NetPayableToLab = due
                });
            }

            // Fallback: If no ledger facts found but specific visitIds were requested
            if (facts.Count == 0 && request.VisitIds != null && request.VisitIds.Count > 0)
            {
                var directVisits = await _context.Visits
                    .Include(v => v.Patient)
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
                    decimal billAmount = inv?.Total ?? orders.Sum(o => o.Price);
                    decimal rec = inv?.Payments?.Sum(p => p.Amount) ?? 0m;
                    decimal due = Math.Max(0, billAmount - rec);

                    totalBilled += billAmount;
                    totalReceived += rec;
                    totalNetDue += due;

                    items.Add(new
                    {
                        Index = lineIndex++,
                        ReceivableFactId = Guid.NewGuid(),
                        VisitId = v.VisitId,
                        BillNumber = $"BILL-{v.CreatedAt:yyyyMMdd}-{v.VisitId.ToString().Substring(0, 4).ToUpper()}",
                        Token = v.Token ?? "COUNTER",
                        Date = v.CreatedAt,
                        PatientName = ptName,
                        AgeGender = ageGen,
                        Investigations = testSummary,
                        GrossAmount = billAmount,
                        Rate = billAmount,
                        AmountReceived = rec,
                        NetPayableToLab = due
                    });
                }
            }

            var now = DateTime.UtcNow;
            var safePartner = (partner.Name ?? "PRT").Replace(" ", "");
            var pCode = safePartner.Substring(0, Math.Min(3, safePartner.Length)).ToUpper();
            var statementNo = $"CLM-{now:yyyyMM}-{pCode}{now:ddHHmm}";

            var upiPayload = $"upi://pay?pa={settings.UpiId}&pn={Uri.EscapeDataString(settings.LabLegalName)}&am={totalNetDue:F2}&cu=INR&tn={statementNo}";

            return Ok(new
            {
                StatementNumber = statementNo,
                Date = now,
                DueDate = now.AddDays(15),
                BillingPeriod = request.StartDate.HasValue && request.EndDate.HasValue 
                    ? $"{request.StartDate.Value:dd MMM yyyy} to {request.EndDate.Value:dd MMM yyyy}" 
                    : $"Transactions as of {now:dd MMM yyyy}",
                
                Lab = settings,

                Partner = new
                {
                    PartnerId = partner.ReferralPartnerId,
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
                    TotalVisitsCount = items.Count,
                    TotalGrossBilled = totalBilled,
                    TotalDiagnosticCharges = totalBilled,
                    TotalCommissionCut = 0m,
                    TotalPaid = totalReceived,
                    TotalReceived = totalReceived,
                    NetClaimDue = totalNetDue,
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

            var path = System.IO.Path.Combine(System.AppContext.BaseDirectory, "billing_stationery_settings.json");
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
}
