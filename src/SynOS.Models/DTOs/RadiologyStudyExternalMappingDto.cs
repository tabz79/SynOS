using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudyExternalMappingDto
    {
        [Required]
        public Guid StudyId { get; set; }

        [StringLength(100)]
        public string SystemName { get; set; }

        [StringLength(100)]
        public string AccessionNumber { get; set; }

        public string ViewerUrl { get; set; }
    }
}
