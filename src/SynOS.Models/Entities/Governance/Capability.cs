using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Governance
{
    public class Capability
    {
        [Key]
        public Guid CapabilityId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g., "Payroll.InitiateRun"
        public string Module { get; set; } = string.Empty; // e.g., "Payroll"
        public string Action { get; set; } = string.Empty; // e.g., "InitiateRun"
    }
}
