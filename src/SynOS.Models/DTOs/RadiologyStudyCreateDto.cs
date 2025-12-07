using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RadiologyStudyCreateDto
    {
        [Required]
        public Guid OrderId { get; set; } // Renamed from VisitTestId to OrderId
        [Required]
        public Guid VisitId { get; set; }
        [Required]
        public Guid PatientId { get; set; }
        [Required]
        [StringLength(50)]
        public string Modality { get; set; } // E.g., XRay, CT, MRI
        public Guid CreatedBy { get; set; }
    }
}
