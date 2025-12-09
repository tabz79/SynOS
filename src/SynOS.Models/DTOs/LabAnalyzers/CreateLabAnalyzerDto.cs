using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class CreateLabAnalyzerDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Model { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Manufacturer { get; set; } = null!;

        [Required]
        [MaxLength(20)]
        public string ConnectionType { get; set; } = LabAnalyzerConnectionTypes.Manual; // Default to Manual

        [MaxLength(500)]
        public string? Notes { get; set; }

        public Guid OrgId { get; set; } = Guid.Empty;    // For now can be Guid.Empty if needed
        public Guid BranchId { get; set; } = Guid.Empty; // same
    }
}
