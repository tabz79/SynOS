### Code Changes Performed

**1. Created `ReferralPayableFact` Entity**
File: `src/SynOS.Models/Entities/Referral/ReferralPayableFact.cs`
```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.Entities.Referral
{
    public class ReferralPayableFact
    {
        [Key]
        public Guid ReferralPayableFactId { get; init; }

        public Guid ReferralPartnerId { get; init; }

        public decimal Amount { get; init; }

        public string Currency { get; init; } = string.Empty;

        public Guid SourceVisitId { get; init; }

        public DateTime OccurredAt { get; init; }

        public DateTime RecordedAt { get; init; } = DateTime.UtcNow;
    }
}
```

**2. Updated `SynOSDbContext`**
File: `src/SynOS.Data/SynOSDbContext.cs`
*   Added `DbSet<ReferralPayableFact> ReferralPayableFacts`.
*   Added configuration for `ReferralPayableFact` in `OnModelCreating`.

```csharp
// In OnModelCreating
            modelBuilder.Entity<ReferralPayableFact>(entity => // ADDED
            {
                entity.ToTable("ReferralPayableFacts");
                entity.HasKey(e => e.ReferralPayableFactId);
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 4)");
            });
```

**3. Generated Migration `AddReferralPayableFact`**
File: `src/SynOS.Data/Migrations/20260112153308_AddReferralPayableFact.cs`
*(Migration creates ReferralPayableFacts table and aligns SpendFacts schema, removing SpendLineItemFacts)*

**4. Refactored `ReferralFinancialService`**
File: `src/SynOS.Services/Referral/ReferralFinancialService.cs`
*   Removed `SpendFact` and `SpendLineItemFact` logic.
*   Removed `IPayableFactWriter` dependency.
*   Added logic to write `ReferralPayableFact`.

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Referral;
using SynOS.Models.Enums.Referral;

namespace SynOS.Services.Referral
{
    public class ReferralFinancialService : IReferralFinancialService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ReferralFinancialService> _logger;

        public ReferralFinancialService(
            SynOSDbContext context,
            ILogger<ReferralFinancialService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ProcessCommissionRecognitionAsync(Visit visit)
        {
            if (!visit.IsReferred || visit.ReferralPartnerId == null)
            {
                return;
            }

            var invoice = visit.Invoices.FirstOrDefault();
            if (invoice == null)
            {
                _logger.LogError("Cannot process commission for Visit {VisitId}: Invoice not found.", visit.VisitId);
                throw new InvalidOperationException($"Invoice not found for visit {visit.VisitId}.");
            }

            var totalCommissionAmount = 0m;

            foreach (var order in visit.Orders)
            {
                var commissionRule = await _context.ReferralCommissionRules
                    .AsNoTracking()
                    .Where(r => r.ReferralPartnerId == visit.ReferralPartnerId && r.TestId == order.TestId && r.IsActive)
                    .OrderByDescending(r => r.EffectiveFrom)
                    .FirstOrDefaultAsync();

                if (commissionRule != null)
                {
                    decimal commission = 0m;
                    if (commissionRule.CommissionType == CommissionType.Percentage)
                    {
                        commission = order.Price * (commissionRule.CommissionValue / 100m);
                    }
                    else if (commissionRule.CommissionType == CommissionType.Flat)
                    {
                        commission = commissionRule.CommissionValue;
                    }

                    totalCommissionAmount += commission;
                }
            }

            if (totalCommissionAmount > 0)
            {
                var payableFact = new ReferralPayableFact
                {
                    ReferralPayableFactId = Guid.NewGuid(),
                    ReferralPartnerId = visit.ReferralPartnerId.Value,
                    Amount = totalCommissionAmount,
                    Currency = "INR", // TODO: Use actual currency from Invoice once available.
                    SourceVisitId = visit.VisitId,
                    OccurredAt = visit.CreatedAt,
                    RecordedAt = DateTime.UtcNow
                };

                _context.ReferralPayableFacts.Add(payableFact);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Commission Recognition (Liability only) complete for Visit {VisitId}. Wrote ReferralPayableFact {ReferralPayableFactId}.", visit.VisitId, payableFact.ReferralPayableFactId);
            }
        }
    }
}
```