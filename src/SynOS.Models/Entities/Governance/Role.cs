using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Governance
{
    public class Role
    {
        [Key]
        public Guid RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}
