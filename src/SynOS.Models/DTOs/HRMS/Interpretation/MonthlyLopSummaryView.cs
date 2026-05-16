using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.HRMS.Interpretation
{
    public class MonthlyLopSummaryView
    {
        public DateOnly Month { get; set; }
        public List<EmployeeLopRow> Rows { get; set; } = new();
    }

    public class EmployeeLopRow
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = null!;
        public int PaidLeaveUsed { get; set; }
        public int PaidLeaveQuota { get; set; }
        public int LopDays { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal EstimatedDeduction { get; set; }
    }
}
