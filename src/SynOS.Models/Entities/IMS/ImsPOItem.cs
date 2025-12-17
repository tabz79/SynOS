using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    public class ImsPOItem
    {
        [Key]
        public Guid POItemId { get; set; }

        [Required]
        public Guid POId { get; set; }
        [ForeignKey("POId")]
        public virtual ImsPurchaseOrder PurchaseOrder { get; set; }

        [Required]
        public Guid TubeId { get; set; }
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster Tube { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Ordered quantity must be greater than 0.")]
        public int OrderedQuantity { get; set; }

        public int ReceivedQuantity { get; set; } = 0;

        [Required]
        [Column(TypeName = "decimal(10, 2)")]
        public decimal UnitPrice { get; set; }

        [Required]
        [Column(TypeName = "decimal(5, 2)")]
        public decimal TaxRate { get; set; } = 0.00m;
    }
}