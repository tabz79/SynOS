using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.CostAttribution
{
    [Table("CostAttribution_UsagePolicies")]
    public class CostAttribution_UsagePolicy
    {
        [Key]
        public Guid UsagePolicyId { get; set; }

        [Required]
        public Guid TestId { get; set; } // FK to TestMaster
        [ForeignKey("TestId")]
        public virtual Test Test { get; set; }

        [Required]
        public Guid InventoryItemId { get; set; } // FK to IMS_InventoryItems
        [ForeignKey("InventoryItemId")]
        public virtual IMS.ImsInventoryItem InventoryItem { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
