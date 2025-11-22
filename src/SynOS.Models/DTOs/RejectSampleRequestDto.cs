using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class RejectSampleRequestDto
    {
        [Required]
        public Guid RejectedByUserId { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; }
        
        public bool RequiresRecollection { get; set; }
    }
}
