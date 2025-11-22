using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class CreateSamplesRequestDto
    {
        [Required]
        public Guid VisitId { get; set; }
    }
}
