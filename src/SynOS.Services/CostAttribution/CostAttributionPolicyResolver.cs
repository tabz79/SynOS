using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.CostAttribution;

namespace SynOS.Services.CostAttribution
{
    public class CostAttributionPolicyResolver : ICostAttributionPolicyResolver
    {
        private readonly SynOSDbContext _context;

        public CostAttributionPolicyResolver(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<CostAttribution_UsagePolicyVersion?> ResolvePolicyVersionAsync(
            Guid testId,
            Guid inventoryItemId,
            Guid branchId,
            DateTimeOffset occurredAt)
        {
            // 1. Find the core UsagePolicy based on TestId and InventoryItemId
            var policy = await _context.CostAttribution_UsagePolicies
                .AsNoTracking() // Read-only operation
                .FirstOrDefaultAsync(p => p.TestId == testId &&
                                          p.InventoryItemId == inventoryItemId &&
                                          p.IsActive);

            if (policy == null)
            {
                return null; // No active core policy found
            }

            // 2. Find the specific UsagePolicyVersion that is active for the given BranchId and OccurredAt timestamp
            var policyVersion = await _context.CostAttribution_UsagePolicyVersions
                .AsNoTracking() // Read-only operation
                .Where(pv => pv.UsagePolicyId == policy.UsagePolicyId &&
                             pv.BranchId == branchId &&
                             pv.EffectiveFrom <= occurredAt &&
                             (pv.EffectiveTo == null || pv.EffectiveTo > occurredAt))
                .OrderByDescending(pv => pv.EffectiveFrom) // In case of overlapping, although unique constraint should prevent
                .FirstOrDefaultAsync();

            return policyVersion;
        }
    }
}
