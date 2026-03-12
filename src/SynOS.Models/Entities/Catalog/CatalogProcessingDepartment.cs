using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogProcessingDepartment
    {
        [Key]
        [StringLength(50)]
        public string DepartmentCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string DepartmentName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ServiceCategoryCode { get; set; } = string.Empty;

        [ForeignKey("ServiceCategoryCode")]
        public virtual CatalogServiceCategory ServiceCategory { get; set; } = null!;

        public bool RequiresSpecimen { get; set; } = true;

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation
        public virtual ICollection<CatalogTest> Tests { get; set; } = new List<CatalogTest>();
    }
}
