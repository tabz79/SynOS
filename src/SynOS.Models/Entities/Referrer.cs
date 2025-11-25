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

        [MaxLength(100)]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(50)]
        public string? BankAccount { get; set; }

        [MaxLength(20)]
        public string? IFSC { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
