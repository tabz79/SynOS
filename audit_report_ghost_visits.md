# 🔍 SynOS Backend Forensic Audit Report

## 1️⃣ Confirmed Truths (Evidence-backed)
*   **Activity Stream Source:** Events are written to the `BranchOperationalEvents` table via `OperationalEventWriter` (injected as Scoped).
*   **Write Sequence (Creation):** `VisitService.CreateVisitAsync` calls `_context.SaveChangesAsync()` (persisting Visit) **BEFORE** calling `WriteEventAsync`.
*   **Write Sequence (Payment):** `InvoiceService.RecordPaymentAsync` calls `_context.SaveChangesAsync()` (persisting Payment & Visit Status) **BEFORE** calling `WriteEventAsync`.
*   **Context Scope:** All services (`VisitService`, `InvoiceService`, `OperationalEventWriter`) share the same HTTP-scoped `SynOSDbContext` instance.
*   **Commit Behavior:** `OperationalEventWriter` performs an immediate `await _context.SaveChangesAsync()` by default.

## 2️⃣ Ruled-Out Hypotheses
*   **Hypothesis A (Pre-commit emission):** **FALSE**. Code analysis of `CreateVisitAsync` (L230 vs L243) and `RecordPaymentAsync` (L137 vs L140) confirms explicit commits happen before event emission.
*   **Hypothesis B (Transaction Rollback):** **FALSE**. There is no explicit `TransactionScope` wrapping the Controller-Service interaction. EF Core uses auto-commit. Since `WriteEventAsync` is called *after* the primary `SaveChangesAsync`, a failure during event writing would not roll back the already-committed Visit.
*   **Hypothesis C (Bypass Persistence):** **FALSE**. `CreateVisitAsync` explicitly adds the entity to the `Visits` DbSet and saves.
*   **Hypothesis E (Multiple Contexts):** **FALSE**. `Program.cs` registers `SynOSDbContext` and all relevant services as `Scoped`, ensuring a single shared context per request.

## 3️⃣ Confirmed Root Cause(s)
**"Ghost Visits" (Event exists, Visit missing) are impossible via the audited code paths.** 
Given the robust "Commit-then-Log" pattern:
*   If the Visit commit fails, the Event log is never reached.
*   If the Event log fails, the Visit remains committed.

**Therefore, the observed state implies one of the following External Factors:**
1.  **Data Deletion:** The Visit row was deleted (manually or via a cleanup script) *after* creation, while the Event log was preserved.
2.  **Environment Mismatch:** The user is viewing Activity Stream from one environment/database and SQL querying another.
3.  **Database Reset:** `DbInitializer` or a deployment process wiped the transactional tables (`Visits`) but perhaps not the event log (if effectively partitioned or preserved, though unlikely in same DB).

## 4️⃣ Architectural Violation
*   **None Detected in Persistence Logic:** The implementation strictly adheres to the "State First, Event Second" invariant.
*   **Logging Risk:** `OperationalEventWriter` swallows exceptions (`try/catch`). While this prevents crashing the main flow, it could theoretically hide DB issues during event writing, but this would result in *Missing Events*, not *Missing Visits*.

## 5️⃣ Minimal Fix Direction
*   **Verify Environment:** Ensure Azure Data Studio is connected to the exact same database instance as the running application.
*   **Audit Deletions:** Add a Trigger or Audit Log specifically for `DELETE` operations on the `Visits` table to catch unauthorized removal.
