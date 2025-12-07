using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyImageUploadDto
    {
        [Required]
        public Guid RadiologyStudyId { get; set; }
        [StringLength(100)]
        public string ViewLabel { get; set; }
        public int? SeriesNumber { get; set; }
        public int? SequenceNumber { get; set; }
        [Required]
        public Guid UploadedBy { get; set; }
    }
}
