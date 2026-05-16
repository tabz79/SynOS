using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.Payroll
{
    [Table("StatutoryConfigs")]
    public class StatutoryConfig
    {
        [Key]
        public Guid ConfigId { get; set; }

        [Required]
        [StringLength(50)]
        public string ComponentName { get; set; } // PF, ESI, TDS

        [Column(TypeName = "decimal(18, 4)")]
        public decimal EmployeeRate { get; set; } // e.g. 0.12 for 12%

        [Column(TypeName = "decimal(18, 4)")]
        public decimal EmployerRate { get; set; } // e.g. 0.0325 for 3.25%

        public bool IsActive { get; set; } = true;

        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
