using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.SpendEngine;
using SynOS.Models.Enums;
using SynOS.Models.Entities.Revenue;
using SynOS.Models.DTOs.Revenue;
using SynOS.Services.Security;
using SynOS.Services.SpendEngine;
using SynOS.Services.Revenue;
using SynOS.Services.Time;

namespace SynOS.Services.Settlements
{
    public class SettlementService : ISettlementService
    {
        private readonly SynOSDbContext _context;
        private readonly ISpendFactWriter _spendFactWriter;
        private readonly IRevenueFactWriter _revenueFactWriter;
        private readonly IUserContext _userContext;
        private readonly SynOS.Services.Operational.INotifier _notifier;
        private readonly ILabTimeProvider _labTimeProvider;

        public SettlementService(
            SynOSDbContext context, 
            ISpendFactWriter spendFactWriter, 
            IRevenueFactWriter revenueFactWriter,
            IUserContext userContext,
            SynOS.Services.Operational.INotifier notifier,
            ILabTimeProvider labTimeProvider)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _spendFactWriter = spendFactWriter ?? throw new ArgumentNullException(nameof(spendFactWriter));
            _revenueFactWriter = revenueFactWriter ?? throw new ArgumentNullException(nameof(revenueFactWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _notifier = notifier ?? throw new ArgumentNullException(nameof(notifier));
            _labTimeProvider = labTimeProvider ?? throw new ArgumentNullException(nameof(labTimeProvider));
        }

        public async Task SettleReferralPayableAsync(Guid id, decimal amount)
        {
            if (amount <= 0) throw new ArgumentException("Amount must be positive.");

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
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
            });
        }

