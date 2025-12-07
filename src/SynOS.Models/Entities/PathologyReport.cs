using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class PathologyReport
    {
        [Key]
        public Guid ReportId { get; set; } // PK and FK to Report

        [Required]
        public Guid OrderId { get; set; } // FK to Order, for context if needed

        [MaxLength(4000)]
        public string? PathologistComments { get; set; }

        [MaxLength(4000)]
        public string? Interpretation { get; set; }

        [MaxLength(4000)]
        public string? Recommendations { get; set; }

        // Navigation properties
        [ForeignKey("ReportId")]
        public virtual Report Report { get; set; }

        [ForeignKey("OrderId")]
        public virtual Order Order { get; set; }
    }
}
