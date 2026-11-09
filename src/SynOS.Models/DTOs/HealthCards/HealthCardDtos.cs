using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.HealthCards
{
    public class HealthCardPlanDto
    {
        public Guid PlanId { get; set; }
        public string PlanCode { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int MaxMembers { get; set; }
        public decimal Price { get; set; }
        public decimal DefaultDiscountPercentage { get; set; }
        public int DefaultValidityDays { get; set; }
        public bool AllowOutsourceDiscounts { get; set; }
        public bool IsActive { get; set; }
    }

    public class HealthCardBeneficiaryInputDto
    {
        public Guid? ExistingPatientId { get; set; } // If already in DB
        public string? FullName { get; set; }        // If new patient
        public string? Gender { get; set; }          // Male, Female, Other
        public int? Age { get; set; }
        public string? PhoneNumber { get; set; }
        public string Relationship { get; set; } = "Self"; // Self, Spouse, Son, Daughter, Mother, Father, Other
    }

    public class IssueHealthCardRequestDto
    {
        public Guid PlanId { get; set; }
        public Guid? PrimaryPatientId { get; set; }
        // If registering a brand new primary patient together:
        public string? PrimaryFullName { get; set; }
        public string? PrimaryPhoneNumber { get; set; }
        public string? PrimaryGender { get; set; }
        public int? PrimaryAge { get; set; }

        public decimal PricePaid { get; set; }
        public string PaymentMode { get; set; } = "Cash"; // Cash, UPI, Card, Split

        // Receptionist can override the default discount on the spot
        public string DiscountType { get; set; } = "Percentage"; // "Percentage" | "Flat"
        public decimal DiscountValue { get; set; } = 30.00m;

        public int ValidityDays { get; set; } = 365;
        public DateTime? CustomExpiryDate { get; set; }
        public bool IsPendingPayment { get; set; } = false;
        public Guid? AssociatedVisitId { get; set; }

        public List<HealthCardBeneficiaryInputDto> Beneficiaries { get; set; } = new();
    }

    public class HealthCardBeneficiaryDto
    {
        public Guid BeneficiaryId { get; set; }
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public int? Age { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string Relationship { get; set; } = string.Empty;
        public DateTime EnrolledAt { get; set; }
        public bool IsSlotLocked { get; set; }
        public DateTime? FirstUsedAt { get; set; }
    }

    public class HealthCardSummaryDto
    {
        public Guid CardId { get; set; }
        public string CardNumber { get; set; } = string.Empty;
        public Guid PlanId { get; set; }
        public string PlanCode { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public int MaxMembers { get; set; }
        public int EnrolledMembersCount { get; set; }
        public int AvailableSlots { get; set; }
        public Guid PrimaryPatientId { get; set; }
        public string PrimaryPatientName { get; set; } = string.Empty;
        public string PrimaryPhoneNumber { get; set; } = string.Empty;
        public decimal PricePaid { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string ConfiguredDiscountType { get; set; } = "Percentage";
        public decimal ConfiguredDiscountValue { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime ValidUntil { get; set; }
        public bool IsExpired { get; set; }
        public string Status { get; set; } = "Active";
        public Guid? AssociatedVisitId { get; set; }
        public decimal TotalSavedToDate { get; set; }
        public int TotalVisitsBilled { get; set; }
        public List<HealthCardBeneficiaryDto> Beneficiaries { get; set; } = new();
    }

    public class HealthCardEligibilityCheckDto
    {
        public bool HasActiveCard { get; set; }
        public bool IsPatientEnrolledBeneficiary { get; set; }
        public bool HasOpenSlots { get; set; }
        public int AvailableSlots { get; set; }
        public bool IsPendingPayment { get; set; } = false;
        public HealthCardSummaryDto? Card { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class EnrollBeneficiaryRequestDto
    {
        public Guid? ExistingPatientId { get; set; }
        public string? FullName { get; set; }
        public string? Gender { get; set; }
        public int? Age { get; set; }
        public string? PhoneNumber { get; set; }
        public string Relationship { get; set; } = "Spouse";
    }

    public class RecordCardUsageRequestDto
    {
        public Guid CardId { get; set; }
        public Guid VisitId { get; set; }
        public Guid PatientId { get; set; }
        public decimal GrossAmount { get; set; }
        public string DiscountType { get; set; } = "Percentage";
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
    }

    public class AttachCardToVisitRequestDto
    {
        public Guid VisitId { get; set; }
        public Guid PlanId { get; set; }
    }
}
