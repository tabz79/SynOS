✦ Execution Plan: Operational Counters Phase 2 (Projection + Live Updates)

This phase activates the Operational Counters by wiring event → projection → push.
No new entities. No engine changes. No frontend work.

1. Implement Projection Handler
   - Create OperationalStatsProjector in SynOS.Services.Operational
   - Input: BranchOperationalEvent
   - Dependencies:
       * SynOSDbContext
       * IUserContext (for UserId where applicable)
       * IHubContext<DashboardHub>
   - Responsibilities:
       1. Begin DB transaction
       2. Check ProcessedProjectionEvent (EventId + "OperationalStats")
           - If exists → return (idempotent)
       3. Switch on BranchEventType
       4. Update:
           - UserOperationalStats (per rules)
           - BranchOperationalStats (per rules)
       5. Insert ProcessedProjectionEvent
       6. Commit transaction

2. Counter Update Rules (STRICT)
   - VISIT_STARTED
       → UserOperationalStats.WalkInsCount += 1
   - PAYMENT_RECEIVED
       → Load Payment by SourceId
       → UserOperationalStats.PaymentsTotal += Payment.Amount
   - SAMPLE_COLLECTED
       → BranchOperationalStats.PendingReportsCount += 1
   - REPORT_SIGNED
       → BranchOperationalStats.PendingReportsCount -= 1
       → Load Report + Sample
       → UserOperationalStats.ReportTatTotalMinutes += (SignedAt - CollectedAt)
       → UserOperationalStats.ReportTatCount += 1

3. SignalR Push
   - After successful commit:
       * Build ReceptionSummaryDto by joining:
           - UserOperationalStats (current user)
           - BranchOperationalStats (current branch)
       * Push FULL SNAPSHOT (not delta) via DashboardHub
           - Clients.User(userId).SendAsync("ReceptionSummaryUpdated", dto)

4. Registration
   - Register OperationalStatsProjector in DI
   - Ensure it is invoked after BranchOperationalEvent is written
     (Application layer, NOT inside Engines)

5. Constraints
   - Engines MUST remain unaware of counters
   - No aggregation queries allowed
   - No frontend inference
   - No polling

Deliverable:
- Live-updating, audit-safe Reception tiles driven purely by backend truth.
