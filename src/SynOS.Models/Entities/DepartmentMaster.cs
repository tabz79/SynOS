using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("DepartmentMasters")]
    public class DepartmentMaster
    {
        [Key]
        public Guid DepartmentId { get; set; }

        [Required]
        [StringLength(10)]
        public string Code { get; set; } = string.Empty; // e.g., "BIO"

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "Biochemistry"

        [Required]
        [StringLength(50)]
        public string MacroDepartment { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
