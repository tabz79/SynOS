using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Governance
{
    public class Assignment
    {
        [Key]
        public Guid AssignmentId { get; set; }
        public Guid RoleId { get; set; }
        public Guid UserId { get; set; } // Link to Module 1 (HR Master/User Identity)
        public Guid? ScopeId { get; set; } // Optional: Department or Branch ID
    }
}
