using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.HealthCards;
using SynOS.Models.DTOs.Reception;
using SynOS.Models.DTOs.Revenue;
using SynOS.Models.Entities;
using SynOS.Models.Entities.HealthCards;
using SynOS.Models.Entities.Revenue;
using SynOS.Services.Reception;
using SynOS.Services.Revenue;

namespace SynOS.Services.HealthCards
{
    public class HealthCardService : IHealthCardService
    {
        private readonly SynOSDbContext _context;
        private readonly IReceptionPatientService _patientService;
        private readonly IRevenueFactWriter _revenueFactWriter;
        private readonly IRevenueEngine _revenueEngine;

        public HealthCardService(
            SynOSDbContext context,
            IReceptionPatientService patientService,
            IRevenueFactWriter revenueFactWriter,
            IRevenueEngine revenueEngine)
        {
            _context = context;
            _patientService = patientService;
            _revenueFactWriter = revenueFactWriter;
            _revenueEngine = revenueEngine;
        }

        public async Task<IEnumerable<HealthCardPlanDto>> GetActivePlansAsync()
        {
            return await _context.HealthCardPlanMasters
                .Where(p => p.IsActive)
                .OrderBy(p => p.MaxMembers)
                .Select(p => new HealthCardPlanDto
                {
                    PlanId = p.PlanId,
                    PlanCode = p.PlanCode,
                    PlanName = p.PlanName,
                    Description = p.Description,
                    MaxMembers = p.MaxMembers,
                    Price = p.Price,
                    DefaultDiscountPercentage = p.DefaultDiscountPercentage,
                    DefaultValidityDays = p.DefaultValidityDays,
                    AllowOutsourceDiscounts = p.AllowOutsourceDiscounts,
                    IsActive = p.IsActive
                })
                .ToListAsync();
        }

