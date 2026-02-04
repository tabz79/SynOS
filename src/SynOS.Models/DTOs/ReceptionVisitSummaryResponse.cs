using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class ReceptionVisitSummaryResponse
    {
        public Guid VisitId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime TokenDate { get; set; }
        public string Dept { get; set; } = string.Empty;
        public string VisitStatus { get; set; } = string.Empty;
        public PatientSummaryDto Patient { get; set; } = new();
        public List<OrderSummaryDto> Orders { get; set; } = new();
        public InvoiceSummaryDto Invoice { get; set; } = new();
        public List<LastPaymentDto> Payments { get; set; } = new();
        public ReadinessFlagsDto Flags { get; set; } = new();
        public ReferralDraftDto? ReferralDraft { get; set; }
    }

    public class ReadinessFlagsDto
    {
        public bool CanPrintToken { get; set; }
        public bool CanCollectSamples { get; set; }
        public bool CanPerformScan { get; set; }
    }
}
