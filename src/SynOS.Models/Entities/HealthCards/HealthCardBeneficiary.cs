using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities.HealthCards
{
    public class HealthCardBeneficiary
    {
        [Key]
        public Guid BeneficiaryId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CardId { get; set; }

        [ForeignKey("CardId")]
        public PatientHealthCard? Card { get; set; }

        [Required]
        public Guid PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        [StringLength(50)]
        public string Relationship { get; set; } = "Self"; // "Self" | "Spouse" | "Son" | "Daughter" | "Mother" | "Father" | "Other"

        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

        public Guid? EnrolledByUserId { get; set; }

        public bool IsSlotLocked { get; set; } = false;

        public DateTime? FirstUsedAt { get; set; }
    }
}
