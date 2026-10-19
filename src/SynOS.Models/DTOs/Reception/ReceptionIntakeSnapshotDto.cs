using System;
using System.Collections.Generic;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.Reception
{
    public class ReceptionIntakeSnapshotDto
    {
        public IntakeContext Context { get; set; } = new();
        public IntakePatient? Patient { get; set; }
        public IntakeVisit? Visit { get; set; }
        public IntakeBilling? Billing { get; set; }
        public IntakeUiHints UiState { get; set; } = new();
    }

    public class IntakeContext
    {
        public Guid BranchId { get; set; }
        public Guid ReceptionistUserId { get; set; }
        public DateTime CurrentTimeUtc { get; set; }
        public string RequestToken { get; set; } = string.Empty; // Traceability
    }

    public class IntakePatient
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty; // M/F/O
        public int? Age { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public bool IsDateOfBirthKnown { get; set; } = true;
        public string Mobile { get; set; } = string.Empty;
        public DateTime? LastVisitDate { get; set; }
        public List<string> LastVisitTestCodes { get; set; } = new();
    }

    public class IntakeVisit
    {
        public Guid VisitId { get; set; }
        public string VisitToken { get; set; } = string.Empty;
        public string Status { get; set; } = "Draft"; // Draft, Billed, Paid, Cancelled
        public bool IsReferred { get; set; }
        public IntakeReferralPartner? ReferralPartner { get; set; }
        public IntakeReferralPartner? SecondaryReferralPartner { get; set; }
        public string PaymentCollectionModel { get; set; } = "LabCollects";
        public decimal? B2BDiscountAmount { get; set; }
        public string? B2BDiscountEnteredBy { get; set; }
        public DateTimeOffset? B2BDiscountEnteredAt { get; set; }
        public List<IntakeTestItem> Tests { get; set; } = new();

        // Multi-Payer Billing Engine (Insurance & Corporate)
        public BillingType BillingType { get; set; } = BillingType.Standard;
        public Guid? InsuranceCompanyId { get; set; }
        public string? InsuranceCompanyName { get; set; }
        public string? PolicyNumber { get; set; }
        public string? PreAuthApprovalNumber { get; set; }
        public decimal InsuranceCoPayAmount { get; set; } = 0;
        public Guid? CorporateAccountId { get; set; }
        public string? CorporateCompanyName { get; set; }
        public string? EmployeeId { get; set; }
        public Guid? CorporatePackageId { get; set; }
    }

    public class IntakeReferralPartner
    {
        public Guid PartnerId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class IntakeTestItem
    {
        public Guid OrderId { get; set; } // Key for Adjustments
        public Guid TestId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsOutsourced { get; set; }
        public string? ReferenceLabName { get; set; }
        public Guid? ParentOrderId { get; set; }
        public bool IsProfile { get; set; }
    }

    public class IntakeBilling
    {
        public Guid InvoiceId { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; } // Gross - Discount
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; } // Net + Tax
        public decimal TotalPaid { get; set; } // For Settlement Calculation
        public decimal? B2BDiscountAmount { get; set; }
        
        public AppliedDiscountInfo? AppliedDiscount { get; set; }
        public IntakeReferralState? Referral { get; set; }
        
        public string PaymentStatus { get; set; } = "PendingPayment"; // PendingPayment | Paid
        public string? PaymentMethod { get; set; }
        public bool IsEditable { get; set; }
        public bool IsLocked { get; set; }
    }

    public class AppliedDiscountInfo
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Type { get; set; } = "Percentage";
        public decimal Value { get; set; }
        public string? AppliedBy { get; set; }
    }

    public class IntakeReferralState
    {
        public ReferralPartnerInfo? Partner { get; set; }
        public ReferralPartnerInfo? SecondaryPartner { get; set; }
        public ReferralDraftInfo? Draft { get; set; } // Added
        public string? ReferrerText { get; set; }
        public string? PrescribingDoctorName { get; set; }
    }

    public class ReferralDraftInfo
    {
        public Guid ReferralDraftId { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string? ClinicName { get; set; }
        public string? Location { get; set; }
    }

    public class ReferralPartnerInfo
    {
        public Guid Id { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string? PartnerType { get; set; }
        public decimal? CommissionCutPercentage { get; set; }
    }

    public class IntakeUiHints
    {
        public bool CanRegisterPatient { get; set; }
        public bool CanAddTests { get; set; }
        public bool CanGenerateBill { get; set; }
        public bool CanAcceptPayment { get; set; }
        public bool IsReadOnly { get; set; }
        public string? ReadOnlyReason { get; set; }
    }

    // Query DTO
    public class ReceptionSnapshotQuery
    {
        public Guid? PatientId { get; set; }
        public Guid? VisitId { get; set; }
    }
}