        public async Task<HealthCardSummaryDto> IssueCardAsync(
            IssueHealthCardRequestDto request, 
            Guid cashierUserId, 
            string cashierUserName, 
            Guid branchId)
        {
            var plan = await _context.HealthCardPlanMasters.FindAsync(request.PlanId);
            if (plan == null) throw new ArgumentException("Invalid health card plan selected.");

            // 1. Resolve Primary Patient
            Guid primaryPatientId;
            string primaryPhone;
            string primaryName;

            if (request.PrimaryPatientId.HasValue && request.PrimaryPatientId.Value != Guid.Empty)
            {
                var existing = await _context.Patients.FindAsync(request.PrimaryPatientId.Value);
                if (existing == null) throw new ArgumentException("Specified primary patient not found.");
                primaryPatientId = existing.PatientId;
                primaryPhone = existing.CurrentPhoneNumber;
                primaryName = existing.DisplayName ?? $"{existing.FirstName} {existing.LastName}".Trim();
            }
            else if (!string.IsNullOrWhiteSpace(request.PrimaryFullName) && !string.IsNullOrWhiteSpace(request.PrimaryPhoneNumber))
            {
                DateTime? dob = null;
                if (request.PrimaryAge.HasValue && request.PrimaryAge.Value > 0)
                {
                    dob = DateTime.UtcNow.AddYears(-request.PrimaryAge.Value);
                }

                var regRes = await _patientService.RegisterPatientAsync(new IntakeRegisterPatientRequest
                {
                    Name = request.PrimaryFullName.Trim(),
                    Phone = request.PrimaryPhoneNumber.Trim(),
                    Gender = request.PrimaryGender ?? "Male",
                    Dob = dob,
                    IsDateOfBirthKnown = dob.HasValue,
                    HasNoMobile = false
                });

                primaryPatientId = regRes.PatientId;
                primaryPhone = request.PrimaryPhoneNumber.Trim();
                primaryName = request.PrimaryFullName.Trim();
            }
            else
            {
                throw new ArgumentException("Primary patient identification or demographic details are required.");
            }

            // 2. Generate Intuitive MRN-based Card Number: {MRN}-HC
            var cardNumber = await GenerateCardNumberAsync(primaryPatientId);

            // 3. Determine Expiration & Discount Rules
            var effectiveFrom = DateTime.UtcNow;
            var validityDays = request.ValidityDays > 0 ? request.ValidityDays : plan.DefaultValidityDays;
            var validUntil = request.CustomExpiryDate ?? effectiveFrom.AddDays(validityDays);

            var discountType = string.Equals(request.DiscountType, "Flat", StringComparison.OrdinalIgnoreCase) 
                ? "Flat" 
                : "Percentage";
            var discountValue = request.DiscountValue > 0 ? request.DiscountValue : plan.DefaultDiscountPercentage;
            var pricePaid = request.PricePaid > 0 ? request.PricePaid : plan.Price;

            // 4. Create Card Entity
            var card = new PatientHealthCard
            {
                CardId = Guid.NewGuid(),
                CardNumber = cardNumber,
                PlanId = plan.PlanId,
                PrimaryPatientId = primaryPatientId,
                PrimaryPhoneNumber = primaryPhone,
                PricePaid = pricePaid,
                PaymentMode = string.IsNullOrWhiteSpace(request.PaymentMode) ? "Cash" : request.PaymentMode,
                ConfiguredDiscountType = discountType,
                ConfiguredDiscountValue = discountValue,
                EffectiveFrom = effectiveFrom,
                ValidUntil = validUntil,
                Status = request.IsPendingPayment ? "PendingPayment" : "Active",
                AssociatedVisitId = request.AssociatedVisitId,
                IssuedAtBranchId = branchId,
                IssuedByUserId = cashierUserId,
                IssuedByUserName = cashierUserName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // 5. Add Primary Patient as Slot #1 (Self)
            card.Beneficiaries.Add(new HealthCardBeneficiary
            {
                BeneficiaryId = Guid.NewGuid(),
                CardId = card.CardId,
                PatientId = primaryPatientId,
                Relationship = "Self",
                EnrolledAt = DateTime.UtcNow,
                EnrolledByUserId = cashierUserId,
                IsSlotLocked = false
            });

            // 6. Process Additional Family Beneficiaries up to Plan Capacity
            if (request.Beneficiaries != null && request.Beneficiaries.Count > 0)
            {
                var availableSlots = plan.MaxMembers - 1; // 1 already taken by primary
                foreach (var b in request.Beneficiaries)
                {
                    if (availableSlots <= 0) break;

                    Guid benPatientId;
                    if (b.ExistingPatientId.HasValue && b.ExistingPatientId.Value != Guid.Empty)
                    {
                        benPatientId = b.ExistingPatientId.Value;
                    }
                    else if (!string.IsNullOrWhiteSpace(b.FullName))
                    {
                        DateTime? bDob = null;
                        if (b.Age.HasValue && b.Age.Value > 0)
                        {
                            bDob = DateTime.UtcNow.AddYears(-b.Age.Value);
                        }

                        var benReg = await _patientService.RegisterPatientAsync(new IntakeRegisterPatientRequest
                        {
                            Name = b.FullName.Trim(),
                            Phone = !string.IsNullOrWhiteSpace(b.PhoneNumber) ? b.PhoneNumber.Trim() : primaryPhone,
                            Gender = b.Gender ?? "Female",
                            Dob = bDob,
                            IsDateOfBirthKnown = bDob.HasValue,
                            HasNoMobile = false
                        });
                        benPatientId = benReg.PatientId;
                    }
                    else
                    {
                        continue;
                    }

                    // Avoid duplicate enrollment of same patient
                    if (card.Beneficiaries.Any(x => x.PatientId == benPatientId)) continue;

                    card.Beneficiaries.Add(new HealthCardBeneficiary
                    {
                        BeneficiaryId = Guid.NewGuid(),
                        CardId = card.CardId,
                        PatientId = benPatientId,
                        Relationship = string.IsNullOrWhiteSpace(b.Relationship) ? "Family" : b.Relationship,
                        EnrolledAt = DateTime.UtcNow,
                        EnrolledByUserId = cashierUserId,
                        IsSlotLocked = false
                    });

                    availableSlots--;
                }
            }

            // 7. ERP Ledger Integration: Record Financial Inflow in Revenue Engine ONLY if fully settled upfront
            if (!request.IsPendingPayment)
            {
                try
                {
                    var paymentModeEnum = ParsePaymentMode(request.PaymentMode);
                    var revenueFactId = await _revenueFactWriter.DeclareRevenueFactAsync(new DeclareRevenueFactCommand
                    {
                        OccurredAt = DateTimeOffset.UtcNow,
                        Amount = pricePaid,
                        Currency = "INR",
                        Direction = RevenueDirection.Inflow,
                        SourceType = RevenueSourceType.Patient,
                        SourceReferenceId = card.CardId.ToString(),
                        PaymentMode = paymentModeEnum,
                        DeclaredByUserId = cashierUserId,
                        Notes = $"Health Card Sale: {plan.PlanName} ({cardNumber} - {primaryName})"
                    });
                    card.RevenueFactId = revenueFactId;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[HealthCardService] Note: RevenueFact declaration failed: {ex.Message}");
                }
            }

            _context.PatientHealthCards.Add(card);
            await _context.SaveChangesAsync();

            return await GetCardByIdAsync(card.CardId) ?? throw new InvalidOperationException("Failed to retrieve created health card.");
        }

        public async Task<HealthCardEligibilityCheckDto> CheckEligibilityAsync(Guid? patientId, string? phoneNumber)
        {
            var now = DateTime.UtcNow;

            // Scenario 1: Concrete PatientId supplied (Verify enrolled beneficiary status)
            if (patientId.HasValue && patientId.Value != Guid.Empty)
            {
                var card = await _context.PatientHealthCards
                    .Include(c => c.Plan)
                    .Include(c => c.PrimaryPatient)
                    .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                    .Include(c => c.Usages)
                    .Where(c => c.Status == "Active" && c.ValidUntil >= now &&
                                c.Beneficiaries.Any(b => b.PatientId == patientId.Value))
                    .OrderByDescending(c => c.CreatedAt)
                    .FirstOrDefaultAsync();

                if (card != null)
                {
                    var summary = MapToSummary(card);
                    return new HealthCardEligibilityCheckDto
                    {
                        HasActiveCard = true,
                        IsPatientEnrolledBeneficiary = true,
                        HasOpenSlots = summary.AvailableSlots > 0,
                        AvailableSlots = summary.AvailableSlots,
                        Card = summary,
                        Message = $"Active {summary.ConfiguredDiscountValue}% Health Card Member ({card.CardNumber})"
                    };
                }
            }

            // Scenario 2: Check by Phone Number (Family card lookup)
            if (!string.IsNullOrWhiteSpace(phoneNumber))
            {
                var cleanPhone = phoneNumber.Trim();
                var card = await _context.PatientHealthCards
                    .Include(c => c.Plan)
                    .Include(c => c.PrimaryPatient)
                    .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                    .Include(c => c.Usages)
                    .Where(c => c.Status == "Active" && c.ValidUntil >= now &&
                                c.PrimaryPhoneNumber == cleanPhone)
                    .OrderByDescending(c => c.CreatedAt)
                    .FirstOrDefaultAsync();

                if (card != null)
                {
                    var summary = MapToSummary(card);
                    var isEnrolled = patientId.HasValue && card.Beneficiaries.Any(b => b.PatientId == patientId.Value);
                    var openSlots = summary.AvailableSlots;

                    return new HealthCardEligibilityCheckDto
                    {
                        HasActiveCard = true,
                        IsPatientEnrolledBeneficiary = isEnrolled,
                        HasOpenSlots = openSlots > 0,
                        AvailableSlots = openSlots,
                        Card = summary,
                        Message = isEnrolled
                            ? $"Active {summary.ConfiguredDiscountValue}% Health Card Member ({card.CardNumber})"
                            : (openSlots > 0
                                ? $"Family Card Found ({card.CardNumber}) with {openSlots} open slot{(openSlots > 1 ? "s" : "")}"
                                : $"Card {card.CardNumber} is at full capacity ({card.Beneficiaries.Count}/{card.Plan?.MaxMembers})")
                    };
                }
            }

            // Scenario 3: Check for PendingPayment Card (issued in draft / awaiting settlement)
            if (patientId.HasValue && patientId.Value != Guid.Empty)
            {
                var pendingCard = await _context.PatientHealthCards
                    .Include(c => c.Plan)
                    .Include(c => c.PrimaryPatient)
                    .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                    .Include(c => c.Usages)
                    .Where(c => c.Status == "PendingPayment" &&
                                c.Beneficiaries.Any(b => b.PatientId == patientId.Value))
                    .OrderByDescending(c => c.CreatedAt)
                    .FirstOrDefaultAsync();

                if (pendingCard != null)
                {
                    var summary = MapToSummary(pendingCard);
                    return new HealthCardEligibilityCheckDto
                    {
                        HasActiveCard = false,
                        IsPendingPayment = true,
                        IsPatientEnrolledBeneficiary = true,
                        HasOpenSlots = summary.AvailableSlots > 0,
                        AvailableSlots = summary.AvailableSlots,
                        Card = summary,
                        Message = $"Health Card ({pendingCard.CardNumber}) • Pending Bill Settlement"
                    };
                }
            }

            if (!string.IsNullOrWhiteSpace(phoneNumber))
            {
                var cleanPhone = phoneNumber.Trim();
                var pendingCard = await _context.PatientHealthCards
                    .Include(c => c.Plan)
                    .Include(c => c.PrimaryPatient)
                    .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                    .Include(c => c.Usages)
                    .Where(c => c.Status == "PendingPayment" &&
                                c.PrimaryPhoneNumber == cleanPhone)
                    .OrderByDescending(c => c.CreatedAt)
                    .FirstOrDefaultAsync();

                if (pendingCard != null)
                {
                    var summary = MapToSummary(pendingCard);
                    var isEnrolled = patientId.HasValue && pendingCard.Beneficiaries.Any(b => b.PatientId == patientId.Value);
                    return new HealthCardEligibilityCheckDto
                    {
                        HasActiveCard = false,
                        IsPendingPayment = true,
                        IsPatientEnrolledBeneficiary = isEnrolled,
                        HasOpenSlots = summary.AvailableSlots > 0,
                        AvailableSlots = summary.AvailableSlots,
                        Card = summary,
                        Message = $"Health Card ({pendingCard.CardNumber}) • Pending Bill Settlement"
                    };
                }
            }

            // Scenario 4: Check for Expired Card (Eligible for seamless 1-click renewal keeping the same card number)
            var expiredQuery = _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.PrimaryPatient)
                .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                .Include(c => c.Usages)
                .Where(c => (c.ValidUntil < now || c.Status == "Expired") && c.Status != "Cancelled");

            if (patientId.HasValue && patientId.Value != Guid.Empty)
            {
                expiredQuery = expiredQuery.Where(c => c.Beneficiaries.Any(b => b.PatientId == patientId.Value));
            }
            else if (!string.IsNullOrWhiteSpace(phoneNumber))
            {
                var cleanPhone = phoneNumber.Trim();
                expiredQuery = expiredQuery.Where(c => c.PrimaryPhoneNumber == cleanPhone);
            }
            else
            {
                expiredQuery = null;
            }

            if (expiredQuery != null)
            {
                var expiredCard = await expiredQuery.OrderByDescending(c => c.ValidUntil).FirstOrDefaultAsync();
                if (expiredCard != null)
                {
                    var summary = MapToSummary(expiredCard);
                    var isEnrolled = patientId.HasValue && expiredCard.Beneficiaries.Any(b => b.PatientId == patientId.Value);
                    return new HealthCardEligibilityCheckDto
                    {
                        HasActiveCard = false,
                        IsExpired = true,
                        IsPatientEnrolledBeneficiary = isEnrolled,
                        HasOpenSlots = summary.AvailableSlots > 0,
                        AvailableSlots = summary.AvailableSlots,
                        Card = summary,
                        Message = $"Health Card ({expiredCard.CardNumber}) Expired on {expiredCard.ValidUntil:dd MMM yyyy}. Renewal required."
                    };
                }
            }

            return new HealthCardEligibilityCheckDto
            {
                HasActiveCard = false,
                IsPendingPayment = false,
                IsExpired = false,
                IsPatientEnrolledBeneficiary = false,
                HasOpenSlots = false,
                AvailableSlots = 0,
                Card = null,
                Message = "No active health card"
            };
        }

