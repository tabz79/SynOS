using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("ReferenceLabs", Schema = "Payables")]
    public class ReferenceLab
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [StringLength(50)]
        public string? Code { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }

        [StringLength(50)]
        public string? Phone { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        public bool IsActive { get; set; } = true;
        
        [Required]
        public SynOS.Models.Enums.Payables.ReferenceLabStatus Status { get; set; } = SynOS.Models.Enums.Payables.ReferenceLabStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
