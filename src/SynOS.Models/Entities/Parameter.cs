using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Parameter
    {
        [Key]
        public Guid ParameterId { get; set; }

        [Required]
        public Guid TestId { get; set; }
        [ForeignKey("TestId")]
        public virtual Test Test { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string ParameterCode { get; set; }

        [Required]
        [StringLength(200)]
        public string ParameterName { get; set; }

        [StringLength(50)]
        public string? Unit { get; set; }

        [Required]
        [StringLength(20)]
        public string DataType { get; set; } = "Numeric";

        public int SortOrder { get; set; } = 1;

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow; // Added

        // Navigation Property
        [ForeignKey("ParameterCode")]
        public virtual ParameterMaster? ParameterMaster { get; set; }

        public virtual ICollection<ReferenceRange> ReferenceRanges { get; set; } = new List<ReferenceRange>();
    }
}
