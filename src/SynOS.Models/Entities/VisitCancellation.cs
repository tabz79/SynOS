using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class VisitCancellation
    {
        [Key]
        public Guid CancelId { get; set; }

        [Required]
        public Guid VisitId { get; set; }

        [ForeignKey("VisitId")]
        public Visit Visit { get; set; }

        [Required]
        [MaxLength(100)]
        public string Reason { get; set; }

        public string Notes { get; set; }

        [Required]
        public int CancelledByUserId { get; set; }

        [ForeignKey("CancelledByUserId")]
        public User CancelledBy { get; set; }

        public DateTime CancelledAt { get; set; } = DateTime.UtcNow;
    }
}
