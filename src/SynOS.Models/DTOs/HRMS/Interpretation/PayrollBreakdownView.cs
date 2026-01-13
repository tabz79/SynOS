using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.HRMS.Interpretation
{
    public class PayrollBreakdownView
    {
        public Guid PayrollRunId { get; set; }
        public DateOnly PeriodStart { get; set; }
        public DateOnly PeriodEnd { get; set; }
        
        public decimal TotalLiability { get; set; }
        
        public List<DepartmentBreakdown> ByDepartment { get; set; } = new();
    }

    public class DepartmentBreakdown
    {
        public string DepartmentName { get; set; } = string.Empty;
        public int EmployeeCount { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
