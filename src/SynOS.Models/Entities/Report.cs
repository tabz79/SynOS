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
        public Guid OrderId { get; set; }
        [ForeignKey("OrderId")]
        public virtual Order Order { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft | Signed

        public Guid? SignedByUserId { get; set; }
        [ForeignKey("SignedByUserId")]
        public virtual User? SignedBy { get; set; }

        public DateTimeOffset? SignedAt { get; set; }

        public string? PathologistComments { get; set; }

        public string? Interpretation { get; set; }

        public string? Recommendations { get; set; }

        public int CurrentVersion { get; set; } = 0;

        public bool Delivered { get; set; } = false;
        public DateTimeOffset? DeliveredAt { get; set; }

        public virtual ICollection<ReportVersion> ReportVersions { get; set; } = new List<ReportVersion>();
    }
}
