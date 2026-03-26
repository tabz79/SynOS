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

        [StringLength(500)]
        public string? EnumOptions { get; set; } // e.g. "Positive,Negative,Equivocal"

        [StringLength(500)]
        public string? Formula { get; set; } // Mathematical formula using ParameterCodes, e.g. "TP - ALB"

        // Extended Print Metadata
        [StringLength(200)]
        public string? PrintName { get; set; }

        [StringLength(100)]
        public string? Methodology { get; set; }

        [StringLength(200)]
        public string? DisplayGroup { get; set; }

        public int DisplayGroupOrder { get; set; } = 0;

        public bool IsCalculated { get; set; } = false;

        public int DecimalPlaces { get; set; } = 2;

        public bool IsActive { get; set; } = true;

        public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid? UpdatedBy { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
