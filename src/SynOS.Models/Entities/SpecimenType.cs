using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class SpecimenType
    {
        [Key]
        [MaxLength(20)]
        public string Code { get; set; } = string.Empty; // e.g., "EDTA", "SERUM"

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "EDTA Whole Blood"

        [Required]
        [MaxLength(50)]
        public string ContainerCategory { get; set; } = "General"; // e.g., "Blood", "Urine"

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
