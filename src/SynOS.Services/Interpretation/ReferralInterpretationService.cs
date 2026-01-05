using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs.Referrals;
using SynOS.Models.Entities.AR; // For ReceivableFact
using SynOS.Models.Entities.Payables; // For PayableFact
using SynOS.Models.Entities.Revenue; // For RevenueFact (acting as CashReceiptFact)
using SynOS.Models.Entities; // For ReferralPartner (to filter RevenueFacts)
using Microsoft.Extensions.Logging;


namespace SynOS.Services.Interpretation
{
    public class ReferralInterpretationService : IReferralInterpretationService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ReferralInterpretationService> _logger;

        public ReferralInterpretationService(SynOSDbContext context, ILogger<ReferralInterpretationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // --- Internal-Only Normalized Ledger Event Structure ---
        private enum EntryType
        {
            Debit,  // Increases partner's debt to lab
            Credit  // Decreases partner's debt to lab (or increases lab's debt to partner)
        }

        private class NormalizedLedgerEvent
        {
            public DateTimeOffset OccurredAt { get; init; }
            public decimal Amount { get; init; }
            public EntryType EntryType { get; init; }
            public string Description { get; init; } = string.Empty;
            public Guid SourceFactId { get; init; } // Added for deterministic ordering
        }
        // --- End Internal Structures ---

        public async Task<List<LedgerEntryDto>> GetPartnerStatementAsync(Guid referralPartnerId, DateTimeOffset? startDate, DateTimeOffset? endDate)
        {
            // 1. Get the unified list of normalized events from the private helper
            var allNormalizedEvents = await GetNormalizedEventsAsync(referralPartnerId, startDate, endDate);

            // 2. Sort all events chronologically and deterministically
            allNormalizedEvents.Sort((a, b) => {
                int dateComparison = a.OccurredAt.CompareTo(b.OccurredAt);
                if (dateComparison != 0) return dateComparison;
                return a.SourceFactId.CompareTo(b.SourceFactId); // Secondary sort for deterministic order
            });

            // 3. Generate final LedgerEntryDto list with running balance
            var ledgerStatement = new List<LedgerEntryDto>();
            decimal runningBalance = 0; // Starts at 0, accumulates based on events

            foreach (var normEvent in allNormalizedEvents)
            {
                var debitAmount = normEvent.EntryType == EntryType.Debit ? normEvent.Amount : 0;
                var creditAmount = normEvent.EntryType == EntryType.Credit ? normEvent.Amount : 0;

                // Apply sign convention: Debit increases partner's debt to lab, Credit decreases it.
                runningBalance += (debitAmount - creditAmount);

                ledgerStatement.Add(new LedgerEntryDto
                {
                    EventDate = normEvent.OccurredAt,
                    Description = normEvent.Description,
                    Debit = debitAmount,
                    Credit = creditAmount,
                    RunningBalance = runningBalance
                });
            }

            return ledgerStatement;
        }
        
        public async Task<PartnerFinancialSummaryDto> GetPartnerFinancialSummaryAsync(Guid referralPartnerId)
        {
            // 1. Get the full history of normalized events using the private helper
            var allNormalizedEvents = await GetNormalizedEventsAsync(referralPartnerId, null, null);

            // 2. Aggregate the events into summary metrics
            decimal totalReceivables = 0;
            decimal totalPayables = 0;

            foreach (var normEvent in allNormalizedEvents)
            {
                if (normEvent.EntryType == EntryType.Debit)
                {
                    // Debits represent receivables owed to the lab.
                    totalReceivables += normEvent.Amount;
                }
                else // Credit
                {
                    // Credits represent payables owed by the lab to the partner.
                    totalPayables += normEvent.Amount;
                }
            }

            // 3. Derive Net Position and create the DTO
            // From the lab's perspective: Positive = Partner owes Lab. Negative = Lab owes Partner.
            var netPosition = totalReceivables - totalPayables;

            return new PartnerFinancialSummaryDto
            {
                TotalReceivables = totalReceivables,
                TotalPayables = totalPayables,
                NetPosition = netPosition
            };
        }

        private async Task<List<NormalizedLedgerEvent>> GetNormalizedEventsAsync(Guid referralPartnerId, DateTimeOffset? startDate, DateTimeOffset? endDate)
        {
            var allNormalizedEvents = new List<NormalizedLedgerEvent>();

            // Query and normalize ReceivableFacts (Flow B)
            var receivableQuery = _context.ReceivableFacts.Where(rf => rf.ReferralPartnerId == referralPartnerId);
            if (startDate.HasValue) receivableQuery = receivableQuery.Where(rf => rf.OccurredAt >= startDate.Value);
            if (endDate.HasValue) receivableQuery = receivableQuery.Where(rf => rf.OccurredAt <= endDate.Value);

            var receivableEvents = await receivableQuery
                .Select(rf => new NormalizedLedgerEvent
                {
                    OccurredAt = rf.OccurredAt,
                    Amount = rf.Amount,
                    EntryType = EntryType.Debit,
                    Description = "Receivable Event", // Neutral description
                    SourceFactId = rf.ReceivableFactId // For deterministic ordering
                })
                .ToListAsync();
            allNormalizedEvents.AddRange(receivableEvents);

            // Query and normalize PayableFacts (Flow A)
            var payableQuery = _context.PayableFacts.Where(pf => pf.ReferralPartnerId == referralPartnerId);
            if (startDate.HasValue) payableQuery = payableQuery.Where(pf => pf.OccurredAt >= startDate.Value);
            if (endDate.HasValue) payableQuery = payableQuery.Where(pf => pf.OccurredAt <= endDate.Value);

            var payableEvents = await payableQuery
                .Select(pf => new NormalizedLedgerEvent
                {
                    OccurredAt = pf.OccurredAt,
                    Amount = pf.AmountOwed,
                    EntryType = EntryType.Credit,
                    Description = "Payable Event", // Neutral description
                    SourceFactId = pf.PayableFactId // For deterministic ordering
                })
                .ToListAsync();
            allNormalizedEvents.AddRange(payableEvents);
            
            // RevenueFact and DisbursementFact handling is intentionally omitted for now per the contract.

            return allNormalizedEvents;
        }

        public async Task<SystemReferralExposureDto> GetSystemReferralExposureAsync()
        {
            var partnerIds = await _context.ReferralPartners
                .Select(p => p.ReferralPartnerId)
                .ToListAsync();

            decimal systemTotalReceivables = 0;
            decimal systemTotalPayables = 0;

            foreach (var partnerId in partnerIds)
            {
                var summary = await GetPartnerFinancialSummaryAsync(partnerId);
                systemTotalReceivables += summary.TotalReceivables;
                systemTotalPayables += summary.TotalPayables;
            }

            return new SystemReferralExposureDto
            {
                SystemTotalReceivables = systemTotalReceivables,
                SystemTotalPayables = systemTotalPayables,
                SystemNetPosition = systemTotalReceivables - systemTotalPayables
            };
        }
    }
}
