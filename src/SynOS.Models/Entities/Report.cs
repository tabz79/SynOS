using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Report
    {
        [Key]
        public Guid ReportId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [Required]
        [StringLength(50)]
        public string Department { get; set; } // 'Pathology' or 'Radiology'

        [Required]
        [StringLength(50)]
        public string SourceType { get; set; } // 'Order' (for pathology), 'RadiologyStudy'

        [Required]
        public Guid SourceId { get; set; } // Links to OrderId for Pathology, or RadiologyStudyId for Radiology

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft | ReadyForVerification | Signed | ManualVerified

        [MaxLength(20)]
        public string VerificationMode { get; set; } = "None"; // None | Manual | Digital

        public string? PdfUrl { get; set; } // URL to the generated PDF

        public Guid? TypedByUserId { get; set; }
        [ForeignKey("TypedByUserId")]
        public virtual User? TypedByUser { get; set; }

        public Guid? SignedByUserId { get; set; }
        [ForeignKey("SignedByUserId")]
        public virtual User? SignedBy { get; set; }

        public Guid? VerifiedByUserId { get; set; }
        [ForeignKey("VerifiedByUserId")]
        public virtual User? VerifiedByUser { get; set; }

        public DateTimeOffset? SignedAt { get; set; }
        public DateTimeOffset? VerifiedAt { get; set; }

        public string? DraftSnapshotJson { get; set; } // Immutable state at submission
        public string? FinalSnapshotJson { get; set; } // Immutable state at signature/manual-verification

        public int CurrentVersion { get; set; } = 0;
        public bool Delivered { get; set; } = false;
        public DateTimeOffset? DeliveredAt { get; set; }
        public bool IsPhysicallyVerified { get; set; } = false;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        // Navigation property for Radiology-specific report details (1-1 relationship)
        public virtual RadiologyReport? RadiologyReport { get; set; }
        public virtual PathologyReport? PathologyReport { get; set; }

        public virtual ICollection<ReportVersion> ReportVersions { get; set; } = new List<ReportVersion>();

        public ICollection<ReportAttachment> Attachments { get; set; } = new List<ReportAttachment>();
    }
}
