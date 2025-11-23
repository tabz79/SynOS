using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ResultFlag
    {
        [Key]
        public Guid FlagId { get; set; }

        [Required]
        public Guid ResultId { get; set; }
        [ForeignKey("ResultId")]
        public virtual Result? Result { get; set; }

        [Required]
        [MaxLength(20)]
        public string FlagType { get; set; } = string.Empty; // e.g., DELTA, CRITICAL, HEMOLYSIS

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
