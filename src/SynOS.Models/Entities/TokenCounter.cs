using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class TokenCounter
    {
        [Key]
        public Guid CounterId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Department { get; set; }

        [Required]
        public DateTime Day { get; set; }

        public int LastNumber { get; set; }

        public int MaxPerDay { get; set; } = 999;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
