using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Enums;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.DTOs.Revenue;
using SynOS.Services.Security;
using SynOS.Services.SpendEngine;
using SynOS.Services.Revenue;

namespace SynOS.Services.Settlements
{
    public class SettlementService : ISettlementService
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;
        private readonly IRevenueFactWriter _revenueFactWriter;
        private readonly IUserContext _userContext;

        public SettlementService(
            SynOSDbContext context, 
            ISpendFactWriter spendFactWriter, 
            IRevenueFactWriter revenueFactWriter,
            IUserContext userContext)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _spendFactWriter = spendFactWriter ?? throw new ArgumentNullException(nameof(spendFactWriter));
            _revenueFactWriter = revenueFactWriter ?? throw new ArgumentNullException(nameof(revenueFactWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
        }

        public async Task SettleReferralPayableAsync(Guid id, decimal amount)
        {
            if (amount <= 0) throw new ArgumentException("Amount must be positive.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payable = await _context.ReferralPayableFacts.FindAsync(id);
                if (payable == null) throw new KeyNotFoundException($"ReferralPayableFact {id} not found.");
                if (payable.SettledAt.HasValue) throw new InvalidOperationException($"ReferralPayableFact {id} is already settled.");

                const decimal tolerance = 0.0001m;
                if (payable.AmountPaid + amount > payable.Amount + tolerance)
                {
                    throw new InvalidOperationException($"Overpayment rejected. Amount due: {payable.Amount - payable.AmountPaid}, tried to pay: {amount}");
                }

                payable.AmountPaid += amount;
                if (Math.Abs(payable.Amount - payable.AmountPaid) < tolerance || payable.AmountPaid > payable.Amount)
                {
                    payable.SettledAt = DateTimeOffset.UtcNow;
                }

                _context.ReferralPayableFacts.Update(payable);

                var partner = await _context.ReferralPartners.FindAsync(payable.ReferralPartnerId);
                var partnerName = partner?.Name ?? "Unknown Partner";

                // Emit SpendFact
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    payable.ReferralPartnerId,
                    amount,
                    payable.Currency,
                    "Referral", // Use operational category
                    partnerName, // PayeeName
                    $"Settlement for {payable.Description}", // Notes
                    null, // BranchId (not explicitly tracked in ReferralPayableFact yet)
                    PaymentMethod.BankTransfer,
                    $"SETTLE-{payable.ReferralPayableFactId}-{DateTime.UtcNow:yyyyMMdd}",
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    "Commission Expense",
                    "System Settlement",
                    Guid.Empty,
                    Guid.Empty,
                    Guid.Empty
                );

                await _spendFactWriter.CreateSpendFactAsync(spendFact);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task SettleReceivableAsync(Guid id, decimal amount)
        {
            if (amount <= 0) throw new ArgumentException("Amount must be positive.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var receivable = await _context.ReceivableFacts.FindAsync(id);
                if (receivable == null) throw new KeyNotFoundException($"ReceivableFact {id} not found.");
                if (receivable.SettledAt.HasValue) throw new InvalidOperationException($"ReceivableFact {id} is already settled.");

                const decimal tolerance = 0.0001m;
                if (receivable.AmountReceived + amount > receivable.Amount + tolerance)
                {
                    throw new InvalidOperationException($"Over-receipt rejected. Amount due: {receivable.Amount - receivable.AmountReceived}, tried to receive: {amount}");
                }

                receivable.AmountReceived += amount;
                if (Math.Abs(receivable.Amount - receivable.AmountReceived) < tolerance || receivable.AmountReceived > receivable.Amount)
                {
                    receivable.SettledAt = DateTimeOffset.UtcNow;
                }

                _context.ReceivableFacts.Update(receivable);

                // Emit RevenueFact (Truth acknowledgment of money arriving)
                var command = new DeclareRevenueFactCommand
                {
                    OccurredAt = DateTimeOffset.UtcNow,
                    Amount = amount,
                    Currency = receivable.Currency,
                    Direction = RevenueDirection.Inflow,
                    SourceType = RevenueSourceType.Partner,
                    SourceReferenceId = receivable.ReceivableFactId.ToString(),
                    PaymentMode = PaymentMode.BankTransfer,
                    DeclaredByUserId = _userContext.CurrentUserId,
                    Notes = $"Settlement for Partner Receivable {receivable.ReceivableFactId}"
                };

                await _revenueFactWriter.DeclareRevenueFactAsync(command);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        public async Task SettleBulkPartnerReceivablesAsync(Guid partnerId, List<Guid> factIds, decimal totalAmount, string paymentMode)
        {
            if (totalAmount <= 0) throw new ArgumentException("Amount must be positive.");
            if (factIds == null || !factIds.Any()) throw new ArgumentException("No fact IDs provided.");

            var partner = await _context.ReferralPartners.FindAsync(partnerId);
            if (partner == null) throw new InvalidOperationException("Partner not found");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var receivables = await _context.ReceivableFacts
                    .Where(f => factIds.Contains(f.ReceivableFactId) && f.ReferralPartnerId == partnerId && f.SettledAt == null)
                    .OrderBy(f => f.OccurredAt)
                    .ToListAsync();

                if (!receivables.Any())
                {
                    throw new InvalidOperationException($"No pending receivables found for Partner {partnerId} with the provided IDs.");
                }

                // 2. Distribute payment (FIFO)
                var remaining = totalAmount;
                foreach (var rec in receivables)
                {
                    if (remaining <= 0) break;

                    var outstanding = rec.Amount - rec.AmountReceived;
                    var apply = Math.Min(remaining, outstanding);

                    rec.AmountReceived += apply;
                    if (rec.AmountReceived >= rec.Amount)
                    {
                        rec.SettledAt = DateTimeOffset.UtcNow;
                    }

                    remaining -= apply;
                    _context.ReceivableFacts.Update(rec);
                }

                // 3. Declare Revenue Fact (Truth Engine)
                var command = new DeclareRevenueFactCommand
                {
                    OccurredAt = DateTimeOffset.UtcNow,
                    Amount = totalAmount,
                    Currency = receivables.First().Currency ?? "INR",
                    Direction = RevenueDirection.Inflow,
                    SourceType = RevenueSourceType.Partner,
                    SourceReferenceId = $"BULK-{partnerId}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    PaymentMode = Enum.TryParse<PaymentMode>(paymentMode, out var mode) ? mode : PaymentMode.BankTransfer,
                    DeclaredByUserId = _userContext.CurrentUserId,
                    Notes = $"Partner: {partner.Name} | Bulk settlement for {receivables.Count} bills."
                };

                await _revenueFactWriter.DeclareRevenueFactAsync(command);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        public async Task SettleBulkReferralPayablesAsync(Guid partnerId, List<Guid> factIds, decimal totalAmount, string paymentMethod)
        {
            if (totalAmount <= 0) throw new ArgumentException("Amount must be positive.");
            if (factIds == null || !factIds.Any()) throw new ArgumentException("No fact IDs provided.");

            var partner = await _context.ReferralPartners.FindAsync(partnerId);
            if (partner == null) throw new InvalidOperationException("Partner not found");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var payables = await _context.ReferralPayableFacts
                    .Where(f => factIds.Contains(f.ReferralPayableFactId) && f.ReferralPartnerId == partnerId && f.SettledAt == null)
                    .OrderBy(f => f.OccurredAt)
                    .ToListAsync();

                if (!payables.Any())
                {
                    throw new InvalidOperationException($"No pending referral payables found for Partner {partnerId} with the provided IDs. Ensure status is 'Pending'.");
                }

                var remaining = totalAmount;
                foreach (var payable in payables)
                {
                    if (remaining <= 0) break;

                    var outstanding = payable.Amount - payable.AmountPaid;
                    var apply = Math.Min(remaining, outstanding);

                    payable.AmountPaid += apply;
                    if (payable.AmountPaid >= payable.Amount)
                    {
                        payable.SettledAt = DateTimeOffset.UtcNow;
                        payable.Status = "Settled";
                    }

                    remaining -= apply;
                    _context.ReferralPayableFacts.Update(payable);
                }

                // Emit SpendFact
                var spendFact = new SpendFact(
                    Guid.NewGuid(),
                    partnerId,
                    totalAmount,
                    payables.First().Currency ?? "INR",
                    "Referral",
                    partner.Name,
                    $"Bulk Settlement for {payables.Count} referral items.",
                    null,
                    Enum.TryParse<PaymentMethod>(paymentMethod, out var method) ? method : PaymentMethod.BankTransfer,
                    $"BULK-SETTLE-{partnerId}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    "Commission Expense",
                    "System Bulk Settlement",
                    Guid.Empty,
                    Guid.Empty,
                    Guid.Empty
                );

                await _spendFactWriter.CreateSpendFactAsync(spendFact);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
