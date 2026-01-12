using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class ProratedComponentAmountFact
    {
        [Key]
        public Guid ProratedComponentAmountFactId { get; set; }
        public Guid PayrollRunId { get; set; }
        public Guid ComponentId { get; set; }
        public decimal OriginalAmount { get; set; }
        public decimal ProratedAmount { get; set; }
    }
}
