using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class PayrollAdjustment
    {
        [Key]
        public Guid PayrollAdjustmentId { get; set; }
        public Guid PayrollRunId { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid PayComponentId { get; set; }
        public decimal Amount { get; set; }
        public string? Notes { get; set; }
    }
}
