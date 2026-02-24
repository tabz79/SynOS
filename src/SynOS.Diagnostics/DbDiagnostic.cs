using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Diagnostics
{
    public class DbDiagnostic
    {
        public static async Task Run(SynOSDbContext context)
        {
            Console.WriteLine("--- Database Diagnostics ---");
            
            var branches = await context.Branches.AsNoTracking().ToListAsync();
            Console.WriteLine($"Found {branches.Count} branches:");
            foreach (var b in branches)
            {
                Console.WriteLine($"- {b.Name} (Id: {b.BranchId})");
            }

            var configs = await context.TerminalPrinterConfigs.AsNoTracking().ToListAsync();
            Console.WriteLine($"\nFound {configs.Count} TerminalPrinterConfigs:");
            foreach (var c in configs)
            {
                Console.WriteLine($"- Terminal: {c.TerminalIdentifier}, Branch: {c.BranchId}, IsLead: {c.IsLeadPrintTerminal}");
            }
            
            var visits = await context.Visits.OrderByDescending(v => v.OccurrenceTimestamp).Take(5).ToListAsync();
            Console.WriteLine("\nRecent Visits:");
            foreach (var v in visits)
            {
              Console.WriteLine($"- Token: {v.Token}, BranchId: {v.BranchId}, Status: {v.Status}");
            }
        }
    }
}
