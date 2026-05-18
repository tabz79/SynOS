using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.HR;

namespace SynOS.Diagnostics
{
    public class SalaryAudit
    {
        public static async Task Run(SynOSDbContext context)
        {
            Console.WriteLine("--- Salary Audit Diagnostics ---");
            
            var employees = await context.Employees.AsNoTracking().ToListAsync();
            Console.WriteLine($"Found {employees.Count} employees:");
            
            foreach (var e in employees)
            {
                Console.WriteLine($"- {e.FirstName} {e.LastName} (Id: {e.EmployeeId})");
                Console.WriteLine($"  BaseSalary: {e.BaseSalary}");
                Console.WriteLine($"  JoinDate: {e.JoinDate}");
                Console.WriteLine($"  PF: {e.PFEnabled} ({e.PFPercentage}%)");
                Console.WriteLine($"  ESI: {e.ESIEnabled} ({e.ESIPercentage}%)");
                Console.WriteLine($"  TDS: {e.TDSEnabled} ({e.TDSValue} - Mode: {e.TDSMode})");
                Console.WriteLine($"  IsActive: {e.IsActive}");
                Console.WriteLine("--------------------------------");
            }

            var periods = await context.PayrollPeriods.AsNoTracking().OrderByDescending(p => p.StartDate).Take(5).ToListAsync();
            Console.WriteLine("\nRecent Payroll Periods:");
            foreach (var p in periods)
            {
                Console.WriteLine($"- Period: {p.StartDate:MMM yyyy} to {p.EndDate:MMM yyyy}, Status: {p.Status}, Id: {p.PayrollPeriodId}");
            }

            var activeRuns = await context.PayrollRuns
                .Include(r => r.PayrollPeriod)
                .Where(r => r.Status != SynOS.Models.Enums.PayrollRunStatus.Finalized && r.Status != SynOS.Models.Enums.PayrollRunStatus.Voided)
                .ToListAsync();
            
            Console.WriteLine("\nActive Payroll Runs:");
            foreach (var r in activeRuns)
            {
                Console.WriteLine($"- RunId: {r.PayrollRunId}, Period: {r.PayrollPeriod.StartDate:MMM yyyy}, Status: {r.Status}");
            }
        }
    }
}
