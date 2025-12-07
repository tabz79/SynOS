using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudySetExternalMappingDto
    {
        [Required]
        public Guid StudyId { get; set; }
        [StringLength(100)]
        public string SystemName { get; set; }
        [StringLength(100)]
        public string AccessionNumber { get; set; }
        [StringLength(200)]
        public string StudyInstanceUid { get; set; }
        public string ViewerUrl { get; set; }
    }
}
