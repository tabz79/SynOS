using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("ModalityMasters")]
    public class ModalityMaster
    {
        [Key]
        public Guid ModalityId { get; set; }

        [Required]
        [StringLength(10)]
        public string Code { get; set; } = string.Empty; // e.g. "XRAY", "CT", "MRI", "US"

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty; // e.g. "X-Ray", "CT Scan", "MRI", "Ultrasound"

        [Required]
        public Guid DepartmentId { get; set; }

        [ForeignKey("DepartmentId")]
        public virtual DepartmentMaster? DepartmentMaster { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
