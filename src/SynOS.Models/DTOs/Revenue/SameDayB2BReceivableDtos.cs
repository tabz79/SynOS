using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Revenue
{
    public class TodayB2BReceivableVisitDto
    {
        public Guid VisitId { get; set; }
        public Guid ReceivableFactId { get; set; }
        public string Token { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public int Age { get; set; }
        public string? Gender { get; set; }
        public string TestsSummary { get; set; } = string.Empty;
        public decimal BilledAmount { get; set; }
        public decimal AmountDue { get; set; }
        public DateTimeOffset RegisteredAt { get; set; }
    }

    public class TodayB2BReceivableGroupDto
    {
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public string? ClinicName { get; set; }
        public string? Phone { get; set; }
        public decimal TotalDueToday { get; set; }
        public int TotalVisitsCount { get; set; }
        public List<TodayB2BReceivableVisitDto> Visits { get; set; } = new();
    }

    public class SettleSameDayB2BRequestDto
    {
        [Required]
        public Guid PartnerId { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one fact ID must be selected.")]
        public List<Guid> FactIds { get; set; } = new();

        [Required]
        [Range(0.01, (double)decimal.MaxValue, ErrorMessage = "Settlement amount must be greater than zero.")]
        public decimal Amount { get; set; }

        [Required]
        public string PaymentMode { get; set; } = "Cash"; // Cash, UPI, BankTransfer

        public string? ReceivedFrom { get; set; }

        public string? Notes { get; set; }
    }

    public class B2BSettlementReceiptDto
    {
        public string ReceiptNo { get; set; } = string.Empty;
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public string? ClinicName { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = "Cash";
        public string? ReceivedFrom { get; set; }
        public string CashierName { get; set; } = string.Empty;
        public DateTimeOffset SettledAt { get; set; }
        public List<TodayB2BReceivableVisitDto> SettledVisits { get; set; } = new();
    }

    public class TodayB2BSettlementHistoryDto
    {
        public string ReceiptNo { get; set; } = string.Empty;
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = "Cash";
        public string? ReceivedFrom { get; set; }
        public string CashierName { get; set; } = string.Empty;
        public DateTimeOffset SettledAt { get; set; }
        public int VisitCount { get; set; }
        public List<string> PatientTokens { get; set; } = new();
    }
}
