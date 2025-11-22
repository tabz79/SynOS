using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class CollectSampleRequestDto
    {
        [Required]
        public Guid CollectedByUserId { get; set; }
    }
}
