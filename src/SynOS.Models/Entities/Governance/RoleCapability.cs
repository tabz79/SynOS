using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Governance
{
    public class RoleCapability
    {
        [Key]
        public Guid RoleCapabilityId { get; set; }
        public Guid RoleId { get; set; }
        public Guid CapabilityId { get; set; }
    }
}
