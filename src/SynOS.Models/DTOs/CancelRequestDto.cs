using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class CancelRequestDto
    {
        [Required]
        public string Reason { get; set; } = string.Empty;
        public string? Notes { get; set; }

        [Required]
        public Guid CancelledByUserId { get; set; }
    }
}
