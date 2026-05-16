using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payroll
{
    [Table("WorkforcePolicies")]
    public class WorkforcePolicy
    {
        [Key]
        public Guid PolicyId { get; set; }

        [Required]
        [StringLength(100)]
        public string PolicyName { get; set; } // "LeavePolicy", "OvertimePolicy", etc.

        public bool IsEnabled { get; set; } = true;

        public string? ConfigJson { get; set; } // Stores dynamic settings like { "defaultPaidLeaves": 2, "allowCarryForward": false }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
