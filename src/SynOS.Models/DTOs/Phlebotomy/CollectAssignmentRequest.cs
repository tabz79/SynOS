using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.Phlebotomy
{
    public class CollectAssignmentRequest
    {
        [Required]
        public Guid AssignmentId { get; set; }
    }
}
