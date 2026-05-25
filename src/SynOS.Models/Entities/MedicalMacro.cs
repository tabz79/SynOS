using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class MedicalMacro
    {
        [Key]
        public Guid MacroId { get; set; }

        [Required]
        [StringLength(100)]
        public string Shortcut { get; set; } // e.g. /fatty-liver

        [Required]
        [StringLength(200)]
        public string Label { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public string Text { get; set; } // TipTap JSON content

        [Required]
        [StringLength(50)]
        public string Scope { get; set; } // "PERSONAL" or "SYSTEM"

        public Guid? UserId { get; set; } // Nullable for SYSTEM scope, set for PERSONAL scope

        [ForeignKey("UserId")]
        public virtual User User { get; set; }

        [Required]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
