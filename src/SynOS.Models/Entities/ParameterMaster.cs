using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class ParameterMaster
    {
        [Key]
        [StringLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string CanonicalName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? ShortName { get; set; }

        [Required]
        [StringLength(50)]
        public string UnitType { get; set; } = string.Empty;

        [StringLength(50)]
        public string? DefaultUnit { get; set; }

        [Required]
        [StringLength(20)]
        public string DataType { get; set; } = "Numeric"; // Numeric, Text, Choice, RichText

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual ICollection<DerivedParameterRule> DerivedRules { get; set; } = new List<DerivedParameterRule>();
        public virtual ICollection<AnalyzerParameterMap> AnalyzerMaps { get; set; } = new List<AnalyzerParameterMap>();
        public virtual ICollection<RangeProfile> RangeProfiles { get; set; } = new List<RangeProfile>();
    }
}
