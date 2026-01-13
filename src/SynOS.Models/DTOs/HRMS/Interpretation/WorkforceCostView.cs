using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.HRMS.Interpretation
{
    public class WorkforceCostView
    {
        public DateOnly Month { get; set; }
        
        public decimal TotalCost { get; set; }
        
        public decimal PayrollCost { get; set; } // Salaries
        public decimal ContractorCost { get; set; } // Spend Engine
        public decimal StatutoryLiability { get; set; } // Compliance Engine (Employer contribution)
        
        public List<CostComponent> TopComponents { get; set; } = new();
    }

    public class CostComponent
    {
        public string Category { get; set; } = string.Empty; // "Salary", "PF Employer", "Contractor: Cleaning"
        public decimal Amount { get; set; }
    }
}
