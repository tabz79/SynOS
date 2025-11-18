using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class TokenCounter
    {
        [Key]
        public Guid CounterId { get; set; }

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;

        [Required]
        public DateTime Day { get; set; } // Lab local date

        [Required]
        [StringLength(1)]
        public string SeriesLetter { get; set; } = "A";

        public int LastNumber { get; set; } = 0;

        public int MaxPerSeries { get; set; } = 999;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}