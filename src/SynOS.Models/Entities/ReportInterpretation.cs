using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ReportInterpretation
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ReportId { get; set; }

        [Required]
        public string Summary { get; set; } = string.Empty;

        public string? Notes { get; set; }

        public Guid CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        [ForeignKey("ReportId")]
        public virtual Report Report { get; set; } = null!;
    }
}
