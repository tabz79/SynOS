using System;
using System.Collections.Generic;
using SynOS.Models.DTOs; // Needed for PatientSummaryDto, InvoiceSummaryDto, OrderSummaryDto

namespace SynOS.Models.Events.Reception
{
    /// <summary>
    /// Event broadcasted to a branch's Lead printer terminal after a successful Reception payment.
    /// This carries all pre-calculated financial snapshot data to ensure the printer remains a dumb terminal.
    /// </summary>
    public class PrintThermalReceiptEvent
    {
        /// <summary>
        /// A strong idempotency key. The receiving client must cache this to prevent duplicate 
        /// prints in the event of SignalR/Redis network replays.
        /// </summary>
        public Guid EventId { get; set; } = Guid.NewGuid();

        public Guid VisitId { get; set; }
        
        /// <summary>
        /// Critical routing key: The Hub will only unicast this to the Lead terminal belonging to this BranchId.
        /// </summary>
        public Guid BranchId { get; set; }

        public string Token { get; set; } = string.Empty;

        public string LabName { get; set; } = "Laboratory";
        public string? LabAddress { get; set; }
        public string? LabPhone { get; set; }
        public string? LabEmail { get; set; }
        public string? LabWebsite { get; set; }
        public BranchPrintDetailsDto Branch { get; set; } = new();

        // Pre-calculated Read-Only Financial Projections
        public PatientSummaryDto Patient { get; set; } = new PatientSummaryDto();
        public InvoiceSummaryDto Billing { get; set; } = new InvoiceSummaryDto();
        public List<OrderSummaryDto> Orders { get; set; } = new List<OrderSummaryDto>();
    }
}
