using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class PatientDto
    {
        public Guid PatientId { get; set; }
        public string MRN { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public int Age { get; set; }
        public string Gender { get; set; }
        public string CurrentPhoneNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsSoftDeleted { get; set; }
        public DateTime? LastVisitDate { get; set; }
        public System.Collections.Generic.List<string> LastVisitTestCodes { get; set; } = new();
    }

    public class PatientCreateDto
    {
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; }

        [Required]
        [StringLength(100)]
        public string LastName { get; set; }

        public DateTime DateOfBirth { get; set; }

        [Required]
        [StringLength(10)]
        public string Gender { get; set; }

        [StringLength(20)]
        public string? CurrentPhoneNumber { get; set; }
    }

    public class PatientUpdateDto
    {
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; }

        [Required]
        [StringLength(100)]
        public string LastName { get; set; }

        public DateTime DateOfBirth { get; set; }

        [Required]
        [StringLength(10)]
        public string Gender { get; set; }

        [StringLength(20)]
        public string? CurrentPhoneNumber { get; set; }
    }
}
