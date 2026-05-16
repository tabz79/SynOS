using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payables;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Enums;
using SynOS.Services.SpendEngine;

namespace SynOS.Services.Payroll.Settlement
{
    public class PayrollSettlementService : IPayrollSettlementService
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;

        public PayrollSettlementService(SynOSDbContext context, ISpendFactWriter spendFactWriter)
        {
            _context = context;
            _spendFactWriter = spendFactWriter;
        }

        public async Task SettleSalaryAsync(Guid employeePayableId, decimal amount, PaymentMethod method, string reference)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payable = await _context.EmployeePayables.FindAsync(employeePayableId);
                if (payable == null) throw new Exception("Employee Payable not found.");
                if (payable.Status == "Settled") throw new Exception("Payable is already settled.");

                var employee = await _context.Employees.FindAsync(payable.EmployeeId);
                var empName = employee != null ? $"{employee.FirstName} {employee.LastName}" : "Unknown Employee";

                // 1. Update Liability
                payable.AmountPaid += amount;
                if (payable.AmountPaid >= payable.NetPayable)
                {
                    payable.Status = "Settled";
                    payable.SettledAt = DateTime.UtcNow;
                }
                else
                {
                    payable.Status = "PartiallyPaid";
                }
                payable.UpdatedAt = DateTime.UtcNow;

                // 2. Emit SpendFact (Actual Expense)
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    payable.EmployeeId,
                    amount,
                    "INR",
                    "Payroll",
                    empName,
                    $"Salary Settlement - Run {payable.PayrollRunId}",
                    null,
                    method,
                    reference ?? $"SAL-SETTLE-{payable.EmployeePayableId}",
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    "PAYROLL",
                    "SETTLEMENT-UI",
                    Guid.Empty,
                    payable.PayrollRunId,
                    Guid.Empty
                );

                await _spendFactWriter.CreateSpendFactAsync(spendFact);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task BulkSettleAsync(Guid payrollRunId, PaymentMethod method)
        {
            var payables = await _context.EmployeePayables
                .Where(p => p.PayrollRunId == payrollRunId && p.Status != "Settled")
                .ToListAsync();

            foreach (var p in payables)
            {
                var remaining = p.NetPayable - p.AmountPaid;
                if (remaining > 0)
                {
                    await SettleSalaryAsync(p.EmployeePayableId, remaining, method, $"BULK-RUN-{payrollRunId}");
                }
            }
        }
    }
}
