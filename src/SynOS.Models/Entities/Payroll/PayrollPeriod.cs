using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Payroll
{
    public class PayrollPeriod
    {
        [Key]
        public Guid PayrollPeriodId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public PayrollPeriodStatus Status { get; set; }
    }
}