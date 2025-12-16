using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.IMS
{
    public class ImsTubeConsumption
    {
        [Key]
        public Guid ConsumptionId { get; set; }

        [Required]
        public Guid SampleId { get; set; }
        [ForeignKey("SampleId")]
        public virtual Sample Sample { get; set; }

        [Required]
        public Guid TubeId { get; set; }
        [ForeignKey("TubeId")]
        public virtual ImsTubeMaster Tube { get; set; }

        public int Quantity { get; set; }

        public DateTimeOffset ConsumedAt { get; set; }

        [Required]
        public Guid ConsumedByUserId { get; set; }
        [ForeignKey("ConsumedByUserId")]
        public virtual User ConsumedByUser { get; set; }
    }
}
