using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class PatientReferrerLink
    {
        [Key]
        public Guid ReferrerLinkId { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        [Required]
        [MaxLength(100)]
        public string ReferrerSystem { get; set; } = string.Empty; // e.g., "HospitalA_EMR"

        [Required]
        [MaxLength(255)]
        public string ReferrerPatientId { get; set; } = string.Empty; // The ID of the patient in the other system

        [Required]
        [MaxLength(50)]
        public string ExternalLabCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string ExternalPatientId { get; set; } = string.Empty;
    }
}
