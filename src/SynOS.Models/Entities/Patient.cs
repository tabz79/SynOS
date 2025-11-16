using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities
{
    public class Patient
    {
        [Key]
        public Guid PatientId { get; set; }

        [Required]
        [MaxLength(6)]
        public string MRN { get; set; }

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; }

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; }

        public DateTime DateOfBirth { get; set; }

        [Required]
        [MaxLength(10)]
        public string Gender { get; set; }

        [MaxLength(20)]
        public string CurrentPhoneNumber { get; set; }

        public bool IsSoftDeleted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<PatientPhoneHistory> PhoneHistory { get; set; }
        public ICollection<PatientAlias> Aliases { get; set; }
        public ICollection<PatientReferrerLink> ReferrerLinks { get; set; }
        
        // Assuming these will be created later
        // public ICollection<Visit> Visits { get; set; }
        // public ICollection<Sample> Samples { get; set; }
    }
}
