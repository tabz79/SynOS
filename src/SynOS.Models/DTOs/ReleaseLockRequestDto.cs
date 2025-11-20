using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class ReleaseLockRequestDto
    {
        [Required]
        public Guid LockId { get; set; }
    }
}
