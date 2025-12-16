using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class DeptScopePolicy
    {
        [Key]
        public Guid PolicyId { get; set; }

        [Required]
        public int RoleId { get; set; }

        [Required]
        [StringLength(50)]
        public string Dept { get; set; }

        public bool CanSearchAll { get; set; } = false;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
