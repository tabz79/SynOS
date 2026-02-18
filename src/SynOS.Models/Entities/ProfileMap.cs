using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    [Table("ProfileMaps")]
    public class ProfileMap
    {
        [Key]
        public Guid ProfileMapId { get; set; }

        [Required]
        public Guid ParentTestId { get; set; } // The Profile (e.g., "LFT")

        [Required]
        public Guid ChildTestId { get; set; } // The Component (e.g., "Bilirubin")

        public int Sequence { get; set; }

        [ForeignKey("ParentTestId")]
        public virtual Test ParentTest { get; set; } = null!;

        [ForeignKey("ChildTestId")]
        public virtual Test ChildTest { get; set; } = null!;
    }
}
