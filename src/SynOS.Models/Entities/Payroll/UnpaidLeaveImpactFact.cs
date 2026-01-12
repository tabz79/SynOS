using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class UnpaidLeaveImpactFact
    {
        [Key]
        public Guid UnpaidLeaveImpactFactId { get; set; }
        public Guid PayrollRunId { get; set; }
        public Guid ComponentId { get; set; }
        public decimal Units { get; set; }
        public decimal AmountDeducted { get; set; }
    }
}
