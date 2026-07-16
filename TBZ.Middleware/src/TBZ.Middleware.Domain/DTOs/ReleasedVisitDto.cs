using System;
using System.Collections.Generic;

namespace TBZ.Middleware.Domain.DTOs
{
    public class ReleasedVisitDto
    {
        public Guid DocumentId { get; set; }
        public string LabId { get; set; } = string.Empty;
        public Guid? BranchId { get; set; }
        public Guid VisitId { get; set; }
        public DateTime VisitDate { get; set; }
        public int Version { get; set; }
        public string ReleaseType { get; set; } = string.Empty;
        public ReleasedVisitDeliveryDto Delivery { get; set; } = null!;
        public ReleasedVisitPatientDto Patient { get; set; } = null!;
        public ReleasedVisitFinancialsDto Financials { get; set; } = null!;
        public ReleasedVisitReferralDto Referral { get; set; } = null!;
        public List<ReleasedVisitInvestigationDto> Investigations { get; set; } = new();
        public List<ReleasedVisitReportDto> Reports { get; set; } = new();
    }

    public class ReleasedVisitDeliveryDto
    {
        public List<string> AvailableChannels { get; set; } = new();
        public string RequestedChannel { get; set; } = string.Empty;
    }

    public class ReleasedVisitPatientDto
    {
        public Guid PatientId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? Area { get; set; }
        public string? Pincode { get; set; }
        public string? Email { get; set; }
    }

    public class ReleasedVisitFinancialsDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal OutstandingAmount { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string? PricingTier { get; set; }
        public Guid? CorporateId { get; set; }
        public string? CorporateName { get; set; }
        public string? InsuranceProvider { get; set; }
        public string? InsurancePolicyNumber { get; set; }
        public decimal PrepaidUsed { get; set; }
    }

    public class ReleasedVisitReferralDto
    {
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string? DoctorPhone { get; set; }
        public string? ReferralType { get; set; }
        public decimal CommissionAmount { get; set; }
        public bool CommissionSettled { get; set; }
    }

    public class ReleasedVisitInvestigationDto
    {
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public decimal BasePrice { get; set; }
        public string? InstrumentId { get; set; }
    }

    public class ReleasedVisitReportDto
    {
        public Guid ReportId { get; set; }
        public string SecureDownloadUrl { get; set; } = string.Empty;
        public DateTime SignedAt { get; set; }
    }
}
