using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class AnalyzerListener
    {
        [Key]
        public Guid AnalyzerListenerId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid AnalyzerId { get; set; }

        [Required]
        [StringLength(50)]
        public string Protocol { get; set; } = "ASTM"; // ASTM, HL7

        [Required]
        public int Port { get; set; }
    }
}
