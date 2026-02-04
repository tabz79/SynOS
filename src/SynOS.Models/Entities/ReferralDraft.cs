using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Entities;

namespace SynOS.Models.Entities.Referral
{
    /// <summary>
    /// Represents a Provisional Referral captured at reception when the partner does not exist yet.
    /// STRICTLY NON-FINANCIAL. No commission, no bank details.
    /// Write-once, resolve-once logic.
    /// </summary>
    public class ReferralDraft
    {
        [Key]
        public Guid ReferralDraftId { get; set; }

        [Required]
        [MaxLength(200)]
        public string ProviderName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? ClinicName { get; set; }

        [MaxLength(100)]
        public string? Location { get; set; } // City or Area

        [Required]
        public Guid VisitId { get; set; }
        
        [Required]
        public Guid CreatedByUserId { get; set; }
        
        [ForeignKey("VisitId")]
        public virtual Visit Visit { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string? ResolvedToPartnerId { get; set; } // For audit trail if resolved

        public Guid? ResolvedByUserId { get; set; }
        public DateTime? ResolvedAt { get; set; }


        public bool IsResolved { get; set; } = false;
    }
}
