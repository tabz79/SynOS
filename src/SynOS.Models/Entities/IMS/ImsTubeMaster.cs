using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.IMS
{
    public class ImsTubeMaster
    {
        [Key]
        public Guid TubeId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [Required]
        [StringLength(50)]
        public string UnitOfMeasure { get; set; } // e.g., "count", "each"

        public bool IsActive { get; set; } = true;
    }
}
