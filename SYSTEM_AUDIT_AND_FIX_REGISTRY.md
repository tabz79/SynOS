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

---

## 7. User-Specific Collections & Cashier Breakdown in Collection History — [RESOLVED & VERIFIED]
### User Requirement & Root Causes
* **Oversight Gap:** In multi-receptionist setups (e.g. Uzma, Ramesh, Dr. Vasudeva Rao), the Lab Owner and Admin had no breakdown of collections by cashier in Collection History (`/finance/revenue/history`).
* **Missing Receipt Linkage for Same-Day Settlements:** Same-day B2B receivable settlements generate receipt numbers (e.g. `RCP-B2B-...`). `EconomicsIntelligenceService.cs` only attempted `Guid.TryParse`, failing to match string receipts to `Payment` entities and rendering them as generic `COUNTER-RCPT` without cashier association.
* **Lack of Filter & Identification:** The ledger table lacked cashier attribution, and there was no way to filter or view an individual receptionist's drawer collections, patient bills, and counter settlements.

### Implemented Fix
1. **Backend Enrichment (`EconomicsIntelligenceService.cs` & `EconomicsController.cs`):**
   * Extracted string receipt candidates (`f.SourceReferenceId`, `f.ExternalTransactionId`) alongside GUIDs.
   * Batch loaded `Payments` by `ReceiptNo` (`paymentsByReceiptMap`), resolving invoice, visit, patient, branch, and cashier for all settlements.
   * Batch loaded `Users` by all declared and received user IDs (`f.DeclaredByUserId`, `payment.ReceivedByUserId`, `visit.CreatedByUserId`, `visit.AssignedReceptionistId`).
   * Projected `CashierId`, `CashierName`, `CashierRole`, and `CollectedBy` on each returned revenue fact.
   * Added optional `userId` parameter to `GetRevenueFacts` endpoint and service for backend filtering.
2. **Staff Cash Drawer Breakdown Strip (`RevenueScreens.jsx`):**
   * Added interactive Cashier Summary cards above the table showing each staff member's total intake, receipt count, cash, and digital breakdown.
   * Clicking any cashier card instantly filters the ledger to that staff member with an active ring indicator; includes an "All Staff" reset toggle.
3. **Dynamic Multi-Dimensional Filter Bar (`FinanceFilterBar.jsx`):**
   * Added Cashier/Staff dropdown selector (`staffFilter`, `onStaffChange`, `staffOptions`) with staff intake totals.
   * Dynamically updates top KPI cards (Total Collections, Cash, Digital/UPI, Bank/Card) to reflect the active cashier's receipts and amounts.
4. **Dedicated 'COLLECTED BY' Table Column & Export/Print:**
   * Added `COLLECTED BY` column with staff avatar pill, display name, and clinical/administrative role.
   * Updated CSV download to export `Collected By (Staff)` and `Staff Role`.
   * Updated A4 printable financial summary modal to include cashier filter tags and staff column.

---

## 8. Enterprise Due Settlement, Three-Way Terms, Secondary Owner Concessions & Due Bills Audit — [RESOLVED & VERIFIED]
### Audit Findings & Root Causes
1. **Binary Settlement Terms:** The intake screen only offered `Full` or `Partial Due`. In clinical practice, patients often pay ₹0 at the counter (100% credit / Full Due), needing the entire bill booked as Outstanding Due without locking the visit or recording false payments.
2. **Hardcoded ₹0 in Post-Processing Print Dispatch:** In `IntentPanel.jsx`, the Print Dispatch screen displayed hardcoded `Balance Due: ₹0 (Fully Settled)` and hardcoded `PAID` / `Billed & Settled` badges even when only a partial payment was received (e.g. ₹100 of ₹400).
3. **Due Bills Tab Leakage (`FinanceBillsController.cs`):** `GetDueBills` queried `.Where(x => x.TotalPaid > 0 && x.BalanceDue > 0)`, which silently suppressed and hid Full Due visits where `TotalPaid == 0`.
4. **Missing Secondary Concession Card for Resumed Due Visits:** When patients returned with an outstanding balance (e.g. ₹300) and met the Lab Owner or Chief Pathologist for a courtesy concession or write-off, there was no dedicated secondary concession card to record an authorized discretionary reduction against remaining dues.
5. **Missing Visit Correction for Active Due Visits:** Active due visits in `Resume Visit` lacked the `[Visit Correction]` action button in the footer bar, preventing receptionists from adding/removing tests or amending financials.

### Implemented Fix
1. **Three-Way Settlement Terms (`BillingSummary.jsx` & `IntentPanel.jsx`):**
   * Added segmented 3-mode control: `Full (₹{net})`, `Partial Due`, and `Full Due`.
   * When `Full Due` is selected (`customPaymentAmount === '0'`), renders an amber counter-credit notice and hides cashier method inputs.
   * Action button reflects: `Confirm Visit (Full Due ₹{due}) ->` and calls `ReceptionApi.collectPayment(visitId, 0, 'Unpaid / Credit')`.
