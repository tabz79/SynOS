using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogSpecimenType
    {
        [Key]
        [StringLength(50)]
        public string SpecimenCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string SpecimenName { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid? UpdatedBy { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
