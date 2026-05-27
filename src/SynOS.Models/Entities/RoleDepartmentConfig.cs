using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("RoleDepartmentConfigs")]
    public class RoleDepartmentConfig
    {
        [Key]
        public Guid ConfigId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(100)]
        public string RoleName { get; set; } = string.Empty; // e.g. "Phlebotomist" or "Receptionist"

        [Required]
        public Guid DepartmentId { get; set; }
        [ForeignKey("DepartmentId")]
        public virtual DepartmentMaster DepartmentMaster { get; set; } = null!;

        [Required]
        [StringLength(10)]
        public string OperatingHoursStart { get; set; } = "08:00"; // HH:mm

        [Required]
        [StringLength(10)]
        public string OperatingHoursEnd { get; set; } = "20:00"; // HH:mm

        public int DefaultTATHours { get; set; } = 24;

        public bool CanSearchAll { get; set; } = false;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
