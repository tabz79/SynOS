using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class RangeCondition
    {
        [Key]
        public Guid ConditionId { get; set; }

        [Required]
        public Guid ProfileId { get; set; }

        [ForeignKey("ProfileId")]
        public virtual RangeProfile RangeProfile { get; set; } = null!;

        [Required]
        [StringLength(10)]
        public string Sex { get; set; } = "ALL"; // Male, Female, ALL

        public int AgeMinDays { get; set; } = 0;
        public int AgeMaxDays { get; set; } = 36525; // 100 years

        [Required]
        [StringLength(50)]
        public string FastingStatus { get; set; } = "Irrelevant"; // Required, NotRequired, Irrelevant

        [StringLength(100)]
        public string? Methodology { get; set; }

        [StringLength(50)]
        public string? InstrumentCode { get; set; }

        public decimal? MinNormal { get; set; }
        public decimal? MaxNormal { get; set; }
        public decimal? MinCritical { get; set; }
        public decimal? MaxCritical { get; set; }

        [StringLength(200)]
        public string? TextRange { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
