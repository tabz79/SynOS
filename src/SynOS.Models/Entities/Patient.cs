using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class Patient
    {
        [Key]
        public Guid PatientId { get; set; }

        [Required]
        [StringLength(6)]
        public string MRN { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        [Required]
        [StringLength(10)]
        public string Gender { get; set; } = string.Empty;

        [StringLength(20)]
        public string CurrentPhoneNumber { get; set; } = string.Empty;

        public bool IsSoftDeleted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public ICollection<PatientPhoneHistory> PhoneHistory { get; set; } = new List<PatientPhoneHistory>();
        public ICollection<PatientAlias> Aliases { get; set; } = new List<PatientAlias>();
        public ICollection<PatientReferrerLink> ReferrerLinks { get; set; } = new List<PatientReferrerLink>();
        
        // Assuming these will be created later
        // public ICollection<Visit> Visits { get; set; }
        // public ICollection<Sample> Samples { get; set; }
    }
}