        public async Task<HealthCardBeneficiaryDto> EnrollBeneficiaryAsync(
            Guid cardId, 
            EnrollBeneficiaryRequestDto request, 
            Guid cashierUserId)
        {
            var card = await _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.Beneficiaries)
                .FirstOrDefaultAsync(c => c.CardId == cardId);

            if (card == null) throw new ArgumentException("Health card not found.");
            if (card.Status != "Active" || card.ValidUntil < DateTime.UtcNow)
                throw new InvalidOperationException("Cannot enroll members into an inactive or expired health card.");

            var maxMembers = card.Plan?.MaxMembers ?? 1;
            if (card.Beneficiaries.Count >= maxMembers)
            {
                throw new InvalidOperationException($"Health card quota exceeded. Maximum capacity is {maxMembers} member(s).");
            }

            Guid beneficiaryPatientId;
            if (request.ExistingPatientId.HasValue && request.ExistingPatientId.Value != Guid.Empty)
            {
                beneficiaryPatientId = request.ExistingPatientId.Value;
            }
            else if (!string.IsNullOrWhiteSpace(request.FullName))
            {
                DateTime? bDob = null;
                if (request.Age.HasValue && request.Age.Value > 0)
                {
                    bDob = DateTime.UtcNow.AddYears(-request.Age.Value);
                }

                var benReg = await _patientService.RegisterPatientAsync(new IntakeRegisterPatientRequest
                {
                    Name = request.FullName.Trim(),
                    Phone = !string.IsNullOrWhiteSpace(request.PhoneNumber) ? request.PhoneNumber.Trim() : card.PrimaryPhoneNumber,
                    Gender = request.Gender ?? "Female",
                    Dob = bDob,
                    IsDateOfBirthKnown = bDob.HasValue,
                    HasNoMobile = false
                });
                beneficiaryPatientId = benReg.PatientId;
            }
            else
            {
                throw new ArgumentException("Beneficiary patient identification or demographic details are required.");
            }

