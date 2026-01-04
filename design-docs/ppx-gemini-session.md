✦ User confirmed. I'll proceed with fixing ReferralInterpretationService. First, I'll read the current implementation. Then, I'll update the internal
  EntryType and SourceFactType enums and the NormalizedLedgerEvent class to include SourceFactId and remove SourceFactType. Next, I'll modify
  GetPartnerStatementAsync to use conditional date filtering, remove RevenueFact queries, normalize PayableFact and ReceivableFact with neutral descriptions  
  and SourceFactId, and implement a two-key sort. Finally, I'll run dotnet build to confirm success.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  ReadFile ReferralInterpretationService.cs                                                                                                               │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ I will modify ReferralInterpretationService.cs. First, I'll adjust internal structures by removing the SourceFactType enum and property, adding SourceFactId
  to NormalizedLedgerEvent. Second, I'll replace the entire GetPartnerStatementAsync method. The new method will use conditional date filtering, omit
  RevenueFact queries, apply neutral descriptions ("Payable Event", "Receivable Event"), include SourceFactId in projections, and sort deterministically by   
  OccurredAt then SourceFactId. I'll execute these changes via two replace calls.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit ReferralInterpretationService.cs:         private enum EntryType... =>         private enum EntryType...                                           │
│                                                                                                                                                            │
│ 32       Credit  // Decreases partner's debt to lab (or increases lab's debt to partner)                                                                   │
│ 33   }                                                                                                                                                     │
│ 34                                                                                                                                                         │
│ 35 - private enum SourceFactType                                                                                                                           │
│ 36 - {                                                                                                                                                     │
│ 37 -     ReceivableFact,                                                                                                                                   │
│ 38 -     PayableFact,                                                                                                                                      │
│ 39 -     RevenueFact, // Used for CashReceiptFact                                                                                                          │
│ 40 -     DisbursementFact // Future compatible                                                                                                             │
│ 41 - }                                                                                                                                                     │
│ 42 -                                                                                                                                                       │
│ 35   private class NormalizedLedgerEvent                                                                                                                   │
│ 36   {                                                                                                                                                     │
│ 37       public DateTimeOffset OccurredAt { get; init; }                                                                                                   │
│ 38       public decimal Amount { get; init; }                                                                                                              │
│ 39       public EntryType EntryType { get; init; }                                                                                                         │
│ 40       public string Description { get; init; } = string.Empty;                                                                                          │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 49 -     public SourceFactType SourceFactType { get; init; }                                                                                               │
│ 41 +     public Guid SourceFactId { get; init; } // Added for deterministic ordering                                                                       │
│ 42   }                                                                                                                                                     │
│ 43   // --- End Internal Structures ---                                                                                                                    │
│ 44                                                                                                                                                         │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Structures updated. Now replacing GetPartnerStatementAsync.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ✓  Edit ReferralInterpretationService.cs:         public async Task<List... =>         public async Task<List...                                           │
│                                                                                                                                                            │
│  45                                                                                                                                                        │
│  46   public async Task<List<LedgerEntryDto>> GetPartnerStatementAsync(Guid referralPartnerId, DateTimeOffset? startDate, DateTimeOffset? endDate)         │
│  47   {                                                                                                                                                    │
│  48 -     // Set default date range if not provided                                                                                                        │
│  49 -     var effectiveStartDate = startDate ?? DateTimeOffset.MinValue;                                                                                   │
│  50 -     var effectiveEndDate = endDate ?? DateTimeOffset.MaxValue;                                                                                       │
│  51 -                                                                                                                                                      │
│  48       var allNormalizedEvents = new List<NormalizedLedgerEvent>();                                                                                     │
│  49                                                                                                                                                        │
│  50       // 1. Query and normalize ReceivableFacts (Flow B)                                                                                               │
│  55 -     var receivableEvents = await _context.ReceivableFacts                                                                                            │
│  56 -         .Where(rf => rf.ReferralPartnerId == referralPartnerId && rf.OccurredAt >= effectiveStartDate && rf.OccurredAt <= effectiveEndDate)          │
│  51 +     var receivableQuery = _context.ReceivableFacts.Where(rf => rf.ReferralPartnerId == referralPartnerId);                                           │
│  52 +     if (startDate.HasValue) receivableQuery = receivableQuery.Where(rf => rf.OccurredAt >= startDate.Value);                                         │
│  53 +     if (endDate.HasValue) receivableQuery = receivableQuery.Where(rf => rf.OccurredAt <= endDate.Value);                                             │
│  54 +                                                                                                                                                      │
│  55 +     var receivableEvents = await receivableQuery                                                                                                     │
│  56           .Select(rf => new NormalizedLedgerEvent                                                                                                      │
│  57           {                                                                                                                                            │
│  58               OccurredAt = rf.OccurredAt,                                                                                                              │
│  59               Amount = rf.Amount,                                                                                                                      │
│  60               EntryType = EntryType.Debit,                                                                                                             │
│  62 -             Description = $"Service Rendered (Visit: {rf.SourceVisitId})", // More descriptive later                                                 │
│  63 -             SourceFactType = SourceFactType.ReceivableFact                                                                                           │
│  61 +             Description = "Receivable Event", // Neutral description                                                                                 │
│  62 +             SourceFactId = rf.ReceivableFactId // For deterministic ordering                                                                         │
│  63           })                                                                                                                                           │
│  64           .ToListAsync();                                                                                                                              │
│  65       allNormalizedEvents.AddRange(receivableEvents);                                                                                                  │
│  66                                                                                                                                                        │
│  67       // 2. Query and normalize PayableFacts (Flow A)                                                                                                  │
│  69 -     var payableEvents = await _context.PayableFacts                                                                                                  │
│  70 -         .Where(pf => pf.ReferralPartnerId == referralPartnerId && pf.OccurredAt >= effectiveStartDate && pf.OccurredAt <= effectiveEndDate)          │
│  68 +     var payableQuery = _context.PayableFacts.Where(pf => pf.ReferralPartnerId == referralPartnerId);                                                 │
│  69 +     if (startDate.HasValue) payableQuery = payableQuery.Where(pf => pf.OccurredAt >= startDate.Value);                                               │
│  70 +     if (endDate.HasValue) payableQuery = payableQuery.Where(pf => pf.OccurredAt <= endDate.Value);                                                   │
│  71 +                                                                                                                                                      │
│  72 +     var payableEvents = await payableQuery                                                                                                           │
│  73           .Select(pf => new NormalizedLedgerEvent                                                                                                      │
│  74           {                                                                                                                                            │
│  75               OccurredAt = pf.OccurredAt,                                                                                                              │
│  76               Amount = pf.AmountOwed,                                                                                                                  │
│  77               EntryType = EntryType.Credit,                                                                                                            │
│  76 -             Description = $"Commission Earned (Source: {pf.SourcePaymentId})", // More descriptive later                                             │
│  77 -             SourceFactType = SourceFactType.PayableFact                                                                                              │
│  78 +             Description = "Payable Event", // Neutral description                                                                                    │
│  79 +             SourceFactId = pf.PayableFactId // For deterministic ordering                                                                            │
│  80           })                                                                                                                                           │
│  81           .ToListAsync();                                                                                                                              │
│  82       allNormalizedEvents.AddRange(payableEvents);                                                                                                     │
│  83                                                                                                                                                        │
│  82 -     // 3. Query and normalize RevenueFacts (Cash Receipts from partner for Flow B)                                                                   │
│  83 -     // RevenueFact is generic, so we need to filter for those attributable to a ReferralPartner.                                                     │
│  84 -     // Assuming RevenueFact has a ReferralPartnerId or equivalent link.                                                                              │
│  85 -     // For now, let's assume it has an ExternalPartyId and ExternalPartyType                                                                         │
│  86 -     // For this implementation, we interpret RevenueFact where ExternalPartyId == ReferralPartnerId as partner cash receipt.                         │
│  87 -     var revenueEvents = await _context.RevenueFacts                                                                                                  │
│  88 -         .Where(revf =>                                                                                                                               │
│  89 -             revf.SourceType == "PartnerPayment" && // Assuming a SourceType for partner payments                                                     │
│  90 -             revf.SourceReferenceId == referralPartnerId.ToString() && // Assuming SourceReferenceId stores ReferralPartnerId                         │
│  91 -             revf.OccurredAt >= effectiveStartDate && revf.OccurredAt <= effectiveEndDate)                                                            │
│  92 -         .Select(revf => new NormalizedLedgerEvent                                                                                                    │
│  93 -         {                                                                                                                                            │
│  94 -             OccurredAt = revf.OccurredAt,                                                                                                            │
│  95 -             Amount = revf.Amount,                                                                                                                    │
│  96 -             EntryType = EntryType.Credit,                                                                                                            │
│  97 -             Description = $"Payment Received (Txn: {revf.ExternalTransactionId})", // More descriptive later                                         │
│  98 -             SourceFactType = SourceFactType.RevenueFact                                                                                              │
│  99 -         })                                                                                                                                           │
│ 100 -         .ToListAsync();                                                                                                                              │
│ 101 -     allNormalizedEvents.AddRange(revenueEvents);                                                                                                     │
│  84 +     // 3. RevenueFact handling removed as per instructions until partner attribution is guaranteed at the truth layer.                               │
│  85 +     // 4. DisbursementFact (future compatible) not included in Phase 1.                                                                              │
│  86                                                                                                                                                        │
│  87 +     // 5. Combine and Sort all events chronologically and deterministically                                                                          │
│  88 +     allNormalizedEvents.Sort((a, b) => {                                                                                                             │
│  89 +         int dateComparison = a.OccurredAt.CompareTo(b.OccurredAt);                                                                                   │
│  90 +         if (dateComparison != 0) return dateComparison;                                                                                              │
│  91 +         return a.SourceFactId.CompareTo(b.SourceFactId); // Secondary sort for deterministic order                                                   │
│  92 +     });                                                                                                                                              │
│  93                                                                                                                                                        │
│ ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ 104 -     // 4. Combine and Sort all events chronologically                                                                                                │
│ 105 -     allNormalizedEvents.Sort((a, b) => a.OccurredAt.CompareTo(b.OccurredAt));                                                                        │
│ 106 -                                                                                                                                                      │
│ 107 -     // 5. Generate final LedgerEntryDto list with running balance                                                                                    │
│  94 +     // 6. Generate final LedgerEntryDto list with running balance                                                                                    │
│  95       var ledgerStatement = new List<LedgerEntryDto>();                                                                                                │
│  96       decimal runningBalance = 0; // Starts at 0, accumulates based on events                                                                          │
│  97                                                                                                                                                        │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ GetPartnerStatementAsync is updated. Time to dotnet build and verify.
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ -  Shell dotnet build [current working directory D:\Projects\SynOS-Synthesized-Lab-Intelligence] (Running dotnet build to verify the changes.)             │
│                                                                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