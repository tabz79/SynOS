using System;
using System.ComponentModel.DataAnnotations; // Keep for [Key]
using System.ComponentModel.DataAnnotations.Schema;
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
        public string? Email { get; set; }

        // Employment Classification
        public EmploymentType EmploymentType { get; set; }
        public SalaryType SalaryType { get; set; } // ADDED
        public string JobTitle { get; set; }
        public Guid? DepartmentId { get; set; } // ADDED: Link to DepartmentMaster
        public string? Department { get; set; } // Deprecated or for legacy display
        public int MonthlyPaidLeaveQuota { get; set; } = 2; // NEW: Enterprise Quota
        public string? PreferredOffDay { get; set; } // NEW: Optional metadata

        // Financials
        public decimal BaseSalary { get; set; } // ADDED
        public string? BankName { get; set; } // ADDED
        public string? AccountNumber { get; set; } // ADDED
        public string? IFSC { get; set; } // ADDED

        // Statutory Settings (Payroll Phase 1)
        public bool PFEnabled { get; set; } = true;
        [Column(TypeName = "decimal(18, 4)")]
        public decimal PFPercentage { get; set; } = 12.0m;

        public bool ESIEnabled { get; set; } = true;
        [Column(TypeName = "decimal(18, 4)")]
        public decimal ESIPercentage { get; set; } = 0.75m; // Standard default

        public bool TDSEnabled { get; set; } = false;
        public TaxCalculationMode TDSMode { get; set; } = TaxCalculationMode.Fixed;
        [Column(TypeName = "decimal(18, 4)")]
        public decimal TDSValue { get; set; } = 0;

        // Identification (Optional for now)
        public string? PanNumber { get; set; }
        public string? AadhaarNumber { get; set; }

        // Contacts
        public string? Phone { get; set; } // ADDED
        public string? EmergencyContact { get; set; } // ADDED

        // Lifecycle
        public DateTimeOffset JoinDate { get; set; }
        public bool IsActive { get; set; } // Sole indicator of employment status

        // System Link (Optional)
        public Guid? UserId { get; set; } // Nullable link to application User (login identity)
        
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        // Metadata
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
