using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class Branch
    {
        [Key]
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
