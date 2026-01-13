using System;

namespace SynOS.Models.DTOs.HRMS.IntelligenceWiring
{
    /// <summary>
    /// Flat projection of a Payroll Fact for Economic Intelligence consumption.
    /// Represents the base labor cost (accrual basis).
    /// </summary>
    public class PayrollCostFact
    {
        public Guid PayrollRunId { get; set; }
        public Guid EmployeeId { get; set; }
        public string Department { get; set; } = string.Empty;
        public string PayComponentName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
    }

    /// <summary>
    /// Flat projection of a Statutory Obligation for Economic Intelligence consumption.
    /// Represents the non-salary labor burden (employer share).
    /// </summary>
    public class StatutoryBurdenFact
    {
        public Guid StatutoryObligationFactId { get; set; }
        public string Authority { get; set; } = string.Empty;
        public string ObligationType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public DateTime LegalPeriodStart { get; set; }
        public DateTime LegalPeriodEnd { get; set; }
    }

    /// <summary>
    /// Flat projection of labor-related Spend facts for Business Intelligence consumption.
    /// Represents actual cash outflow.
    /// </summary>
    public class LaborDisbursementFact
    {
        public Guid SpendFactId { get; set; }
        public Guid PayeeId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty; // e.g. "Salary Payable"
        public DateTime OccurredAt { get; set; }
        public string TransactionReference { get; set; } = string.Empty;
    }
}
