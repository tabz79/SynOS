using Microsoft.EntityFrameworkCore;
using SynOS.Services.Operational; // ADDED
using SynOS.Data;
using SynOS.Models.DTOs.Reception;
using SynOS.Services.Security;
using SynOS.Models.Enums;
using SynOS.Services.Time; // ADDED
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Services.Reception
{
    public class ReceptionSnapshotService : IReceptionSnapshotService
    {
        private readonly SynOSDbContext _context;
        private readonly IUserContext _userContext;
        private readonly IVisitLifecyclePolicy _lifecyclePolicy;
        private readonly ILabTimeProvider _labTimeProvider; // ADDED

        public ReceptionSnapshotService(
            SynOSDbContext context, 
            IUserContext userContext, 
            IVisitLifecyclePolicy lifecyclePolicy,
            ILabTimeProvider labTimeProvider) // ADDED
        {
            _context = context;
            _userContext = userContext;
            _lifecyclePolicy = lifecyclePolicy;
            _labTimeProvider = labTimeProvider;
        }

        public async Task<ReceptionIntakeSnapshotDto> GetSnapshotAsync(ReceptionSnapshotQuery query)
        {
            var snapshot = new ReceptionIntakeSnapshotDto
            {
                Context = new IntakeContext
                {
                    BranchId = _userContext.CurrentBranchId,
                    ReceptionistUserId = _userContext.CurrentUserId,
                    CurrentTimeUtc = DateTime.UtcNow,
                    RequestToken = Guid.NewGuid().ToString("N")
                }
            };

            // 1. Resolve State
            try
            {
                if (query.VisitId.HasValue)
                {
                    await LoadVisitContextAsync(snapshot, query.VisitId.Value, query.PatientId);
                }
                else if (query.PatientId.HasValue)
                {
                    // Use Policy to find any resumable visit for this patient
                    var patientVisits = await _context.Visits
                        .Where(v => v.PatientId == query.PatientId.Value)
                        .OrderByDescending(v => v.CreatedAt)
                        .ToListAsync();

                    var today = _labTimeProvider.GetLabToday();
                    var resumableVisit = patientVisits.FirstOrDefault(v => 
                        v.TokenDate == today && // ONLY resume visits from Today
                        _lifecyclePolicy.CanResume(v.Status));

                    if (_userContext.CurrentRole == "Receptionist")
                    {
                        if (resumableVisit != null && resumableVisit.AssignedReceptionistId != _userContext.CurrentUserId)
                        {
                            resumableVisit = null;
                        }
                    }

                    if (resumableVisit != null)
                    {
                        await LoadVisitContextAsync(snapshot, resumableVisit.VisitId, query.PatientId);
                    }
                    else
                    {
                        await LoadPatientContextAsync(snapshot, query.PatientId.Value);
                    }
                }
                else
                {
                    // Empty Intake
                    snapshot.UiState.CanRegisterPatient = true; // Can start flow
                }
            }
            catch (Exception ex)
            {
                // CRITICAL DEBUGGING: Expose error to UI instead of 500
                snapshot.UiState.IsReadOnly = true;
                snapshot.UiState.ReadOnlyReason = $"BACKEND ERROR: {ex.Message} | {ex.StackTrace}";
                // Log strictly
                Console.WriteLine($"[Snapshot Error] {ex}"); 
            }

            return snapshot;
        }

        private async Task LoadVisitContextAsync(ReceptionIntakeSnapshotDto snapshot, Guid visitId, Guid? requestedPatientId)
        {
            // 1. Fetch Main Visit Context (No History Cycle)
            var visit = await _context.Visits
                .AsNoTracking()
                .Include(v => v.Patient) // Just Patient info
                .Include(v => v.Creator) // Biller User Info
                .Include(v => v.Orders).ThenInclude(o => o.Test)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .Include(v => v.ReferralDraft)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            // Ownership Check
            if (_userContext.CurrentRole == "Receptionist" && visit.AssignedReceptionistId != _userContext.CurrentUserId)
            {
                throw new UnauthorizedAccessException("This visit is assigned to another receptionist. Access denied.");
            }

            // Mismatch Check
            if (requestedPatientId.HasValue && visit.PatientId != requestedPatientId.Value)
            {
                throw new ArgumentException("VisitId and PatientId do not match. Context corruption detected.");
            }

            // 2. Fetch History Separately (Avoids EF Core No-Tracking Cycle)
            // Fix: Include current visit in "Last Visit" calculation to match Search Results consistency.
            // If the user resumes a draft, they expect to see "Last Visit: Today" rather than "New".
            var lastVisit = await _context.Visits
                .AsNoTracking()
                .Where(v => v.PatientId == visit.PatientId && v.Status != VisitStatus.Cancelled)
                .Include(v => v.Orders)
                .OrderByDescending(v => v.TokenDate)
                .Select(v => new { v.TokenDate, TestCodes = v.Orders.Select(o => o.TestCode).ToList() })
                .FirstOrDefaultAsync();

            // Populate Patient
            snapshot.Patient = new IntakePatient
            {
                PatientId = visit.Patient.PatientId,
                MRN = visit.Patient.MRN,
                FullName = !string.IsNullOrEmpty(visit.Patient.DisplayName) 
                           ? visit.Patient.DisplayName 
                           : $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                Gender = visit.Patient.Gender,
                Age = visit.Patient.DateOfBirth > DateTime.MinValue && visit.Patient.DateOfBirth.Year > 1900
                      ? Math.Max(0, (int)((DateTime.UtcNow - visit.Patient.DateOfBirth).TotalDays / 365.25))
                      : null,
                DateOfBirth = visit.Patient.DateOfBirth > DateTime.MinValue && visit.Patient.DateOfBirth.Year > 1900 ? visit.Patient.DateOfBirth : null,
                IsDateOfBirthKnown = visit.Patient.IsDateOfBirthKnown,
                Mobile = visit.Patient.CurrentPhoneNumber,
                LastVisitDate = lastVisit?.TokenDate,
                LastVisitTestCodes = lastVisit?.TestCodes ?? new List<string>()
            };

            // 1. Resolve Active Invoice and Meta-data
            var invoice = visit.Invoices?.OrderByDescending(i => i.CreatedAt).FirstOrDefault(); // Safe check for null list
            
            AppliedDiscountInfo? appliedDiscount = null;
            if (invoice != null)
            {
                var discountFact = await _context.DiscountFacts
                    .AsNoTracking()
                    .Where(df => df.InvoiceId == invoice.InvoiceId && df.IsActive)
                    .OrderByDescending(df => df.AppliedAt)
                    .FirstOrDefaultAsync();

                if (discountFact != null)
                {
                    var master = await _context.DiscountMasters
                        .AsNoTracking()
                        .FirstOrDefaultAsync(dm => dm.DiscountDefinitionId == discountFact.DiscountDefinitionId);

                    string? extractedReason = null;
                    if (!string.IsNullOrWhiteSpace(discountFact.AppliedBy))
                    {
                        var parts = discountFact.AppliedBy.Split(" - ", 2);
                        if (parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1]))
                        {
                            extractedReason = parts[1].Trim();
                        }
                    }

                    if (string.IsNullOrWhiteSpace(extractedReason) && master != null)
                    {
                        extractedReason = master.Name;
                    }

                    string displayName = master?.Name ?? (discountFact.Type == SynOS.Models.Enums.DiscountType.Percentage ? $"{discountFact.Value}% Custom Discount" : $"₹{discountFact.Value} Custom Concession");
                    if (!string.IsNullOrWhiteSpace(extractedReason))
                    {
                        displayName = extractedReason;
                    }
                    
                    appliedDiscount = new AppliedDiscountInfo
                    {
                        Id = master?.DiscountDefinitionId ?? discountFact.DiscountDefinitionId,
                        Code = master?.Code ?? "CUSTOM",
                        Name = displayName,
                        Reason = extractedReason ?? displayName,
                        Amount = discountFact.DiscountAmount,
                        Type = discountFact.Type.ToString(),
                        Value = discountFact.Value,
                        AppliedBy = discountFact.AppliedBy
                    };
                }
            }

            // New Referral State Logic (Primary Prescribing Doctor + Secondary RMP Partner)
            IntakeReferralState? referralState = null;
            ReferralPartnerInfo? partnerInfo = null;

            if (visit.ReferralPartnerId.HasValue)
            {
                var partner = await _context.ReferralPartners
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ReferralPartnerId == visit.ReferralPartnerId.Value);
                
                if (partner != null)
                {
                    partnerInfo = new ReferralPartnerInfo
                    {
                        Id = partner.ReferralPartnerId,
                        DisplayName = partner.Name,
                        PartnerType = partner.PartnerType.ToString(),
                        CommissionCutPercentage = partner.DefaultCommissionPercentage
                    };
                }
            }

            ReferralPartnerInfo? secondaryPartnerInfo = null;
            if (visit.SecondaryReferralPartnerId.HasValue)
            {
                var secPartner = await _context.ReferralPartners
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ReferralPartnerId == visit.SecondaryReferralPartnerId.Value);

                if (secPartner != null)
                {
                    secondaryPartnerInfo = new ReferralPartnerInfo
                    {
                        Id = secPartner.ReferralPartnerId,
                        DisplayName = secPartner.Name,
                        PartnerType = secPartner.PartnerType.ToString(),
                        CommissionCutPercentage = secPartner.DefaultCommissionPercentage
                    };
                }
            }

            if (partnerInfo != null || secondaryPartnerInfo != null || !string.IsNullOrEmpty(visit.ReferrerText) || visit.ReferralDraft != null)
            {
                referralState = new IntakeReferralState
                {
                    Partner = partnerInfo,
                    SecondaryPartner = secondaryPartnerInfo,
                    ReferrerText = visit.ReferrerText,
                    PrescribingDoctorName = visit.ReferrerText ?? partnerInfo?.DisplayName,
                    Draft = visit.ReferralDraft == null ? null : new ReferralDraftInfo
                    {
                        ReferralDraftId = visit.ReferralDraft.ReferralDraftId,
                        ProviderName = visit.ReferralDraft.ProviderName,
                        ClinicName = visit.ReferralDraft.ClinicName,
                        Location = visit.ReferralDraft.Location
                    }
                };
            }

            // Check insurance and corporate names if assigned
            string? insuranceName = null;
            if (visit.InsuranceCompanyId.HasValue)
            {
                var ins = await _context.InsuranceCompanies.FindAsync(visit.InsuranceCompanyId.Value);
                insuranceName = ins?.Name;
            }

            string? corporateName = null;
            if (visit.CorporateAccountId.HasValue)
            {
                var corp = await _context.CorporateAccounts.FindAsync(visit.CorporateAccountId.Value);
                corporateName = corp?.CompanyName;
            }

            string? billerFullName = visit.Creator?.Name;
            string? billerUsername = visit.Creator?.Username;
            string? billerDisplay = null;
            if (!string.IsNullOrEmpty(billerFullName) && !string.IsNullOrEmpty(billerUsername))
            {
                billerDisplay = $"{billerFullName} ({billerUsername})";
            }
            else if (!string.IsNullOrEmpty(billerFullName))
            {
                billerDisplay = billerFullName;
            }
            else if (!string.IsNullOrEmpty(billerUsername))
            {
                billerDisplay = billerUsername;
            }

            // Populate Visit
            snapshot.Visit = new IntakeVisit
            {
                VisitId = visit.VisitId,
                VisitToken = visit.Token,
                Status = visit.Status.ToString(),
                IsReferred = visit.IsReferred,
                BilledBy = billerDisplay,
                BilledByFullName = billerFullName,
                BilledByUsername = billerUsername,
                ReferralPartner = partnerInfo != null ? new IntakeReferralPartner
                {
                    PartnerId = partnerInfo.Id,
                    Name = partnerInfo.DisplayName
                } : null,
                SecondaryReferralPartner = secondaryPartnerInfo != null ? new IntakeReferralPartner
                {
                    PartnerId = secondaryPartnerInfo.Id,
                    Name = secondaryPartnerInfo.DisplayName
                } : null,
                PaymentCollectionModel = visit.PaymentCollectionModel ?? "LabCollects",
                B2BDiscountAmount = visit.B2BDiscountAmount,
                B2BDiscountType = visit.B2BDiscountType,
                B2BDiscountValue = visit.B2BDiscountValue,
                B2BDiscountEnteredBy = visit.B2BDiscountEnteredBy,
                B2BDiscountEnteredAt = visit.B2BDiscountEnteredAt,
                BillingType = visit.BillingType,
                InsuranceCompanyId = visit.InsuranceCompanyId,
                InsuranceCompanyName = insuranceName,
                PolicyNumber = visit.PolicyNumber,
                PreAuthApprovalNumber = visit.PreAuthApprovalNumber,
                InsuranceCoPayAmount = visit.InsuranceCoPayAmount,
                CorporateAccountId = visit.CorporateAccountId,
                CorporateCompanyName = corporateName,
                EmployeeId = visit.EmployeeId,
                CorporatePackageId = visit.CorporatePackageId,
                Tests = visit.Orders?
                    .Where(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled) // 🔹 FIX: Exclude Cancelled Orders
                    .Where(o => o.ParentOrderId == null && !(o.Price == 0 && o.Test != null && !o.Test.IsProfile && visit.Orders.Any(po => po.Test != null && po.Test.IsProfile && po.Status != SynOS.Models.Enums.OrderStatus.Cancelled)))
                    .Select(o => new IntakeTestItem
                {
                    OrderId = o.OrderId,
                    TestId = o.TestId,
                    TestCode = o.TestCode,
                    TestName = o.Test?.TestName ?? o.TestCode, // Safe navigation
                    Department = o.Department,
                    Price = o.Price,
                    IsOutsourced = o.IsOutsourced,
                    ReferenceLabName = o.ReferenceLabName,
                    ParentOrderId = o.ParentOrderId,
                    IsProfile = o.Test != null ? o.Test.IsProfile : false
                }).ToList() ?? new List<IntakeTestItem>()
            };

            // 2. Populate Billing Contract
            if (invoice != null)
            {
                snapshot.Billing = new IntakeBilling
                {
                    InvoiceId = invoice.InvoiceId,
                    GrossAmount = invoice.GrossAmount,
                    DiscountAmount = invoice.DiscountAmount,
                    NetAmount = invoice.NetAmount,
                    TaxAmount = invoice.TaxAmount,
                    TotalAmount = invoice.Total,
                    B2BDiscountAmount = visit.B2BDiscountAmount,
                    
                    AppliedDiscount = appliedDiscount,
                    Referral = referralState, // Updated Structure
                    BilledBy = billerDisplay,
                    PaymentStatus = invoice.Status, // "PendingPayment" | "Paid"
                    PaymentMethod = invoice.Payments?.FirstOrDefault(p => p.Method != "PartnerAccount")?.Method ?? (visit.PaymentCollectionModel == "PartnerCollects" ? "PartnerAccount" : invoice.Payments?.FirstOrDefault()?.Method), // Safe navigation
                    TotalPaid = visit.PaymentCollectionModel == "PartnerCollects"
                        ? 0m
                        : ((invoice.Payments?.Where(p => p.Method != "PartnerAccount").Sum(p => p.Amount) ?? 0m) + (invoice.PartialPayments?.Sum(p => p.Amount) ?? 0m)),
                    
                    IsEditable = !_lifecyclePolicy.IsTerminal(visit.Status),
                    IsLocked = _lifecyclePolicy.IsTerminal(visit.Status)
                };
            }

            // 3. Derived UI Hints (using logic from Billing contract)
            snapshot.UiState.IsReadOnly = _lifecyclePolicy.IsTerminal(visit.Status);
            if (snapshot.UiState.IsReadOnly) snapshot.UiState.ReadOnlyReason = $"Visit is {visit.Status}";

            bool hasTests = snapshot.Visit.Tests.Any();
            bool hasBill = snapshot.Billing != null;

            if (!snapshot.UiState.IsReadOnly)
            {
                snapshot.UiState.CanAddTests = _lifecyclePolicy.IsEditable(visit.Status) && !hasBill;
                if (hasBill) snapshot.UiState.ReadOnlyReason = "Bill Generated";

                snapshot.UiState.CanGenerateBill = hasTests && !hasBill;
                snapshot.UiState.CanAcceptPayment = _lifecyclePolicy.CanAcceptPayment(visit.Status);
            }

            // 4. Correction & Revision Audit History
            var correctionFacts = await _context.CorrectionFacts
                .AsNoTracking()
                .Where(c => c.VisitId == visit.VisitId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            if (correctionFacts.Any())
            {
                var userIds = correctionFacts.Select(c => c.CreatedBy).Distinct().ToList();
                var users = await _context.Users
                    .AsNoTracking()
                    .Where(u => userIds.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => u.Name ?? u.Username);

                snapshot.CorrectionHistory = correctionFacts.Select(c => new IntakeCorrectionHistoryItem
                {
                    CorrectionId = c.CorrectionId,
                    CreatedAt = c.CreatedAt,
                    Reason = c.Reason,
                    PreviousAmount = c.PreviousAmount,
                    NewAmount = c.NewAmount,
                    CreatedByName = users.TryGetValue(c.CreatedBy, out var name) ? name : "Staff Desk",
                    PayloadJson = c.PayloadJson
                }).ToList();
            }
        }

        private async Task LoadPatientContextAsync(ReceptionIntakeSnapshotDto snapshot, Guid patientId)
        {
            // 1. Fetch Patient (Avoid cycle)
            var patient = await _context.Patients
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.PatientId == patientId);

            if (patient == null) throw new KeyNotFoundException($"Patient {patientId} not found.");

            // 2. Fetch History Separately
            var lastVisit = await _context.Visits
                .AsNoTracking()
                .Where(v => v.PatientId == patient.PatientId && v.Status != VisitStatus.Cancelled)
                .Include(v => v.Orders)
                .OrderByDescending(v => v.TokenDate)
                .Select(v => new { v.TokenDate, TestCodes = v.Orders.Select(o => o.TestCode).ToList() })
                .FirstOrDefaultAsync();

            snapshot.Patient = new IntakePatient
            {
                PatientId = patient.PatientId,
                MRN = patient.MRN,
                FullName = !string.IsNullOrEmpty(patient.DisplayName) 
                           ? patient.DisplayName 
                           : $"{patient.FirstName} {patient.LastName}",
                Gender = patient.Gender,
                Age = patient.DateOfBirth > DateTime.MinValue && patient.DateOfBirth.Year > 1900
                      ? Math.Max(0, (int)((DateTime.UtcNow - patient.DateOfBirth).TotalDays / 365.25))
                      : null,
                DateOfBirth = patient.DateOfBirth > DateTime.MinValue && patient.DateOfBirth.Year > 1900 ? patient.DateOfBirth : null,
                IsDateOfBirthKnown = patient.IsDateOfBirthKnown,
                Mobile = patient.CurrentPhoneNumber,
                LastVisitDate = lastVisit?.TokenDate,
                LastVisitTestCodes = lastVisit?.TestCodes ?? new List<string>()
            };

            // No Visit context
            snapshot.UiState.CanRegisterPatient = false; // Already selected
            snapshot.UiState.CanAddTests = true; // Can create visit by adding tests? 
            // Usually Flow is: Select Patient -> Create Visit (implicit or explicit?).
            // If explicit "Create Visit" button exists, then CanCreateVisit = true.
            // If adding tests creates visit, then CanAddTests = true.
            // Prompt says "Visit Draft (Tests selected, not yet billed)".
            // "Patient Identified -> Visit Draft".
            // So if Patient Selected, we are in pre-visit state.
            // Let's assume UI has "Create Visit" or "Start Intake".
            // But usually "Add Test" implicitly starts a draft.
            // I'll set CanAddTests = false (since no Visit container exists yet?), 
            // OR I assume frontend calls "CreateVisit" first.
            // Let's assume we need to "Start Visit" to get a VisitId.
            snapshot.UiState.CanAddTests = false; 
            // Actually, if Visit is null, we can't add tests to it.
            // We probably need a "CanStartVisit" flag? 
            // Or "CanAddTests" implies creating one?
            // "Draft" implies Visit exists.
            // "Patient Identified" is step 2.
            // I will add `CanCreateVisit` implicit flag logic?
            // Wait, UiState definition: CanAddTests.
            // If I return `CanAddTests=false` when patient is selected, how do they proceed?
            // They must call `CreateVisit`.
            // So I should probably add `CanCreateVisit`?
            // But I can't change DTO structure arbitrarily.
            // The prompt DTO has `CanAddTests`.
            // Maybe `CanAddTests` means "Can Add Tests to *A* visit (creating one if needed)"?
            // I will set it to `true` if that's the trigger.
            // But backend `AddTest` API usually needs `VisitId`.
            // So Frontend likely calls `CreateVisit` -> gets `VisitId` -> calls Snapshot -> sees `CanAddTests=true`.
            // So here, `CanAddTests = false`.
            // `CanRegisterPatient` = false.
            // Implicit "Ready to Create Visit".
        }
    }
}
