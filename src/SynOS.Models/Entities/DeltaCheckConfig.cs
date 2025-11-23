using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class DeltaCheckConfig
    {
        [Key]
        public Guid ConfigId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ParameterCode { get; set; } = string.Empty;

        [Required]
        public int ThresholdPercent { get; set; } = 30;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
