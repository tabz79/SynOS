using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class ReceptionStartVisitResponse
    {
        public Guid VisitId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime TokenDate { get; set; }
        public string Dept { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public PatientSummaryDto PatientSummary { get; set; } = new();
        public List<OrderSummaryDto> Orders { get; set; } = new();
        public InvoiceSummaryDto Invoice { get; set; } = new();
        public VisitFlagsDto Flags { get; set; } = new();
        public ReferralDraftDto? ReferralDraft { get; set; }
    }

    public class PatientSummaryDto
    {
        public Guid PatientId { get; set; }
        public string Mrn { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Sex { get; set; } = string.Empty;
        public int Age { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public bool IsDateOfBirthKnown { get; set; } = true;
    }

    public class ReferralDraftDto
    {
        public Guid ReferralDraftId { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string? ClinicName { get; set; }
        public string? Location { get; set; }
    }

    public class OrderSummaryDto
    {
        public Guid OrderId { get; set; }
        public string TestCode { get; set; } = string.Empty;
        public string TestName { get; set; } = string.Empty;
        public string Dept { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal Discount { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TaxRate { get; set; }
        public bool IsOutsourced { get; set; }
        public bool IsPricingResolved { get; set; }
    }

    public class InvoiceSummaryDto
    {
        public Guid InvoiceId { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
    }
    
    public class VisitFlagsDto
    {
        public bool HasSameDayVisits { get; set; }
        public int SameDayVisitCount { get; set; }
    }
}
