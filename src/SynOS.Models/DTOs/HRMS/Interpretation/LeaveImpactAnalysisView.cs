using System;

namespace SynOS.Models.DTOs.HRMS.Interpretation
{
    public class LeaveImpactAnalysisView
    {
        public Guid EmployeeId { get; set; }
        public int TotalDaysRequested { get; set; }
        public int PaidDays { get; set; }
        public int LopDays { get; set; }
        public int RemainingQuotaBefore { get; set; }
        public int RemainingQuotaAfter { get; set; }
        public decimal EstimatedSalaryReduction { get; set; }
        public string? Month { get; set; }
    }
}
