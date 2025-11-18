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
        public Visit? Visit { get; set; }

        [Required]
        [StringLength(200)]
        public string Reason { get; set; } = string.Empty;

        [Column(TypeName = "nvarchar(max)")]
        public string Notes { get; set; } = string.Empty;

        [Required]
        public Guid CancelledByUserId { get; set; }

        [ForeignKey("CancelledByUserId")]
        public User? CancelledBy { get; set; }

        public DateTime CancelledAt { get; set; } = DateTime.UtcNow;
    }
}
