using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.Payroll
{
    public class PayrollCalculationContext
    {
        public Guid PayrollRunId { get; set; }
        public DateTime PayrollPeriodStartDate { get; set; }
        public DateTime PayrollPeriodEndDate { get; set; }
        public List<Guid> EmployeeIds { get; set; } = new List<Guid>();

        // Placeholder for Compensation snapshot reference (V1 fixed-pay)

        public List<PayrollTimeFactPlaceholder> TimeFacts { get; set; } = new List<PayrollTimeFactPlaceholder>();
        public List<PayrollLeaveFactPlaceholder> LeaveFacts { get; set; } = new List<PayrollLeaveFactPlaceholder>();
    }
}
