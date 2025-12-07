using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class CreateRadiologyStudiesRequestDto
    {
        [Required]
        public Guid VisitId { get; set; }
    }
}
