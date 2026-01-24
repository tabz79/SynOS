using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Enums;
using SynOS.Services.Security;
using SynOS.Services.SpendEngine;

namespace SynOS.Services.Settlements
{
    public class SettlementService : ISettlementService
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;
        private readonly IUserContext _userContext;

        public SettlementService(SynOSDbContext context, ISpendFactWriter spendFactWriter, IUserContext userContext)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _spendFactWriter = spendFactWriter ?? throw new ArgumentNullException(nameof(spendFactWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
        }

        public async Task SettleReferralPayableAsync(Guid id)
        {
            var payable = await _context.ReferralPayableFacts.FindAsync(id);
            if (payable == null) throw new KeyNotFoundException($"ReferralPayableFact {id} not found.");
            if (payable.SettledAt.HasValue) throw new InvalidOperationException($"ReferralPayableFact {id} is already settled.");

            payable.SettledAt = DateTimeOffset.UtcNow;
            _context.ReferralPayableFacts.Update(payable);

            // Emit SpendFact
            var spendFact = new SpendFact(
                Guid.NewGuid(),
                payable.ReferralPartnerId,
                payable.Amount,
                payable.Currency,
                PaymentMethod.BankTransfer, // Assumed settlement method
                $"SETTLE-{payable.ReferralPayableFactId}",
                DateTime.UtcNow,
                DateTime.UtcNow,
                "Commission Expense",
                "System Settlement",
                Guid.Empty, // No specific payment attempt ID
                Guid.Empty, // No payroll run
                Guid.Empty // No batch
            );

            await _spendFactWriter.CreateSpendFactAsync(spendFact);
            await _context.SaveChangesAsync();
        }

        public async Task SettleReceivableAsync(Guid id)
        {
            var receivable = await _context.ReceivableFacts.FindAsync(id);
            if (receivable == null) throw new KeyNotFoundException($"ReceivableFact {id} not found.");
            if (receivable.SettledAt.HasValue) throw new InvalidOperationException($"ReceivableFact {id} is already settled.");

            receivable.SettledAt = DateTimeOffset.UtcNow;
            _context.ReceivableFacts.Update(receivable);
            await _context.SaveChangesAsync();
        }
    }
}
