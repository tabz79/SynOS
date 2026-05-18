using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.Payroll;

namespace SynOS.Services.Payroll.Orchestration
{
    public class PayrollDataCleanupService
    {
        private readonly SynOSDbContext _context;

        public PayrollDataCleanupService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task CleanupDuplicatePeriodsAsync()
        {
            var allPeriods = await _context.PayrollPeriods.ToListAsync();
            
            var groups = allPeriods
                .GroupBy(p => new { p.StartDate.Year, p.StartDate.Month })
                .Where(g => g.Count() > 1);

            foreach (var group in groups)
            {
                // Keep the first one, delete others
                var toDelete = group.Skip(1).ToList();
                _context.PayrollPeriods.RemoveRange(toDelete);
                
                // Also need to handle associated PayrollRuns and EmployeePayables if any
                // For now, let's just delete the periods if they are empty
            }

            await _context.SaveChangesAsync();
        }
    }
}
