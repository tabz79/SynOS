using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ResultLink
    {
        [Key]
        public Guid LinkId { get; set; }

        [Required]
        public Guid FromResultId { get; set; }
        [ForeignKey("FromResultId")]
        public virtual Result? FromResult { get; set; }

        [Required]
        public Guid ToResultId { get; set; }
        [ForeignKey("ToResultId")]
        public virtual Result? ToResult { get; set; }

        [Required]
        [MaxLength(50)]
        public string Relation { get; set; } = string.Empty; // e.g., "RetestOf", "Supersedes"
        
        public DateTime LinkedAt { get; set; } = DateTime.UtcNow;
    }
}
