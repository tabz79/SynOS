using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Payroll
{
    public class PayableUnitsFact
    {
        [Key]
        public Guid PayableUnitsFactId { get; set; }
        public Guid PayrollRunId { get; set; }
        public Guid ComponentId { get; set; }
        public decimal FinancialPayableUnits { get; set; }
    }
}
