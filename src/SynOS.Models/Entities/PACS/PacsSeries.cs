using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.PACS
{
    public class PacsSeries
    {
        [Key]
        public Guid SeriesId { get; set; }

        [Required]
        public Guid RadiologyStudyId { get; set; }

        [ForeignKey("RadiologyStudyId")]
        public virtual RadiologyStudy RadiologyStudy { get; set; }

        // Made nullable to accommodate current schema. To be made non-nullable when multi-tenancy is implemented.
        public Guid? OrgId { get; set; }

        public Guid? BranchId { get; set; }

        [Required]
        [StringLength(200)]
        public string StudyInstanceUid { get; set; }

        [Required]
        [StringLength(200)]
        public string SeriesInstanceUid { get; set; }

        [StringLength(50)]
        public string? Modality { get; set; }

        [StringLength(200)]
        public string? Description { get; set; }

        public int? SeriesNumber { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        public Guid CreatedBy { get; set; }

        [ForeignKey("CreatedBy")]
        public virtual User Creator { get; set; }
        
        public virtual ICollection<PacsInstance> PacsInstances { get; set; } = new List<PacsInstance>();

        // Soft delete properties
        public bool IsDeleted { get; set; } = false;
        public DateTimeOffset? DeletedAt { get; set; }
        public Guid? DeletedBy { get; set; }
    }
}
