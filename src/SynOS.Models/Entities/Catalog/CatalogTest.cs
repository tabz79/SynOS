using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogTest
    {
        [Key]
        [StringLength(50)]
        public string TestCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string TestName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string DepartmentCode { get; set; } = string.Empty;

        [ForeignKey("DepartmentCode")]
        public virtual CatalogProcessingDepartment ProcessingDepartment { get; set; } = null!;

        [StringLength(50)]
        public string? SpecimenCode { get; set; }

        [ForeignKey("SpecimenCode")]
        public virtual CatalogSpecimenType? SpecimenType { get; set; }

        [StringLength(50)]
        public string? TubeCode { get; set; }

        [ForeignKey("TubeCode")]
        public virtual CatalogTubeType? TubeType { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal Price { get; set; }

        public bool IsPanel { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid? UpdatedBy { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
        
        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

        // Navigation
        public virtual ICollection<CatalogParameter> Parameters { get; set; } = new List<CatalogParameter>();
        
        [InverseProperty("PanelTest")]
        public virtual ICollection<CatalogPanelMapping> ParentMappings { get; set; } = new List<CatalogPanelMapping>();
        
        [InverseProperty("ChildTest")]
        public virtual ICollection<CatalogPanelMapping> ChildMappings { get; set; } = new List<CatalogPanelMapping>();

        public virtual ICollection<CatalogTestNote> TestNotes { get; set; } = new List<CatalogTestNote>();

        public string? DefaultInterpretation { get; set; }
        public DateTimeOffset? DefaultInterpretationLastUpdatedAt { get; set; }
        public Guid? DefaultInterpretationLastUpdatedBy { get; set; }
        public string? ReportTitle { get; set; }
    }
}
