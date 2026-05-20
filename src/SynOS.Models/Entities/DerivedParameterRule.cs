using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class DerivedParameterRule
    {
        [Key]
        public Guid RuleId { get; set; }

        [Required]
        [StringLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [ForeignKey("ParameterCode")]
        public virtual ParameterMaster ParameterMaster { get; set; } = null!;

        [Required]
        [StringLength(1000)]
        public string FormulaExpression { get; set; } = string.Empty; // e.g., "{TC} - {HDL} - ({TG}/5)"

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
