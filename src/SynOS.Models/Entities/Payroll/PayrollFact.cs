using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class PayrollFact
    {
        [Key]
        public Guid PayrollFactId { get; set; }
        public Guid PayrollRunId { get; set; }
        public Guid PayrollPeriodId { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid PayComponentId { get; set; }
        public decimal Amount { get; set; }
    }
}
