using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums; // Added

namespace SynOS.Models.Entities
{
    public class Test
    {
        [Key]
        public Guid TestId { get; set; }

        [Required]
        [StringLength(50)]
        public string TestCode { get; set; }

        [Required]
        [StringLength(200)]
        public string TestName { get; set; }

        [Required]
        [StringLength(50)]
        public string Department { get; set; } // Pathology | Radiology

        [StringLength(100)]
        public string? Category { get; set; }

        public TubeType? DefaultTubeType { get; set; } // Added

        [Required]
        [Column(TypeName = "decimal(10, 2)")]
        public decimal BasePrice { get; set; }

        public int TAT_Hours { get; set; } = 24;

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual ICollection<Parameter> Parameters { get; set; } = new List<Parameter>();
        public virtual ICollection<PriceConfig> PriceConfigs { get; set; } = new List<PriceConfig>();
    }
}
