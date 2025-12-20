using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.CostAttribution
{
    [Table("CostAttribution_UsagePolicyVersions")]
    public class CostAttribution_UsagePolicyVersion
    {
        [Key]
        public Guid UsagePolicyVersionId { get; set; }

        [Required]
        public Guid UsagePolicyId { get; set; } // FK to CostAttribution_UsagePolicy
        [ForeignKey("UsagePolicyId")]
        public virtual CostAttribution_UsagePolicy UsagePolicy { get; set; }

        [Required]
        public Guid BranchId { get; set; } // FK to Branch
        [ForeignKey("BranchId")]
        public virtual Branch Branch { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal Quantity { get; set; }

        [Required]
        [StringLength(50)]
        public string Unit { get; set; }

        [Required]
        public DateTimeOffset EffectiveFrom { get; set; }

        public DateTimeOffset? EffectiveTo { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        [Required]
        public Guid CreatedByUserId { get; set; } // FK to User
        [ForeignKey("CreatedByUserId")]
        public virtual User CreatedByUser { get; set; }
    }
}
