using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SynOS.Models.Enums.IMS;

namespace SynOS.Models.Entities.IMS
{
    public class ImsConsumable
    {
        [Key]
        public Guid ConsumableId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [Required]
        public ConsumableCategory Category { get; set; }

        [Required]
        [StringLength(50)]
        public string UnitOfMeasure { get; set; }
        
        public int LowStockThreshold { get; set; }

        public bool IsCritical { get; set; } = false;

        public bool IsReusable { get; set; } = false;

        public bool IsActive { get; set; } = true;
        
        // For one-way data migration traceability
        public Guid? LegacyTubeId { get; set; }

        // Navigation property to the usage profile
        public virtual ImsInventoryUsageProfile? UsageProfile { get; set; }
    }
}
