using System;
using System.ComponentModel.DataAnnotations; // Keep for [Key]
using SynOS.Models.Enums; // For EmploymentType

namespace SynOS.Models.Entities.HR
{
    /// <summary>
    /// Represents an Employee Master record (HR Master).
    /// This is the stable, minimal, and future-proof source of truth for an employee's identity.
    /// </summary>
    public class Employee
    {
        // Identity
        [Key]
        public Guid EmployeeId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }

        // Employment Classification
        public EmploymentType EmploymentType { get; set; }
        public string JobTitle { get; set; }
        public string Department { get; set; }

        // Lifecycle
        public DateTimeOffset JoinDate { get; set; }
        public bool IsActive { get; set; } // Sole indicator of employment status

        // System Link (Optional)
        public Guid? UserId { get; set; } // Nullable link to application User (login identity)

        // Metadata
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
