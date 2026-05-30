using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class Branch
    {
        [Key]
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(10)]
        public string Code { get; set; } = string.Empty; // ADDED for Accessioning

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        public bool IsActive { get; set; } = true;

        [StringLength(250)]
        public string? Address { get; set; }

        [StringLength(50)]
        public string? Phone { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }
    }
}
