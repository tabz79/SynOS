using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class AssignStudyRequestDto
    {
        [Required]
        public Guid StudyId { get; set; }
    }
}
