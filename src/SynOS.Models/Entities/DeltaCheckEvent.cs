using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class DeltaCheckEvent
    {
        [Key]
        public Guid EventId { get; set; }

        [Required]
        public Guid ResultId { get; set; }
        [ForeignKey("ResultId")]
        public virtual Result? CurrentResult { get; set; }

        [Required]
        public Guid PreviousResultId { get; set; }
        [ForeignKey("PreviousResultId")]
        public virtual Result? PreviousResult { get; set; }

        public string PreviousValue { get; set; } = string.Empty;
        public string CurrentValue { get; set; } = string.Empty;
        public decimal DeltaPercentage { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Flagged"; // Flagged, Reviewed, Dismissed

        public Guid? ReviewedByUserId { get; set; }
        [ForeignKey("ReviewedByUserId")]
        public virtual User? ReviewedBy { get; set; }
        public DateTime? ReviewedAt { get; set; }
    }
}
