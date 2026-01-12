using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class ProrationBaseFact
    {
        [Key]
        public Guid ProrationBaseFactId { get; set; }
        public Guid PayrollRunId { get; set; }
        public Guid ComponentId { get; set; }
        public decimal DeclaredDenominator { get; set; }
        public string UnitSystem { get; set; } = string.Empty;
    }
}
