using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogParameter
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50)]
        public string TestCode { get; set; } = string.Empty;

        [ForeignKey("TestCode")]
        public virtual CatalogTest Test { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string ParameterName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string DataType { get; set; } = "Numeric";

        [StringLength(50)]
        public string? Unit { get; set; }

        [StringLength(1000)]
        public string? ReferenceRange { get; set; }

        public int SortOrder { get; set; } = 1;

        public bool IsRequired { get; set; } = true;

        [StringLength(50)]
        public string? AnalyzerCode { get; set; }

        [StringLength(2000)]
        public string? EnumOptions { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
