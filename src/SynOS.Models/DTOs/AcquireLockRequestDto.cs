using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class AcquireLockRequestDto
    {
        [Required]
        public string EntityType { get; set; } = string.Empty;

        [Required]
        public Guid EntityId { get; set; }
    }
}
