using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    public class ImsTestTubeMap
    {
        [Key]
        public Guid MapId { get; set; }

        [Required]
        public Guid TestId { get; set; } // Changed from SynOSTestCode to TestId for proper FK
        [ForeignKey("TestId")]
        public virtual Test Test { get; set; }

        [Required]
        public Guid TubeId { get; set; }
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster Tube { get; set; }

        public int QuantityPerSample { get; set; } = 1;
    }
}
