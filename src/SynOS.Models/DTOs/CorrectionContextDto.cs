using System;
using System.Collections.Generic;
using SynOS.Models.Entities.Revenue;

namespace SynOS.Models.DTOs
{
    public class CorrectionContextDto
    {
        public Guid VisitId { get; set; }
        public bool IsCorrectionAllowed { get; set; }
        public bool RequiresAuthorization { get; set; }
        public bool RequiresReason { get; set; }
        public string PaymentState { get; set; } = string.Empty; // "Unpaid", "Partial", "Paid"
        
        // ADDED: Hardening Pass Flags
        public bool CanChangeDiscount { get; set; }
        public bool CanChangeTests { get; set; }
        public bool CanChangePrice { get; set; }
        public bool RequiresSupervisorApproval { get; set; }

        public List<CorrectionFact> History { get; set; } = new List<CorrectionFact>();
    }
}
