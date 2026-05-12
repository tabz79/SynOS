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



        [StringLength(100)]
        public string? Category { get; set; }

        [MaxLength(20)]
        public string? SpecimenTypeCode { get; set; } // FK to SpecimenType.Code

        [ForeignKey("SpecimenTypeCode")]
        public virtual SpecimenType? SpecimenType { get; set; }



        public bool IsProfile { get; set; } = false; // Added Phase 8

        public Guid? DepartmentId { get; set; } // Added Phase 8 (Nullable for migration)
        [ForeignKey("DepartmentId")]
        public virtual DepartmentMaster? DepartmentMaster { get; set; }

        public int TAT_Hours { get; set; } = 24;

        public bool IsActive { get; set; } = true;
        public bool IsOutsourced { get; set; } = false;

        [StringLength(1000)]
        public string? ExtraInfo { get; set; }

        [StringLength(1000)]
        public string? SpecialInstructions { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual ICollection<Parameter> Parameters { get; set; } = new List<Parameter>();
        public virtual ICollection<TestPricing> TestPricings { get; set; } = new List<TestPricing>(); // Added Phase 8
        public virtual ICollection<PriceConfig> PriceConfigs { get; set; } = new List<PriceConfig>();

        [InverseProperty("ParentTest")]
        public virtual ICollection<ProfileMap> ProfileChildren { get; set; } = new List<ProfileMap>();
        [InverseProperty("ChildTest")]
        public virtual ICollection<ProfileMap> ProfileParents { get; set; } = new List<ProfileMap>();
    }
}
