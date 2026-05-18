using System;
using SynOS.Models.Enums;

namespace SynOS.Models.DTOs.Payroll
{
    public class PayrollPeriodSummaryView
    {
        public Guid PayrollPeriodId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public PayrollPeriodStatus Status { get; set; }
        public int StaffCount { get; set; }
        public decimal TotalAccrual { get; set; }
        public string MonthName => StartDate.ToString("MMMM yyyy");
    }
}
