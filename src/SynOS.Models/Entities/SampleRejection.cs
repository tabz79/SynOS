using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class SampleRejection
    {
        [Key]
        public Guid RejectionId { get; set; }

        [Required]
        public Guid SampleId { get; set; }

        [ForeignKey("SampleId")]
        public virtual Sample Sample { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; }

        public bool RequiresRecollection { get; set; } = false;

        public Guid? NewSampleId { get; set; }

        [ForeignKey("NewSampleId")]
        public virtual Sample NewSample { get; set; }

        [Required]
        public Guid RejectedByUserId { get; set; }

        [ForeignKey("RejectedByUserId")]
        public virtual User RejectedBy { get; set; }

        public DateTime RejectedAt { get; set; } = DateTime.UtcNow;
    }
}
