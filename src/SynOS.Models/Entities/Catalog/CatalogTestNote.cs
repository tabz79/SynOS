using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogTestNote
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
        public string NoteType { get; set; } = "ClinicalSignificance"; // ClinicalSignificance, MethodDetail, FooterWarning

        [Required]
        public string NoteText { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public Guid CreatedBy { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public Guid? UpdatedBy { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
