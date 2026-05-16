using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payables
{
    [Table("ReferenceLabRateRules", Schema = "Payables")]
    public class ReferenceLabRateRule
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ReferenceLabId { get; set; }

        [Required]
        public Guid TestId { get; set; }

        [ForeignKey("TestId")]
        public virtual Test? Test { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal Cost { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public Guid UpdatedBy { get; set; }
    }
}