            if (card.Beneficiaries.Any(b => b.PatientId == beneficiaryPatientId))
            {
                throw new InvalidOperationException("Patient is already enrolled under this health card.");
            }

            var beneficiary = new HealthCardBeneficiary
            {
                BeneficiaryId = Guid.NewGuid(),
                CardId = card.CardId,
                PatientId = beneficiaryPatientId,
                Relationship = string.IsNullOrWhiteSpace(request.Relationship) ? "Family" : request.Relationship,
                EnrolledAt = DateTime.UtcNow,
                EnrolledByUserId = cashierUserId,
                IsSlotLocked = false
            };

            _context.HealthCardBeneficiaries.Add(beneficiary);
            await _context.SaveChangesAsync();

            var loaded = await _context.HealthCardBeneficiaries
                .Include(b => b.Patient)
                .FirstOrDefaultAsync(b => b.BeneficiaryId == beneficiary.BeneficiaryId);

            var pat = loaded?.Patient;
            return new HealthCardBeneficiaryDto
            {
                BeneficiaryId = beneficiary.BeneficiaryId,
                PatientId = beneficiary.PatientId,
                MRN = pat?.MRN ?? string.Empty,
                DisplayName = pat?.DisplayName ?? $"{pat?.FirstName} {pat?.LastName}".Trim(),
                Gender = pat?.Gender ?? string.Empty,
                PhoneNumber = pat?.CurrentPhoneNumber ?? string.Empty,
                Relationship = beneficiary.Relationship,
                EnrolledAt = beneficiary.EnrolledAt,
                IsSlotLocked = beneficiary.IsSlotLocked,
                FirstUsedAt = beneficiary.FirstUsedAt
            };
        }

