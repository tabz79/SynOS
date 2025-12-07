using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class RadiologyImage
    {
        [Key]
        public Guid ImageId { get; set; }

        [Required]
        public Guid RadiologyStudyId { get; set; }

        public RadiologyStudy RadiologyStudy { get; set; }

        [Required]
        [StringLength(200)]
        public string FileName { get; set; }

        [Required]
        public string FileUrl { get; set; }

        [StringLength(100)]
        public string ViewLabel { get; set; }

        public int? SeriesNumber { get; set; }

        public int? SequenceNumber { get; set; }

        public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        public Guid UploadedBy { get; set; }

        [ForeignKey("UploadedBy")]
        public User Uploader { get; set; }
    }
}
