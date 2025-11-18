using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class VisitDayGroup
    {
        [Key]
        public Guid GroupId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        [Required]
        public DateTime Day { get; set; }

        public Guid? PrimaryVisitId { get; set; }

        public int VisitCount { get; set; }

        public bool CombinedBilling { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
