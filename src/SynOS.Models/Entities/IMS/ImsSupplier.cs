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

        [StringLength(500)]
        public string? ContactInfo { get; set; }

        public bool IsActive { get; set; } = true;
    }
}