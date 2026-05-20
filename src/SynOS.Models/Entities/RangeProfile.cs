using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class RangeProfile
    {
        [Key]
        public Guid ProfileId { get; set; }

        [Required]
        [StringLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [ForeignKey("ParameterCode")]
        public virtual ParameterMaster ParameterMaster { get; set; } = null!;

        [Required]
        [StringLength(200)]
        public string ProfileName { get; set; } = string.Empty; // e.g., "Standard Adult"

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public virtual ICollection<RangeCondition> RangeConditions { get; set; } = new List<RangeCondition>();
    }
}
