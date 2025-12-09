using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums; // Assuming Enums folder for ConnectionType

namespace SynOS.Models.Entities
{
    public class LabAnalyzer : BaseEntity
    {
        [Key]
        public Guid AnalyzerId { get; set; }

        public Guid OrgId { get; set; }
        public Guid BranchId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [Required]
        [MaxLength(50)]
        public string Model { get; set; }

        [Required]
        [MaxLength(50)]
        public string Manufacturer { get; set; }

        [Required]
        [MaxLength(20)]
        public string ConnectionType { get; set; } // e.g. "Manual", "ASTM", "HL7", "FileDrop"

        public bool IsEnabled { get; set; } = true;

        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
