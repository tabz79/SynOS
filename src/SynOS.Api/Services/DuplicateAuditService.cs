using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SynOS.Data;

namespace SynOS.Api.Services
{
    public static class DuplicateAuditService
    {
        public static async Task RunAuditAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<SynOSDbContext>>();

            logger.LogInformation("=== STARTING REVENUE FACT DUPLICATE SCAN ===");

            var groups = await context.RevenueFacts
                .GroupBy(f => new { f.SourceType, f.SourceReferenceId })
                .Select(g => new 
                { 
                    Key = g.Key, 
                    Count = g.Count(), 
                    Ids = g.Select(x => x.RevenueFactId).ToList(),
                    Amounts = g.Select(x => x.Amount).ToList(),
                    Directions = g.Select(x => x.Direction).ToList(),
                    Modes = g.Select(x => x.PaymentMode).ToList()
                })
                .Where(x => x.Count > 1)
                .ToListAsync();

            if (groups.Count == 0)
            {
                logger.LogInformation("✅ SCAN COMPLETE: No duplicates found. Safe to apply UNIQUE INDEX.");
            }
            else
            {
                logger.LogWarning("⚠️ SCAN COMPLETE: Found {Count} duplicate groups!", groups.Count);
                foreach (var g in groups)
                {
                    logger.LogWarning("Duplicate detected for Source: {Type} / {RefId}. Count: {Count}", g.Key.SourceType, g.Key.SourceReferenceId, g.Count);
                    
                    // Check for Identity (Safe Cleanup) vs Semantic Conflict (STOP)
                    var distinctAmounts = g.Amounts.Distinct().Count();
                    var distinctDirs = g.Directions.Distinct().Count();
                    var distinctModes = g.Modes.Distinct().Count();

                    if (distinctAmounts > 1 || distinctDirs > 1 || distinctModes > 1)
                    {
                         logger.LogError("❌ CRITICAL: Semantic Conflict in Duplicates! Amounts: {Amounts}", string.Join(",", g.Amounts));
                    }
                    else
                    {
                        logger.LogInformation("ℹ️ Duplicates are identical. Auto-cleanup candidates.");
                    }
                }
            }
            
            logger.LogInformation("=== SCAN FINISHED ===");
        }
    }
}
