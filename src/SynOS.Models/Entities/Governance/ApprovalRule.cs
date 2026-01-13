using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Governance
{
    public class ApprovalRule
    {
        [Key]
        public Guid ApprovalRuleId { get; set; }
        public string ActionName { get; set; } = string.Empty; // e.g., "Spend.PaymentAttempt"
        public decimal ThresholdAmount { get; set; } // Declarative threshold
        public Guid RequiredRoleId { get; set; } // Role required to approve
        public bool RequiresSeparationOfDuties { get; set; } // If true, Approver != Creator
    }
}
