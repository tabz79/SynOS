# SynOS Operational Audit & Fix Registry

**Date:** 2026-11-04  
**Branch:** `cloud-testing-2`  
**Reference Video:** `/Users/tabrez/Blip/20261027_160956.mp4`, `export-1793783131438.mp4`

---

## 1. Walk-Ins Metric Inaccuracy & Draft Leakage — [RESOLVED & VERIFIED]
### Audit Findings & Root Causes
1. **Event Projection Premature Trigger:**
   * In `ReceptionFlowService.StartVisitAsync`, `BranchEventType.VISIT_STARTED` is emitted as soon as registration begins.
   * `OperationalStatsProjector.cs` immediately increments `userStats.WalkInsCount` and `branchStats.WalkInsCount`.
   * If a receptionist opens intake to check tests, tests a draft, cancels, or refreshes without collecting payment, `WalkInsCount` is permanently incremented.
2. **Fallback Query Defect in `InvoiceService.cs`:**
   * `_context.Visits.Where(v => v.BranchId == branchId && v.CreatedAt >= startOfToday && v.CreatedAt < endOfToday).CountAsync()` counts all visit rows without filtering `v.Status != VisitStatus.Draft && v.Status != VisitStatus.Cancelled`.
   * Also fails to distinguish Direct Walk-Ins from Corporate B2B Prepaid visits (`v.PaymentCollectionModel == "PartnerCollects"`), double-counting prepaid visits that are already tracked in the dedicated *Prepaid Bills Issued* card.

### Implemented Fix
* Updated `InvoiceService.cs` visits query to enforce:
  ```csharp
  v.Status != VisitStatus.Draft && 
  v.Status != VisitStatus.Cancelled && 
  (v.Token == null || !v.Token.StartsWith("D-")) &&
  v.PaymentCollectionModel != "PartnerCollects" &&
  v.BillingType != BillingType.PrepaidPartner
  ```

---

## 2. Pending Reports Metric Scope (All-Time vs. Today's Cohort) — [RESOLVED & VERIFIED]
### Audit Findings & Root Causes
1. **All-Time Unsigned Query:**
   * In `OperationsEngine.cs` (`GetDailyOperationsStatsAsync`), the query counts all reports where `r.Visit.BranchId == branchId && r.Visit.Status != VisitStatus.Cancelled && r.Status != "Signed" && r.Status != "ManualVerified"` with **no date filter**.
   * It aggregates all unsigned test/draft reports across history.
2. **Draft Visit Leakage:**
   * Does not filter out `r.Visit.Status == VisitStatus.Draft`.

### Implemented Fix
* Scoped today's pending reports cohort in `OperationsEngine.cs`:
  ```csharp
  r.Visit.BranchId == branchId &&
  r.Visit.Status != VisitStatus.Draft &&
  r.Visit.Status != VisitStatus.Cancelled &&
  r.Status != "Signed" &&
  r.Status != "ManualVerified" &&
  r.Visit.CreatedAt >= todayStart &&
  r.Visit.CreatedAt < todayEnd
  ```

---

## 3. Daily Expenses Disconnection & Vanishing Logged Entries — [RESOLVED & VERIFIED]
### Audit Findings & Root Causes
1. **Ephemeral Frontend State:**
   * In `DailyExpensesScreen` (`ExpenseScreens.jsx`), `recentLogs` lacked hydration on mount.
2. **Missing `BranchId` in `SpendFact`:**
   * In `OverheadExpensesController.cs` (`SettleExpense`), `new SpendFact` was writing `BranchId = null`.
3. **Property Mismatch in `ExpenseOverviewTab`:**
   * Calculated via `o.amount` instead of `o.amountDue`.

### Implemented Fix
* `OverheadExpensesController.cs` assigns `spendFact.BranchId = effectiveBranchId` (`_userContext.CurrentBranchId`).
* `DailyExpensesScreen` hydrates today's logs via `loadTodayLogs` from backend truth on mount.
* `ExpenseOverviewTab` safely falls back: `o.amountDue ?? o.amount ?? 0`.

---