        public async Task<bool> RecordCardUsageAsync(
            RecordCardUsageRequestDto request, 
            Guid cashierUserId, 
            string cashierUserName)
        {
            var card = await _context.PatientHealthCards
                .Include(c => c.Beneficiaries)
                .FirstOrDefaultAsync(c => c.CardId == request.CardId);

            if (card == null) return false;

            var usage = new HealthCardUsageLedger
            {
                UsageId = Guid.NewGuid(),
                CardId = request.CardId,
                VisitId = request.VisitId,
                PatientId = request.PatientId,
                GrossAmount = request.GrossAmount,
                DiscountType = request.DiscountType,
                DiscountValue = request.DiscountValue,
                DiscountAmount = request.DiscountAmount,
                NetAmount = request.NetAmount,
                BilledAt = DateTime.UtcNow,
                BilledByUserId = cashierUserId,
                BilledByUserName = cashierUserName
            };

            _context.HealthCardUsageLedgers.Add(usage);

            // Anti-Revolving-Door Lock: Lock the beneficiary slot upon first visit
            var beneficiary = card.Beneficiaries.FirstOrDefault(b => b.PatientId == request.PatientId);
            if (beneficiary != null)
            {
                beneficiary.IsSlotLocked = true;
                if (!beneficiary.FirstUsedAt.HasValue)
                {
                    beneficiary.FirstUsedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<HealthCardSummaryDto>> GetCardsAsync(string? searchQuery, int limit = 50)
        {
            var query = _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.PrimaryPatient)
                .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                .Include(c => c.Usages)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                var q = searchQuery.Trim().ToLower();
                query = query.Where(c => c.CardNumber.ToLower().Contains(q) ||
                                         c.PrimaryPhoneNumber.Contains(q) ||
                                         (c.PrimaryPatient != null && (c.PrimaryPatient.DisplayName!.ToLower().Contains(q) || c.PrimaryPatient.MRN.ToLower().Contains(q))));
            }

            var cards = await query
                .OrderByDescending(c => c.CreatedAt)
                .Take(Math.Min(100, Math.Max(1, limit)))
                .ToListAsync();

            return cards.Select(MapToSummary);
        }

        public async Task<HealthCardSummaryDto?> GetCardByIdAsync(Guid cardId)
        {
            var card = await _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.PrimaryPatient)
                .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                .Include(c => c.Usages)
                .FirstOrDefaultAsync(c => c.CardId == cardId);

            return card != null ? MapToSummary(card) : null;
        }

