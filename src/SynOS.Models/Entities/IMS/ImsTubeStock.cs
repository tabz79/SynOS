using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    public class ImsTubeStock
    {
        [Key]
        public Guid StockId { get; set; }

        [Required]
        public Guid TubeId { get; set; }
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster Tube { get; set; }



        public int CurrentQuantity { get; set; }

        public int AlertQuantity { get; set; }
    }
}
