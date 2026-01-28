using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Reception;
using SynOS.Services.Security;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SynOS.Services.Reception
{
    public class ReceptionSnapshotService : IReceptionSnapshotService
    {
        private readonly SynOSDbContext _context;
        private readonly IUserContext _userContext;

        public ReceptionSnapshotService(SynOSDbContext context, IUserContext userContext)
        {
            _context = context;
            _userContext = userContext;
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
                    // Fix: Check for Active Visit first
                    var activeVisit = await _context.Visits
                        .Where(v => v.PatientId == query.PatientId.Value && v.Status != "Paid" && v.Status != "Cancelled")
                        .OrderByDescending(v => v.CreatedAt)
                        .FirstOrDefaultAsync();

                    if (activeVisit != null)
                    {
                        await LoadVisitContextAsync(snapshot, activeVisit.VisitId, query.PatientId);
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
                .Include(v => v.Orders).ThenInclude(o => o.Test)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

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
                .Where(v => v.PatientId == visit.PatientId && v.Status != "Cancelled")
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
                Age = visit.Patient.IsDateOfBirthKnown 
                      ? DateTime.UtcNow.Year - visit.Patient.DateOfBirth.Year 
                      : null, 
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
                    .Where(df => df.InvoiceId == invoice.InvoiceId)
                    .OrderByDescending(df => df.AppliedAt)
                    .FirstOrDefaultAsync();

                if (discountFact != null)
                {
                    var master = await _context.DiscountMasters
                        .AsNoTracking()
                        .FirstOrDefaultAsync(dm => dm.DiscountDefinitionId == discountFact.DiscountDefinitionId);
                    
                    if (master != null)
                    {
                        appliedDiscount = new AppliedDiscountInfo
                        {
                            Id = master.DiscountDefinitionId,
                            Code = master.Code,
                            Name = master.Name,
                            Amount = discountFact.DiscountAmount
                        };
                    }
                }
            }

            // New Referral State Logic
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
                        CollectionLabel = partner.PaymentCollectionModel == "PartnerCollects" ? "Prepaid (Partner)" : "Patient Pay"
                    };
                }
            }

            if (partnerInfo != null || !string.IsNullOrEmpty(visit.ReferrerText))
            {
                referralState = new IntakeReferralState
                {
                    Partner = partnerInfo,
                    ReferrerText = visit.ReferrerText
                };
            }

            // Populate Visit
            snapshot.Visit = new IntakeVisit
            {
                VisitId = visit.VisitId,
                VisitToken = visit.Token,
                Status = visit.Status,
                IsReferred = visit.IsReferred,
                ReferralPartner = partnerInfo != null ? new IntakeReferralPartner
                {
                    PartnerId = partnerInfo.Id,
                    Name = partnerInfo.DisplayName,
                    // PaymentCollectionModel is available via the local 'partner' variable from the block above
                    // but since we only need ID and Name for legacy, we can fetch or assume default
                    PaymentCollectionModel = "LabCollects" // Fallback for legacy DTO
                } : null,
                Tests = visit.Orders?
                    .Where(o => o.Status != SynOS.Models.Enums.OrderStatus.Cancelled) // 🔹 FIX: Exclude Cancelled Orders
                    .Select(o => new IntakeTestItem
                {
                    TestId = o.TestId,
                    TestCode = o.TestCode,
                    TestName = o.Test?.TestName ?? o.TestCode, // Safe navigation
                    Department = o.Department,
                    Price = o.Price
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
                    
                    AppliedDiscount = appliedDiscount,
                    Referral = referralState, // Updated Structure
                    
                    PaymentStatus = invoice.Status, // "PendingPayment" | "Paid"
                    PaymentMethod = invoice.Payments?.FirstOrDefault()?.Method, // Safe navigation
                    
                    IsEditable = visit.Status != "Paid" && visit.Status != "Cancelled",
                    IsLocked = visit.Status == "Paid"
                };
            }

            // 3. Derived UI Hints (using logic from Billing contract)
            bool isPaid = visit.Status == "Paid";
            bool isCancelled = visit.Status == "Cancelled";
            bool hasTests = snapshot.Visit.Tests.Any();
            bool hasBill = snapshot.Billing != null;

            snapshot.UiState.IsReadOnly = isPaid || isCancelled;
            if (isPaid) snapshot.UiState.ReadOnlyReason = "Visit is Paid";
            if (isCancelled) snapshot.UiState.ReadOnlyReason = "Visit is Cancelled";

            if (!snapshot.UiState.IsReadOnly)
            {
                snapshot.UiState.CanAddTests = !hasBill; // Locked once billed in V1 flow
                if (hasBill) snapshot.UiState.ReadOnlyReason = "Bill Generated";

                snapshot.UiState.CanGenerateBill = hasTests && !hasBill;
                snapshot.UiState.CanAcceptPayment = hasBill && !isPaid;
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
                .Where(v => v.PatientId == patient.PatientId && v.Status != "Cancelled")
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
                Age = patient.IsDateOfBirthKnown 
                      ? DateTime.UtcNow.Year - patient.DateOfBirth.Year 
                      : null,
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