        public async Task<HealthCardSummaryDto?> GetCardByPatientIdAsync(Guid patientId)
        {
            var now = DateTime.UtcNow;
            var card = await _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.PrimaryPatient)
                .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                .Include(c => c.Usages)
                .Where(c => c.PrimaryPatientId == patientId || c.Beneficiaries.Any(b => b.PatientId == patientId))
                .OrderByDescending(c => c.Status == "Active" && c.ValidUntil >= now)
                .ThenByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            return card != null ? MapToSummary(card) : null;
        }

        public async Task<HealthCardSummaryDto> UpdateCardAsync(Guid cardId, UpdateHealthCardRequestDto request, Guid cashierUserId)
        {
            var card = await _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.PrimaryPatient)
                .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                .Include(c => c.Usages)
                .FirstOrDefaultAsync(c => c.CardId == cardId);

            if (card == null) throw new KeyNotFoundException($"Health card with ID {cardId} not found.");

            if (!string.IsNullOrWhiteSpace(request.DiscountType))
            {
                card.ConfiguredDiscountType = string.Equals(request.DiscountType, "Flat", StringComparison.OrdinalIgnoreCase)
                    ? "Flat"
                    : "Percentage";
            }

            if (request.DiscountValue.HasValue && request.DiscountValue.Value >= 0)
            {
                card.ConfiguredDiscountValue = request.DiscountValue.Value;
            }

            if (request.CustomExpiryDate.HasValue)
            {
                card.ValidUntil = request.CustomExpiryDate.Value;
            }
            else if (request.ValidityDays.HasValue && request.ValidityDays.Value > 0)
            {
                card.ValidUntil = card.EffectiveFrom.AddDays(request.ValidityDays.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                card.Status = request.Status;
            }

            card.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapToSummary(card);
        }

        public async Task<HealthCardSummaryDto> RenewCardAsync(Guid cardId, RenewHealthCardRequestDto request, Guid cashierUserId, string cashierUserName)
        {
            var card = await _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.PrimaryPatient)
                .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                .Include(c => c.Usages)
                .FirstOrDefaultAsync(c => c.CardId == cardId);

            if (card == null) throw new KeyNotFoundException($"Health card with ID {cardId} not found.");

            var days = request.ValidityDays > 0 ? request.ValidityDays : (card.Plan?.DefaultValidityDays ?? 365);
            var now = DateTime.UtcNow;

            // Enterprise renewal invariant:
            // If renewing before expiry, extend from current expiry date.
            // If already expired, start fresh renewal period from today!
            var baseDate = (card.ValidUntil > now && card.Status == "Active") ? card.ValidUntil : now;
            card.ValidUntil = baseDate.AddDays(days);
            card.Status = "Active";
            card.UpdatedAt = now;

            decimal price = request.RenewalPrice ?? card.Plan?.Price ?? 0m;
            if (price > 0)
            {
                card.PricePaid += price;
                try
                {
                    var paymentModeEnum = ParsePaymentMode(request.PaymentMode);
                    await _revenueFactWriter.DeclareRevenueFactAsync(new DeclareRevenueFactCommand
                    {
                        OccurredAt = DateTimeOffset.UtcNow,
                        Amount = price,
                        Currency = "INR",
                        Direction = RevenueDirection.Inflow,
                        SourceType = RevenueSourceType.Patient,
                        SourceReferenceId = card.CardId.ToString(),
                        PaymentMode = paymentModeEnum,
                        DeclaredByUserId = cashierUserId,
                        Notes = $"Health Card Renewal: {card.Plan?.PlanName} ({card.CardNumber} - {card.PrimaryPatient?.DisplayName})"
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[HealthCardService] Note: RevenueFact declaration failed during renewal: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return MapToSummary(card);
        }

        public async Task<bool> CancelCardAsync(Guid cardId, string? reason, Guid cashierUserId)
        {
            var card = await _context.PatientHealthCards.FindAsync(cardId);
            if (card == null) return false;

            card.Status = "Cancelled";
            card.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveBeneficiaryAsync(Guid cardId, Guid beneficiaryId, Guid cashierUserId)
        {
            var beneficiary = await _context.HealthCardBeneficiaries
                .Include(b => b.Card)
                .FirstOrDefaultAsync(b => b.CardId == cardId && b.BeneficiaryId == beneficiaryId);

            if (beneficiary == null) return false;

            if (beneficiary.Relationship == "Self" || (beneficiary.Card != null && beneficiary.PatientId == beneficiary.Card.PrimaryPatientId))
            {
                throw new InvalidOperationException("Cannot remove the primary subscriber from the health card.");
            }

            _context.HealthCardBeneficiaries.Remove(beneficiary);
            await _context.SaveChangesAsync();
            return true;
        }

        private static HealthCardSummaryDto MapToSummary(PatientHealthCard card)
        {
            var max = card.Plan?.MaxMembers ?? 1;
            var enrolledCount = card.Beneficiaries?.Count ?? 0;
            var availableSlots = Math.Max(0, max - enrolledCount);
            var totalSaved = card.Usages?.Sum(u => u.DiscountAmount) ?? 0m;
            var totalVisits = card.Usages?.Count ?? 0;

            var primaryName = card.PrimaryPatient?.DisplayName;
            if (string.IsNullOrWhiteSpace(primaryName) && card.PrimaryPatient != null)
            {
                var combined = $"{card.PrimaryPatient.FirstName} {card.PrimaryPatient.LastName}".Trim();
                if (!string.IsNullOrWhiteSpace(combined)) primaryName = combined;
            }
            if (string.IsNullOrWhiteSpace(primaryName)) primaryName = "Subscriber";

            return new HealthCardSummaryDto
            {
                CardId = card.CardId,
                CardNumber = card.CardNumber ?? string.Empty,
                PlanId = card.PlanId,
                PlanCode = card.Plan?.PlanCode ?? string.Empty,
                PlanName = card.Plan?.PlanName ?? "Health Card Plan",
                MaxMembers = max,
                EnrolledMembersCount = enrolledCount,
                AvailableSlots = availableSlots,
                PrimaryPatientId = card.PrimaryPatientId,
                PrimaryPatientName = primaryName,
                PrimaryPhoneNumber = card.PrimaryPhoneNumber ?? string.Empty,
                PricePaid = card.PricePaid,
                PaymentMode = card.PaymentMode ?? "Cash",
                ConfiguredDiscountType = card.ConfiguredDiscountType ?? "Percentage",
                ConfiguredDiscountValue = card.ConfiguredDiscountValue,
                EffectiveFrom = card.EffectiveFrom,
                ValidUntil = card.ValidUntil,
                IsExpired = card.ValidUntil < DateTime.UtcNow,
                Status = card.ValidUntil < DateTime.UtcNow ? "Expired" : (card.Status ?? "Active"),
                AssociatedVisitId = card.AssociatedVisitId,
                TotalSavedToDate = totalSaved,
                TotalVisitsBilled = totalVisits,
                Beneficiaries = card.Beneficiaries?.Select(b => new HealthCardBeneficiaryDto
                {
                    BeneficiaryId = b.BeneficiaryId,
                    PatientId = b.PatientId,
                    MRN = b.Patient?.MRN ?? string.Empty,
                    DisplayName = b.Patient?.DisplayName ?? (!string.IsNullOrWhiteSpace($"{b.Patient?.FirstName} {b.Patient?.LastName}".Trim()) ? $"{b.Patient?.FirstName} {b.Patient?.LastName}".Trim() : "Beneficiary"),
                    Gender = b.Patient?.Gender ?? string.Empty,
                    PhoneNumber = b.Patient?.CurrentPhoneNumber ?? string.Empty,
                    Relationship = b.Relationship ?? "Family",
                    EnrolledAt = b.EnrolledAt,
                    IsSlotLocked = b.IsSlotLocked,
                    FirstUsedAt = b.FirstUsedAt
                }).ToList() ?? new List<HealthCardBeneficiaryDto>()
            };
        }

        public async Task<bool> AttachCardToVisitAsync(Guid visitId, Guid planId, Guid cashierUserId)
        {
            var plan = await _context.HealthCardPlanMasters.FindAsync(planId);
            if (plan == null) throw new ArgumentException("Invalid health card plan ID.");

            var visit = await _context.Visits
                .Include(v => v.Orders)
                .Include(v => v.Invoices)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null) throw new KeyNotFoundException("Visit not found.");

            // Idempotent: check if order already exists in active status
            if (visit.Orders.Any(o => o.TestCode.Equals(plan.PlanCode, StringComparison.OrdinalIgnoreCase) && o.Status != SynOS.Models.Enums.OrderStatus.Cancelled))
            {
                return true;
            }

            // Ensure billable test catalog entry exists
            var test = await _context.Tests.FirstOrDefaultAsync(t => t.TestCode == plan.PlanCode);
            if (test == null)
            {
                test = new Test
                {
                    TestId = Guid.NewGuid(),
                    TestCode = plan.PlanCode,
                    TestName = $"Health Card: {plan.PlanName}",
                    Category = "HealthCard",
                    SpecimenTypeCode = "NO_SPECIMEN",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.Tests.Add(test);

                _context.TestPricings.Add(new TestPricing
                {
                    PricingId = Guid.NewGuid(),
                    TestId = test.TestId,
                    BasePrice = plan.Price,
                    EffectiveFrom = DateTime.UtcNow.AddYears(-1),
                    CreatedAt = DateTimeOffset.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            var order = new Order
            {
                OrderId = Guid.NewGuid(),
                VisitId = visitId,
                TestId = test.TestId,
                TestCode = plan.PlanCode,
                Department = "HealthCard",
                Status = SynOS.Models.Enums.OrderStatus.Pending,
                Price = plan.Price,
                Discount = 0,
                CreatedAt = DateTime.UtcNow,
                IsOutsourced = false
            };

            _context.Orders.Add(order);

            // Associate any pending health card for this patient to this visit
            var pendingCard = await _context.PatientHealthCards
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync(c => c.PrimaryPatientId == visit.PatientId && c.PlanId == planId && c.Status == "PendingPayment");
            if (pendingCard != null)
            {
                pendingCard.AssociatedVisitId = visitId;
            }

            await _context.SaveChangesAsync();

            await _revenueEngine.ApplySnapshotAsync(visitId, cashierUserId);
            return true;
        }

        public async Task<HealthCardSummaryDto> ActivatePendingCardAsync(Guid cardId, string paymentMode, Guid cashierUserId)
        {
            var card = await _context.PatientHealthCards
                .Include(c => c.Plan)
                .Include(c => c.PrimaryPatient)
                .Include(c => c.Beneficiaries).ThenInclude(b => b.Patient)
                .Include(c => c.Usages)
                .FirstOrDefaultAsync(c => c.CardId == cardId);

            if (card == null) throw new KeyNotFoundException($"Health card with ID {cardId} not found.");

            if (card.Status == "PendingPayment")
            {
                var validityDays = card.Plan?.DefaultValidityDays ?? 365;
                card.Status = "Active";
                card.EffectiveFrom = DateTime.UtcNow;
                card.ValidUntil = DateTime.UtcNow.AddDays(validityDays);
                if (!string.IsNullOrWhiteSpace(paymentMode))
                {
                    card.PaymentMode = paymentMode;
                }
                card.UpdatedAt = DateTime.UtcNow;

                if (!card.RevenueFactId.HasValue && card.PricePaid > 0)
                {
                    try
                    {
                        var paymentModeEnum = ParsePaymentMode(card.PaymentMode);
                        var primaryName = card.PrimaryPatient?.DisplayName ?? "Patient";
                        var planName = card.Plan?.PlanName ?? "Health Card";
                        var revenueFactId = await _revenueFactWriter.DeclareRevenueFactAsync(new DeclareRevenueFactCommand
                        {
                            OccurredAt = DateTimeOffset.UtcNow,
                            Amount = card.PricePaid,
                            Currency = "INR",
                            Direction = RevenueDirection.Inflow,
                            SourceType = RevenueSourceType.Patient,
                            SourceReferenceId = card.CardId.ToString(),
                            PaymentMode = paymentModeEnum,
                            DeclaredByUserId = cashierUserId,
                            Notes = $"Health Card Sale: {planName} ({card.CardNumber} - {primaryName})"
                        });
                        card.RevenueFactId = revenueFactId;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[HealthCardService] Note: RevenueFact declaration failed: {ex.Message}");
                    }
                }

                await _context.SaveChangesAsync();
            }

            return await GetCardByIdAsync(card.CardId) ?? throw new InvalidOperationException("Failed to retrieve activated card.");
        }

        public async Task<HealthCardSummaryDto?> ActivateCardForVisitAsync(Guid visitId, string paymentMode, Guid cashierUserId)
        {
            var card = await _context.PatientHealthCards
                .FirstOrDefaultAsync(c => c.AssociatedVisitId == visitId && c.Status == "PendingPayment");

            if (card == null)
            {
                var visit = await _context.Visits
                    .Include(v => v.Orders)
                    .FirstOrDefaultAsync(v => v.VisitId == visitId);

                if (visit != null)
                {
                    var planCodes = await _context.HealthCardPlanMasters.Select(p => p.PlanCode).ToListAsync();
                    var hasPlanOrder = visit.Orders.Any(o => planCodes.Contains(o.TestCode));
                    if (hasPlanOrder)
                    {
                        card = await _context.PatientHealthCards
                            .OrderByDescending(c => c.CreatedAt)
                            .FirstOrDefaultAsync(c => c.PrimaryPatientId == visit.PatientId && c.Status == "PendingPayment");
                    }
                }
            }

            if (card != null)
            {
                card.AssociatedVisitId = visitId;
                return await ActivatePendingCardAsync(card.CardId, paymentMode, cashierUserId);
            }

            return null;
        }

        private async Task<string> GenerateCardNumberAsync(Guid primaryPatientId)
        {
            var patient = await _context.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.PatientId == primaryPatientId);
            var mrn = patient?.MRN?.Trim();
            if (string.IsNullOrWhiteSpace(mrn))
            {
                var shortId = primaryPatientId.ToString("N").Substring(0, 6).ToUpper();
                mrn = shortId;
            }

            var baseCardNumber = $"{mrn}-HC";
            var exists = await _context.PatientHealthCards.AnyAsync(c => c.CardNumber == baseCardNumber);
            if (!exists)
            {
                return baseCardNumber;
            }

            int suffix = 2;
            while (await _context.PatientHealthCards.AnyAsync(c => c.CardNumber == $"{baseCardNumber}-{suffix}"))
            {
                suffix++;
            }
            return $"{baseCardNumber}-{suffix}";
        }

        private static PaymentMode ParsePaymentMode(string mode)
        {
            if (string.Equals(mode, "UPI", StringComparison.OrdinalIgnoreCase)) return PaymentMode.UPI;
            if (string.Equals(mode, "Card", StringComparison.OrdinalIgnoreCase)) return PaymentMode.Card;
            if (string.Equals(mode, "BankTransfer", StringComparison.OrdinalIgnoreCase)) return PaymentMode.BankTransfer;
            return PaymentMode.Cash;
        }
    }
}