## 4. Keyboard Navigation Loop for Multi-Test Intake & Outsource/Financials Trapping — [RESOLVED & VERIFIED]
### User Requirement & Root Causes
* In `VisitDetails.jsx`, pressing `Tab` on `#btn-outsource-test` unconditionally intercepted keydown and searched for `[data-concession-trigger="true"]`, `#input-flat-concession`, `[data-financials-focus="true"]`, and `#btn-settlement-full`.
* In Corporate B2B (Prepaid) mode, none of these 4 elements exist (desk collection is ₹0, concession trigger is hidden, and B2B inputs lacked standard focus IDs).
* Focus was permanently swallowed and trapped on `#btn-outsource-test` (as demonstrated in `export-1793783131438.mp4`).
* Entering multiple tests in sequence required manual mouse clicks or tabbing through all test remove buttons.

### Implemented Fix
1. **Continuous Test Entry Loop:**
   * In `handleAddTest`, on test selection (Enter or click), search query `filter` is instantly reset to `""` and `testSearchInputRef.current?.focus()` is refocused immediately, allowing seamless back-to-back test entry (`CBP` -> Enter -> `LFT` -> Enter).
2. **Non-Blocking Forward Tab Navigation:**
   * Pressing `Tab` with an empty search query smoothly jumps to `#btn-outsource-test` (or directly into Financials).
   * Centralized `findFirstFinancialsTarget()` resolves across all modes:
     - Standard: `[data-concession-trigger="true"]`, `#input-flat-concession`, `#btn-settlement-full`
     - Corporate B2B: `#input-b2b-discount`, `#input-b2b-doctor-search`, `#btn-unified-action`
     - Insurance & Fallback: `#synos-financials-container` active inputs/buttons, `#btn-unified-action`
   * Only calls `e.preventDefault()` if a valid focus target is found, preventing browser focus traps.
3. **Visual Separation of 'Billed to Doctor':**
   * Carved out "Billed to Doctor" from "Doctor Discount & Rate" into a standalone card.
   * Displays clear status ("Default: Prescribing Doctor" with active ledger indicator vs. "Overruled" with revert button).
   * Eliminates receptionist confusion about needing to re-enter the prescribing doctor.

---

## 5. Keyboard Tab Focus Ring & Card Backlight Styling — [RESOLVED & VERIFIED]
### Audit Findings & Aesthetic Fix
* Enhanced `.synos-focus-btn`, `.synos-focus-input`, and `.synos-focus-card` in `index.css`:
  - Ambient indigo bloom with elevation lift (`box-shadow: 0 12px 28px -4px rgba(79, 70, 229, 0.16)`).
  - High-contrast, non-glaring focus rings (`focus-visible:ring-2 focus-visible:ring-synos-primary/60 focus-visible:ring-offset-2`).
  - Added `synos-focus-btn` and `synos-focus-input` to B2B discount, doctor search, outsource test, and modal submit buttons.

---

## 6. Duplicate Key Collision on `Payments.ReceiptNo` (`SYS-{Token}`) — [RESOLVED & VERIFIED]
### Severity: High / Crash (HTTP 500 `DbUpdateException`)
### Incident & Evidence
* When submitting `/api/v1/reception/visit/mark-prepaid` or batch-editing visits, EF Core crashed with:
  `Cannot insert duplicate key row in object 'dbo.Payments' with unique index 'IX_Payments_ReceiptNo'`.
* Root cause: `ReceiptNo = $"SYS-{visit.Token}"` lacked date stamps and collision handling. When visit tokens cycled daily (`MAI-001`, `MAI-002`...), re-using a token from a previous day crashed SQL Server.

### Implemented Fix
* Added `GenerateUniqueReceiptNoAsync(string prefix, string? token)` in `VisitService.cs`:
  - Date-stamped base format: `$"SYS-{DateTime.UtcNow:yyyyMMdd}-{cleanToken}"`
  - Loop verification against `_context.Payments` to safely append adjustment counter suffixes (`-2`, `-3`) on repeat operations.
  - Replaced hardcoded un-scoped receipt strings across all prepaid, batch-edit, and refund payment generations.

