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

        public decimal? DiscountAmount { get; set; } // Added
        public decimal? DiscountPercent { get; set; } // Added
        public decimal? TaxPercent { get; set; } // Added

        [StringLength(500)]
        public string? Notes { get; set; } // Added

        public Guid? CombinedBillingGroupId { get; set; } // Added

        // Referral Fields
        public bool? IsReferred { get; set; }
        public Guid? ReferralPartnerId { get; set; }
        public string? PaymentCollectionModel { get; set; }
    }
}