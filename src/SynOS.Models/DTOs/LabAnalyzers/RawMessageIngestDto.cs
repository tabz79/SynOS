using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs.LabAnalyzers
{
    public class RawMessageIngestDto
    {
        [Required]
        public string Protocol { get; set; } = null!; // ASTM, HL7

        [Required]
        public string RawMessage { get; set; } = null!;
    }
}
