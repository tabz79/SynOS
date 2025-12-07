using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudyAssignDto
    {
        [Required]
        public Guid StudyId { get; set; }
        [Required]
        public Guid TechnicianId { get; set; }
    }
}
