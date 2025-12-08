using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.PACS
{
    public class PacsInstance
    {
        [Key]
        public Guid InstanceId { get; set; }

        [Required]
        public Guid SeriesId { get; set; }

        [ForeignKey("SeriesId")]
        public virtual PacsSeries PacsSeries { get; set; }

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

        [Required]
        [StringLength(200)]
        public string SopInstanceUid { get; set; }

        public int? InstanceNumber { get; set; }

        public int? FrameCount { get; set; }

        [Required]
        [StringLength(500)]
        public string FilePath { get; set; }

        public long? FileSizeBytes { get; set; }

        [Required]
        [StringLength(100)]
        public string ContentType { get; set; } = "application/dicom";

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        public Guid CreatedBy { get; set; }

        [ForeignKey("CreatedBy")]
        public virtual User Creator { get; set; }
    }
}
