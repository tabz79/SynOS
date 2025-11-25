using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class Referrer
    {
        [Key]
        public Guid ReferrerId { get; set; }

        [Required]
        [MaxLength(200)]
        public string ProviderName { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }
}
