using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class AnalyzerParameterMap
    {
        [Key]
        public Guid MapId { get; set; }

        [Required]
        [StringLength(100)]
        public string AnalyzerId { get; set; } = string.Empty; // Machine ID

        [Required]
        [StringLength(100)]
        public string ExternalParameterCode { get; set; } = string.Empty; // Machine's parameter code

        [Required]
        [StringLength(50)]
        public string InternalParameterCode { get; set; } = string.Empty; // SynOS ParameterMaster code

        [ForeignKey("InternalParameterCode")]
        public virtual ParameterMaster ParameterMaster { get; set; } = null!;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
