using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Entities.Referral;

namespace SynOS.Models.Entities
{
    public class Visit
    {
        [Key]
        public Guid VisitId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid? ReferrerId { get; set; }
        [ForeignKey("ReferrerId")]
        public virtual Referrer? Referrer { get; set; }

        public Guid? BranchId { get; set; } // Nullable FK
        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; } // Nullable navigation property

        [Required]
        [StringLength(12)] // Increased length for new token format
        public string Token { get; set; } = string.Empty;

        [Required]
        public DateTime TokenDate { get; set; } // Lab local date

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

        // Referral Fields
        public bool IsReferred { get; set; } = false;
        public Guid? ReferralPartnerId { get; set; }
        [ForeignKey("ReferralPartnerId")]
        public virtual ReferralPartner? ReferralPartner { get; set; }
        public string? PaymentCollectionModel { get; set; }
        
        [StringLength(500)]
        public string? ReferrerText { get; set; } // Free-text metadata
    }
}