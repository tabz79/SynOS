using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs.HRMS.Interpretation
{
    public class PayslipView
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        
        public Guid PayrollRunId { get; set; }
        public DateOnly PeriodStart { get; set; }
        public DateOnly PeriodEnd { get; set; }
        
        public List<PayslipItem> Earnings { get; set; } = new();
        public List<PayslipItem> Deductions { get; set; } = new();
        
        public decimal TotalEarnings { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetPayable { get; set; }
        
        // Optional: Link to actual disbursement
        public List<PaymentProof> Disbursements { get; set; } = new();
    }

    public class PayslipItem
    {
        public string ComponentName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
    }

    public class PaymentProof
    {
        public Guid SpendFactId { get; set; }
        public string TransactionReference { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime PaidAt { get; set; }
    }
}
