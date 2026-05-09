using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.IMS
{
    public class ImsSupplier
    {
        [Key]
        public Guid SupplierId { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [StringLength(50)]
        public string? TaxId { get; set; } // GST/VAT

        [StringLength(100)]
        public string? Category { get; set; } // Reagents, Consumables, etc.

        [EmailAddress]
        public string? Email { get; set; }

        [Phone]
        public string? Phone { get; set; }

        [StringLength(500)]
        public string? ContactInfo { get; set; }

        public bool IsActive { get; set; } = true;
    }
}