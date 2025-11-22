using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Sample
    {
        [Key]
        public Guid SampleId { get; set; }

        [Required]
        public Guid OrderId { get; set; }

        [ForeignKey("OrderId")]
        public virtual Order? Order { get; set; }

        [Required]
        public TubeType TubeType { get; set; }

        [Required]
        [MaxLength(255)]
        public string Barcode { get; set; } = string.Empty;

        public DateTime? CollectedAt { get; set; }

        public Guid? CollectedByUserId { get; set; }

        [ForeignKey("CollectedByUserId")]
        public virtual User? CollectedBy { get; set; }

        [Required]
        public SampleStatus Status { get; set; } = SampleStatus.Pending;

        public bool IsRejected { get; set; } = false;

        public ICollection<SampleRejection> Rejections { get; set; } = new List<SampleRejection>();
    }
}
