using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class AutosaveBuffer
    {
        [Key]
        public Guid BufferId { get; set; }

        [Required]
        public Guid UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Required]
        [MaxLength(100)]
        public string EntityType { get; set; } = string.Empty; // e.g., "OrderResults"

        [Required]
        public Guid EntityId { get; set; } // e.g., OrderId

        [Required]
        public string DraftJson { get; set; } = string.Empty;

        public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    }
}