        public async Task SettleReceivableAsync(Guid id, decimal amount)
        {
            if (amount <= 0) throw new ArgumentException("Amount must be positive.");

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
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

                    // Synchronize visit Invoice and record Payment in central ledger
                    if (receivable.SourceVisitId != Guid.Empty)
                    {
                        var invoice = await _context.Invoices
                            .Include(i => i.Payments)
                            .Include(i => i.PartialPayments)
                            .FirstOrDefaultAsync(i => i.VisitId == receivable.SourceVisitId);

                        if (invoice != null)
                        {
                            var invoicePaid = (invoice.Payments?.Sum(p => p.Amount) ?? 0) + (invoice.PartialPayments?.Sum(p => p.Amount) ?? 0);
                            var invoiceDue = Math.Max(0, invoice.Total - invoicePaid);
                            var payAmount = Math.Min(amount, invoiceDue);

                            if (payAmount > 0)
                            {
                                var actorId = _userContext.CurrentUserId != Guid.Empty 
                                    ? _userContext.CurrentUserId 
                                    : await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();

                                var payRecord = new Payment
                                {
                                    PaymentId = Guid.NewGuid(),
                                    InvoiceId = invoice.InvoiceId,
                                    Amount = payAmount,
                                    Method = "BankTransfer",
                                    ReceiptNo = $"RCP-PARTNER-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                                    ReceivedAt = DateTime.UtcNow,
                                    ReceivedByUserId = actorId
                                };
                                _context.Payments.Add(payRecord);

                                if (invoicePaid + payAmount >= invoice.Total)
                                {
                                    invoice.Status = "Paid";
                                    var visit = await _context.Visits.FindAsync(invoice.VisitId);
                                    if (visit != null) visit.Status = VisitStatus.Paid;
                                }
                                else
                                {
                                    invoice.Status = "PartialPayment";
                                    var visit = await _context.Visits.FindAsync(invoice.VisitId);
                                    if (visit != null) visit.Status = VisitStatus.PartialPayment;
                                }
                            }
                        }
                    }

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

                    // Live Single Source of Truth Broadcast
                    try
                    {
                        await _notifier.NotifyReceivablesUpdatedAsync(null, receivable.ReferralPartnerId ?? receivable.DebtorId);
                    }
                    catch { }
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
        public async Task SettleBulkPartnerReceivablesAsync(Guid partnerId, List<Guid> factIds, decimal totalAmount, string paymentMode, string? reference = null)
        {
            if (totalAmount <= 0) throw new ArgumentException("Amount must be positive.");
            if (factIds == null || !factIds.Any()) throw new ArgumentException("No fact IDs provided.");

            var partner = await _context.ReferralPartners.FindAsync(partnerId);
            string debtorName = partner?.Name ?? "";
            if (string.IsNullOrEmpty(debtorName))
            {
                var ins = await _context.InsuranceCompanies.FindAsync(partnerId);
                debtorName = ins?.Name ?? "";
            }
            if (string.IsNullOrEmpty(debtorName))
            {
                var corp = await _context.CorporateAccounts.FindAsync(partnerId);
                debtorName = corp?.CompanyName ?? "";
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var validVisitIds = await _context.Visits
                        .Where(v => v.SecondaryReferralPartnerId == partnerId || v.ReferralPartnerId == partnerId)
                        .Select(v => v.VisitId)
                        .ToListAsync();

                    var receivables = await _context.ReceivableFacts
                        .Where(f => factIds.Contains(f.ReceivableFactId) && (f.ReferralPartnerId == partnerId || f.DebtorId == partnerId || validVisitIds.Contains(f.SourceVisitId)) && f.SettledAt == null)
                        .OrderBy(f => f.OccurredAt)
                        .ToListAsync();

                    if (!receivables.Any())
                    {
                        throw new InvalidOperationException($"No pending receivables found for Debtor {partnerId} with the provided IDs.");
                    }

                    // 2. Distribute payment (FIFO)
                    var remaining = totalAmount;
                    foreach (var rec in receivables)
                    {
                        if (remaining <= 0) break;

                        if (rec.DebtorType == DebtorType.Partner && rec.DebtorId != partnerId)
                        {
                            rec.DebtorId = partnerId;
                            rec.ReferralPartnerId = partnerId;
                        }

                        var outstanding = rec.Amount - rec.AmountReceived;
                        var apply = Math.Min(remaining, outstanding);

                        rec.AmountReceived += apply;
                        if (rec.AmountReceived >= rec.Amount)
                        {
                            rec.SettledAt = DateTimeOffset.UtcNow;
                        }

                        remaining -= apply;
                        _context.ReceivableFacts.Update(rec);

                        // Synchronize visit Invoice and record Payment in central ledger
                        if (rec.SourceVisitId != Guid.Empty && apply > 0)
                        {
                            var invoice = await _context.Invoices
                                .Include(i => i.Payments)
                                .Include(i => i.PartialPayments)
                                .FirstOrDefaultAsync(i => i.VisitId == rec.SourceVisitId);

                            if (invoice != null)
                            {
                                var invoicePaid = (invoice.Payments?.Sum(p => p.Amount) ?? 0) + (invoice.PartialPayments?.Sum(p => p.Amount) ?? 0);
                                var invoiceDue = Math.Max(0, invoice.Total - invoicePaid);
                                var payAmount = Math.Min(apply, invoiceDue);

                                if (payAmount > 0)
                                {
                                    var actorId = _userContext.CurrentUserId != Guid.Empty 
                                        ? _userContext.CurrentUserId 
                                        : await _context.Users.OrderBy(u => u.CreatedAt).Select(u => u.UserId).FirstOrDefaultAsync();

                                    var receiptNo = !string.IsNullOrWhiteSpace(reference)
                                        ? reference.Trim()
                                        : $"RCP-PARTNER-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";

                                    var payRecord = new Payment
                                    {
                                        PaymentId = Guid.NewGuid(),
                                        InvoiceId = invoice.InvoiceId,
                                        Amount = payAmount,
                                        Method = !string.IsNullOrWhiteSpace(paymentMode) ? paymentMode : "BankTransfer",
                                        ReceiptNo = receiptNo,
                                        ReceivedAt = DateTime.UtcNow,
                                        ReceivedByUserId = actorId
                                    };
                                    _context.Payments.Add(payRecord);

                                    if (invoicePaid + payAmount >= invoice.Total)
                                    {
                                        invoice.Status = "Paid";
                                        var visit = await _context.Visits.FindAsync(invoice.VisitId);
                                        if (visit != null) visit.Status = VisitStatus.Paid;
                                    }
                                    else
                                    {
                                        invoice.Status = "PartialPayment";
                                        var visit = await _context.Visits.FindAsync(invoice.VisitId);
                                        if (visit != null) visit.Status = VisitStatus.PartialPayment;
                                    }
                                }
                            }
                        }
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
                        Notes = $"Partner: {debtorName} | Bulk settlement for {receivables.Count} bills."
                    };

                    await _revenueFactWriter.DeclareRevenueFactAsync(command);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Live Single Source of Truth Broadcast
                    try
                    {
                        await _notifier.NotifyReceivablesUpdatedAsync(null, partnerId);
                    }
                    catch { }
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
        public async Task SettleBulkReferralPayablesAsync(Guid partnerId, List<Guid> factIds, decimal totalAmount, string paymentMethod)
        {
            if (totalAmount <= 0) throw new ArgumentException("Amount must be positive.");
            if (factIds == null || !factIds.Any()) throw new ArgumentException("No fact IDs provided.");

            var partner = await _context.ReferralPartners.FindAsync(partnerId);
            if (partner == null) throw new InvalidOperationException("Partner not found");

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var validVisitIds = await _context.Visits
                        .Where(v => v.SecondaryReferralPartnerId == partnerId || v.ReferralPartnerId == partnerId)
                        .Select(v => v.VisitId)
                        .ToListAsync();

                    var payables = await _context.ReferralPayableFacts
                        .Where(f => factIds.Contains(f.ReferralPayableFactId) && (f.ReferralPartnerId == partnerId || validVisitIds.Contains(f.SourceVisitId)) && f.SettledAt == null)
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

                        if (payable.ReferralPartnerId != partnerId)
                        {
                            payable.ReferralPartnerId = partnerId;
                        }

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
            });
        }

        public async Task<List<TodayB2BReceivableGroupDto>> GetTodayB2BReceivablesAsync(Guid branchId)
        {
            var today = _labTimeProvider.GetLabToday();
            var tz = _labTimeProvider.GetLabTimeZone();
            var startOfToday = new DateTimeOffset(today, tz.GetUtcOffset(today));
            var endOfToday = startOfToday.AddDays(1);
            var startUtc = startOfToday.UtcDateTime;
            var endUtc = endOfToday.UtcDateTime;

            // 1. Fetch today's B2B visits registered under Corporate B2B (Prepaid) or PartnerCollects
            var todayVisits = await _context.Visits
                .AsNoTracking()
                .Include(v => v.ReferralPartner)
                .Include(v => v.SecondaryReferralPartner)
                .Include(v => v.Patient)
                .Include(v => v.Orders).ThenInclude(o => o.Test)
                .Where(v => v.BranchId == branchId
                         && (v.TokenDate == today || (v.CreatedAt >= startUtc && v.CreatedAt < endUtc))
                         && v.Status != VisitStatus.Cancelled
                         && v.Status != VisitStatus.Draft
                         && (v.BillingType == BillingType.PrepaidPartner || v.PaymentCollectionModel == "PartnerCollects")
                         && (v.Token == null || !v.Token.StartsWith("D-")))
                .ToListAsync();

            if (!todayVisits.Any())
            {
                return new List<TodayB2BReceivableGroupDto>();
            }

            var visitIds = todayVisits.Select(v => v.VisitId).ToList();

            // 2. Fetch pending (unsettled) ReceivableFacts for these visits
            var facts = await _context.ReceivableFacts
                .AsNoTracking()
                .Where(f => visitIds.Contains(f.SourceVisitId) && f.SettledAt == null && f.AmountReceived < f.Amount)
                .ToListAsync();

            var factMap = facts.GroupBy(f => f.SourceVisitId).ToDictionary(g => g.Key, g => g.First());

            // 3. Group by partner
            var partnerGroups = new Dictionary<Guid, TodayB2BReceivableGroupDto>();

            foreach (var v in todayVisits)
            {
                if (!factMap.TryGetValue(v.VisitId, out var fact))
                {
                    continue; // Either already settled or no fact
                }

                var partner = v.SecondaryReferralPartner ?? v.ReferralPartner;
                var partnerId = v.SecondaryReferralPartnerId ?? v.ReferralPartnerId ?? fact.DebtorId;
                var partnerName = partner?.Name ?? fact.DebtorName ?? "B2B Partner";

                // Exclude system sentinels
                if (string.Equals(partnerName.Trim(), "SELF", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(partnerName.Trim(), "SYSTEM_SELF", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(partnerName.Trim(), "SELF WALK-IN", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(partnerName.Trim(), "DIRECT", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!partnerGroups.TryGetValue(partnerId, out var group))
                {
                    group = new TodayB2BReceivableGroupDto
                    {
                        PartnerId = partnerId,
                        PartnerName = partnerName,
                        ClinicName = partner?.ClinicName,
                        Phone = partner?.ContactInfo,
                        TotalDueToday = 0,
                        TotalVisitsCount = 0,
                        Visits = new List<TodayB2BReceivableVisitDto>()
                    };
                    partnerGroups[partnerId] = group;
                }

                decimal due = Math.Max(0m, fact.Amount - fact.AmountReceived);
                if (due <= 0) continue;

                group.TotalDueToday += due;
                group.TotalVisitsCount += 1;

                var testsSummary = string.Join(", ", v.Orders?.Select(o => o.Test?.TestName).Where(n => !string.IsNullOrEmpty(n)) ?? Array.Empty<string>());
                if (string.IsNullOrEmpty(testsSummary)) testsSummary = "Clinical Diagnostics";

                group.Visits.Add(new TodayB2BReceivableVisitDto
                {
                    VisitId = v.VisitId,
                    ReceivableFactId = fact.ReceivableFactId,
                    Token = v.Token ?? "N/A",
                    PatientName = v.Patient != null ? $"{v.Patient.FirstName} {v.Patient.LastName}".Trim() : "Patient",
                    Age = v.Patient != null && v.Patient.DateOfBirth > DateTime.MinValue
                        ? Math.Max(0, (int)((DateTime.Today - v.Patient.DateOfBirth).TotalDays / 365.25))
                        : 0,
                    Gender = v.Patient?.Gender,
                    TestsSummary = testsSummary,
                    BilledAmount = fact.Amount,
                    AmountDue = due,
                    RegisteredAt = v.CreatedAt
                });
            }

            return partnerGroups.Values
                .Where(g => g.TotalDueToday > 0 && g.Visits.Any())
                .OrderByDescending(g => g.TotalDueToday)
                .ToList();
        }

        public async Task<B2BSettlementReceiptDto> SettleSameDayB2BReceivablesAsync(SettleSameDayB2BRequestDto request, Guid userId, Guid branchId)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            decimal concession = Math.Max(0m, request.ConcessionAmount ?? 0m);
            decimal totalClearance = request.Amount + concession;
            if (request.Amount < 0 || totalClearance <= 0) throw new ArgumentException("Total settlement clearance (payment + concession) must be positive.");
            if (request.FactIds == null || !request.FactIds.Any()) throw new ArgumentException("No receivable fact IDs selected.");

            var today = _labTimeProvider.GetLabToday();
            var tz = _labTimeProvider.GetLabTimeZone();
            var startOfToday = new DateTimeOffset(today, tz.GetUtcOffset(today));
            var endOfToday = startOfToday.AddDays(1);
            var startUtc = startOfToday.UtcDateTime;
            var endUtc = endOfToday.UtcDateTime;

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                // 1. Fetch facts
                var facts = await _context.ReceivableFacts
                    .Where(f => request.FactIds.Contains(f.ReceivableFactId) && f.SettledAt == null)
                    .OrderBy(f => f.OccurredAt)
                    .ToListAsync();

                if (!facts.Any())
                {
                    throw new InvalidOperationException("No open receivable facts found matching the provided IDs.");
                }

                var sourceVisitIds = facts.Select(f => f.SourceVisitId).ToList();
                var visits = await _context.Visits
                    .Include(v => v.Patient)
                    .Include(v => v.Orders).ThenInclude(o => o.Test)
                    .Include(v => v.Invoices)
                    .Where(v => sourceVisitIds.Contains(v.VisitId))
                    .ToListAsync();

                // STRICT SAME-DAY AND BRANCH BOUNDARY CHECK (Zero Heuristic Seepage)
                foreach (var fact in facts)
                {
                    var v = visits.FirstOrDefault(x => x.VisitId == fact.SourceVisitId);
                    bool isToday = (v != null && (v.TokenDate == today || (v.CreatedAt >= startUtc && v.CreatedAt < endUtc)))
                                   || (fact.OccurredAt >= startUtc && fact.OccurredAt < endUtc);

                    if (!isToday || (v != null && v.BranchId != branchId))
                    {
                        throw new UnauthorizedAccessException(
                            "Reception desk is strictly authorized for same-day B2B settlements. " +
                            "Aged receivables (>1 day) must be cleared through Finance Administration."
                        );
                    }
                }

                var partner = await _context.ReferralPartners.FindAsync(request.PartnerId);
                string partnerName = partner?.Name ?? facts.First().DebtorName;
                if (string.IsNullOrEmpty(partnerName)) partnerName = "B2B Partner";

                var user = await _context.Users.FindAsync(userId);
                string cashierName = user?.Name ?? "Reception Staff";

                var receiptNo = $"RCP-B2B-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
                var settledVisitsList = new List<TodayB2BReceivableVisitDto>();

                decimal remainingPayment = request.Amount;
                decimal remainingConcession = concession;

                foreach (var fact in facts)
                {
                    var outstanding = fact.Amount - fact.AmountReceived;
                    if (outstanding <= 0) continue;
                    if (remainingPayment <= 0 && remainingConcession <= 0) break;

                    var v = visits.FirstOrDefault(x => x.VisitId == fact.SourceVisitId);

                    // Allocate payment first, then concession
                    var paymentApply = Math.Min(remainingPayment, outstanding);
                    remainingPayment -= paymentApply;

                    var concessionApply = Math.Min(remainingConcession, outstanding - paymentApply);
                    remainingConcession -= concessionApply;

                    var totalApply = paymentApply + concessionApply;
                    if (totalApply <= 0) continue;

                    fact.AmountReceived += totalApply;
                    if (fact.AmountReceived >= fact.Amount)
                    {
                        fact.SettledAt = DateTimeOffset.UtcNow;
                    }

                    _context.ReceivableFacts.Update(fact);

                    if (v != null)
                    {
                        var invoice = v.Invoices.FirstOrDefault();
                        if (invoice != null)
                        {
                            if (paymentApply > 0)
                            {
                                var payment = new Payment
                                {
                                    PaymentId = Guid.NewGuid(),
                                    InvoiceId = invoice.InvoiceId,
                                    Amount = paymentApply,
                                    Method = request.PaymentMode,
                                    ReceiptNo = receiptNo,
                                    ReceivedAt = DateTime.UtcNow,
                                    ReceivedByUserId = userId
                                };
                                _context.Payments.Add(payment);
                            }

                            if (concessionApply > 0)
                            {
                                invoice.DiscountAmount += concessionApply;
                                invoice.Total = Math.Max(0m, invoice.GrossAmount - invoice.DiscountAmount);
                            }

                            var totalPaid = (invoice.Payments?.Sum(p => p.Amount) ?? 0) + paymentApply;
                            if (totalPaid >= invoice.Total)
                            {
                                invoice.Status = "Paid";
                                v.Status = VisitStatus.Paid;
                            }
                            else
                            {
                                invoice.Status = "PartialPayment";
                                v.Status = VisitStatus.PartialPayment;
                            }
                        }

                        var testsSummary = string.Join(", ", v.Orders?.Select(o => o.Test?.TestName).Where(n => !string.IsNullOrEmpty(n)) ?? Array.Empty<string>());
                        settledVisitsList.Add(new TodayB2BReceivableVisitDto
                        {
                            VisitId = v.VisitId,
                            ReceivableFactId = fact.ReceivableFactId,
                            Token = v.Token ?? "N/A",
                            PatientName = v.Patient != null ? $"{v.Patient.FirstName} {v.Patient.LastName}".Trim() : "Patient",
                            Age = v.Patient != null && v.Patient.DateOfBirth > DateTime.MinValue
                                ? Math.Max(0, (int)((DateTime.Today - v.Patient.DateOfBirth).TotalDays / 365.25))
                                : 0,
                            Gender = v.Patient?.Gender,
                            TestsSummary = testsSummary,
                            BilledAmount = fact.Amount,
                            AmountDue = totalApply,
                            RegisteredAt = v.CreatedAt
                        });
                    }
                }

                // Declare RevenueFact for actual payment received (Truth Engine)
                if (request.Amount > 0)
                {
                    var command = new DeclareRevenueFactCommand
                    {
                        OccurredAt = DateTimeOffset.UtcNow,
                        Amount = request.Amount,
                        Currency = "INR",
                        Direction = RevenueDirection.Inflow,
                        SourceType = RevenueSourceType.Partner,
                        SourceReferenceId = receiptNo,
                        PaymentMode = Enum.TryParse<PaymentMode>(request.PaymentMode, out var pm) ? pm : PaymentMode.Cash,
                        DeclaredByUserId = userId,
                        Notes = $"Reception Same-Day B2B Settlement. Partner: {partnerName} | Payer: {request.ReceivedFrom ?? "Representative"}{(concession > 0 ? $" | Concession: ₹{concession} ({request.ConcessionReason ?? "Waiver"})" : "")} | Notes: {request.Notes ?? "N/A"}"
                    };

                    await _revenueFactWriter.DeclareRevenueFactAsync(command);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Broadcast Live Real-time Sync
                try
                {
                    await _notifier.NotifyReceivablesUpdatedAsync(branchId.ToString(), request.PartnerId);
                    await _notifier.NotifyRealitySummaryUpdateAsync(branchId.ToString());
                }
                catch { }

                return new B2BSettlementReceiptDto
                {
                    ReceiptNo = receiptNo,
                    PartnerId = request.PartnerId,
                    PartnerName = partnerName,
                    ClinicName = partner?.ClinicName,
                    Amount = request.Amount,
                    ConcessionAmount = concession > 0 ? concession : null,
                    ConcessionReason = concession > 0 ? request.ConcessionReason : null,
                    PaymentMode = request.PaymentMode,
                    ReceivedFrom = request.ReceivedFrom,
                    CashierName = cashierName,
                    SettledAt = DateTimeOffset.UtcNow,
                    SettledVisits = settledVisitsList
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
            });
        }

        public async Task<List<TodayB2BSettlementHistoryDto>> GetTodayB2BSettlementsHistoryAsync(Guid branchId)
        {
            var today = _labTimeProvider.GetLabToday();
            var tz = _labTimeProvider.GetLabTimeZone();
            var startOfToday = new DateTimeOffset(today, tz.GetUtcOffset(today));
            var endOfToday = startOfToday.AddDays(1);
            var startUtc = startOfToday.UtcDateTime;
            var endUtc = endOfToday.UtcDateTime;

            var payments = await _context.Payments
                .AsNoTracking()
                .Include(p => p.Invoice).ThenInclude(i => i.Visit).ThenInclude(v => v.ReferralPartner)
                .Include(p => p.Invoice).ThenInclude(i => i.Visit).ThenInclude(v => v.SecondaryReferralPartner)
                .Where(p => p.ReceiptNo != null && p.ReceiptNo.StartsWith("RCP-B2B")
                         && p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc
                         && p.Invoice != null && p.Invoice.Visit != null && p.Invoice.Visit.BranchId == branchId)
                .OrderByDescending(p => p.ReceivedAt)
                .ToListAsync();

            if (!payments.Any())
            {
                return new List<TodayB2BSettlementHistoryDto>();
            }

            var userIds = payments.Select(p => p.ReceivedByUserId).Distinct().ToList();
            var userMap = await _context.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

            var historyGroups = payments
                .GroupBy(p => p.ReceiptNo)
                .Select(g => {
                    var first = g.First();
                    var visit = first.Invoice?.Visit;
                    var partner = visit?.SecondaryReferralPartner ?? visit?.ReferralPartner;
                    var partnerName = partner?.Name ?? "B2B Partner";
                    var tokens = g.Select(x => x.Invoice?.Visit?.Token).Where(t => !string.IsNullOrEmpty(t)).Distinct().ToList()!;

                    return new TodayB2BSettlementHistoryDto
                    {
                        ReceiptNo = g.Key!,
                        PartnerId = partner?.ReferralPartnerId ?? Guid.Empty,
                        PartnerName = partnerName,
                        Amount = g.Sum(x => x.Amount),
                        PaymentMode = first.Method ?? "Cash",
                        ReceivedFrom = null,
                        CashierName = userMap.TryGetValue(first.ReceivedByUserId, out var uname) ? uname : "Reception Staff",
                        SettledAt = first.ReceivedAt,
                        VisitCount = tokens.Count(),
                        PatientTokens = tokens
                    };
                })
                .ToList();

            return historyGroups;
        }
    }
}
