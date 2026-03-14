using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public enum SpecimenStatus
    {
        Pending,
        Collected,
        Accessioned,
        Rejected,
        Cancelled
    }

    public class Specimen
    {
        [Key]
        public Guid SpecimenId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [ForeignKey("VisitId")]
        public virtual Visit? Visit { get; set; }

        [Required]
        [MaxLength(20)]
        public string SpecimenTypeCode { get; set; } = string.Empty;

        [ForeignKey("SpecimenTypeCode")]
        public virtual SpecimenType? SpecimenType { get; set; }

        // --- SNAPSHOT FIELDS (Clinical Integrity) ---
        [MaxLength(50)]
        public string? SpecimenTypeName { get; set; }

        [MaxLength(50)]
        public string? TubeCode { get; set; }
        
        [MaxLength(100)]
        public string? TubeName { get; set; }

        public int TubeCount { get; set; } = 1;
        // --------------------------------------------

        [Required]
        [MaxLength(50)]
        public string AccessionNumber { get; set; } = string.Empty; // Unique Index

        [Required]
        public SpecimenStatus Status { get; set; } = SpecimenStatus.Pending;

        public DateTime? CollectedAt { get; set; }
        public Guid? CollectedByUserId { get; set; }
        public Guid? CollectedBy { get; set; } // OperationalResourceId

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
