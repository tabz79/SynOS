using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Catalog
{
    public class CatalogPanelMapping
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50)]
        public string PanelTestCode { get; set; } = string.Empty;

        [ForeignKey("PanelTestCode")]
        public virtual CatalogTest PanelTest { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string ChildTestCode { get; set; } = string.Empty;

        [ForeignKey("ChildTestCode")]
        public virtual CatalogTest ChildTest { get; set; } = null!;

        public int SortOrder { get; set; } = 1;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
