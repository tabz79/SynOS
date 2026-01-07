using System;
using System.ComponentModel.DataAnnotations;
using SynOS.Models.Enums;

namespace SynOS.Models.Entities.Payroll
{
    public class PayrollRun
    {
        [Key]
        public Guid PayrollRunId { get; set; }
        public Guid PayrollPeriodId { get; set; }
        public PayrollRunStatus Status { get; set; }
        public PayrollRunType RunType { get; set; }
    }
}
