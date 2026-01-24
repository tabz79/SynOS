using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class VisitCreateDto
    {
        [Required]
        public Guid PatientId { get; set; }

        public Guid? AppointmentId { get; set; } // Added

        [Required]
        public string Department { get; set; } = string.Empty;

        public Guid? ReferrerId { get; set; }

        [Required]
        public List<string> TestCodes { get; set; } = new List<string>();

        public string? DiscountCode { get; set; } // ADDED: Backend Truth Authority

        // DEPRECATED: Ignored by backend. Use DiscountCode.
        public decimal? DiscountAmount { get; set; } 
        public decimal? DiscountPercent { get; set; } 
        public decimal? TaxPercent { get; set; } 

        [StringLength(500)]
        public string? Notes { get; set; } // Added

        public Guid? CombinedBillingGroupId { get; set; } // Added

        // Referral Fields
        public bool? IsReferred { get; set; }
        public Guid? ReferralPartnerId { get; set; }
        public string? PaymentCollectionModel { get; set; }
        public string? ReferrerText { get; set; } // Free-text input
    }
}