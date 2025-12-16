using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    public class ImsTubeLot
    {
        [Key]
        public Guid LotId { get; set; }

        [Required]
        public Guid TubeId { get; set; }
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster Tube { get; set; }

        [Required]
        public Guid BranchId { get; set; }
        [ForeignKey("BranchId")]
        public virtual Branch Branch { get; set; }

        [Required]
        [StringLength(50)]
        public string LotNumber { get; set; }

        public DateTimeOffset ExpiryDate { get; set; }

        public int CurrentQuantity { get; set; }

        public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.UtcNow;

        [NotMapped]
        public bool IsActive => CurrentQuantity > 0 && ExpiryDate >= DateTimeOffset.UtcNow;
    }
}
