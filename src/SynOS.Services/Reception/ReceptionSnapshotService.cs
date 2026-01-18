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
            if (query.VisitId.HasValue)
            {
                await LoadVisitContextAsync(snapshot, query.VisitId.Value, query.PatientId);
            }
            else if (query.PatientId.HasValue)
            {
                await LoadPatientContextAsync(snapshot, query.PatientId.Value);
            }
            else
            {
                // Empty Intake
                snapshot.UiState.CanRegisterPatient = true; // Can start flow
            }

            return snapshot;
        }

        private async Task LoadVisitContextAsync(ReceptionIntakeSnapshotDto snapshot, Guid visitId, Guid? requestedPatientId)
        {
            var visit = await _context.Visits
                .AsNoTracking()
                .Include(v => v.Patient)
                .Include(v => v.Orders).ThenInclude(o => o.Test)
                .Include(v => v.Invoices).ThenInclude(i => i.Payments) // Assuming 1:1 or 1:N invoice, standard flow usually 1 active
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException($"Visit {visitId} not found.");

            // Mismatch Check
            if (requestedPatientId.HasValue && visit.PatientId != requestedPatientId.Value)
            {
                throw new ArgumentException("VisitId and PatientId do not match. Context corruption detected.");
            }

            // Populate Patient
            snapshot.Patient = new IntakePatient
            {
                PatientId = visit.Patient.PatientId,
                MRN = visit.Patient.MRN,
                FullName = !string.IsNullOrEmpty(visit.Patient.DisplayName) 
                           ? visit.Patient.DisplayName 
                           : $"{visit.Patient.FirstName} {visit.Patient.LastName}",
                Gender = visit.Patient.Gender,
                // Age is null if DOB is unknown
                Age = visit.Patient.IsDateOfBirthKnown 
                      ? DateTime.UtcNow.Year - visit.Patient.DateOfBirth.Year 
                      : null, 
                Mobile = visit.Patient.CurrentPhoneNumber
            };

            // Resolve Referral Partner Name (Optimization: query only if needed or Include above?)
            // Visit entity might not have navigation prop for ReferralPartner if not configured.
            // Let's assume we query it if ID exists.
            IntakeReferralPartner? referralInfo = null;
            if (visit.ReferralPartnerId.HasValue)
            {
                var partner = await _context.ReferralPartners
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ReferralPartnerId == visit.ReferralPartnerId.Value);
                
                if (partner != null)
                {
                    referralInfo = new IntakeReferralPartner
                    {
                        PartnerId = partner.ReferralPartnerId,
                        Name = partner.Name,
                        PaymentCollectionModel = partner.PaymentCollectionModel
                    };
                }
            }

            // Populate Visit
            snapshot.Visit = new IntakeVisit
            {
                VisitId = visit.VisitId,
                VisitToken = visit.Token,
                Status = visit.Status,
                IsReferred = visit.IsReferred,
                ReferralPartner = referralInfo,
                Tests = visit.Orders.Select(o => new IntakeTestItem
                {
                    TestId = o.TestId,
                    TestCode = o.TestCode,
                    TestName = o.Test.TestName, // Assuming Order has Nav prop to Test
                    Department = o.Department,
                    Price = o.Price
                }).ToList()
            };

            // Populate Billing
            var invoice = visit.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(); // Active invoice
            if (invoice != null)
            {
                snapshot.Billing = new IntakeBilling
                {
                    InvoiceId = invoice.InvoiceId,
                    GrossAmount = invoice.GrossAmount,
                    DiscountAmount = invoice.DiscountAmount,
                    TaxAmount = invoice.TaxAmount,
                    NetAmount = invoice.Total, // Total is Net + Tax usually.
                    PaymentStatus = invoice.Status,
                    PaymentMethod = invoice.Payments.FirstOrDefault()?.Method, // Simplified
                    IsLocked = invoice.Status == "Paid" || invoice.Status == "Cancelled"
                };
            }

            // Derived UI State
            bool isPaid = visit.Status == "Paid" || (snapshot.Billing?.PaymentStatus == "Paid");
            bool isCancelled = visit.Status == "Cancelled";
            bool hasTests = snapshot.Visit.Tests.Any();
            bool hasBill = snapshot.Billing != null;

            snapshot.UiState.IsReadOnly = isPaid || isCancelled;
            if (isPaid) snapshot.UiState.ReadOnlyReason = "Visit is Paid";
            if (isCancelled) snapshot.UiState.ReadOnlyReason = "Visit is Cancelled";

            if (!snapshot.UiState.IsReadOnly)
            {
                snapshot.UiState.CanAddTests = true; // Can allow add/remove until locked/paid? Usually until Bill Gen?
                // Requirement: "Billed Visit (Invoice generated, awaiting payment)". Usually locks tests?
                // Let's assume Generating Bill locks tests structure in V1.
                if (hasBill) 
                {
                    snapshot.UiState.CanAddTests = false; 
                    snapshot.UiState.ReadOnlyReason = "Bill Generated"; // Soft lock
                }

                snapshot.UiState.CanGenerateBill = hasTests && !hasBill;
                snapshot.UiState.CanAcceptPayment = hasBill && !isPaid;
            }
        }

        private async Task LoadPatientContextAsync(ReceptionIntakeSnapshotDto snapshot, Guid patientId)
        {
            var patient = await _context.Patients
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.PatientId == patientId);

            if (patient == null) throw new KeyNotFoundException($"Patient {patientId} not found.");

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
                Mobile = patient.CurrentPhoneNumber
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