2. **Backend Full Due Registration (`ReceptionFlowService.cs`):**
   * When `request.Amount <= 0 && existingInvoice.Total > 0`, safely sets `Invoice.Status = "PendingPayment"` and `Visit.Status = VisitStatus.PendingPayment`.
   * Skips adding false `PaymentConfirmedFact` records for zero-rupee amounts while generating official daily tokens (`MAI-xxx`) and creating lab test accession items.
3. **Dynamic Balance Due & True Settlement State in Print Dispatch (`IntentPanel.jsx`):**
   * Dynamically calculates `actualBalanceDue = Math.max(0, postNet - postPaid)`.
   * Replaced hardcoded `Balance Due: ₹0` with dynamic live amount (`Balance Due: ₹{actualBalanceDue}`).
   * Rendered dynamic badges: `Billed (Full Due)`, `Billed (Partial Due)`, or `Billed & Settled`.
4. **Secondary Concession & Owner Write-Off Card (`BillingSummary.jsx` & `VisitService.cs`):**
   * Added dedicated card on active due visits allowing `Flat (₹)` or `% of Due` adjustments with quick chips (`Full Write-Off`, `50%`, `₹100 Off`).
   * Enforced mandatory authorization presets: *Lab Owner Discretionary Concession*, *Chief Pathologist Courtesy*, *Indigent Patient Full Write-off*, etc.
   * In `VisitService.cs`, permitted authorized owner concessions/write-offs even after sample collection.
5. **Visit Correction Integration for Active Due Visits (`IntentPanel.jsx`):**
   * Added `[Visit Correction]` button directly to the bottom action bar on non-finalized active due visits, enabling instant transition to amendment mode.
6. **Due Bills Ledger Audit Parity (`FinanceBillsController.cs` & `RevenueScreens.jsx`):**
   * Relaxed `GetDueBills` filter to `.Where(x => x.BalanceDue > 0)`, returning `Status = x.TotalPaid > 0 ? "Partial" : "Pending"`.
   * Updated `DueBillsScreen` filter tabs and table to expose both `Partial Due` and `Full Due (Unpaid)` with distinctive visual status pills.

---

## 9. Post-Payment Concession Lock, Secondary Owner Concession Drawer Default & Universal Visit Correction — [RESOLVED & VERIFIED]
### Audit Findings & Root Causes
1. **Accidental Due Balance Inflation via Discount Deletion:** When a visit had already received partial desk collection (`TotalPaid > 0`), the UI still displayed a delete `(x)` button beside the initial registration concession (e.g. `Shakeel Test - ₹100`). Clicking `(x)` deleted the discount from the database, inflating the gross/net bill from ₹400 to ₹500 and causing remaining dues to jump from ₹300 to ₹400.
2. **Secondary Concession Drawer Default Visibility:** For returning patients with an active due balance (`remainingDue > 0`), the secondary concession card was collapsed by default (`isSecondaryExpanded = false`), obscuring the owner concession/write-off capabilities from receptionists.
3. **Visit Correction Accessibility on Active Visits:** The `[Visit Correction]` action was only visible in the bottom bar on certain screens, leaving receptionists uncertain how to amend an active due visit without cancelling it.

### Implemented Fix
1. **Initial Registration Concession Lock (`BillingSummary.jsx` & `VisitService.cs`):**
   * In `BillingSummary.jsx`, conditioned the `(x)` discount deletion button on `totalPaid === 0`. When `totalPaid > 0`, the `(x)` is replaced by an `Initial Concession` badge, completely preventing accidental discount deletion and due inflation.
   * In `VisitService.cs` (`RemoveDiscountFromVisitAsync`), added a hard backend safeguard that verifies if `Payments` or `PartialPayments` with `Amount > 0` exist on the invoice; if so, rejects deletion with an `InvalidOperationException` advising the user to use Visit Correction or Secondary Concession.
2. **Expanded-by-Default Secondary Concession & Write-off (`BillingSummary.jsx`):**
   * Initialized `isSecondaryExpanded = true` so the card is open and visible whenever `!isDraftVisit && remainingDue > 0 && canPerformActions`.
   * Provides immediate 1-click `Full Write-Off`, `50%`, `₹100 Off`, or custom ₹/% reductions with authorized management/owner preset reasons.
3. **Dual Placement of `[Visit Correction]` (`IntentPanel.jsx`):**
   * Added `[Visit Correction]` directly into the top header next to the token `#MAI-xxx`, as well as maintaining the bottom action bar button next to `[Cancel Visit]`.
   * Allows receptionists to seamlessly enter the audited correction drawer for any active visit with a single click.
4. **Production Bundle Build & Asset Sync:**
   * Rebuilt frontend bundle (`index-CA6NwEHb.js`), synced to `src/SynOS.Api/wwwroot/assets/`, purged stale hashes.



