using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    /// <summary>
    /// Represents the global branding and identity of the Laboratory.
    /// GPT-5 Mandate: Single Source of Truth for Document Branding.
    /// </summary>
    public class LabProfile
    {
        [Key]
        public Guid LabProfileId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = "SynOS Laboratory";

        public string? Tagline { get; set; }

        [Required]
        public string Address { get; set; } = string.Empty;

        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Phone { get; set; }

        public string? Accreditation { get; set; } // e.g., "NABL ACCREDITED LAB (MC-1234)"
        
        public string? HeaderLogoUrl { get; set; }
        public string? WatermarkUrl { get; set; }

        public string? FooterDisclaimer { get; set; } // e.g., "* Clinical correlation required"

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
