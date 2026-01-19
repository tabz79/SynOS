using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Reception
{
    public class IntakeAddTestRequest
    {
        [Required]
        public Guid VisitId { get; set; }

        [Required]
        public string TestCode { get; set; } = string.Empty;
    }
}
