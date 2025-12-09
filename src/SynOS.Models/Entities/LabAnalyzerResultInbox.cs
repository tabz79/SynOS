using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class LabAnalyzerResultInbox : BaseEntity
    {
        [Key]
        public Guid InboxId { get; set; }

        public Guid AnalyzerId { get; set; }
        public LabAnalyzer Analyzer { get; set; } = null!;

        [Required]
        public string RawMessage { get; set; } = null!;

        [MaxLength(100)]
        public string? PatientIdentifier { get; set; }

        [MaxLength(50)]
        public string? AnalyzerTestCode { get; set; }

        [MaxLength(50)]
        public string? ResultValue { get; set; }

        [MaxLength(20)]
        public string? Units { get; set; }

        [MaxLength(50)]
        public string? Flags { get; set; }

        public DateTimeOffset? MeasuredAt { get; set; }

        public Guid? VisitId { get; set; }
        public Guid? OrderId { get; set; }

        [MaxLength(50)]
        public string? SynosTestCode { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        public DateTimeOffset ReceivedAt { get; set; }
        public Guid? ReceivedBy { get; set; }

        public DateTimeOffset? ReviewedAt { get; set; }
        public Guid? ReviewedBy { get; set; }

        [MaxLength(500)]
        public string? ReviewNote { get; set; }
    }
}
