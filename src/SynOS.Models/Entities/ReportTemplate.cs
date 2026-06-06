using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ReportTemplate
    {
        [Key]
        public Guid TemplateId { get; set; }

        [Required]
        [StringLength(50)]
        public string Modality { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public string TemplateJson { get; set; }

        [Required]
        public int Version { get; set; } = 1;

        [Required]
        public bool IsPublished { get; set; } = false;

        [Required]
        public bool IsDefault { get; set; } = false;

        [Required]
        public bool IsDeleted { get; set; } = false;

        [Required]
        public Guid CreatedBy { get; set; }

        [ForeignKey("CreatedBy")]
        public virtual User User { get; set; }

        public Guid? BranchId { get; set; }

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }

        [Required]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
