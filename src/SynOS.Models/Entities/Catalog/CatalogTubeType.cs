using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogTubeType
    {
        [Key]
        [StringLength(50)]
        public string TubeCode { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string TubeName { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Color { get; set; }

        public bool IsActive { get; set; } = true;

        public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid? UpdatedBy { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
        
        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
