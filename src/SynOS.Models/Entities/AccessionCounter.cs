using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class AccessionCounter
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public DateTime Day { get; set; }

        [Required]
        public string Prefix { get; set; }

        public int LastNumber { get; set; }
    }
}
