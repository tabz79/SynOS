using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogServiceCategory
    {
        [Key]
        [StringLength(50)]
        public string ServiceCategoryCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string ServiceCategoryName { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid? UpdatedBy { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation
        public virtual ICollection<CatalogProcessingDepartment> ProcessingDepartments { get; set; } = new List<CatalogProcessingDepartment>();
    }
}
