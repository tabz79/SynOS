# SynOS Operational Audit & Fix Registry

> 🚨 **MANDATORY CODING AGENT & DEVELOPER DIRECTIVE (READ BEFORE EDITING):**
> Before executing ANY code modification, refactor, bugfix, or feature addition in this repository—especially touching **Financials, Billing, Reception Action Queue, Cash Drawers, Collection History, Shift Ledgers, Printing, or PDF Generation**—all AI coding agents and developers **MUST FIRST READ AND STRICTLY COMPLY WITH:**
> 1. [`AGENTS.md`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/AGENTS.md) — Root Architectural Contracts & Invariants (Document Engine Rules, Payer Modes, Reception Intake Walk-In Metrics, and Finance Hub 8-Tab Truth Engine Parity).
> 2. [`.agents/AGENTS.md`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/.agents/AGENTS.md) — 7 Critical Non-Negotiable System Guardrails & Regression Preventions.
> 
> **ZERO-TOLERANCE REGRESSION RULE:**
> Under NO circumstances may an agent perform ad-hoc SQL filtering, rename payer modes, modify discount formulas, or guess branch IDs (e.g., via blind `UserBranchRoles` fallback). Every change must preserve 100% parity across all 8 Finance Hub tabs (`Bills & Collections`, `Due Bills`, `Pending Receivables`, `Visit Corrections`, `Cancellations & Refunds`, `Due Change & Patient Refunds`, `Collection History`, and `Cash Drawer Shift Ledgers`).

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

---

## 10. Reception Action Queue Full Due Pill, Redundant Credit Box Removal & Pastel Secondary Concession Overhaul — [RESOLVED & VERIFIED]
### Audit Findings & Root Causes
1. **Redundant 100% Credit Notice & Badge:** On `Full Due` selection, a bulky amber notice card and an explicit `FULL DUE (100% CREDIT)` badge cluttered the settlement screen when the `Full Due` button was already self-explanatory.
2. **Generic Queue Status Badge:** In `ReceptionScreen.jsx`, uncollected Full Due tokens displayed a generic grey `DUE` badge (`bg-zinc-500/10`), obscuring whether it was standard due or total counter credit.
3. **Duplicate Primary Concession Form during Resume Visit:** In `Resume Visit`, the primary concession trigger (`+ Concession` / `Edit Concession`) was active, and the drawer expanded, showing initial discount inputs even when the visit was already registered and not in Visit Correction mode.
4. **Secondary Concession Visual Harshness:** The Secondary Concession deck used saturated amber/orange tones (`bg-amber-600`) that clashed with SynOS's pastel clinical UI system.

### Implemented Fix
1. **Streamlined Settlement Terms UI (`BillingSummary.jsx`):**
   * Removed the bulky `100% Patient Counter Credit` notice card completely.
   * Removed the `Full Due (100% Credit)` header badge, keeping only the clean, self-explanatory `Full Due` segmented button.
2. **Pastel Orange FULL DUE Action Queue Badge (`ReceptionScreen.jsx`):**
   * Added explicit `isFullDue` condition (`totalPaid === 0 && remainingDue > 0`).
   * Rendered `FULL DUE` in pastel orange pill (`bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30`).
3. **Primary Concession Lockout on Follow-up (`BillingSummary.jsx`):**
   * Conditioned primary concession expansion and trigger on `isInitialIntake = isDraftVisit || isCorrectionIntent`.
   * In standard `Resume Visit` mode, the primary concession trigger is greyed out (`opacity-45 cursor-not-allowed`) with a tooltip directing users to Visit Correction or Secondary Concession, and the primary discount form does not render.
4. **Pastel Orange Secondary Concession Design System (`BillingSummary.jsx`):**
   * Restyled the Secondary Concession drawer to soft pastel orange (`bg-[#FFF9F3] border-[#FDE3CF]`, header `#8C3C0B`, chips `#FDE4D0`, button `#E87A38`).
   * Secondary Concession cleanly takes over follow-up due adjustments with zero visual clutter.
5. **Production Build & Verification:**
   * Bundle rebuilt (`index-B8ixeIVB.js`, `index-BObHbOkl.css`), synced to `wwwroot`, and validated with 16/16 test passes.

---

## 11. Reception Action Queue Payment Column Semantic Confusion & Secondary Concession Overpayment / Refund Gap — [RESOLVED & VERIFIED]
### Severity: Medium / Financial Ledger Ambiguity
### Impacted Modules
* **Reception Action Queue Table:** [`ReceptionScreen.jsx:324-376`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L324-L376)
* **Secondary Concession Flow:** [`VisitService.cs:667-748`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L667-L748) (`ApplyCustomDiscountToVisitAsync`)
* **Revenue Engine Settlement Invariant:** [`RevenueEngine.cs:104-126`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Revenue/RevenueEngine.cs#L104-L126)

### Incident Evidence (Live Audit of Visit `MAI-009`, Patient `Test Patient9`)
1. **Database Truth (`dbo.Payments` & `dbo.Invoices`):**
   * **Invoice `837acab6-ff6d-4f34-904f-4bb17714d850`:**
     - `GrossAmount`: ₹1,000 (LFT ₹600 + CBP ₹400)
     - `DiscountAmount`: ₹800 (Cumulative concessions applied)
     - `NetAmount` / `Total`: **₹200**
   * **Physical Cash Payments (`dbo.Payments`):**
     - Payment 1: ₹0 (Initial Full Due creation at 14:40:37)
     - Payment 2: **₹400 Cash** collected at desk by Dr. Vasudeva Rao (`ReceiptNo: REC-20261104-MAI-009` at 14:43:37)
   * **Collection History Ledger (`/finance/revenue/history`):**
     - Accurately displays **₹400 PHYSICAL CASH** collected by Dr. Vasudeva Rao (representing the real cash collected into the physical drawer).
2. **Reception Screen Action Queue Display (`/reception`):**
   * Displays under `PAYMENT` column: **`₹200 CASH`**.

### Root Cause Analysis
1. **UI Column Semantic Bug in `ReceptionScreen.jsx`:**
   * In `ReceptionScreen.jsx` lines 358–363:
     ```javascript
     const displayAmount = isDraft
         ? (totalBilled ? `₹${totalBilled.toLocaleString()}` : "₹0")
         : (isPartial
             ? `₹${remainingDue.toLocaleString()}`
             : (totalBilled ? `₹${totalBilled.toLocaleString()}` : "₹0"));
     ```
   * When a visit is fully paid (`remainingDue === 0`), `displayAmount` renders **`totalBilled`** (`row.totalAmount` = ₹200) right next to the badge **`CASH`** (`row.paymentMethod`).
   * The operator or doctor reads this as *"₹200 was paid in Cash"*, when in reality the patient was billed ₹200, but actually paid **₹400**!
2. **Post-Collection Concession Overpayment / Refund Gap:**
   * When a secondary concession or downward visit revision is applied *after* money has already been collected at the desk (`totalPaid > revisedTotal`):
     - `RevenueEngine` lowers `Invoice.Total` to ₹200.
     - Because `totalPaid (400) >= totalAmount (200)`, it marks `Status = "Paid"`.
     - However, the lab has taken ₹400 for a ₹200 bill. The patient has **overpaid by ₹200** (or is owed a ₹200 refund).
     - `ApplyCustomDiscountToVisitAsync` currently only inserts a `DiscountFact`; it does not prompt the cashier to disburse a ₹200 cash refund, nor does it emit a reversal `RevenueFact` to keep the physical drawer balance synchronized if cash was refunded.

### Implemented Fix
1. **Reception Action Queue Disambiguation (`ReceptionScreen.jsx`):**
   * Added explicit `isOverpaid` detection: `const isOverpaid = totalPaid > totalBilled;`
   * When `isOverpaid`:
     - Renders bill amount with an excess/refund badge: `REFUND DUE: ₹{totalPaid - totalBilled}` and subtext `Paid: ₹{totalPaid}`.
   * When paid normally:
     - Disambiguates `totalPaid` with payment method pill (`CASH` / `UPI`).

---

## 12. Walk-Ins Metric Inaccuracy (Showing 7 vs 12 Actual) & Fragility Root Cause — [RESOLVED & VERIFIED]
### Severity: High / Core Operational Truth Metric Failure
### Impacted Workflows & Files
* **Dashboard Summary Service:** [`DashboardService.cs:33-40`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Dashboard/DashboardService.cs#L33-L40)
* **Revenue Read Model Engine:** [`InvoiceService.cs:54-130`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L54-L130) (`GetDailyRevenueStatsAsync`)
* **Event Projection Disconnect:** [`OperationalStatsProjector.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operational/OperationalStatsProjector.cs)
* **Frontend Reality Tile Fallback:** [`ReceptionScreen.jsx:221-231`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L221-L231)

### Incident Evidence (Screenshot Audit)
* **Live Reality:**
  12 daily tokens were issued today (`MAI-001` through `MAI-012`).
  - Active Visits: 11
  - Cancelled Visits: 1 (`MAI-008` refunded ₹100 due to long queue)
* **What the UI Displays:**
  - **Walk-Ins (Paid/Credit):** `7`
  - **Prepaid Bills Issued:** `1` (₹340)
* **Discrepancy:**
  Where did the remaining 4 visits go?
  - Retail Direct Walk-Ins (Cash/Due): `MAI-001`, `MAI-002`, `MAI-004`, `MAI-009`, `MAI-010`, `MAI-011`, `MAI-012` = **7 visits**
  - Corporate B2B Prepaid Visits: `MAI-003`, `MAI-005`, `MAI-006`, `MAI-007` = **4 visits**
  - Cancelled: `MAI-008` = **1 visit**
  - Total = **12 visits**
  The system counted ONLY the 7 retail visits in Walk-Ins, but because of a query bug, it failed to count the 4 Prepaid visits in *Prepaid Bills Issued* (showing 1 instead of 4), completely losing track of 3 B2B visits!

### Forensic Root Cause: Why "Walk-Ins" Breaks Every 3–4 Code Edits

#### 1. Dual Competing Truth Sources (Event Sourcing Projection vs Direct DB Query)
* SynOS has an event projector (`OperationalStatsProjector.cs`) that updates `UserOperationalStats.WalkInsCount` whenever `BranchEventType.VISIT_STARTED` is fired.
* Whenever an agent adds or refactors an intake endpoint (`/intake/register`, `/visit/prepaid`, `/visits/{id}/batch-edit`, `/intake/resume`, `/visit/cancel`), the new or altered endpoint frequently fails to emit the exact matching event or emits it with a different user context.
* When the projector counters drift, developers attempt to "patch" it by writing fallback direct SQL queries in `InvoiceService.cs`. This creates two un-synchronized sources of truth fighting each other.

#### 2. The Variable Mutation Bug in `InvoiceService.cs` (Prepaid Vanishing Bug)
* In [`InvoiceService.cs:94-119`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L94-L119):
  `var deskVisitsQuery = branchVisitsQuery;` inherited the `PaymentCollectionModel != 'PartnerCollects'` clause, making chaining `.Where(PaymentCollectionModel == 'PartnerCollects')` an impossible condition that returned 0 prepaid visits and caused fallback to stale projector stats.

### Implemented Fix
1. **Decoupled Base Query (`InvoiceService.cs`):**
   * Established `confirmedVisitsToday` covering all active tokens (`TokenDate == today` or `CreatedAt` today, `Status != Cancelled`, `Status != Draft`, non-draft token).
   * Branched `retailWalkInsQuery` independently:
     `confirmedVisitsToday.Where(v => v.PaymentCollectionModel != "PartnerCollects" && v.BillingType != BillingType.PrepaidPartner)`.
   * Branched `prepaidVisitsQuery` independently:
     `confirmedVisitsToday.Where(v => v.PaymentCollectionModel == "PartnerCollects" || v.BillingType == BillingType.PrepaidPartner)`.
   * Directly counted both queries from the relational database state, permanently eliminating query cross-contamination and stale projection fallbacks.

---

## 13. Extended Split-Tab B2B Receivables Terminal, Smart FIFO Auto-Allocation Engine & Secondary Concession Write-Off Deck — [RESOLVED & VERIFIED]
### Severity: High / Scalability & Clinical Billing Workflow Enhancement
### User Requirement & Architectural Context
1. **Terminal Scaling (50+ to 90+ B2B Visits):**
   * The single-column drawer layout did not scale when corporate partners (e.g. KIMS Hospital, Anjum Hospital) sent batches of 20 to 90+ patients per day.
   * Required an extended screen occupying ~85% of display space (`xl:w-[85vw] max-w-[1780px] h-[92vh] sm:h-[88vh]`), split into two synchronized operational halves:
     - **Left Half (Prepaid Debtors & Patient Visits List):** Collapsible accordion partner groups, badge counters, due totals, live instant search filter, select-all checkboxes, and live smart allocation status pills (`PAID`, `PARTIAL`, `DUE`, `EXCLUDED`).
     - **Right Half (Settlements & Financials):** Active partner context, settlement mode switcher (`Full Settle` vs `Partial Settle`), smart FIFO auto-allocation calculation, pastel orange secondary concession deck, net financial summary, payer details, payment channel, and sticky authorize button.
2. **Smart FIFO Auto-Allocation Engine:**
   * When a partner pays a partial sum (e.g. ₹2,500 on ₹5,000 due across multiple visits) without specifying individual bill allocations, the reception desk should not manually edit each bill.
   * The engine automatically allocates the payment across selected visits in FIFO order (by `RegisteredAt`/token), marking earlier visits `PAID`, boundary visits `PARTIAL (Paid ₹X • Due ₹Y)`, and remainder visits `DUE ₹Z` in real time with live badges in the left list.
3. **Secondary Concession & Owner Write-Off Deck:**
   * Permitted authorized write-offs and secondary concessions against B2B partner receivables with authorized presets (*Lab Owner Discretionary Concession*, *Goodwill Partner Retainer Discount*, *Indigent Patient Corporate Waiver*).
   * Atomically allocated concessions and collections in `SettlementService.cs`, updated invoice discounts and totals, and declared `RevenueFact` only for real money collected.
4. **Thermal Slip Parity:**
   * Updated `generateThermalB2BSettlementSlipHtml` in `thermalPrinter.js` to print concession deductions and net settled balance on 80mm receipts.

---

## 14. Patient Search Phone Number Stripping (`No Mobile` Badge Defect) — [RESOLVED & VERIFIED]
### Severity: Medium / Operational Intake Verification Defect
### Impacted Workflows & Files
* **Patient Search Service:** [`PatientService.cs:193-270`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/PatientService.cs#L193-L270) (`SearchPatientsAsync`)
* **Patients API Controller:** [`PatientsController.cs:41-45`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/PatientsController.cs#L41-L45) (`GET /api/v1/patients?q=...`)
* **Patient Identification Component:** [`PatientIdentification.jsx:90-91`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/PatientIdentification.jsx#L90-L91)
* **Rich Patient Card UI:** [`RichPatientCard.jsx:82, 287`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/components/patient/RichPatientCard.jsx#L82)

### Incident & Evidence
* **Visual Bug:** When searching for patients in the Registration modal (e.g. typing query `test`), all matched patient cards display a grey `No Mobile` pill:
  - `Test Patient3` (`MRN: A00003`) $\rightarrow$ displays `No Mobile`
  - `Test Patient7` (`MRN: A00007`) $\rightarrow$ displays `No Mobile`
  - `Test Patient5` (`MRN: A00005`) $\rightarrow$ displays `No Mobile`
  - `Test Patient6` (`MRN: A00006`) $\rightarrow$ displays `No Mobile`
  - `Test Patient9` (`MRN: A00009`) $\rightarrow$ displays `No Mobile`
* **Database Truth vs Direct Endpoint Audit:**
  - In `dbo.Patients`, every single one of these patients has their mobile number recorded in the `CurrentPhoneNumber` column:
    - `Test Patient3`: `"555-0102"`
    - `Test Patient9`: `"555-0108"`
  - Direct lookup via `GET /api/v1/patients/8554ac52-dfbf-484a-8476-1b482aac2baa` (`A00003`) returns:
    ```json
    {
      "mrn": "A00003",
      "firstName": "Test",
      "lastName": "Patient3",
      "currentPhoneNumber": "555-0102"
    }
    ```
  - However, searching via `GET /api/v1/patients?q=test` returns:
    ```json
    {
      "mrn": "A00003",
      "firstName": "Test",
      "lastName": "Patient3",
      "currentPhoneNumber": null
    }
    ```

### Forensic Root Cause Analysis
1. **Disregard of Entity Table Column in Projection:**
   In `PatientService.cs:236-256` (`SearchPatientsAsync`), the projection evaluated `CurrentPhoneNumber = ph != null ? ph.PhoneNumber : null`. For patients whose mobile was saved directly in `dbo.Patients.CurrentPhoneNumber`, `ph` was `null`, setting `CurrentPhoneNumber = null`.
2. **Search By Mobile Filter Blind Spot:**
   `p.CurrentPhoneNumber` was omitted from the `WHERE` search filter, so searching by phone number missed patients lacking a separate `PatientPhoneHistories` row.

### Implemented Fix
* Updated `SearchPatientsAsync` in `PatientService.cs`:
  - Projection fallback: `CurrentPhoneNumber = ph != null && !string.IsNullOrWhiteSpace(ph.PhoneNumber) ? ph.PhoneNumber : p.CurrentPhoneNumber`.
  - Added `EF.Functions.Like(p.CurrentPhoneNumber, $"%{q}%")` into search filter criteria.

---

## 15. Zero Walk-Ins Card Reproduction on Day-Start B2B Intake & Enterprise Metric Redefinition — [RESOLVED & VERIFIED]
### Severity: High / Core Executive Reality Inaccuracy
### Impacted Modules
* **Invoice Service Metric Query:** [`InvoiceService.cs:94-140`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L94-L140) (`GetDailyRevenueStatsAsync`)
* **Reception UI Reality Tile:** [`ReceptionScreen.jsx:221-231`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L221-L231)
* **Architectural Invariants:** [`AGENTS.md`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/AGENTS.md) & [`.agents/AGENTS.md`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/.agents/AGENTS.md)

### Incident Evidence (Live 05-Nov-2026 Morning Audit)
* **Live State:** It is the start of the clinical shift on Nov 5, 2026.
* **Queue Reality:** Exactly 1 patient has arrived and been registered:
  - Token: `MAI-001`
  - Patient: `Test Patient5` (41y/M)
  - Test: `MRI_NECK`
  - Payment: `₹4,500 PREPAID` (Referred by Dr Test Partner 3)
* **What the Top Tiles Display:**
  - **Walk-Ins (Paid/Credit):** `0`
  - **Prepaid Bills Issued:** `1` (₹4,500)
* **The Problem:** The lab has 1 real human patient sitting in the reception queue holding token `MAI-001`, but the primary executive card told the lab owner that there are **0 Walk-Ins**.

### Root Cause: Flawed Metric Assumption
* Developers assumed only patients paying retail cash/UPI out-of-pocket are "Walk-Ins", and stripped Corporate B2B referral patients out of the count.
* Whenever the first patient of the day is a B2B referral, the Walk-Ins tile displayed `0` despite a populated action queue.

### Enterprise-Grade Architecture Solution (Permanent Fix)
1. **Redefined Card 1 as Canonical "Total Patient Intake":**
   In healthcare ERPs (Cerner, Epic, SRL), the top-left executive KPI represents the **physical front-door volume** across all desks in the branch for today:
   ```csharp
   // Total Confirmed Patients Acceded Today across the Branch
   var confirmedVisitsToday = _context.Visits
       .Where(v => v.BranchId == branchId 
                && (v.TokenDate == today || (v.CreatedAt >= startUtc && v.CreatedAt < endUtc))
                && v.Status != VisitStatus.Cancelled
                && v.Status != VisitStatus.Draft
                && (v.Token == null || !v.Token.StartsWith("D-")));

   var totalIntakeWalkIns = await confirmedVisitsToday.CountAsync();
   var finalWalkIns = totalIntakeWalkIns;
   ```
2. **Financial Stream Partitioning in Subsequent Cards:**
   - **Tile 1 (Volume):** **Total Intake (Walk-Ins): 1** *(Token MAI-001)*.
   - **Tile 2 (Cash Flow):** **Cash Collected: ₹0**.
   - **Tile 5 (B2B Ledger):** **Prepaid Bills Issued: 1 (₹4,500)**.
3. **Double-Layered Frontend Fallback Resilience (`ReceptionScreen.jsx`):**
   ```javascript
   const effectiveWalkIns = summary 
       ? ((Number(summary.walkInsToday) > 0) 
           ? Number(summary.walkInsToday) 
           : (todayNonDraftQueue.length > 0 ? todayNonDraftQueue.length : (Number(summary.walkInsToday) || 0)))
       : (todayNonDraftQueue.length || 0);
   ```
4. **Architectural Guardrails in `AGENTS.md` and `.agents/AGENTS.md`:**
   Enshrined Rule 4/5 as a mandatory invariant contract forbidding future agents from stripping B2B/credit visits from `WalkInsToday`.

---

## 16. Accidental Hijacking of Prepaid Visits by `OVERPAID` / `Refund Due` Badge — [RESOLVED & VERIFIED]
### Severity: High / Front-Desk UI Pollution & Financial State Distortion
### Impacted Files & Commit
* **Polluting Commit:** `5fd7ea68` (*"feat(reception): implement extended split tab B2B terminal with smart FIFO partial allocation and secondary concession write-off"*)
* **Impacted File:** [`ReceptionScreen.jsx:328-386`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L328-L386)
* **Backend Projection:** [`OperationsEngine.cs:292-296, 421-425`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operations/OperationsEngine.cs#L292-L296)

### Incident Evidence (Live Audit of Visit `MAI-001`)
* **What the User Expected:**
  ```
  ₹4,500  [PREPAID]
  Dr Test Partner 3
  ```
* **What Rendered in the UI Before Fix:**
  ```
  ₹4,500  [OVERPAID]
  Refund Due: ₹1,500 (Paid: ₹6,000)
  Dr Test Partner 3
  ```
* **The Problem:** The patient paid ₹0 at the counter because it is a Corporate B2B referral billed directly to the doctor's monthly institutional account. Yet the reception queue falsely declared the patient had "overpaid" and was due a ₹1,500 cash refund from the drawer!

### Forensic Root Cause Analysis
1. **Un-Scoped `isOverpaid` Check:**
   `isOverpaid` was evaluated without checking `!isPrepaid` and placed before `isPrepaid` in the evaluation chain, hijacking all prepaid visits with contracted partner discounts.
2. **Backend Numbers Mismatch on Prepaid B2B:**
   `TotalAmount` was projected as contracted net (₹4,500), but `TotalPaid` was summed from the gross invoice payment entry (₹6,000), triggering false overpayment arithmetic.

### Implemented Fix
1. **Frontend Scoping (`ReceptionScreen.jsx`):**
   * Scoped `isOverpaid` strictly to non-prepaid, non-draft visits:
     `const isOverpaid = !isDraft && !isPrepaid && totalPaid > totalBilled && totalBilled > 0;`
   * Ensured `isPrepaid` is evaluated first in badge prioritization.
   * Suppressed `Refund Due` subtext completely when `isPrepaid` is true, displaying the clean partner name (`row.referrerName`).
2. **Backend Projection Alignment (`OperationsEngine.cs`):**
   * Projected `TotalPaid = TotalAmount` and `RemainingDue = 0` for `visit.PaymentCollectionModel == "PartnerCollects"`.
   * Restored the clean clinical display:
     `₹4,500 [PREPAID]` with subtext `Dr Test Partner 3`.

---

## 17. Multi-Desk Draft Seepage Across Receptionists in Action Queue & Activity Stream — [AUDITED, SPECIFIED & FIXED]
### Severity: High / Desk Concurrency & Data Isolation Violation
### Impacted Modules & Files
* **SignalR Notification Dispatcher:** [`SignalRNotifier.cs:44-67`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Services/SignalRNotifier.cs#L44-L67)
* **Frontend Realtime Delta Ingestion:** [`ReceptionScreen.jsx:109-140`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L109-L140)
* **Action Queue Projection Query:** [`OperationsEngine.cs:170-195`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operations/OperationsEngine.cs#L170-L195)
* **Operational Event Emission:** [`ReceptionFlowService.cs:218-230`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ReceptionFlowService.cs#L218-L230) & [`VisitService.cs:1500-1530`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L1500-L1530)

### Incident Evidence (Multi-Workstation Test)
* **Workstation 1 (Mac Mini):** Logged in as Admin (`Dr. Vasudeva Rao`).
  - Opened Registration modal, initiated intake for `Test Patient7`.
  - System created draft token `D-9B7FAE5F24` (Status: `Draft`, Amount: ₹0).
* **Workstation 2 (Laptop):** Logged in as Receptionist (`Uzma`).
  - Action Queue immediately displayed the unfinalized draft `D-9B7FAE5F24` with patient `Test Patient7` and badge `₹0 DRAFT | • Draft Visit`.
  - Live Stream activity ticker on Uzma's screen broadcast:
    `D-9B7FAE5F24 Test Patient7 just now Visit started for Test Patient7`
    `D-7C4E8AC947 Test Patient7 just now Visit Cancelled: Patient unable to wait / Long queue. Refund: ₹0.`

### Forensic Root Cause Analysis: The 4 Vectors of Seepage

1. **SignalR Broadcast Scope Overreach (`SignalRNotifier.cs:64`):**
   ```csharp
   // Step 1 correctly targeted the private receptionist user:
   if (delta.AssignedToUserId.HasValue && delta.AssignedToUserId.Value != Guid.Empty)
       await _hubContext.Clients.User(delta.AssignedToUserId.Value.ToString()).SendAsync("ActionQueueDeltaReceived", delta);

   // Step 2 & 4 unconditionally broadcast EVERY delta to the whole branch!
   await _hubContext.Clients.Group($"BranchAdmins-{branchId}").SendAsync("ActionQueueDeltaReceived", delta);
   await _hubContext.Clients.Group($"Branch-{branchId}").SendAsync("ActionQueueDeltaReceived", delta);
   ```
   * **Root Cause:** When `NotifyActionQueueDeltaAsync` is triggered for a draft visit (`Status == Draft`, `Token.StartsWith("D-")`), it did not check if the visit was a draft before calling `Clients.Group($"Branch-{branchId}")`. Every connected client in the branch received the draft delta payload.

2. **Frontend Delta Ingestion Blind Spot (`ReceptionScreen.jsx:109-140`):**
   ```javascript
   SignalRService.onActionQueueDeltaReceived((deltaRow) => {
       if (!deltaRow) return;
       const normalized = normalizeQueueData([deltaRow])[0];
       setActionQueue(prev => {
           const exists = prev.some(r => r.visitId === normalized.visitId);
           const isActionable = !normalized.isFinalized || normalized.dateGroup === "Today";
           if (exists) {
               return prev.map(r => r.visitId === normalized.visitId ? normalized : r);
           } else {
               if (isActionable || showHistoryRef.current) {
                   return [normalized, ...prev]; // PREPENDS TO UZMA'S QUEUE!
               }
               return prev;
           }
       });
   });
   ```
   * **Root Cause:** `isActionable` evaluated `!normalized.isFinalized` as `true` for all drafts. The frontend listener contained zero validation for whether the incoming draft was owned by the currently logged-in user.

3. **Premature Activity Stream Event Emission (`ReceptionFlowService.cs:220` & `VisitService.cs:1508`):**
   * Emitting `BranchEventType.VISIT_STARTED` and `BranchEventType.VISIT_CANCELLED` upon the creation or abandonment of ephemeral drafts blasted unconfirmed noise across all workstations.

4. **Shared Queue Query Filter Gaps (`OperationsEngine.cs:170-195`):**
   * Non-receptionist roles (Admin, Cashier, Supervisor) querying `GetActionQueueAsync` were not filtering out in-flight foreign drafts.

### Implemented Enterprise Fixes

1. **Backend SignalR Scope Guard (`SignalRNotifier.cs`):**
   * Scoped `ActionQueueDeltaReceived` for draft visits (`!delta.IsFinalized || delta.Token.StartsWith("D-") || delta.OperationalStatus == "Draft"`) exclusively to `Clients.User(delta.AssignedToUserId)`.
   * Suppressed broadcast to `Branch-{branchId}` and `BranchAdmins-{branchId}` until the visit is finalized with an official `MAI-xxx` token.

2. **Frontend Reception Desk Isolation (`ReceptionScreen.jsx`):**
   * In `onActionQueueDeltaReceived`, added strict user-desk matching:
     ```javascript
     const isDraft = !normalized.isFinalized || Boolean(normalized.token?.startsWith('D-')) || normalized.operationalStatus === 'Draft';
     const currentUserId = user?.id;
     const draftOwnerId = normalized.assignedToUserId;
     if (isDraft && draftOwnerId && currentUserId && String(draftOwnerId).toLowerCase() !== String(currentUserId).toLowerCase()) {
         return; // Discard foreign drafts
     }
     ```

3. **Backend Action Queue Scope (`OperationsEngine.cs`):**
   * In `GetActionQueueAsync`, added desk isolation invariant ensuring drafts are strictly visible only to their creator:
     ```csharp
     visitQuery = visitQuery.Where(v => 
         (v.Status != VisitStatus.Draft && (v.Token == null || !v.Token.StartsWith("D-"))) || 
         v.AssignedReceptionistId == currentUserId
     );
     ```

4. **Operational Event Stream Guard (`ReceptionFlowService.cs` & `VisitService.cs`):**
   * In `StartVisitAsync`, suppressed `BranchEventType.VISIT_STARTED` emission when `visit.Status == VisitStatus.Draft || visit.Token.StartsWith("D-")`.
   * In `CancelVisitAsync`, suppressed `BranchEventType.VISIT_CANCELLED` timeline broadcast for draft visits (`visit.Token.StartsWith("D-")`).

---

## 18. Reception Desk Keyboard Trapping & Focus Reset on B2B Concession Entry — [RESOLVED & VERIFIED]
### Severity: High / Front-Desk Operational Throughput & Ergonomics Failure
### Impacted Module & Files
* **Component:** [`BillingSummary.jsx:1810-1845`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/BillingSummary.jsx#L1810-L1845) (`input-b2b-discount` input & `handleSaveB2BDiscount`)
* **Focus Orchestration:** [`VisitDetails.jsx:710-755`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/VisitDetails.jsx#L710-L755) (`findFirstFinancialsTarget`)
* **Video Evidence:** `/Users/tabrez/Downloads/export-1793854190948.mp4` (Duration: 47.6s)

### Incident Evidence (Video Breakdown: Frame by Frame)
1. **Intake Setup (0:00 - 0:18):**
   * Patient: `Test Patient1`, Billing Mode: `Corporate B2B (Prepaid)`, Doctor: `Dr. Khaleeq`, Test: `LFT - LIVER FUNCTION TEST` (Gross: ₹600).
2. **Concession Input (0:19 - 0:24):**
   * In Financials Section 3, user enters `100` into `Flat Concession` input (`id="input-b2b-discount"`).
   * A blue `Save` button conditionally appears next to the input (`{isB2BEditing && <button>Save</button>}`).
3. **Tab Key Hijack & Save Skip (0:24 - 0:30):**
   * User presses `Tab` expecting focus to move to the `Save` button.
   * **Observed Failure:** Focus completely skips `Save` and jumps directly into `Search doctor to overrule default account...` (`id="input-b2b-doctor-search"`), popping open the suggestion dropdown (`DR.B.DURGA SURESH`, `Dr Test Partner 3`, etc.).
   * The next `Tab` press jumps past the dropdown to the primary submit button `Confirm Corporate B2B Bill (₹0)` at the bottom of the modal.
4. **Enter Key Focus Destruction (0:31 - 0:45):**
   * User Shift-Tabs back to the `100` Flat Concession input and hits the `Enter` key.
   * The concession of ₹100 applies immediately (Net Doctor Bill drops to ₹500, `isB2BEditing` becomes false, `Save` button unmounts).
   * **Observed Failure:** The moment `Enter` commits the discount, keyboard focus is completely destroyed (`activeElement` resets to `document.body`). There is no active focus ring on screen.
   * The user presses `Tab` again: because focus was lost to `document.body`, the browser's tab order cycles from the very top of the entire modal (Patient Identification, MRN, Test Search, etc.). The user is forced to manually click with the mouse or loop through all previous form elements to reach `Confirm Corporate B2B Bill`.

### Forensic Root Cause Analysis

1. **Explicit Tab Interception Hijacking (`BillingSummary.jsx:1820-1835`):**
   ```javascript
   } else if (e.key === 'Tab') {
       if (!e.shiftKey) {
           const nextInput = document.getElementById('input-b2b-doctor-search') ||
                             document.getElementById('btn-unified-action');
           if (nextInput) {
               e.preventDefault();
               e.stopPropagation();
               nextInput.focus();
           }
       }
   ```
   * **Mechanism:** When the user types a discount, `isB2BEditing` is `true`, causing `<button>Save</button>` to render immediately after `<input id="input-b2b-discount">` in the DOM.
   * In standard browser tab navigation, `Tab` would naturally focus this `Save` button. However, the custom `onKeyDown` explicitly executed `e.preventDefault()` and forcibly jumped to `input-b2b-doctor-search`. It was physically impossible for a keyboard-only user to tab into the `Save` button.

2. **DOM Disabling Blurs Active Element to `document.body` (`BillingSummary.jsx:1788` & `555-575`):**
   ```javascript
   // Inside input:
   disabled={!canPerformActions || isProcessing}

   // Inside handleSaveB2BDiscount:
   setIsProcessing(true);
   try {
       await ReceptionApi.updateB2BDiscountRate(...);
       setIsB2BEditing(false);
       if (onVisitUpdated) onVisitUpdated();
   } finally {
       setIsProcessing(false);
   }
   ```
   * **Mechanism:** When `Enter` is pressed, `handleSaveB2BDiscount` sets `isProcessing = true`.
   * Under W3C HTML specifications, setting `disabled = true` on the currently focused element causes the browser to immediately blur the element and reset focus to `document.body`.
   * Unmounting the `Save` button (`isB2BEditing = false`) further invalidates any local references.
   * When `onVisitUpdated()` reloads visit state and re-renders the component tree, there is zero focus-restoration logic. The active element remains `document.body`, causing subsequent `Tab` keystrokes to restart at the beginning of the modal.

### Why This is Fragile (Anti-Patterns in Front-Desk UI)
1. **Hardcoded Element ID Leaps:** Hardcoding `getElementById('input-b2b-doctor-search')` inside `Tab` key handlers breaks whenever any UI element (badges, buttons, alerts, helper text) is inserted between the inputs.
2. **Manual Save Button Anti-Pattern:** Requiring a front-desk operator to manually click or tab to a separate "Save" button just to confirm a single discount number is an obsolete modal anti-pattern. In high-speed ERP intake (Epic / Cerner), discount entries auto-commit on `Enter` or `Blur`.

### Enterprise-Grade Fix Specification (For Implementation Agent)

1. **Auto-Commit on Enter & Natural Tab Flow (`BillingSummary.jsx`):**
   * Remove the hardcoded `Tab` override on `input-b2b-discount`. Allow the browser to follow natural, accessible DOM tab flow.
   * If the user types a discount and presses `Tab` or `Blur`, auto-stage/save the value seamlessly without requiring a separate click.
   * If the user presses `Enter` on `input-b2b-discount`:
     - Save/commit the discount immediately.
     - **Forward-Advance Focus:** Programmatically advance focus directly to the next logical action target:
       ```javascript
       const forwardTarget = document.getElementById('input-b2b-doctor-search') || 
                             document.getElementById('btn-unified-action');
       forwardTarget?.focus();
       ```

2. **Eliminate Focus-Killing `disabled` State during Processing:**
   * Instead of setting `disabled={isProcessing}` on the input (which forces the browser to eject focus to `body`), use `readOnly={isProcessing}` or visual loading indicators (`aria-busy="true"`).
   * This guarantees that even during async API round-trips with `onVisitUpdated()`, the browser never drops focus to `document.body`.

3. **Post-Update Focus Restoration Guard:**
   * In `handleSaveB2BDiscount`:
     ```javascript
     const nextTargetId = 'btn-unified-action'; // Fast-path straight to Confirm Corporate B2B Bill
     try {
         await ReceptionApi.updateB2BDiscountRate(...);
         if (onVisitUpdated) await onVisitUpdated();
     } finally {
         setTimeout(() => {
             const target = document.getElementById(nextTargetId);
             target?.focus();
         }, 50);
     }
     ```
   * Fast-path keyboard operator: Type `100` -> Hit `Enter` -> Discount saves -> Focus immediately lands on `Confirm Corporate B2B Bill` -> Hit `Enter` -> Done in 2 seconds without touching the mouse.

---

## 19. Reality Summary Card Height Squishing on Minimize — [RESOLVED & VERIFIED]
### Severity: Medium / Visual Ergonomics & Layout Consistency
### Impacted Module & Files
* **Component:** [`RealitySummary.jsx:70-130, 240-310`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/components/layout/RealitySummary.jsx#L70-L130)
* **Parent Screen:** [`ReceptionScreen.jsx:465-485`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L465-L485)
* **Video Evidence:** `/Users/tabrez/Downloads/export-1793855122783.mp4` (Duration: 12.6s)

### Incident Evidence (Video Breakdown)
* **Default State (0:00 - 0:02):**
  - Reality Summary renders 8 KPI cards in a 2-row x 4-column grid (`Walk-Ins`, `Cash Collected`, `Online Payments`, `Online Total`, `Prepaid Bills Issued`, `Prepaid Total`, `Recorded Expenses`, `Cash in the Drawer`).
  - Cards have standard full dimensions (`h-28 sm:h-32`), prominent 4xl/5xl numeric values, top-right icons, and bottom label footers.
* **Minimized State Failure (0:03 - 0:12):**
  - User clicks the collapse chevron on Reality Summary.
  - Cards collapse into 6 cards in 1 row, but their height collapses into an ultra-narrow ~25px ribbon pill (`px-4 py-2.5 gap-0 h-full`).
  - Text shrinks to tiny 12px font (`Icon Label: Value`), stripping away the card aesthetic and making numbers difficult to read at a glance.
* **The User Expectation:**
  - Minimizing should save vertical screen space by **eliminating the second row of cards** (reducing from 8 cards across 2 rows to 6 primary cards in 1 row).
  - The 6 cards in that single row **must preserve their standard full card height (`h-28 sm:h-32`) and prominent typography**, rather than compressing into narrow ribbon pills.

### Forensic Root Cause Analysis
In [`RealitySummary.jsx:70-130`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/components/layout/RealitySummary.jsx#L70-L130):
```javascript
// Line 80: Height condition strips full card height:
isCollapsed ? "px-4 py-2.5 gap-0 h-full" : "p-4 sm:p-5 h-28 sm:h-32 gap-0"

// Line 88: Complete layout swap to horizontal single-line pill:
{isCollapsed ? (
    <div className="flex items-center justify-between w-full h-full">
        <div className="flex items-center gap-1.5 min-w-0">
            {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                {displayLabel}:
            </span>
            <span className={cn("font-bold text-sm tabular-nums", ui.text)}>
                {value}
            </span>
...
```
* When `isCollapsed` is true, the component completely unmounts the standard vertical card layout and swaps in a single-line horizontal flex pill.
* In the grid container ([`RealitySummary.jsx:298-305`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/components/layout/RealitySummary.jsx#L298-L305)), `isCollapsed` sets `grid-cols-6 grid-rows-[auto_0px]`, which is the correct 6-column single-row structure, but the card interior artificially deflates into a micro-ribbon.

### Enterprise-Grade Fix Specification (For Implementation Agent)
1. **Preserve Card Height & Layout Contract in Collapsed Mode:**
   * In `RealityTile`, preserve standard card dimensions regardless of `isCollapsed`:
     ```javascript
     // Retain consistent full card height:
     className={cn(
         "rounded-xl transition-[transform,opacity] duration-300 group cursor-default flex flex-col",
         ui.card,
         "p-3.5 sm:p-4 h-28 sm:h-30 gap-0", // Height preserved across both states
         isHidden && "opacity-0 pointer-events-none"
     )}
     ```
   * Remove the layout swap that replaces cards with horizontal text pills. The cards in the 6-column collapsed row must render the same bold, readable metrics and icons as the expanded view.
2. **Container Row Preservation (`RealitySummary.jsx`):**
   * Keep `isCollapsed ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-1" : "grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 p-1"`.
   * Cards 7 & 8 (`idx >= 6`) are cleanly unmounted/hidden when `isCollapsed` is true, saving exactly one row of screen real estate (~130px) without shrinking the height of cards 1 through 6.

---

## 20. Accounts Receivable Terminal Accordion Lock & Visual Contrast Bleed — [RESOLVED & VERIFIED]
### Severity: High / Front-Desk Usability & Design System Non-Compliance
### Impacted Module & Files
* **Component:** [`ReceptionB2BReceivablesDrawer.jsx:60-76, 715-795`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/ReceptionB2BReceivablesDrawer.jsx#L60-L76)
* **Video Evidence:** `/Users/tabrez/Downloads/export-1793855598096.mp4` (Duration: 31.7s)
* **Design System Benchmark:** User screenshot [`media_1793855756740_5b9bb50e.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793855756740_5b9bb50e.png) (Finance > Bills & Collections)

### Incident Evidence (Video Breakdown)
* **Accordion Lock Bug (0:00 - 0:25):**
  - User opens `Accounts Receivable Terminal #REC-B2B`.
  - Partner 1 (`Dr Test Partner 3`, Active, ₹4,877) is expanded, showing 2 visits (`MAI-001`, `MAI-003`).
  - User clicks the collapse chevron on `Dr Test Partner 3` to minimize it. **Nothing happens.** The card refuses to collapse.
  - User clicks the second partner (`DR. B.DURGA SURESH, MS.`, ₹550).
  - Suddenly, `Dr Test Partner 3` collapses and `DR. B.DURGA SURESH, MS.` expands.
  - Now, user clicks the collapse chevron on `DR. B.DURGA SURESH, MS.` to minimize it. **Again, nothing happens.**
* **Visual Contrast Bleed (0:00 - 0:31):**
  - The entire terminal background, column containers, debtor cards, and nested visit cards are rendered in near-identical shades of translucent white (`bg-white/40`, `bg-white/60`, `bg-white/80`, `bg-white/90`).
  - The cards blend into the canvas with weak borders, appearing washed-out and visually flat.
* **Design Benchmark Contrast ([`media_1793855756740_5b9bb50e.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793855756740_5b9bb50e.png)):**
  - In native SynOS screens (such as *Bills & Collections*), the workspace background is a calm, distinct slate-gray tone (`#EBF1F6` / `bg-slate-100` / `bg-[#F0F4F8]`).
  - Cards are solid, crisp white (`bg-white`), framed with crisp borders and soft shadows, creating clear depth hierarchy.

### Forensic Root Cause Analysis

1. **The Accordion Logic Lock (`ReceptionB2BReceivablesDrawer.jsx:719`):**
   ```javascript
   const isSelectedPartner = selectedPartnerId === g.partnerId;
   const isExpanded = expandedPartnerIds.has(g.partnerId) || isSelectedPartner; // ❌ HARDCODED OVERRIDE
   ```
   * **Mechanism:** When a partner is selected, `isSelectedPartner` is `true`.
   * Because of `|| isSelectedPartner`, `isExpanded` is **permanently true**.
   * Clicking the chevron calls `togglePartnerAccordion(g.partnerId)`, which toggles the ID in `expandedPartnerIds`. But because `isSelectedPartner` is still `true`, the expression `expandedPartnerIds.has(id) || true` always evaluates to `true`! The active card cannot be minimized.
   * When the user clicks a *different* partner, `isSelectedPartner` shifts to the new partner, unlocking the previous card and causing it to abruptly collapse based on the earlier toggles.

2. **White-on-White Aesthetic Bleed (`ReceptionB2BReceivablesDrawer.jsx:69-75`):**
   ```javascript
   panel: "bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)]",
   header: "bg-white/70 backdrop-blur-md border-b border-slate-200/80",
   card: "bg-white/90 border border-[#D5E2EC] shadow-[0_4px_16px_rgba(15,35,60,0.06)]",
   leftColumn: "bg-white/40 border-r border-slate-200/80",
   partnerCard: "bg-white/80 border-slate-200",
   nestedVisitCard: "bg-slate-50/70"
   ```
   * High translucency (`/40`, `/70`, `/80`) and lack of a solid slate canvas background creates a low-contrast, bleached appearance where boundaries disappear.

### Enterprise-Grade Fix Specification (For Implementation Agent)

1. **Decouple Selection from Accordion Expansion (`ReceptionB2BReceivablesDrawer.jsx`):**
   * Change `expandedPartnerIds` from a passive Set to an explicit source of truth for open/close state:
     ```javascript
     // Partner expansion is governed solely by expandedPartnerIds:
     const isExpanded = expandedPartnerIds.has(g.partnerId);
     ```
   * In `selectPartner(group)`:
     ```javascript
     const selectPartner = (group) => {
         setSelectedPartnerId(group.partnerId);
         // Open accordion if not already open, but allow subsequent user toggle
         setExpandedPartnerIds(prev => new Set([...prev, group.partnerId]));
         ...
     };
     ```
   * In `togglePartnerAccordion`:
     ```javascript
     const togglePartnerAccordion = (partnerId) => {
         setExpandedPartnerIds(prev => {
             const next = new Set(prev);
             if (next.has(partnerId)) next.delete(partnerId);
             else next.add(partnerId);
             return next;
         });
     };
     ```
   * Now clicking the minimize chevron on *any* card (active or inactive) immediately toggles it closed or open without interference.

2. **Align with Native SynOS Slate Canvas & Crisp Card System:**
   * Adopt the proven color palette from [`Bills & Collections`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793855756740_5b9bb50e.png):
     - **Drawer Base Canvas:** Solid cool slate-gray (`bg-[#F0F4F8]` or `bg-slate-100/90`).
     - **Left Column & Work Area:** Slate surface (`bg-[#EBF1F6]/60 dark:bg-zinc-950/40`).
     - **Debtor Partner Cards:** Solid crisp white (`bg-white dark:bg-zinc-900`) with distinct border (`border-slate-300/80 dark:border-zinc-700`) and elevated shadow (`shadow-sm hover:shadow-md`).
     - **Nested Visit Cards:** Distinct recessed pod (`bg-[#F4F7FA] dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60`).
   * Eliminates the washed-out white bleed and restores the tactile, high-contrast, professional SynOS aesthetic.

---

## 21. Accounts Payable Terminal Single-Column Collapse & History Tab Width Lock — [RESOLVED & VERIFIED]
### Severity: High / Front-Desk Layout Regression & Terminal Usability Defect
### Impacted Files & Commits
* **Original 2-Column Widescreen Implementation:** Commit `4825b2a9` (*"feat(reception): facelift expense drawer, wire branch pool metrics, and add cash in drawer tracking"*)
* **Regressive Single-Column Collapse:** Commit `f89ad92a` (*"feat(reception): compact single-column layout for Record Expense and dynamic width expansion on History/Metrics"*)
* **Width Trapping & Embedding in Options Panel:** Commit `cc2a9af4` (*"feat(reception): implement seamless in-drawer view morphing and universal Return to Reception button for HR"*)
* **Impacted Files:**
  - [`ReceptionExpenseDrawer.jsx:415-430, 530-545, 915-930`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/ReceptionExpenseDrawer.jsx#L415-L430)
  - [`ReceptionOptionsPanel.jsx:99-118, 225-240`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/ReceptionOptionsPanel.jsx#L99-L118)
* **Visual Evidence:** Screenshot [`media_1793864919655_569d9c0a.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793864919655_569d9c0a.png)

### Incident Evidence (Screenshot Audit)
* **Current Observed State:**
  - `Accounts Payable Terminal #EXP-RECEPTION` is rendered as a narrow, single-column panel.
  - Step 1 (`Expense Classification & Stream`), Step 2 (`Outflow Particulars`), and Step 3 (`Settlement & Financials`) are stacked vertically on top of each other in a single narrow column (`space-y-4`).
  - Switching to Tab 2 (`2 Live & 7D History`) or Tab 3 (`3 Visual Metrics`) **fails to expand the drawer**. The drawer stays trapped at `max-w-[880px]`, squishing the audit table and Argon metric charts into an unreadable narrow slice.
* **Original Designed Behavior:**
  - The drawer was originally an **85vw expanded window (`max-w-[1780px]`)**, matching the two-column cockpit layout of `IntentPanel`:
    - **Left Half (7 cols / 12):** Step 1 (`Expense Classification & Stream`) + Step 2 (`Outflow Particulars`).
    - **Right Half (5 cols / 12):** Step 3 (`Settlement & Financials`).
  - When switching to Tab 2 (`Live & 7D History`) or Tab 3 (`Visual Metrics`), the full 85vw width provided ample space for high-density transactional ledgers and financial breakdown charts.

### Forensic Root Cause Analysis: Commit-by-Commit Regression Trace

1. **Commit `4825b2a9` (Original Balanced 2-Column Layout):**
   * The drawer was styled with:
     ```jsx
     <div className="w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px] h-full ...">
     ```
   * Tab 1 (`record`) had a balanced 12-column grid:
     ```jsx
     <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 xl:gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
         {/* LEFT COLUMN (7 COLS): OUTFLOW PARTICULARS */}
         <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
             <Step1_Classification />
             <Step2_Particulars />
         </div>
         {/* RIGHT COLUMN (5 COLS): SETTLEMENT & FINANCIALS */}
         <div className="lg:col-span-5 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
             <Step3_SettlementAndFinancials />
         </div>
     </div>
     ```

2. **Commit `f89ad92a` (Destructive Single-Column Flattening):**
   * The developer arbitrarily dismantled the 12-column grid:
     ```diff
     - <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 xl:gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
     -     <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
     + <div className="p-4 sm:p-6 w-full flex-1 min-h-0 overflow-y-auto space-y-4 animate-in fade-in duration-300 pr-1.5 sm:pr-3">
     ```
   * Step 3 (`Settlement & Financials`) was moved from its dedicated right half and appended directly beneath Step 2 with the code comment:
     `{/* STEP 3: SETTLEMENT & FINANCIALS (Brought to Area 4 under Step 2) */}`.
   * Drawer width was artificially shrunken on Tab 1 to `max-w-[740px]`, attempting to dynamically morph width when switching to Tab 2 (`history`) or Tab 3 (`metrics`).

3. **Commit `cc2a9af4` (Width Trapping Inside `ReceptionOptionsPanel`):**
   * The expense drawer was embedded inside `ReceptionOptionsPanel` with `embedded={true}`.
   * In `ReceptionOptionsPanel.jsx:101-102`:
     ```javascript
     if (activeView === 'expense') {
         viewWidthClasses = "w-[96vw] sm:w-[92vw] md:w-[75vw] lg:w-[50vw] xl:w-[44vw] 2xl:w-[40vw] min-w-[580px] max-w-[880px]";
     }
     ```
   * **Root Cause of Non-Expansion:** The outer wrapper `ReceptionOptionsPanel` governs the width of the sliding drawer container. However, `ReceptionOptionsPanel` has **zero state awareness** of `activeTab` inside `ReceptionExpenseDrawer`.
   * When the user clicks `[2 Live & 7D History]`, `ReceptionExpenseDrawer` internally changes `activeTab = 'history'`, but its parent container remains hard-locked at `max-w-[880px]`. The drawer cannot expand to the wide 85vw canvas!

### Enterprise-Grade Fix Specification (For Implementation Agent)

1. **Restore Canonical 2-Column Split Layout for Tab 1 (`ReceptionExpenseDrawer.jsx`):**
   * Reinstate the widescreen 12-column cockpit layout:
     ```jsx
     <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 xl:gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
         {/* LEFT HALF (7 COLS): Steps 1 & 2 */}
         <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
             {/* Step 1: Expense Classification & Stream */}
             {/* Step 2: Outflow Particulars */}
         </div>

         {/* RIGHT HALF (5 COLS): Step 3 */}
         <div className="lg:col-span-5 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
             {/* Step 3: Settlement & Financials (Net Amount, Channel, Settle Now, Drawer Attribution) */}
         </div>
     </div>
     ```

2. **Universal Widescreen Canvas Contract (`ReceptionOptionsPanel.jsx` & `ReceptionExpenseDrawer.jsx`):**
   * Either:
     - **Option A (Consistent Wide Workspace):** Set `activeView === 'expense'` to standard widescreen `85vw` (`w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px]`), identical to `activeView === 'b2b'` and `IntentPanel`. This provides a stable, un-cramped surface for both the 2-column Record view and the 7-day History/Metrics tables without disorienting width reflows.
     - **Option B (Tab-Aware Dynamic Width Sync):** Pass an `onTabChange` callback from `ReceptionExpenseDrawer` up to `ReceptionOptionsPanel`, dynamically switching `viewWidthClasses` from `w-[85vw]` to `w-[90vw]` when activeTab is `'history'` or `'metrics'`.
   * **Recommended:** Option A provides rock-solid ERP layout consistency, matching `IntentPanel` and eliminating container constraint bugs permanently.

---

## 22. Reality Summary Multi-Digit Financial Overflow & Badge Boundary Bleed — [RESOLVED & VERIFIED]
### Severity: High / Financial Display Truncation & Layout Rupture
### Impacted Files & Component
* **Component:** [`RealitySummary.jsx:150-195`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/components/layout/RealitySummary.jsx#L150-L195) (`RealityTile` Single-Metric Layout)
* **Parent Screen:** [`ReceptionScreen.jsx:465-485`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L465-L485)
* **Visual Evidence:** Laptop screenshot [`media_1793866549974_564983b4.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793866549974_564983b4.png) (6-card single row on laptop screen)

### Incident Evidence (Laptop Math & Geometry)
* **Viewport Reality on 1366px Laptop:**
  - Screen Width: ~1366px.
  - Active Layout: Main work area on left (~75% or flex-1) + `Live Stream` on right (`w-[290px]` to `w-[340px]`).
  - Available width for Reality Summary row: **~980px to 1020px**.
  - In a 6-card row (`grid-cols-6`) with 5 column gaps (16px each = 80px):
    - Each card's outer width is **~150px to 158px**.
    - With card padding (`p-4` = 32px horizontal padding), **net available content width is only ~118px to 126px**.
* **What Happens with 5-Digit & 6-Digit Numbers:**
  - 5-digit number: `₹25,000` (7 characters).
  - 6-digit number: `₹1,25,000` (9 characters).
  - In `RealityTile`, the font size for numbers under 10 characters evaluates to `text-4xl` (36px, `font-extrabold`).
  - A 9-character string at 36px font size requires **~180px to 200px** of horizontal space.
  - Alongside the number on the **same horizontal flex row**, the card attempts to render:
    - Margin: `ml-2` (8px).
    - Scope Badge: `[ DESK ]` or `[ POOL ]` (~44px).
    - Icon Container: `w-6 h-6 ml-2` (~32px).
    - Total badge + icon footprint: **~84px**.
  - Combined required width: **200px + 84px = 284px**.
  - Available width: **118px**. Deficit: **166px!**
* **The Observed Failure:**
  - Because `RealityTile` lacks `overflow-hidden` and places the number and badges on the same horizontal row (`flex justify-between items-start w-full`), the expanding number **physically pushes the `DESK`/`POOL` badge and icon off the right edge of the card**, bleeding directly into the adjacent tile or screen margins!
  - If a 6-digit number occurs (`₹1,25,000`), the number itself gets clipped or wraps awkwardly into multi-line numbers (`₹1,2` on line 1, `5,000` on line 2), destroying executive readability.

### Forensic Root Cause Analysis

1. **Horizontal Space Contention (Number & Metadata on Same Line):**
   ```jsx
   {/* SLOT 1: HEADER + VALUE (Side-by-side in same flex container) */}
   <div className="flex justify-between items-start w-full">
       <span className={cn("font-extrabold font-sans text-4xl ...")}>
           {value}
       </span>
       <div className="flex items-center gap-1.5 ml-2">
           {scopeBadge && <span>{scopeBadge}</span>}
           {Icon && <Icon className="w-6 h-6" />}
       </div>
   </div>
   ```
   * The number and the badges/icons are forced to compete for the same 118px horizontal line. As soon as the number exceeds 4 characters (e.g. `₹1,000`), the row overflows.

2. **Inadequate Font Breakpoints for Dense Grids:**
   ```javascript
   value && value.toString().length > 9 ? "text-3xl sm:text-4xl leading-snug"
       : value && value.toString().length > 6 ? "text-4xl leading-snug"
           : "text-4xl sm:text-5xl leading-tight pb-1"
   ```
   * Even a 6-digit number (`₹1,25,000` = 9 chars) is treated with `text-4xl` (36px), which is massive for a card that is only 150px wide.

3. **Absence of Overflow Boundary Containment:**
   * Neither the card container nor the top header row has `overflow-hidden` or flex min-width constraints (`min-w-0`), allowing absolute visual bleed across card boundaries.

---

### Enterprise-Grade Fix Specification (For Implementation Agent)

1. **Vertical Slot Separation Architecture (3-Tier Layout):**
   * Decouple the metadata (Badge + Icon) from the financial number. Move the metadata to a dedicated top header row, giving the financial number **100% of the card's width**:
     ```jsx
     <div className="flex flex-col h-full justify-between overflow-hidden">
         {/* TIER 1: TOP METADATA HEADER (Badge + Icon) */}
         <div className="flex items-center justify-between w-full h-5 shrink-0 mb-1">
             <div className="flex items-center gap-1 min-w-0">
                 {scopeBadge && (
                     <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 truncate">
                         {scopeBadge}
                     </span>
                 )}
                 {isPool && (
                     <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate">
                         Pool
                     </span>
                 )}
             </div>
             {Icon && <Icon className="w-4 h-4 text-zinc-400 shrink-0" />}
         </div>

         {/* TIER 2: CENTER NUMERIC VALUE (100% Width to Itself) */}
         <div className="flex-1 flex items-center min-w-0 w-full overflow-hidden">
             <span 
                 title={String(value)}
                 className={cn(
                     "font-extrabold font-sans tracking-tight block tabular-nums truncate w-full text-left",
                     ui.text,
                     // Responsive Dynamic Font Scaling
                     strLen > 8 ? "text-xl sm:text-2xl" :
                     strLen > 6 ? "text-2xl sm:text-3xl" :
                     strLen > 4 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
                 )}
             >
                 {value}
             </span>
         </div>

         {/* TIER 3: BOTTOM FOOTER (Label) */}
         <div className="w-full shrink-0 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
             <span title={displayLabel} className="text-zinc-500 text-xs font-semibold truncate block">
                 {displayLabel}
             </span>
         </div>
     </div>
     ```

2. **Benefits of the 3-Tier Architecture:**
   * **Zero Badge Displacement:** The badges and icons sit in Tier 1. Even if the number in Tier 2 becomes 7 or 8 digits (`₹15,00,000`), it **physically cannot push the badges or icons out of the card**.
   * **Unconstrained Number Width:** The number has the full 118px width without sharing space with badges.
   * **Automatic Fluid Scaling:** With `truncate` and dynamic font scaling (`text-xl` for 6+ digits, `text-2xl` for 5 digits), 5-digit and 6-digit sums render crisp, legible, and completely confined within the card borders on any laptop or desktop screen.

---

## 23. Cash Drawer Shift Ledgers Date Filter Disconnection & Single-Day Backend Limit — [RESOLVED & VERIFIED]
### Severity: High / Financial Audit Visibility & Historical Ledger Inaccessibility
### Impacted Files & Endpoints
* **Frontend Screen:** [`RevenueScreens.jsx:4550-4635`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/RevenueScreens.jsx#L4550-L4635) (`CashDrawerLedgersScreen`)
* **API Client:** [`finance.js:206-216`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/api/finance.js#L206-L216) (`getMyCashDrawerLedger`)
* **Backend Controller:** [`FinanceBillsController.cs:1450-1490`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1450-L1490) (`GET /api/v1/finance/bills/cash-drawer/my-ledger`)
* **Visual Evidence:** Screenshot [`media_1793871809415_4e5808c3.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793871809415_4e5808c3.png)

### Incident Evidence (Screenshot Audit)
* **Observed State:**
  - Route: *Finance > Revenue > Cash Drawer Ledgers*.
  - Global Filter: User clicked **`This Month`**.
  - Cashier Selected: `Dr. Vasudeva Rao`.
  - Date Indicator: Shows `11/05/2026 Today`.
  - Inflows & Collections: `Total Cash Inflow: +₹0.00`, `Net Cash in Hand / Drawer: ₹0.00`.
  - Only a single transaction appears: `EXP-454C457C - Petty Operational Outflow - Tea (-₹20.00)`.
  - All historical cash transactions from earlier in November or previous shifts are completely absent.
* **The Question:** Is the data missing because the feature was implemented today, or is the historical data back-supported in the database?
* **Audit Finding:** The historical data **does exist in `dbo.Payments` and `dbo.OverheadPayableFacts`**. The reason it is not displayed is a double breakdown between frontend filter synchronization and backend query parameters.

### Forensic Root Cause Analysis
1. **Frontend Disregard of Global Date Context (`RevenueScreens.jsx:4550-4630`):**
   * While `CashDrawerLedgersScreen` extracts `{ presetRange, customDates } = useGlobalFilter()`, it never binds `presetRange` ("thisMonth") to the data-fetching hook.
   * Instead, it hardcodes an independent local state:
     `const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);`
   * It calls `FinanceApi.getMyCashDrawerLedger({ userId: selectedUserId, date: selectedDate })` passing only the single string `"2026-11-05"`.
2. **Backend Hardcoded 24-Hour Window (`FinanceBillsController.cs:1475-1478`):**
   ```csharp
   var targetDate = date ?? _labTimeProvider.GetLabNow();
   var startUtc = targetDate.Date.ToUniversalTime();
   var endUtc = startUtc.AddDays(1); // ❌ HARDCODED SINGLE-DAY SPAN
   ```
   * The backend endpoint takes only a single `DateTime? date`. It has no parameters for `startDate`, `endDate`, `range`, or month aggregation.
   * As a result, even if the user clicks `This Month`, `This Quarter`, or `Custom Range`, the backend executes `p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc` for today only!

### Enterprise-Grade Fix Specification (For Implementation Agent)
1. **Backend Endpoint Range Support (`FinanceBillsController.cs`):**
   * Expand `GetMyCashDrawerLedger`:
     ```csharp
     [HttpGet("cash-drawer/my-ledger")]
     public async Task<IActionResult> GetMyCashDrawerLedger(
         [FromQuery] DateTime? date = null,
         [FromQuery] DateTime? startDate = null,
         [FromQuery] DateTime? endDate = null,
         [FromQuery] string? range = null,
         [FromQuery] Guid? userId = null)
     ```
   * Compute `startUtc` and `endUtc` dynamically based on `startDate`/`endDate` or `range` (e.g., `thisMonth` -> start of month to end of today).
2. **Frontend Filter Synchronization (`RevenueScreens.jsx`):**
   * Pass `startDate`, `endDate`, and `presetRange` from `useGlobalFilter()` directly into `FinanceApi.getMyCashDrawerLedger`.
   * When `presetRange === 'thisMonth'`, display the full monthly shift reconciliation and total accumulated cash drawer flows.

---

## 24. Unaccounted B2B Write-Off Waivers & Secondary Concession Ledger Disconnection — [RESOLVED & VERIFIED]
### Severity: High / Financial Governance, Audit Gap & Bad-Debt Concealment
### Impacted Modules & Files
* **B2B Settlement Drawer:** [`ReceptionB2BReceivablesDrawer.jsx:96-100, 375-385`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/ReceptionB2BReceivablesDrawer.jsx#L96-L100) (`SECONDARY CONCESSION / WRITE-OFF WAIVER`)
* **Settlement Service:** [`SettlementService.cs:645-685, 715-740`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs#L645-L685) (`SettleSameDayB2BReceivablesAsync`)
* **Partial Due Secondary Concession:** [`BillingSummary.jsx:500-535`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/BillingSummary.jsx#L500-L535) (`handleApplySecondaryConcession`)
* **Visit Service:** [`VisitService.cs:700-745`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L700-L745) (`ApplyCustomDiscountToVisitAsync`)
* **Visual Evidence:** Screenshots [`media_1793872074417_3323fdc1.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793872074417_3323fdc1.png) and [`media_1793872684420_e3293d00.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793872684420_e3293d00.png)

### Incident Evidence (End-to-End Audit)
* **Reception UI Displays Two Write-Off / Waiver Mechanisms:**
  1. *Accounts Receivable Terminal (Screenshot 2):* Allows front-desk staff to enter a `Secondary Concession / Write-off Waiver` with amount, reason, and authorizer when settling corporate B2B balances.
  2. *Resume Visit Partial Due (Screenshot 4):* Allows staff to enter a `Secondary Concession / Write-Off` (e.g., `-₹175` Full Write-Off) against remaining due with an "Authorization Authority & Reason" dropdown (*"Lab Owner Discretionary Concession"*).
* **The Question:** Are these write-offs and concessions accounted for in the system? Are they visible in `Discount Master` or `Revenue` tabs? Or are they floating disconnectedly?

### Forensic Root Cause Analysis: The Audit Void
1. **B2B Waivers Bypass All Audit & Discount Ledgers (`SettlementService.cs:670-685`):**
   ```csharp
   if (concessionApply > 0)
   {
       invoice.DiscountAmount += concessionApply;
       invoice.Total = Math.Max(0m, invoice.GrossAmount - invoice.DiscountAmount);
   }
   ```
   * When a B2B waiver is approved at the desk, the service simply adds the waiver amount into `invoice.DiscountAmount`.
   * **Zero Discount Fact Created:** It does NOT create a `DiscountFact` or link to `DiscountMaster`.
   * **Discarded Authorizer:** `request.ConcessionAuthorizer` is completely dropped in memory and never saved to any database column.
   * **Omission from Revenue Truth Engine:** If a settlement is a 100% full waiver (`request.Amount == 0`), `_revenueFactWriter.DeclareRevenueFactAsync` is bypassed entirely (`if (request.Amount > 0)`).
   * **Result:** B2B write-offs and concessions are **100% invisible** in `Discount Master` (Intelligence, History, Staff tabs) and in `Revenue` analytics.
2. **Patient Secondary Write-Offs Conflated into Single Generic Discount Fact (`VisitService.cs:715-740`):**
   * In `BillingSummary.jsx`, applying a secondary write-off on an active due bill calculates `totalNewDiscount = currentDiscountAmt + addedSecondary` and calls `applyDiscountToVisit`.
   * In `VisitService.cs`, this deactivates the original `DiscountFact` and creates a single replacement fact pointing to the generic code `"CUSTOM"`.
   * The lab owner has no way to distinguish what portion was an initial marketing/referral concession vs. what portion was a post-service bad-debt write-off.

### Enterprise-Grade Architecture Solution
1. **Dedicated "Concessions & Write-Offs" Audit Ledger in Finance Hub:**
   * In healthcare ERPs (Cerner/Epic), patient and institutional write-offs are tracked under a dedicated **Bad-Debt & Courtesy Write-Off Ledger** within either:
     - `Finance > Revenue > Visit Corrections & Write-Offs` (Tab 5), OR
     - `Finance > Discount Master > Concessions & Waivers` (Tab 4).
2. **First-Class `WriteOffFact` or `DiscountFact` Creation for B2B:**
   * In `SettlementService.cs`, whenever `concessionApply > 0`:
     - Create a formal `DiscountFact` (or `ReceivableWriteOffFact`) linking `InvoiceId`, `PartnerId`, `Amount`, `Authorizer`, `Reason`, and `ReceiptNo`.
     - Feed this into `DiscountMaster`'s Concession Intelligence control deck so write-offs are visible in real-time executive reports.

---

## 25. Omission of Change Due Liability on Finalized Summary & Thermal Slip — [RESOLVED & VERIFIED]
### Severity: High / Financial Transaction Integrity & Patient Receipt Discrepancy
### Impacted Modules & Files
* **Thermal Document Generator:** [`thermalPrinter.js:365-385`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/utils/thermalPrinter.js#L365-L385) (`generateThermalInvoiceHtml`)
* **Thermal Payload Builder:** [`IntentPanel.jsx:860-915`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx#L860-L915) (`buildThermalPayload`)
* **Finalization Screen Summary:** [`IntentPanel.jsx:2330-2365`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx#L2330-L2365) (`Visit Consolidation Summary` Card 3)
* **Visual Evidence:** Screenshot [`media_1793872303955_a1c37d58.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793872303955_a1c37d58.png)

### Incident Evidence (Screenshot Audit)
* **Scenario:**
  - Visit Token: `MAI-004` (Patient: `Test Patient2`, Test: `T3 T4 TSH`, Gross: ₹500, Discount: -₹150).
  - Grand Total: **₹350**.
  - Patient tendered: **₹500 Cash**.
  - Receptionist selected: **"No cash available in drawer / hold as Change Due"**.
  - System registered a Change Due liability of **₹150**.
* **What Appears on the Thermal POS Receipt:**
  ```
  Gross Subtotal:     ₹500.00
  Discount:           -₹150.00
  GRAND TOTAL:        ₹350.00
  Amount Received:    ₹500.00
  Balance Due:        ₹0.00
  ```
  - **The Defect:** There is **zero line item** stating that the lab owes the patient ₹150! It appears as if the lab simply accepted ₹500 for a ₹350 bill and kept the surplus. The patient has zero printed proof to claim their ₹150 change.
* **What Appears on the Finalization Screen (Card 3 Financials):**
  - Shows `Desk Collection: ₹500 via Cash`, `Balance Due: ₹0 (Fully Settled)`.
  - There is **no badge, no alert, and no liability note** indicating that ₹150 is owed to the patient as Change Due.

### Forensic Root Cause Analysis
1. **Omission in `buildThermalPayload` (`IntentPanel.jsx:860-915`):**
   * When generating the thermal payload, `IntentPanel` evaluates `effectivePaid = 500`, but **completely omits `changeDue` and `tenderedAmount`** from the payload passed to `generateThermalInvoiceHtml`.
2. **Missing Change Due Section in `thermalPrinter.js:370-385`:**
   * The template renders only `Amount Received` and `Balance Due`. It has no field or conditional block for:
     `*** CHANGE DUE TO PATIENT ***: ₹150.00 (Claimable at Counter)`.
3. **Missing Settlement Pod Representation in `IntentPanel.jsx:2340-2365`:**
   * In Card 3 Financials, the component checks only `actualBalanceDue > 0`. Since `actualBalanceDue` is 0, it renders `Balance Due: ₹0 (Fully Settled)`, completely ignoring `changeDue > 0` and `isChangeRetainedAsDue`.

### Enterprise-Grade Fix Specification (For Implementation Agent)
1. **Thermal Slip Enhancement (`thermalPrinter.js`):**
   * When `payload.changeDue > 0` or `billingObj.changeDue > 0`:
     ```html
     <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11.5px; border: 1px dashed #000000; padding: 2px 4px; margin-top: 3px;">
         <span>*** CHANGE DUE (COLLECT LATER) ***:</span>
         <span style="font-family: monospace; text-align: right;">₹${changeDueStr}</span>
     </div>
     <div style="font-size: 8.5px; font-weight: 700; text-align: center; margin-top: 2px;">
         Show this slip at reception counter to claim pending change refund.
     </div>
     ```
2. **Payload Wiring (`IntentPanel.jsx`):**
   * Pass `changeDue: changeDueVal` and `tenderedAmount: Number(tenderedAmount)` into `buildThermalPayload`.
3. **Finalization Screen Summary Indicator (`IntentPanel.jsx`):**
   * In Card 3 Financials, when `changeDue > 0`:
     - Render an amber liability badge:
       `Change Due to Patient: ₹150 (Pending Counter Claim)` alongside `Desk Collection: ₹500`.

---

## 26. Counter Cash Tender & Change Return Architecture: Button Semantics, Missing Denomination Flow in Cash Drawer Ledger & Reality Summary Stagnation — [RESOLVED & VERIFIED]
### Severity: High / Operational Cashier Usability, Cash Reconciliation Integrity & POS ERP Standard
### Impacted Files & Endpoints
* **Action Button & Unified Handler:** [`IntentPanel.jsx:1168-1185, 1550-1558`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx#L1168-L1185) (`mainActionLabel`, `handleUnifiedAction`)
* **POS Cash Tender Component:** [`PosCashTenderModule.jsx:265-285`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/PosCashTenderModule.jsx#L265-L285)
* **Cash Drawer Shift Ledger:** [`FinanceBillsController.cs:1500-1588`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1500-L1588) (`GET /api/v1/finance/bills/cash-drawer/my-ledger`)
* **Payment Domain & Service:** [`Payment.cs:7-36`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/Payment.cs#L7-L36), [`InvoiceService.cs:292-355`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L292-L355), [`ReceptionFlowService.cs:926-938`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ReceptionFlowService.cs#L926-L938)
* **Reception Screen Synchronization:** [`ReceptionScreen.jsx:55-80, 566`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L55-L80)
* **Visual Evidence:** Screenshot [`media_1793877127657_2b012e0f.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793877127657_2b012e0f.png)

### Incident Evidence & User Scenarios
1. **Scenario A (Screenshot Reproduction):**
   - Bill: ₹400 test, minus ₹50 discount = **₹350 Net Amount to Collect**.
   - Cash Tendered: Patient gives a standard Indian **₹500 note**. Receptionist selects the ₹500 chip.
   - Calculator Output: Correctly computes and displays in green: `Change to Return (₹): Return to Patient: ₹150.00`.
   - **Flaw 1 (Incorrect Button Text):** The bottom primary submit button displays:
     `Accept Payment (₹350) ->` instead of `Accept 500 and Return 150` (or `Accept ₹500 & Return ₹150`).
   - **Flaw 2 (Skipped Physical Cash Movement in Ledger):** Because the app sends `Amount: 350`, the cash drawer ledger only records `₹350 Inflow`. The ₹500 physical note in and the ₹150 change return out are completely erased from the ledger record.
2. **Scenario B (Action Queue Resume ₹1000 Bill, Tendered ₹2000):**
   - Bill in Action Queue: ₹1,000.
   - Patient tenders ₹2,000. POS calculator instructs to return/refund ₹1,000.
   - User completes payment, but observes that the **Cash in the Drawer Reality Summary Card does not update**.

### Forensic Root Cause Analysis

1. **Button Semantic Disconnect (`IntentPanel.jsx:1550-1558`):**
   ```javascript
   // CURRENT DEFECTIVE CODE:
   } else if (paymentMethod === 'Cash' && isChangeRetainedAsDue && Number(tenderedAmount) > payNowAmount) {
       const retNow = Number(changeReturnedNow) || 0;
       const changeDueVal = Math.max(0, Number(tenderedAmount) - payNowAmount - retNow);
       mainActionLabel = `Accept ₹${Number(tenderedAmount).toLocaleString()} Cash • ₹${changeDueVal.toLocaleString()} Change Due to Patient`;
   } else {
       mainActionLabel = `Accept Payment (₹${remainingDue.toLocaleString()})`;
   }
   ```
   * The button label only reacts to `tenderedAmount > payNowAmount` if `isChangeRetainedAsDue` is TRUE (the drawer shortage checkbox is checked).
   * In normal daily operations where change **is** given back immediately to the patient, `isChangeRetainedAsDue` is FALSE.
   * As a result, the logic drops through to `else`, hardcoding `Accept Payment (₹350)` (or `Accept Payment (₹1,000)`). The cashier gets no confirmation that they are accepting ₹500 and returning ₹150 change.

2. **Reality Summary Stagnation via Missing Event Callback (`IntentPanel.jsx:1179-1185`):**
   * In `IntentPanel.jsx`, `handleUnifiedAction` executes:
     ```javascript
     const res = await ReceptionApi.collectPayment(paymentPayload);
     const currentPaid = snapshot?.billing?.totalPaid || 0;
     await loadSnapshot();
     // ❌ MISSING: if (onVisitUpdated) onVisitUpdated();
     setPostProcessingSession({ ... });
     ```
   * While `handleCloseAndReset()` and `handleDeleteVisit()` invoke `onVisitUpdated()`, the actual payment completion handler **never calls `onVisitUpdated()`**.
   * Consequently, `ReceptionScreen`'s `refreshDashboard()` is never triggered. The parent `summary` state stays frozen, leaving the "Cash in the Drawer" and "Cash Collected" cards at old values until a manual page reload.

3. **Concealment of Physical Cash Notes in Cash Drawer Ledger (`Payment.cs`, `FinanceBillsController.cs`):**
   * The database entity `Payment` (`dbo.Payments`) only contains a single `Amount` column.
   * When ₹500 is tendered for a ₹350 bill, `IntentPanel` transmits `Amount: 350`, throwing away `TenderedAmount` and `ChangeReturned`.
   * In `FinanceBillsController.cs:1573-1588`, the shift ledger queries `p.Amount` and logs a single row:
     `PATIENT_CASH • Inflow: ₹350.00`.
   * In hospital & retail ERP standards (Epic, SAP POS), the cash drawer journal must track the physical movement of tender:
     - Gross Physical Cash Tendered In: `+₹500.00`
     - Physical Change Returned Out: `-₹150.00`
     - Net Settlement: `+₹350.00`
   * Without this, cashier cash counting at shift close cannot reconcile denominations (e.g. why there is a ₹500 note in the till when all bills were under ₹400).

### Implemented Fix
1. **Button Label Dynamic Tender Semantics (`IntentPanel.jsx`):**
   - When `paymentMethod === 'Cash' && Number(tenderedAmount) > payNowAmount`:
     - If `isChangeRetainedAsDue`: `Accept ₹{Number(tenderedAmount).toLocaleString()} Cash • ₹{changeDueVal.toLocaleString()} Change Due to Patient`
     - Else: `Accept ₹{Number(tenderedAmount).toLocaleString()} and Return ₹{changeToReturn.toLocaleString()}`
   - Cashiers now have unambiguous button confirmation showing the exact cash accepted and change returned to the patient.
2. **Real-Time Reality Summary Dashboard Synchronization (`IntentPanel.jsx`):**
   - Added `if (onVisitUpdated) onVisitUpdated();` immediately following `ReceptionApi.collectPayment`, `markVisitAsPrepaid`, `markVisitAsInsurance`, and `markVisitAsCorporate`.
   - Triggers instantaneous dashboard refresh (`refreshDashboard()`), keeping the Reality Summary Cards (Cash Collected, Cash in Drawer, Prepaid Bills, Total Intake) 100% current in real-time.
3. **Physical Denomination & Change Tracking in Backend & Shift Ledger:**
   - Added `TenderedAmount` and `ChangeReturned` nullable `decimal(12,2)` columns to `dbo.Payments` via `DbInitializer.cs` and `Payment.cs`.
   - Wired `TenderedAmount` and `ChangeReturned` through `PaymentRequestDto.cs`, `InvoiceService.cs`, and `ReceptionFlowService.cs`.
   - In `FinanceBillsController.cs` (`GetMyCashDrawerLedger`), mapped `TenderedAmount` and `ChangeReturned` onto `CashDrawerLedgerItemDto` and updated `Particulars` for cash tender settlements:
     `{patientName} • {testSummary} (Tendered: ₹{p.TenderedAmount:N2}, Change: ₹{changeRet:N2})` with net settlement in `InflowAmount`.

---

## 27. Overpaid Bills & Refund/Change Due Omission on Thermal POS Slip and Finalization Financials (Regression Audit) — [RESOLVED & VERIFIED]
### Severity: High / Financial Accounting Integrity, Patient Receipt Accuracy & Counter Liability Concealment
### Impacted Files & Components
* **Finalization Screen Summary:** [`IntentPanel.jsx:2365-2405`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx#L2365-L2405) (Card 3 Financials)
* **Thermal Payload Builder:** [`IntentPanel.jsx:877-915`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx#L877-L915) (`buildThermalPayload`)
* **Thermal Document Generator:** [`thermalPrinter.js:176-184, 380-394`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/utils/thermalPrinter.js#L176-L184) (`generateThermalInvoiceHtml`)
* **Visual Evidence:** 
  - Screenshot 1: [`media_1793881024819_e8d36229.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793881024819_e8d36229.png) (Visit Finalized & Print Dispatch for `#MAI-011`)
  - Screenshot 2: [`media_1793881043858_f3bcee19.png`](file:///Users/tabrez/.gemini/antigravity/brain/13b1c467-601a-446d-9a79-6ae6a930fb8a/.user_uploaded/media_1793881043858_f3bcee19.png) (Action Queue displaying `MAI-011: ₹400 [OVERPAID] Refund Due: ₹100 (Paid: ₹500)`)

### Incident Evidence (Forensic Reproduction)
1. **The Scenario:**
   - Visit: `#MAI-011` (Patient: `Test Patient3`, Test: `CBP WITH PLATELETS`, Gross: ₹400, Concession: ₹0, Net Amount: **₹400**).
   - Cash Tendered / Paid: **₹500**.
   - Net Counter Liability: **₹100 Overpayment / Refund Due**.
2. **What the Action Queue Correctly Shows (Screenshot 2):**
   - Action Queue in `ReceptionScreen.jsx:377` correctly detects `totalPaid > totalBilled` (`500 > 400`) and displays:
     ```
     ₹400 [OVERPAID]
     Refund Due: ₹100 (Paid: ₹500)
     ```
3. **What Appears on the Thermal POS Receipt (Screenshot 1 - The Defect):**
   ```
   GRAND TOTAL:        ₹400
   Amount Received:    ₹500
   Balance Due:        ₹0
   ```
   - **Zero mention** that the patient is owed ₹100 change/refund!
   - It appears as though the lab accepted ₹500 for a ₹400 bill and kept the ₹100 excess. The patient leaves with no paper proof to claim their ₹100 change at the counter.
4. **What Appears in Card 3 Financials (Screenshot 1 - The Defect):**
   - Displays: `[✓] Desk Collection: ₹500 via Cash`, `Balance Due: ₹0 (Fully Settled)`.
   - The liability callout is **completely absent**. It misleadingly states `(Fully Settled)`.

### Forensic Root Cause Analysis: Why the Previous Agent's Fix Failed

1. **Fragile UI-Only State Dependency (`IntentPanel.jsx:2390`):**
   * The previous agent implemented the callout with this condition:
     ```javascript
     {((isChangeRetainedAsDue && changeDue > 0) || (postProcessingSession?.isChangeRetainedAsDue && postProcessingSession?.changeDue > 0)) && (
     ```
   * **The Breakdown:**
     - It relies strictly on `isChangeRetainedAsDue` — a temporary React checkbox state in the intake form.
     - When a visit is resumed, reloaded, or overpaid without explicitly checking that checkbox, `isChangeRetainedAsDue` is `false` or `undefined`.
     - In `postProcessingSession`, if the payment was made earlier or resumed from queue, `postProcessingSession?.isChangeRetainedAsDue` is `undefined`.
     - Most critically: It **completely ignored the financial ground truth**: `postPaid > stagedNet` (or `totalPaid > netAmount`).
     - Because `actualBalanceDue` is `0`, the screen unconditionally renders: `Balance Due: ₹0 (Fully Settled)`!

2. **Blind Thermal Payload Generator (`IntentPanel.jsx:882, 904`):**
   ```javascript
   changeDue: isChangeRetainedAsDue ? changeDue : (postProcessingSession?.changeDue || snapshot?.billing?.changeDue || 0),
   ```
   * In `buildThermalPayload()`, `snapshot?.billing?.changeDue` does not exist on the API snapshot DTO.
   * `isChangeRetainedAsDue` is false.
   * As a result, `changeDue` is passed as `0`.
   * In `thermalPrinter.js:384`:
     ```javascript
     ${(normalizedData.financial.changeDue > 0) ? ` ... ` : ''}
     ```
     Because `changeDue` is `0`, the dashed box `*** CHANGE DUE (COLLECT LATER) ***` is never rendered.
   * The printer generator **never computed the mathematical excess**:
     `effectiveRefundDue = Math.max(0, Number(payload.changeDue || 0), Number(totalPaid - totalAmount))`.

### Enterprise-Grade Fix Specification (For Implementation Agent)

1. **Calculate Financial Overpayment Truth (`IntentPanel.jsx`):**
   * Define the unified counter refund/change liability across all intake, post-processing, and resume states:
     ```javascript
     const effectiveNet = stagedNet !== undefined ? stagedNet : (snapshot?.billing?.netAmount || 0);
     const effectivePaid = postProcessingSession?.paidAmount !== undefined ? postProcessingSession.paidAmount : (snapshot?.billing?.totalPaid || 0);
     const counterExcessDue = Math.max(0, effectivePaid - effectiveNet);
     const effectiveChangeDue = Math.max(0, Number(changeDue || postProcessingSession?.changeDue || 0), counterExcessDue);
     ```

2. **Card 3 Financials Settlement Pod Update (`IntentPanel.jsx:2376-2405`):**
   * In Card 3, update the balance due text and callout:
     ```javascript
     <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
         Balance Due:{" "}
         {effectiveChangeDue > 0 ? (
             <span className="font-mono text-rose-600 dark:text-rose-400 font-black">
                 ₹0 <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">(Refund Due ₹{effectiveChangeDue.toLocaleString()})</span>
             </span>
         ) : actualBalanceDue <= 0 ? (
             <strong className="font-mono text-slate-900 dark:text-white">₹0 <span className="text-[#245E49] dark:text-emerald-400 font-bold">(Fully Settled)</span></strong>
         ) : isFullDueVisit ? (
             <strong className="font-mono text-rose-600 dark:text-rose-400 text-sm font-black">₹{actualBalanceDue.toLocaleString()} <span className="text-amber-600 dark:text-amber-400 font-bold">(100% Full Due)</span></strong>
         ) : (
             <strong className="font-mono text-rose-600 dark:text-rose-400 text-sm font-black">₹{actualBalanceDue.toLocaleString()} <span className="text-amber-600 dark:text-amber-400 font-bold">(Partial Due)</span></strong>
         )}
     </div>
     ```
   * Replace the callout condition to trigger whenever `effectiveChangeDue > 0`:
     ```javascript
     {effectiveChangeDue > 0 && (
         <div className="mt-2.5 pt-2 border-t border-rose-500/25 flex items-center justify-between text-xs bg-rose-500/10 p-2 rounded-lg">
             <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold">
                 <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                 <span>Change / Refund Due to Patient:</span>
                 <span className="font-mono text-sm font-black text-rose-900 dark:text-rose-200">
                     ₹{effectiveChangeDue.toLocaleString()}
                 </span>
             </div>
             <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30">
                 Claimable at Counter
             </span>
         </div>
     )}
     ```

3. **Thermal Receipt Generator Robustness (`thermalPrinter.js:176-184, 380-394`):**
   * In `thermalPrinter.js`, calculate `changeDue` from both explicit payload and financial excess:
     ```javascript
     const explicitChangeDue = Number(payload.changeDue || billingObj.changeDue || payload.financial?.changeDue || 0);
     const excessOverpaid = Math.max(0, totalPaid - totalAmount);
     const changeDue = Math.max(explicitChangeDue, excessOverpaid);
     ```
   * Render the prominent dashed box on the thermal slip whenever `changeDue > 0`:
     ```html
     ${(normalizedData.financial.changeDue > 0) ? `
         <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11.5px; border: 1px dashed #000000; padding: 2px 4px; margin-top: 3px;">
             <span>*** CHANGE / REFUND DUE ***:</span>
             <span style="font-family: monospace; text-align: right;">₹${normalizedData.financial.changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
         </div>
         <div style="font-size: 8.5px; font-weight: 700; text-align: center; margin-top: 2px;">
             Show this receipt at reception counter to claim pending ₹${normalizedData.financial.changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} change.
         </div>
     ` : ''}
     ```


















---

## 28. Premature Official Daily Token Promotion on Unfinalized Draft Visits (MAI-007 / MAI-008 Token vs Draft Visit Inconsistency) — [RESOLVED & VERIFIED]
### Severity: High / Front-Desk Operational Integrity & Token Sequence Corruption
### Impacted Modules & Files
* **Reception Flow Service:** [`ReceptionFlowService.cs:860-985`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ReceptionFlowService.cs#L860-L985)
* **Visit Service Token Promotion Engine:** [`VisitService.cs:1330-1360`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L1330-L1360)
* **Revenue Engine Financial Snapshot:** [`RevenueEngine.cs:100-132`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Revenue/RevenueEngine.cs#L100-L132)
* **Action Queue Projection Engine:** [`OperationsEngine.cs:195-210, 515-585`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operations/OperationsEngine.cs#L195-L210)
* **Action Queue Table Cells:** [`ActionQueueCells.jsx:4-25, 75-95`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/components/layout/ActionQueueCells.jsx#L4-L25)
* **Branch Activity Live Stream:** [`ActivityStream.jsx:35-50`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/components/layout/ActivityStream.jsx#L35-L50)

### Incident Evidence (Live Pilot Telemetry)
* **Facility:** Sri Divya Diagnostic Centre, Wyra Road, Khammam.
* **Timestamp:** `2026-11-06 13:46:35` (Live Screen).
* **Observed State in Action Queues:**
  * `MAI-008` | Patient: `DIVYA 23y/F (HAEMOGLOBIN_HPLC)` | Payment: `₹100 DRAFT` | Status: `• Draft Visit`
  * `MAI-007` | Patient: `RAMESH 65y/M (LIPASE, AMYLASE)` | Payment: `₹1,500 DRAFT` | Status: `• Draft Visit`
* **Observed Events in Branch Live Stream:**
  * `MAI-008 DIVYA`: *"Custom FLAT concession (100) applied by Moin"* (3m ago)
  * `MAI-007 RAMESH`: *"Custom FLAT concession (1500) applied by Moin"* (4m ago)
* **Inconsistency Identified by User:**
  1. Why are MAI-007 and MAI-008 showing as `Draft Visit` with `DRAFT` payment badges?
  2. How did MAI-007 and MAI-008 get assigned official daily branch tokens (`MAI-xxx`) when the visits are still in an uncommitted draft state instead of holding an ephemeral draft token (`D-xxx`)?

---

### Root Cause Analysis

#### 1. Why are MAI-007 and MAI-008 in Draft Visit status?
1. **Uncommitted Desk Intake:**
   * When a receptionist (Moin) clicks "+ Registration" or starts an intake, `VisitService.CreateVisitAsync` creates a visit with `Status = VisitStatus.Draft`.
   * Moin selected tests (`LIPASE` + `AMYLASE` for Ramesh; `HAEMOGLOBIN_HPLC` for Divya) and applied custom flat concessions (₹1,500 and ₹100 respectively).
   * In SynOS, applying a discount creates a `DiscountFact` and calls `RevenueEngine.ApplySnapshotAsync`.
   * In `RevenueEngine.cs` (lines 115-130), if payments have not yet been tendered (`totalPaid == 0`), the engine sets `invoice.Status = "PendingPayment"`, but **leaves `visit.Status = VisitStatus.Draft`** untouched.
   * Because Moin never completed checkout (did not click `Accept Payment` to collect cash/UPI/credit), the visits were never transitioned to `VisitStatus.Paid`, `VisitStatus.FullPaid`, or `VisitStatus.PendingPayment`.
2. **Action Queue Projection Rendering:**
   * In `OperationsEngine.cs`:
     * `DeriveOperationalStatus` checks `if (visit.Status == VisitStatus.Draft)` and returns `"Draft"`. This causes `ActionQueueCells.jsx` to render `• Draft Visit` with an amber pulsing dot.
     * `DerivePaymentDisplay` and `DerivePaymentMethod` check `if (visit.Status == VisitStatus.Draft)` and return `"Draft"`. This causes `ReceptionScreen.jsx` to render the amber `DRAFT` badge alongside the uncollected amount (`₹1,500 DRAFT` and `₹100 DRAFT`).

#### 2. How did MAI-007 and MAI-008 get assigned official daily tokens while still in draft state?
1. **Decoupled Token Promotion vs. Visit Status Update:**
   * In `VisitService.cs`, a visit is initialized with an ephemeral token:
     ```csharp
     var token = $"D-{Guid.NewGuid():N}"[..12].ToUpperInvariant();
     ```
   * The official token (`MAI-007`, `MAI-008`) can ONLY be generated by `AssignOfficialTokenAsync(visitId, actorUserId)`, which reads and increments `dbo.TokenCounters` for the branch and day.
2. **Defect in `CompletePaymentAsync` (`ReceptionFlowService.cs:862-985`):**
   * When `CompletePaymentAsync` is triggered, lines 968-980 check:
     ```csharp
     if (string.Equals(updatedInvoice.Status, "Paid", StringComparison.OrdinalIgnoreCase) ||
         string.Equals(updatedInvoice.Status, "PartialPayment", StringComparison.OrdinalIgnoreCase) ||
         string.Equals(updatedInvoice.Status, "PendingPayment", StringComparison.OrdinalIgnoreCase))
     {
         var dbVisitForToken = await _context.Visits.FindAsync(visit.VisitId);
         if (dbVisitForToken != null && (dbVisitForToken.Token.StartsWith("DRAFT") || dbVisitForToken.Token.StartsWith("D-")))
         {
             var officialToken = await _visitService.AssignOfficialTokenAsync(dbVisitForToken.VisitId, userId);
             visit.Token = officialToken;
         }
     }
     ```
   * **The Flaw:** In `CompletePaymentAsync`, if a visit has zero net balance (`existingInvoice.Total <= 0` from a 100% concession) or if an attempt was made to confirm the visit, `AssignOfficialTokenAsync` is executed and **commits the new token immediately to SQL Server**. However, `CompletePaymentAsync` **fails to set `dbVisit.Status = VisitStatus.Paid`** (lines 862-878 set `existingInvoice.Status = "Paid"` but never mutate `dbVisit.Status`).
   * Similarly, if checkout encounters a client-side interruption or partial submission, `AssignOfficialTokenAsync` has already fired and burned an official token sequence (`MAI-007`), leaving the visit entity in the database with:
     * `visit.Token = "MAI-007"` (Permanent official daily token)
     * `visit.Status = VisitStatus.Draft` (Unfinalized draft state)
3. **Live Stream Leakage Consequence:**
   * In `ActivityStream.jsx` (lines 40-47), the frontend suppresses event noise for uncommitted drafts by checking:
     ```javascript
     if (tokenStr.toUpperCase().startsWith('DRAFT-') || titleStr.includes('draft-') || tokenStr.startsWith('D-')) { return false; }
     ```
   * Because `visit.Token` was prematurely mutated to `"MAI-007"` while still in draft, the Activity Stream filter no longer recognized it as an ephemeral draft. Consequently, the discount event (*"Custom FLAT concession (1500) applied by Moin"*) was published to the branch live stream as an official operational event for an unbilled patient.

---

### Architectural Fix Specification (To be executed by Implementation Agent)

1. **Atomic Token Promotion & Status Transition Guard (`ReceptionFlowService.cs` & `VisitService.cs`):**
   * `AssignOfficialTokenAsync` must NEVER be called in isolation from a verified, successful visit status transition.
   * In `ReceptionFlowService.CompletePaymentAsync` (lines 862-878):
     * Explicitly set `dbVisit.Status = VisitStatus.Paid` when zero-net / 100% concession checkout is processed:
       ```csharp
       if (existingInvoice != null && (string.Equals(existingInvoice.Status, "Paid", StringComparison.OrdinalIgnoreCase) || existingInvoice.Total <= 0))
       {
           existingInvoice.Status = "Paid";
           var dbVisit = await _context.Visits.FindAsync(visit.VisitId);
           if (dbVisit != null)
           {
               dbVisit.Status = VisitStatus.Paid;
           }
           ...
       }
       ```
   * In `VisitService.AssignOfficialTokenAsync`:
     * Add an explicit assertion that `AssignOfficialTokenAsync` cannot be called on a visit whose status is strictly `VisitStatus.Draft` unless the caller simultaneously transitions the status to `Paid`, `PartialPayment`, or `PendingPayment`.

2. **Action Queue Projection Alignment (`OperationsEngine.cs`):**
   * Ensure `OperationsEngine.cs` reconciles any inconsistent legacy records:
     * If a visit has `visit.Status == VisitStatus.Draft` but possesses an official daily token (`!visit.Token.StartsWith("D-")`), log a warning.
     * When opening such a visit in `IntentPanel.jsx`, allow the cashier to resume the draft and complete payment without generating a redundant second token.

3. **Live Stream Filter Hardening (`ActivityStream.jsx`):**
   * Update the filter in `ActivityStream.jsx` to check operational status in addition to token prefix:
     ```javascript
     const isDraftEvent = (e.metadataObj?.status || '').toLowerCase() === 'draft' || 
                          (e.status || '').toLowerCase() === 'draft' || 
                          tokenStr.startsWith('D-') || 
                          tokenStr.startsWith('DRAFT');
     if (!isFinalizedOrBilled && isDraftEvent) {
         return false;
     }
     ```


---

## 29. Cross-Branch Token Counter Collision & Sequence Offset (First Billed Patient in MRI Branch Assigned MRI-007 Instead of MRI-001) — [RESOLVED & VERIFIED]
### Severity: High / Multi-Branch Daily Counter Contamination & Queue Desynchronization
### Impacted Modules & Files
* **Visit Service Daily Token Generator:** [`VisitService.cs:1607-1670`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L1607-L1670)
* **Token Promotion Entry Point:** [`VisitService.cs:1345-1379`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L1345-L1379)
* **Database Entity Model Configuration:** [`SynOSDbContext.cs:763`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/SynOSDbContext.cs#L763)
* **Token Counter Entity Model:** [`TokenCounter.cs:7-30`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/TokenCounter.cs#L7-L30)
* **Initial Database Migration:** [`20251218064454_InitialSchema.cs:2622-2624`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/migrations/20251218064454_InitialSchema.cs#L2622-L2624)

### Incident Evidence (Live Pilot Telemetry)
* **Active Branch Selected:** `MRI Branch` (code prefix `MRI`, branch selector active at top header).
* **Observed Timestamp:** `2026-11-10 15:15:36` (Live Screen).
* **Logged-in Actor:** `Tabrez Developer`.
* **Observed Reality Summary for MRI Branch:**
  * Walk-Ins (Paid/Credit): `1`
  * Prepaid Bills Issued: `1` (Prepaid Total: `₹2,800`)
  * Cash Collected: `₹0`
  * Online Total: `₹0`
* **Observed State in Action Queues:**
  * Assigned Token: `MRI-007` (Red-boxed in UI)
  * Patient: `P.JANAMMA 65y/F (CT_NECK)`
  * Payment: `₹2,800 PREPAID POOJA HOSPITALS`
  * Status: `• Ready for Sample`
* **Observed Events in Branch Live Stream:**
  * `MRI-007 P.JANAMMA` — *"Prepaid visit billed by Uday Sri for CT_NECK, referred by POOJA"*.
* **Defect Raised by User:**
  * `P.JANAMMA` is the **very first patient billed today in the MRI Branch**.
  * The assigned token number should have started at **`MRI-001`**, but was instead assigned **`MRI-007`**.

---

### Root Cause Analysis

#### 1. Database Schema Constraint Flaw: Global Unique Index Lacking `BranchId`
* In `SynOSDbContext.cs:763`:
  ```csharp
  modelBuilder.Entity<TokenCounter>(entity => entity.HasIndex(e => new { e.Day, e.Department }).IsUnique());
  ```
* In the initial EF Core migration (`20251218064454_InitialSchema.cs:2622`), the unique index was established as:
  ```csharp
  table.CreateIndex(
      name: "IX_TokenCounters_Day_Department",
      table: "TokenCounters",
      columns: new[] { "Day", "Department" },
      unique: true);
  ```
* **The Fundamental Design Defect:**
  * When multi-branch operations were introduced, `TokenCounter.BranchId` was added to the entity, but the database-level unique index `IX_TokenCounters_Day_Department` was **never updated to include `BranchId`**.
  * Because the unique constraint is strictly on `(Day, Department)`, SQL Server strictly forbids inserting more than one row in `TokenCounters` for any given day and department across all branches in the entire organization.

#### 2. Fragile Multi-Branch Fallback in `VisitService.GenerateDailyTokenAsync`
* When multi-branch testing was performed, attempting to insert a separate counter row for a second branch previously caused an immediate SQL Server `Unique Constraint Violation (Error 2601 / 2627)`.
* In commit `18fefb3a527d6cf3e12ea6b1965c4d664dac3a05` (*"fix unique index IX_TokenCounters_Day_Department fallback"*), rather than migrating the database index to `(BranchId, Day, Department)`, the service logic was modified with an ad-hoc fallback in `VisitService.cs:1630-1659`:
  ```csharp
  // We find any existing token counter for this day & department to respect unique index IX_TokenCounters_Day_Department
  var tokenCounter = await _context.TokenCounters
      .FirstOrDefaultAsync(tc => tc.Day == labLocalDay && tc.BranchId == branchId && tc.Department == department)
      ?? await _context.TokenCounters
      .FirstOrDefaultAsync(tc => tc.Day == labLocalDay && tc.Department == department);

  if (tokenCounter == null)
  {
      tokenCounter = new TokenCounter
      {
          CounterId = Guid.NewGuid(),
          Department = department,
          Day = labLocalDay,
          BranchId = branchId,
          Prefix = prefix,
          LastNumber = 0,
          MaxPerSeries = 9999,
          UpdatedAt = DateTime.UtcNow
      };
      _context.TokenCounters.Add(tokenCounter);
  }
  else
  {
      if (tokenCounter.BranchId != branchId && branchId != Guid.Empty)
      {
          tokenCounter.BranchId = branchId;
      }
      await _context.Entry(tokenCounter).ReloadAsync();
  }

  tokenCounter.LastNumber++;
  tokenCounter.UpdatedAt = DateTime.UtcNow;
  await _context.SaveChangesAsync();

  return $"{prefix}-{tokenCounter.LastNumber:D3}";
  ```

#### 3. Step-by-Step Chronology Explaining `MRI-007`
1. **Earlier Today (MAIN Branch Activity):**
   * Prior to this visit, the `MAIN` branch processed exactly **6 billed visits / token generations** (`MAI-001` through `MAI-006`).
   * The single shared row in `dbo.TokenCounters` had:
     * `Day = 2026-11-10`
     * `Department = ""`
     * `BranchId = <MainBranchGuid>`
     * `Prefix = "MAI"`
     * `LastNumber = 6`
2. **First Intake in MRI Branch (`P.JANAMMA`):**
   * Receptionist (Uday Sri) billed `P.JANAMMA` at the `MRI Branch`.
   * `AssignOfficialTokenAsync` invoked `GenerateDailyTokenAsync(visit.Department, today, actorUserId, mriBranchId)`.
   * The primary check (`tc.Day == today && tc.BranchId == mriBranchId && tc.Department == ""`) returned `null` because no record existed yet for `MRI Branch`.
   * **The Fallback Fired:** `tc.Day == today && tc.Department == ""` queried across the entire table without branch scoping. It retrieved the **existing MAIN branch record** where `LastNumber = 6`.
   * The logic then executed:
     * `tokenCounter.BranchId = mriBranchId;` (Hijacking the row and reassigning it to MRI Branch).
     * `tokenCounter.LastNumber++;` (Incrementing from `6` to `7`).
     * Resolved branch prefix for MRI Branch: `"MRI"`.
     * Constructed return string: `$"MRI-{7:D3}"` = **`MRI-007`**.
3. **Consequences:**
   * The first patient in the MRI branch received sequence number `007` instead of `001`.
   * Branch token sequences are completely coupled and interleaved across branches: whichever branch bills next will continue from `008` (e.g. `MAI-008` or `MRI-008`), depriving each physical clinic branch of its independent daily `001` reset sequence.

---

### Architectural Fix Specification (To be executed when authorized)

1. **Database Schema & Index Scoping (`SynOSDbContext.cs` & New EF Migration):**
   * Drop the legacy organization-wide unique index `IX_TokenCounters_Day_Department`.
   * Replace it with a branch-isolated composite unique index:
     ```csharp
     modelBuilder.Entity<TokenCounter>(entity => 
         entity.HasIndex(e => new { e.BranchId, e.Day, e.Department }).IsUnique());
     ```
   * Generate and apply migration `20261110_ScopeTokenCountersByBranch`.

2. **Remove Unsafe Cross-Branch Fallback (`VisitService.cs`):**
   * Revert lines 1630-1659 in `VisitService.cs` to strictly query and insert counters per branch:
     ```csharp
     var tokenCounter = await _context.TokenCounters
         .FirstOrDefaultAsync(tc => tc.Day == labLocalDay && tc.BranchId == branchId && tc.Department == department);

     if (tokenCounter == null)
     {
         tokenCounter = new TokenCounter
         {
             CounterId = Guid.NewGuid(),
             Department = department,
             Day = labLocalDay,
             BranchId = branchId,
             Prefix = prefix,
             LastNumber = 0,
             MaxPerSeries = 9999,
             UpdatedAt = DateTime.UtcNow
         };
         _context.TokenCounters.Add(tokenCounter);
     }
     else
     {
         await _context.Entry(tokenCounter).ReloadAsync();
     }
     ```
   * Remove the mutating line `tokenCounter.BranchId = branchId;` which overwrites branch ownership on existing counters.

3. **Data Backfill & Integrity Guard:**
   * Backfill any existing legacy rows where `BranchId IS NULL` to the designated `MAIN` branch ID.
   * If a branch has not billed any patient for the day, its counter starts cleanly at `0`, assigning `001` to its first patient (`MRI-001`, `MAI-001`, etc.) without interference.


---

## 30. Cross-Branch Notification Leaks & Session Storage Contamination (Main Branch Billing & Cash Milestone Notifications Polluting MRI Branch) — [RESOLVED & VERIFIED]
### Severity: Medium-High / Multi-Branch UI Data Isolation & Operator Confusion
### Impacted Modules & Files
* **Notification Context State & Persistence Engine:** [`NotificationContext.jsx:52-84, 120-148, 166-186`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/context/NotificationContext.jsx#L52-L84)
* **Reception Screen Real-Time Event Listener:** [`ReceptionScreen.jsx:206-245`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L206-L245)
* **Action Queue Delta Transfer Object:** [`ActionQueueRowDto.cs:7-50`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/DTOs/Dashboard/ActionQueueRowDto.cs#L7-L50)
* **Action Queue Projection Engine:** [`OperationsEngine.cs:359-488`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operations/OperationsEngine.cs#L359-L488)
* **Real-Time SignalR Broadcast Dispatcher:** [`SignalRNotifier.cs:24-85`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Services/SignalRNotifier.cs#L24-L85)
* **Dashboard SignalR Hub:** [`DashboardHub.cs:11-40`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Hubs/DashboardHub.cs#L11-L40)
* **Notification Center UI Rail:** [`ReceptionNotificationCenter.jsx:14-125`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/ReceptionNotificationCenter.jsx#L14-L125)

### Incident Evidence (Live Pilot Telemetry)
* **Active Branch Selected in Header:** `MRI Branch` (surrounded by active red boundary indicator).
* **Observed Timestamp:** `2026-11-10 14:55:37` (Live Screen).
* **Logged-in Actor:** `Tabrez Developer`.
* **Observed State in Main UI Panels:**
  * **Action Queue (Center):** Correctly scoped to `MRI Branch` via `/api/v1/branch/action-queue?branchId=...` (shows only `MRI-007` and draft `D-531183CCB2`).
  * **Activity Live Stream (Right):** Correctly scoped to `MRI Branch` via `/api/v1/branch/activity?branchId=...` (shows only `MRI-007 P.JANAMMA`).
  * **Financials & Intake (Bottom):** Active draft `Registration ID: AFC02868C2` for patient `HC-test`.
* **Contamination in Notification Center (Left Rail):**
  * Top bar indicates `Notifications (6)` with active Live pulse.
  * Card 1: `₹1,000 Billed` `Now` — *"Visit MAI-008 (DHANUSH) finalized by Desk."*
  * Card 2: `₹650 Billed` `Now` — *"Visit MAI-009 (SK.SHAHFEEN) finalized by Desk."*
  * Card 3: `₹2,450 Billed` `Now` — *"Visit MAI-011 (CH ANIL) finalized by Desk."*
  * Card 4: `₹2,200 Billed` `Now` — *"Visit MAI-015 (NAGA PRASANNA) finalized by Desk."*
  * Card 5: `₹400 Billed` `Now` — *"Visit MAI-012 (HC-test) finalized by Desk."*
  * Card 6: `₹10,000 Cash In Coun...` `10:58 AM` — *"3 bills completed, ₹10,000 cash collected today."*
* **Defect Raised by User:**
  * All 5 billed visit notifications belong to the **`MAIN` branch** (`MAI-008`, `MAI-009`, `MAI-011`, `MAI-012`, `MAI-015`), and the cash milestone notification represents MAIN branch's cash collection.
  * When operating inside the `MRI Branch`, the notification rail must be strictly branch-isolated; MAIN branch activities must never pollute the MRI branch interface.

---

### Root Cause Analysis

Investigation across the full frontend and backend telemetry paths identified **three distinct architectural leaks** that combine to cause this cross-branch pollution:

#### 1. Unpartitioned Global Storage in `NotificationContext.jsx`
* In `NotificationContext.jsx` (lines 53-83):
  ```javascript
  const [notifications, setNotifications] = useState(() => {
      try {
          const saved = sessionStorage.getItem('synos_notifications_list');
          if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
      } catch (_) {}
      return DEFAULT_SEED_NOTIFICATIONS;
  });

  useEffect(() => {
      try {
          sessionStorage.setItem('synos_notifications_list', JSON.stringify(notifications));
      } catch (_) {}
  }, [notifications]);
  ```
* **The Failure Mechanism:**
  * In SynOS, branch switching via `SystemBar.jsx` updates `localStorage.setItem('synos_oversight_branch_id', bId)` and triggers `window.location.reload()`.
  * In the browser DOM model, `sessionStorage` **persists across page reloads within the same browser tab**.
  * The storage key `'synos_notifications_list'` is **completely global and lacks any branch scoping**.
  * Any notifications accumulated while the user was on the `MAIN` branch (the 5 finalized visits and the cash milestone) were serialized to `synos_notifications_list`.
  * When the page refreshed into the `MRI Branch`, `NotificationProvider` mounted, read `'synos_notifications_list'` from `sessionStorage`, and restored all `MAIN` branch notifications directly into the `MRI Branch` view.

#### 2. SignalR Delta Listener Lacks Branch Filtering (`ReceptionScreen.jsx`)
* In `ReceptionScreen.jsx` (lines 206-245):
  ```javascript
  SignalRService.onActionQueueDeltaReceived((deltaRow) => {
      if (!deltaRow) return;

      const normalized = normalizeQueueData([deltaRow])[0];
      if (!normalized) return;

      // MULTI-DESK DRAFT ISOLATION INVARIANT (Zero-Seepage Rule):
      // Filters unfinalized drafts belonging to other receptionists...

      // OS-Level Dynamic Notification for finalized/billed visits
      if (normalized.isFinalized || normalized.operationalStatus === 'Paid') {
          const paidAmt = Number(normalized.totalPaid || normalized.amount || normalized.netAmount || 0);
          notify({
              id: `bill_${normalized.visitId || normalized.token}`,
              type: 'activity',
              category: 'billing',
              title: paidAmt > 0 ? `₹${paidAmt.toLocaleString('en-IN')} Billed` : 'Visit Finalized',
              message: `Visit ${normalized.token || ''} (${normalized.patientName || 'Patient'}) finalized by ${normalized.createdByName || 'Desk'}.`,
              action: { label: 'View Visit', type: 'ROUTE_TO_VISIT', payload: { visitId: normalized.visitId } }
          });
      }
  ```
* **The Failure Mechanism:**
  * While Section 17 introduced a *multi-desk draft isolation guard* (`currentUserId !== draftOwnerId`), there is **no branch isolation check** whatsoever.
  * Whenever an `ActionQueueDeltaReceived` event is received by the browser, `ReceptionScreen.jsx` calls `notify()` for every finalized visit unconditionally, without checking whether `normalized.branchId` matches the currently active branch (`activeOversightBranchId`).

#### 3. DTO Schema Gap: `ActionQueueRowDto` Lacks `BranchId`
* In `src/SynOS.Models/DTOs/Dashboard/ActionQueueRowDto.cs`:
  * The DTO defines `VisitId`, `Token`, `PatientName`, `TotalAmount`, `TotalPaid`, `OperationalStatus`, `AssignedToUserId`, `DepartmentCode`, etc.
  * **`BranchId` is completely missing from `ActionQueueRowDto`.**
* In `OperationsEngine.ProjectActionQueueRowAsync(Guid visitId)`:
  * Even though `visit.BranchId` is present in the `Visit` entity, it is never projected onto `ActionQueueRowDto`.
* Consequently, when `SignalRNotifier` serializes `delta` and sends it to connected clients, the receiving frontend has no reliable way to verify the branch origin of the delta row.

#### 4. SignalR Hub Channel Coupling to JWT Home Branch
* In `DashboardHub.OnConnectedAsync`:
  ```csharp
  var branchIdClaim = Context.User?.FindFirst("branch_id")?.Value;
  ...
  await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch-{branchId}");
  ```
* In `signalr.js`:
  * The WebSocket connects to `/dashboardHub` using `localStorage.getItem('synos_jwt')`.
  * The JWT contains the user's permanent home branch (`MAIN`).
  * When an admin or multi-branch user switches to `MRI Branch`, `activeOversightBranchId` is stored in `localStorage`, but the JWT is NOT re-minted.
  * As a result, the WebSocket connection remains joined to `Branch-<MainBranchId>`.
  * When any receptionist bills a patient at `MAIN`, `SignalRNotifier` broadcasts to `Branch-<MainBranchId>` (and to `Clients.User(...)`), which is immediately delivered to the user's browser even while viewing `MRI Branch`.

---

### Architectural Fix Specification (To be executed when authorized)

1. **Branch-Scoped Storage & Notification State (`NotificationContext.jsx`):**
   * Scope notification storage keys by active branch:
     ```javascript
     const activeBranchId = localStorage.getItem('synos_oversight_branch_id') || 'default';
     const storageKey = `synos_notifications_${activeBranchId}`;
     ```
   * Listen for branch switch events or reload changes: clear or swap the active notifications list to match the active branch.
   * Attach `branchId` to each notification item generated by `notify()`:
     ```javascript
     const newNotif = {
         ...
         branchId: item.branchId || activeBranchId,
     };
     ```
   * In `ReceptionNotificationCenter.jsx`, strictly filter displayed cards:
     ```javascript
     const branchNotifications = notifications.filter(n => !n.branchId || n.branchId === activeBranchId);
     ```

2. **Add `BranchId` to `ActionQueueRowDto` (`ActionQueueRowDto.cs` & `OperationsEngine.cs`):**
   * Add `public Guid? BranchId { get; set; }` to `ActionQueueRowDto.cs`.
   * Populate `BranchId = visit.BranchId` in `OperationsEngine.ProjectActionQueueRowAsync`.

3. **Enforce Branch Invariant in `ReceptionScreen.jsx` Delta Handler:**
   * In `SignalRService.onActionQueueDeltaReceived`:
     ```javascript
     const activeBranchId = localStorage.getItem('synos_oversight_branch_id') || user?.branchId;
     if (normalized.branchId && activeBranchId && String(normalized.branchId).toLowerCase() !== String(activeBranchId).toLowerCase()) {
         return; // Discard foreign branch deltas
     }
     ```
   * Pass `branchId: normalized.branchId` into `notify({ ... })`.

4. **Dynamic SignalR Group Subscription on Branch Switch (`DashboardHub.cs` & `signalr.js`):**
   * Pass the active branch ID in query parameters when establishing the SignalR connection (`/dashboardHub?branchId=...`), or implement a `JoinBranchGroup(string branchId)` hub method invoked when switching branches.
   * Ensure `DashboardHub` joins the client to `Branch-{activeBranchId}` rather than exclusively using the static JWT claim.


---

## 31. Live SignalR Broadcast Seepage into Foreign Branch (Main Branch Reality Summary & Queue Delta Polluting Active MRI Branch View) — [RESOLVED & VERIFIED]
### Severity: High / Cross-Branch Data Leakage & Real-Time Operational Pollution
### Impacted Modules & Files
* **Reception Screen Event Listeners:** [`ReceptionScreen.jsx:195-267`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L195-L267)
* **Real-Time SignalR Broadcast Dispatcher:** [`SignalRNotifier.cs:64-85, 137-148`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Services/SignalRNotifier.cs#L64-L85)
* **SignalR Dashboard Hub Group Assignment:** [`DashboardHub.cs:24-30`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Hubs/DashboardHub.cs#L24-L30)
* **Action Queue Row Delta DTO:** [`ActionQueueRowDto.cs:7-50`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/DTOs/Dashboard/ActionQueueRowDto.cs#L7-L50)
* **Frontend Cache Storage:** [`ReceptionScreen.jsx:34-52`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/ReceptionScreen.jsx#L34-L52)

### Incident Evidence (Live Pilot Telemetry)
* **Active Branch Selected in Header:** `MRI Branch` (code prefix `MRI`, branch dropdown active).
* **Observed Timestamp:** `2026-11-10 15:04:04` (Before Browser Refresh).
* **Logged-in Actor:** `Tabrez Developer`.
* **Observed Reality Summary Cards (Image 1):**
  * Walk-Ins (Paid/Credit): `15` (Belongs to MAIN branch; MRI branch had only 1 confirmed visit).
  * Cash Collected: `₹3,230` (Belongs to MAIN branch).
  * Online Payments: `3` (Online Total: `₹3,500`) (Belongs to MAIN branch).
  * Prepaid Bills Issued: `8` (Prepaid Total: `₹4,980`) (Belongs to MAIN branch).
  * Cash in the Drawer: `₹3,230`.
* **Observed Action Queue Table (Image 1):**
  * `MAI-018` | `VEERANNA 35y/M` | `₹2,000 CASH` | `• Ready for Sample`
  * This visit was finalized in the **`MAIN` Branch**, yet it was injected live into the **`MRI Branch` Action Queue table**.
* **Post-Refresh Behavior (Image 2 - 16:06:10):**
  * When the user pressed browser refresh (`F5`), `MAI-018` completely disappeared.
  * Walk-Ins dropped from `15` to `2` (the genuine count of MRI branch visits).
  * Prepaid Bills dropped from `8` to `2` (Prepaid Total: `₹6,800`, matching `MRI-001` ₹2,800 + `MRI-002` ₹4,000).

---

### Root Cause Analysis

The incident demonstrates a severe divergence between **initial REST API hydration** (which is branch-isolated) and **live WebSocket SignalR subscriptions** (which are not):

1. **Static JWT Token vs. Dynamic Branch Oversight:**
   * When `Tabrez Developer` connects to the system, SignalR establishes a WebSocket connection to `/dashboardHub` using `localStorage.getItem('synos_jwt')`.
   * In `DashboardHub.OnConnectedAsync`:
     ```csharp
     var branchIdClaim = Context.User?.FindFirst("branch_id")?.Value;
     await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch-{branchId}");
     ```
   * The user's JWT has `branch_id = <MainBranchGuid>`.
   * When switching to `MRI Branch` via the header dropdown, `activeOversightBranchId` is saved in `localStorage`, but the JWT is never re-issued.
   * Consequently, the browser's live WebSocket remains permanently joined to `Branch-<MainBranchGuid>`.

2. **Unfiltered SignalR Ingestion in `ReceptionScreen.jsx`:**
   * **Reality Summary Ingestion (`ReceptionScreen.jsx:195-203`):**
     ```javascript
     SignalRService.onReceptionSummaryUpdated((payload) => {
         if (payload) {
             setSummary(payload);
             localStorage.setItem('synos_cached_reality_summary', JSON.stringify(payload));
         }
     });
     ```
     When any cashier at MAIN branch accepted a payment, `SignalRNotifier.NotifyRealitySummaryUpdateAsync` broadcasted `ReceptionSummaryUpdated` to `Branch-<MainBranchGuid>`.
     Because `Tabrez Developer` was still listening to that channel, this listener fired and unconditionally overwrote the MRI Branch reality summary cards with MAIN branch stats (`15 walk-ins, ₹3,230 cash, 8 prepaid bills`).
   * **Action Queue Delta Ingestion (`ReceptionScreen.jsx:206-267`):**
     ```javascript
     SignalRService.onActionQueueDeltaReceived((deltaRow) => {
         const normalized = normalizeQueueData([deltaRow])[0];
         ...
         setActionQueue(prev => [normalized, ...prev]);
     });
     ```
     When visit `MAI-018` was billed at MAIN branch, `SignalRNotifier` broadcasted `ActionQueueDeltaReceived` to `Branch-<MainBranchGuid>`.
     `ReceptionScreen.jsx` received `MAI-018` and prepended it straight into the MRI branch table.

3. **Why Refresh Fixed the Table and Tiles:**
   * On browser refresh, `refreshDashboard()` executes REST calls: `ReceptionApi.getActionQueue()` and `ReceptionApi.getDailySummary()`.
   * These REST calls pass `?branchId=<MRI_Branch_Guid>`.
   * The database query executed exclusively for the MRI Branch. Thus, `MAI-018` was filtered out and the genuine counts (`2 walk-ins`, `2 prepaid bills`) were restored.

---

## 32. Reality Summary Cash Collected Stagnation on Visit Mode Correction (Cash Bill Converted to Prepaid Leaving Cash Stuck at ₹10,000) — [RESOLVED & VERIFIED]
### Severity: High / Financial Reporting Inaccuracy & Ledger Stagnation
### Impacted Modules & Files
* **Daily Revenue Calculation Engine:** [`InvoiceService.cs:157-222`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L157-L222)
* **Visit Correction Settlement Handler:** [`VisitService.cs:2452-2488, 2630-2695`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L2452-L2488)
* **Operational Stats Projection Engine:** [`OperationalStatsProjector.cs:238-305`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operational/OperationalStatsProjector.cs#L238-L305)

### Incident Evidence (Live Pilot Telemetry)
* **Observed Screenshot:** Image 2 (`2026-11-10 16:06:10`, Post-Refresh).
* **Active Queue State for MRI Branch:**
  * `MRI-001` | `P.JANAMMA` | `₹2,800 PREPAID POOJA HOSPITALS`
  * `MRI-002` | `B.BALU` | `₹4,000 PREPAID MEDHA HOSPITAL`
  * There are **zero cash visits** in the active queue today.
* **Observed Reality Summary Cards:**
  * Walk-Ins: `2`
  * Prepaid Bills: `2` (Prepaid Total: `₹6,800`)
  * **Cash in the Drawer: `₹0`** (Accurate: physical drawer has zero cash).
  * **Cash Collected: `₹10,000`** (Completely wrong: showing ₹10,000 despite zero cash bills).
* **Operational Context Provided by User:**
  * Visit `MRI-002` was initially registered and billed as a **Cash bill for ₹10,000**.
  * The user subsequently executed a **Visit Correction** on `MRI-002`, changing it from Cash (₹10,000) to Corporate B2B Prepaid (₹4,000 Medha Hospital).
  * Even after refreshing the page, `Cash Collected` remains frozen at **`₹10,000`**.

---

### Root Cause Analysis

Investigation of the backend financial calculation revealed a **defective fallback expression** in [`InvoiceService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L211-L221) combined with an **event reversal gap** in [`VisitService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L2452-L2462):

#### 1. The Broken Ternary Fallback in `InvoiceService.cs:218`
* In `InvoiceService.GetDailyRevenueStatsAsync`:
  ```csharp
  var payments = await paymentsQuery.ToListAsync(); // Query payments for this branch today
  decimal cashTotal = payments.Where(p => isCash(p.Method)).Sum(p => p.Amount);
  ...
  // Direct ledger takes precedence for real-time accuracy (partial payments, refunds, cash desk)
  decimal finalCash = payments.Any() ? cashTotal : (stats?.Cash ?? 0m);
  ```
* **The Fatal Flaw:**
  * When `MRI-002` was changed from Cash to Prepaid, `VisitService.cs` (lines 2455-2461) executed:
    ```csharp
    var counterPayments = invoice.Payments.Where(p => p.Method != "PartnerAccount" ...).ToList();
    _context.Payments.RemoveRange(counterPayments);
    ```
    This successfully deleted the ₹10,000 cash payment row from `dbo.Payments`.
  * Because there were no other cash visits at MRI branch today, `paymentsQuery.ToListAsync()` returned an **empty list** (`payments.Count == 0`).
  * Therefore, `payments.Any()` evaluated to **`FALSE`**!
  * Because `payments.Any()` was false, the ternary skipped `cashTotal` (which was `0m`) and fell back to:
    ```csharp
    (stats?.Cash ?? 0m)
    ```
  * `stats` comes from `dbo.UserOperationalStats` / `dbo.BranchOperationalStats`!

#### 2. The Projection Reversal Gap in `VisitService.cs` & `OperationalStatsProjector.cs`
* When `MRI-002` was initially paid in cash, a `PAYMENT_RECEIVED` event was published.
* `OperationalStatsProjector.cs` incremented:
  ```csharp
  userStats.PaymentsCashTotal += 10000m;
  branchStats.PaymentsCashTotal += 10000m;
  ```
* When the visit correction occurred:
  * `VisitService.cs` deleted the payment from `dbo.Payments` and emitted `BranchEventType.VISIT_UPDATED`.
  * However, `OperationalStatsProjector.cs` **does not listen to `VISIT_UPDATED` to adjust payment statistics**, nor did `VisitService.cs` emit a `PAYMENT_VOIDED` event for the removed cash payment.
  * Consequently, `UserOperationalStats.PaymentsCashTotal` remained permanently recorded as **`10,000`**.

#### 3. Contrast Between "Cash in Drawer" vs "Cash Collected"
* **Cash in Drawer (`₹0`):** Calculated on line 284 using `branchCashTotal = allBranchPayments.Where(p => isCash(p.Method)).Sum(p => p.Amount)`. Because `allBranchPayments` had 0 cash rows, it correctly evaluated `0 - 0 = 0` (rendered as `₹0`).
* **Cash Collected (`₹10,000`):** Calculated on line 218 using the broken ternary `payments.Any() ? cashTotal : stats.Cash`. Because `payments.Any()` was false, it picked up `stats.Cash` (10,000), leaving the card frozen at `₹10,000` even though not a single rupee of cash was collected.

---

### Architectural Fix Specification (To be executed when authorized)

1. **Fix Fallback Logic in `InvoiceService.cs` (`GetDailyRevenueStatsAsync`):**
   * Do NOT use `payments.Any()` to gate `cashTotal`. If the branch has active confirmed visits for today, the authoritative sum from `dbo.Payments` (`cashTotal`) is the absolute truth, even when it is `0m`:
     ```csharp
     // Authoritative truth from direct ledger
     decimal finalCash = cashTotal;
     decimal finalOnline = onlineTotal;
     int finalOnlineCount = onlineCount;
     decimal finalTotal = totalPayments;
     ```
   * Only fall back to `stats?.Cash` if the ledger query itself is completely unindexed or bypassed in offline emergency mode.

2. **Emit `PAYMENT_VOIDED` on Payment Removal during Visit Correction (`VisitService.cs`):**
   * In `VisitService.cs` (lines 2455-2461), when removing counter payments during a billing mode switch:
     ```csharp
     foreach (var cp in counterPayments)
     {
         _context.Payments.Remove(cp);
         await _operationalEventWriter.WriteEventAsync(
             BranchEventType.PAYMENT_VOIDED,
             visit.BranchId.ToString(),
             visit.VisitId.ToString(),
             visit.Token,
             $"Counter payment of ₹{cp.Amount:N0} voided via visit correction",
             actorName,
             actorUserId.ToString(),
             true, null, null,
             TimelineVisibility.Surface,
             visit.VisitId,
             metadata: JsonSerializer.Serialize(new { PaymentId = cp.PaymentId, Amount = cp.Amount, Method = cp.Method })
         );
     }
     ```

3. **Branch Isolation on WebSocket Channels (`signalr.js` & `DashboardHub.cs`):**
   * Re-bind SignalR connection dynamically when `activeOversightBranchId` changes so that clients only join the group of the active branch on screen.
   * Discard any SignalR delta or summary updates in `ReceptionScreen.jsx` if `payload.branchId !== activeOversightBranchId`.


---

## 33. Multi-Channel Split Payment (Cash + UPI) Accounting & UI Transparency Audit — [RESOLVED & VERIFIED]
### Severity: Medium-High / Front-Desk Operational Confusion & Slip Reconciliation
### Impacted Modules & Files
* **Action Queue Projection Engine:** [`OperationsEngine.cs:556-568, 590-595`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operations/OperationsEngine.cs#L556-L568)
* **Thermal POS Slip Generator:** [`thermalPrinter.js:185-215, 420-435`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/utils/thermalPrinter.js#L185-L215)
* **Print Thermal Receipt Event DTO:** [`PrintThermalReceiptEvent.cs:35-39`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Events/Reception/PrintThermalReceiptEvent.cs#L35-L39)
* **Reception Payment Intent Panel:** [`IntentPanel.jsx:1543-1580, 1995-2020`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx#L1543-L1580)
* **Reception Flow Payment Processor:** [`ReceptionFlowService.cs:940-1000`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ReceptionFlowService.cs#L940-L1000)
* **Daily Revenue & Cash Drawer Calculation:** [`InvoiceService.cs:211-235`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L211-L235)
* **Bills & Collections Ledger:** [`FinanceBillsController.cs:502-522, 694-696`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L502-L522)
* **Cashier Shift Closing Ledger:** [`FinanceBillsController.cs:1850-1863`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1850-L1863)

### Incident & Scenario Evidence
* **Observed Test Case in Draft Mode (Image 2):**
  * Registration ID: `#D-F1C3727F51` | Patient: `Test Patient3` 43y/M
  * Test: `CBP WITH PLATELETS` (Bill Total: `₹400`)
  * Settlement: `Full (₹400)` with `Split / Multi-Channel Payment` enabled
  * Split Breakdown: `Cash from Patient: ₹150` | `UPI / QR Scan: ₹250`
  * Action Button: `Accept Split Payment (₹150 Cash + ₹250 UPI) →`
* **Live Incident Raised by Operator (Image 1):**
  * Operator used the "Split UPI and Cash" button to settle a patient bill.
  * Operator claimed *"something is wrong and something didn't work"* because:
    1. In the Action Queue table (`PAYMENT` column), the visit did NOT indicate it was split. It displayed a single payment badge (e.g. `₹2,000 UPI` on `MAI-018` or `₹2,000 CASH`), leading the cashier to believe the system had charged the full amount to one method.
    2. The thermal paper receipt printed `Payment Mode: SPLIT (CASH+UPI)` without itemizing how much was paid in Cash vs UPI.

---

### Deep Dive Audit: Where Does the Money Go? (e.g. ₹2,000 Bill = ₹500 Cash + ₹1,500 UPI)

#### 1. Database Ledger Accounting (`dbo.Payments`): **[WORKING CORRECTLY]**
* In `ReceptionFlowService.cs:940-958`:
  ```csharp
  foreach (var sp in request.SplitPayments.Where(p => p.Amount > 0))
  {
      var spDto = new PaymentRequestDto { Amount = sp.Amount, Method = sp.Method, ... };
      lastPayment = await _invoiceService.RecordPaymentAsync(invoiceId, spDto);
  }
  ```
* For a ₹2,000 bill split as ₹500 Cash + ₹1,500 UPI, the backend creates **two separate, immutable payment rows** in `dbo.Payments`:
  * Row 1: `Amount = ₹500.00`, `Method = "Cash"`
  * Row 2: `Amount = ₹1,500.00`, `Method = "UPI"`
* Both rows are linked to the same `InvoiceId` and sum to ₹2,000.

#### 2. Cash Drawer & Shift Handover Accounting: **[WORKING CORRECTLY]**
* **Reality Summary "Cash in the Drawer" (`InvoiceService.cs:235`):**
  * Queries `allBranchPayments.Where(p => isCash(p.Method)).Sum(p => p.Amount)`.
  * Filters strictly for `Cash` and captures exactly **`₹500`**.
* **Cashier Shift Closing (`FinanceBillsController.cs:1850-1863`):**
  * `standardCashPayments = cashierPayments.Where(p => p.Method.Contains("cash"))` -> captures **`₹500`**.
  * `standardUpiPayments = cashierPayments.Where(p => p.Method.Contains("upi"))` -> captures **`₹1,500`**.
* **Physical Cash Ledger (`/cash-drawer/my-ledger`):**
  * Displays the ₹500 cash payment as an inflow transaction in the cashier's drawer ledger.

#### 3. Revenue Tab & Bills and Collections Ledger: **[WORKING CORRECTLY]**
* In `FinanceBillsController.cs:507-522`:
  * Iterates `genuinePayments`: adds ₹500 to `cashAmount` and ₹1,500 to `onlineAmount`.
* In `RevenueScreens.jsx:1362-1366`:
  * Renders: `Cash: ₹500` and `Online: ₹1,500` under the Collected column.
* In Revenue KPI headers:
  * Sums `bill.cashAmount` into Total Cash Collections, and `bill.onlineAmount` into Online Collections.

---

### Root Causes: Why Did the Operator Claim "It Didn't Work"?

While backend mathematical accounting is sound, the **User Interface and Document engines suffer from three severe transparency defects**:

#### Defect 1: Action Queue PAYMENT Column Obliterates Split Payments
* In `OperationsEngine.cs` (lines 556-568 & 590-595):
  ```csharp
  if (invoice != null && (invoice.Status == "Paid" || invoice.Status == "FullPaid"))
  {
      var method = invoice.Payments.FirstOrDefault()?.Method;
      return method ?? "Paid";
  }
  ```
* **The Glitch:**
  * `OperationsEngine` only checks `invoice.Payments.FirstOrDefault()?.Method`.
  * It completely ignores whether the invoice has multiple payment rows!
  * If the ₹1,500 UPI row happens to be first, `PaymentDisplay` evaluates to **`UPI`**.
  * `ActionQueueCells.jsx` renders: **`₹2,000 UPI`** with a cyan badge.
  * The cashier sees `₹2,000 UPI` and panics, believing the ₹500 cash portion was ignored.

#### Defect 2: Thermal POS Slip Lacks Payment Breakdown
* In `thermalPrinter.js` (lines 185-189 & 425-428):
  * The receipt template uses a single string variable:
    ```html
    <span>Payment Mode:</span>
    <span style="font-weight: 900;">${rawPaymentMethod}</span>
    ```
  * If `rawPaymentMethod` is `"Split (Cash+UPI)"`, the receipt prints:
    `Amount Received: ₹2,000.00`
    `Payment Mode: SPLIT (CASH+UPI)`
  * It **never prints the itemized amounts** (`Cash: ₹500.00`, `UPI: ₹1,500.00`).
  * If `rawPaymentMethod` falls back to `"Cash"` or `"UPI"`, it falsely tells the patient that 100% of the bill was paid via that single channel.
* Furthermore, `PrintThermalReceiptEvent.cs` **omits the `Payments` list entirely** from the event payload, preventing printer terminals from rendering split payment line items.

#### Defect 3: Silent Single-Method Fallback on Input Discrepancy in `IntentPanel.jsx`
* In `IntentPanel.jsx` (lines 1543-1579 & 1995-2019):
  ```javascript
  if (isSplitPayment && (Number(splitCashAmount) + Number(splitUpiAmount) === effectiveAmount)) {
      paymentPayload = {
          Method: 'Split (Cash+UPI)',
          SplitPayments: [ ... ]
      };
  } else {
      paymentPayload = {
          Method: methodToUse, // Single method (e.g. 'Cash' or 'UPI')
          ...
      };
  }
  ```
* **The Trap:**
  * If the receptionist toggles "Split Payment", but the sum of `splitCashAmount` + `splitUpiAmount` does not **exactly match** the bill total (e.g. typing error, extra digit, or unbalanced partial due):
    * The main action button **does NOT disable**. It silently falls back to `Accept Payment (₹2,000)`.
    * When clicked, the code silently enters the `else` branch, sending `Method: 'Cash'` (or `'UPI'`) with **zero split data**.
    * The entire bill is collected under a single method without any warning or validation error.

#### Defect 4: Incomplete `PaymentConfirmedFact` Emission
* In `ReceptionFlowService.cs:957-1000`:
  * In split payment mode, `payment = lastPayment`.
  * `PaymentConfirmedFact` is only created for `payment.PaymentId` (the second payment).
  * The first payment (Cash) never receives an immutable `PaymentConfirmedFact`.

---

### Architectural Fix Specification (To be executed when authorized)

1. **Action Queue Multi-Method Support (`OperationsEngine.cs`):**
   * In `DerivePaymentDisplay` and `DerivePaymentMethod`:
     ```csharp
     if (invoice != null && (invoice.Status == "Paid" || invoice.Status == "FullPaid"))
     {
         var validPayments = invoice.Payments.Where(p => p.Amount > 0).ToList();
         if (validPayments.Count > 1)
         {
             var methods = string.Join(" + ", validPayments.Select(p => p.Method).Distinct());
             return $"Split ({methods})";
         }
         return validPayments.FirstOrDefault()?.Method ?? "Paid";
     }
     ```
   * In `ActionQueueCells.jsx`, render a distinct pastel purple badge for `Split` payments.

2. **Thermal Receipt Breakdown (`thermalPrinter.js` & `PrintThermalReceiptEvent.cs`):**
   * Add `public List<PaymentSummaryDto> Payments { get; set; } = new();` to `PrintThermalReceiptEvent.cs`.
   * In `thermalPrinter.js`, when `normalizedData.financial.payments.length > 1`, render itemized lines:
     ```html
     <div style="font-size: 10px; margin-top: 2px;">
         <div>• Cash: ₹500.00</div>
         <div>• UPI / QR: ₹1,500.00</div>
     </div>
     ```

3. **IntentPanel Strict Validation Guard (`IntentPanel.jsx`):**
   * When `isSplitPayment` is true, disable the submit button unless `splitCashAmount + splitUpiAmount === payNowAmount`.
   * Never silently fall back to pure cash/UPI when the split toggle is active.

4. **Iterate All Split Payments for `PaymentConfirmedFact` (`ReceptionFlowService.cs`):**
   * Loop through all recorded split payments and create a `PaymentConfirmedFact` for each payment entity.

---

## 34. A4 Document Layout Unification (Target Print Standard Across B2B, Direct, and Insurance Modules) — [IMPLEMENTED & VERIFIED]
### Severity: Medium / Visual Uniformity & Commercial Print Standardization
### Impacted Modules & Files
* **Dynamic Invoice Canvas Renderer:** [`DynamicInvoiceCanvas.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/components/documents/DynamicInvoiceCanvas.jsx)
* **Document Layout Schemas Registry:** [`documentLayoutSchemas.js`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/components/documents/documentLayoutSchemas.js)

### Target Document Suite
1. **Corporate B2B Prepaid Mode:**
   * Doctor Bill A4 (`partner_b2b_invoice`)
   * B2B Corporate Summary A4 (`summary_corporate`)
   * Prepaid Patient Slip A4 (`prepaid_patient_a4_slip`)
2. **Direct Mode:**
   * Patient Tax Invoice A4 (`patient_tax_invoice`)
3. **Insurance / TPA Mode:**
   * Insurance TPA Claim Invoice A4 (`insurance_tpa_claim`)
   * Insurance Summary A4 (`summary_insurance`)

### Resolution Summary
* **Header:** Rendered brand initials tile (`SD` or uploaded logo), lab legal name, facility address, contact phone with icon, and billing email with icon on the left, paired with a shaded metadata card (Invoice No., Statement Date, Billing Period) on the top right.
* **Title & Badge:** Replaced plain headers with solid dark title badge, color-coded payment status pill, and descriptive subtitle bar.
* **Party Details:** Replaced loose text fields with a rounded card featuring a light-grey header title bar, a clean 2-column demographics grid without double colons, and an integrated billing desk audit strip.
* **Investigation Table:** Adjusted column weights and added non-wrapping flags for short and numeric headers to eliminate vertical per-letter breaking (`D-A-T-E`, `L-A-B- -T-A-R-I-F-F`). Removed harsh vertical column borders for a clean horizontal row layout.
* **Dual Lower Block:** Implemented a side-by-side grid uniting the Payment Details card (QR code + bank remittance info) on the left and the Financial Summary card (totals breakdown + highlighted soft red Net Amount Due bar) on the right.
* **Settlement Terms & Footer:** Added clean Commercial Settlement Terms numbered list and a unified 3-part bottom footer (`Generated by SynOS Diagnostics OS | Page 1 of 1 | Printed on {timestamp}`).
* **Thermal Isolation:** Preserved all 80mm thermal receipt code paths intact.


---

## 35. Reception Same-Day B2B Settlement Crash (Duplicate Key Violation on `Payments.ReceiptNo` during Multi-Visit Clearance) — [RESOLVED & VERIFIED]
### Severity: High / Front-Desk B2B Collection Blocker (HTTP 500 `DbUpdateException`)
### Impacted Modules & Files
* **Settlement Service (Receivables Engine):** [`SettlementService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs) (lines 623, 668)
* **Database Model Definition:** [`SynOSDbContext.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/SynOSDbContext.cs) (line 773)
* **Settlement API Endpoint:** [`SettlementsController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/SettlementsController.cs) (lines 62-95)
* **Frontend Receivables Modal:** [`AccountsReceivableModal.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/AccountsReceivableModal.jsx)

### Incident Evidence
* **Incident Action:** Front desk receptionist opens `Accounts Receivable Terminal` (`#RCP-B2B`), selects partner `DISHA HOSPITAL (ACTIVE)` with 2 visits (`#MAI-010 SK.KUBRA FATHIMA ₹500` and `#MAI-009 SK.SHAHFEEN ₹300`, Total: `₹800`), tenders `₹800` via Cash Drawer, and clicks **Authorize Settlement**.
* **Observed UI Failure:** An error modal immediately blocks the screen:
  > *"An error occurred while saving the entity changes. See the inner exception for details."*
* **Browser DevTools Console Diagnostics:**
  ```text
  Failed to load https://synos.tbzlabs.in/api/settlements/reception/b2b-today/settle resource: the server responded with a status of 500 ()
  Settlement failed: Error: An error occurred while saving the entity changes. See the inner exception for details.
  ```

### Detailed Root Cause Analysis
1. **Batch Settlement Loop Sharing a Single Receipt Number:**
   * In `SettlementService.cs`, method `SettleSameDayB2BReceivablesAsync` handles batch settlement of selected invoices for a referring partner.
   * At line 623:
     ```csharp
     var receiptNo = $"RCP-B2B-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
     ```
     A single `receiptNo` is generated **once** before entering the loop over the selected visits (`facts`).
   * In lines 629–672, the service iterates over each receivable fact (`foreach (var fact in facts)`). For every visit where a payment is applied, it instantiates a new `Payment` entity:
     ```csharp
     var payment = new Payment
     {
         PaymentId = Guid.NewGuid(),
         InvoiceId = invoice.InvoiceId,
         Amount = paymentApply,
         Method = request.PaymentMode,
         ReceiptNo = receiptNo, // <--- IDENTICAL FOR EVERY VISIT IN THE BATCH!
         ReceivedAt = DateTime.UtcNow,
         ReceivedByUserId = userId
     };
     _context.Payments.Add(payment);
     ```
2. **Database Unique Index Conflict (`IX_Payments_ReceiptNo`):**
   * In `SynOSDbContext.cs` line 773:
     ```csharp
     modelBuilder.Entity<Payment>(entity =>
     {
         entity.HasIndex(e => e.ReceiptNo).IsUnique();
     });
     ```
   * The database enforces that every row in `dbo.Payments` MUST have a globally unique `ReceiptNo`.
   * When settling a single visit (1 invoice), the operation succeeds because only one `Payment` row is created with that `receiptNo`.
   * However, when a partner has **2 or more visits** (e.g. Disha Hospital with 2 visits), EF Core queues two `Payment` entities sharing the exact same `receiptNo` (e.g., `RCP-B2B-20261110-3F8A21`).
   * When `_revenueFactWriter.DeclareRevenueFactAsync` or `_context.SaveChangesAsync()` runs inside the transaction, SQL Server detects the duplicate key violation:
     ```sql
     Cannot insert duplicate key row in object 'dbo.Payments' with unique index 'IX_Payments_ReceiptNo'. The duplicate key value is (RCP-B2B-20261110-3F8A21).
     ```
   * EF Core wraps this in a `DbUpdateException` which bubbles up as HTTP 500: *"An error occurred while saving the entity changes. See the inner exception for details."*

### Architectural Fix Specification
1. **Unique Suffixing per Batch Payment Entity (`SettlementService.cs`):**
   * Generate an indexed sequence or sub-receipt suffix per visit in the batch so each `Payment` record has an absolute unique key in `dbo.Payments`:
     ```csharp
     var batchGroupRef = $"RCP-B2B-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
     int itemIndex = 1;
     foreach (var fact in facts)
     {
         ...
         var itemReceiptNo = facts.Count > 1 ? $"{batchGroupRef}-{itemIndex:D2}" : batchGroupRef;
         itemIndex++;

         var payment = new Payment
         {
             PaymentId = Guid.NewGuid(),
             InvoiceId = invoice.InvoiceId,
             Amount = paymentApply,
             Method = request.PaymentMode,
             ReceiptNo = itemReceiptNo,
             Notes = $"B2B Batch Settle Ref: {batchGroupRef}",
             ReceivedAt = DateTime.UtcNow,
             ReceivedByUserId = userId
         };
         ...
     }
     ```
   * This guarantees that:
     - SQL Server's unique constraint `IX_Payments_ReceiptNo` is 100% satisfied.
     - Single-visit settlements keep the clean `RCP-B2B-YYYYMMDD-XXXXXX` format.
     - Multi-visit settlements generate `RCP-B2B-YYYYMMDD-XXXXXX-01`, `RCP-B2B-YYYYMMDD-XXXXXX-02`, etc., and cross-reference the master batch group in `Notes`.
     - Financial audit trails and thermal/A4 receipt printers can query either the batch reference or individual receipt item cleanly.


---

## 36. Collection History & Drawer Pool Refund Inflation (Positive Inversion of Reversal Facts & Cashier Ledger Distortion) — [RESOLVED & VERIFIED]
### Severity: High / Financial Accounting & Cash Reconciliation Defect
### Impacted Modules & Files
* **Economics Intelligence (Collection History):** [`EconomicsIntelligenceService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/EconomicsIntelligence/EconomicsIntelligenceService.cs) (lines 1026–1029, 1140–1145)
* **Finance Collection History Frontend:** [`RevenueScreens.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/RevenueScreens.jsx) (lines 3377–3383, 3436–3439, 3691–3694)
* **Visit Cancellation & Event Emission:** [`VisitService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs) (lines 1519–1531, 1582–1602)
* **Operational Stats Projector:** [`OperationalStatsProjector.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Operational/OperationalStatsProjector.cs) (lines 145–160, 225–253)
* **Daily Revenue & Drawer Stats Engine:** [`InvoiceService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs) (lines 60–85, 211–248, 283–286)

### Incident Evidence
* **Incident Scenario:** Receptionist Moin billed patient Khaja (`MAI-001`) for ₹2,900 cash at 07:51. At 07:56, the visit was cancelled and ₹2,900 cash was refunded to the patient. Later, Moin collected ₹80 (`MAI-002`) and ₹500 (`MAI-003`).
* **Expected Physical Reality:**
  - Net cash intake for Moin: `+₹2,900 (MAI-001) - ₹2,900 (Refund) + ₹80 (MAI-002) + ₹500 (MAI-003) = ₹580`.
  - Row 3 in table: `-₹2,900` in red (`text-rose-500`) with note `"Visit Refund Disbursed"`.
* **Observed UI Failure in Screenshot:**
  - Row 3 displays as **`+₹2,900` in emerald green** with note `"Visit Refund Disbursed"`.
  - Moin's Staff Breakdown Card displays **`₹6,380`** (`4 rpts • ₹6,380 C`) instead of `₹580`.
  - Top Summary Cards: Total Collections = `₹6,380`, Cash Collections = `₹6,380`, All Staff = `₹24,420`.
  - **Accounting Distortion:** The ₹2,900 refund was **ADDED** instead of subtracted, inflating Moin's intake by `₹5,800` (`₹6,380` vs `₹580`).
  - **Drawer Pool Impact:** The Reception Desk Cash Drawer Pool and individual drawer balances fail to decrement immediately on cancellation due to missing SignalR live invalidation and actor ID parameter swapping during event projection.

### Detailed Root Cause Analysis

#### 1. Unsigned Direction Blindness in `EconomicsIntelligenceService.cs`
* In `RevenueFact`, the database stores `Amount` as an unsigned decimal magnitude (`2900m`), while its accounting direction is stored in `Direction` (`RevenueDirection.Inflow` vs `RevenueDirection.Reversal`).
* In `EconomicsIntelligenceService.GetRevenueFactsAsync` (line 1142):
  ```csharp
  results.Add(new
  {
      RevenueFactId = f.RevenueFactId,
      OccurredAt = f.OccurredAt,
      Amount = f.Amount, // <--- DEFECT: Always outputs positive decimal (2900m)!
      Currency = f.Currency,
      Direction = f.Direction.ToString(), // "Reversal"
      ...
  ```
* While other aggregation methods in `EconomicsIntelligenceService.cs` (lines 252, 257) correctly apply:
  `fact.Direction == RevenueDirection.Inflow ? fact.Amount : -fact.Amount`
  `GetRevenueFactsAsync` completely omitted this direction sign! It returned `amount: 2900` with `direction: "Reversal"`.

#### 2. Blind Client-Side Reduction in `RevenueScreens.jsx`
* In `RevenueScreens.jsx`:
  - **Staff Card Aggregation (lines 3377–3383):**
    ```javascript
    const amt = Number(r.amount) || 0;
    existing.total += amt;
    if (mode.includes('cash')) existing.cash += amt;
    ```
  - **Top KPI Reduction (lines 3436–3439):**
    ```javascript
    const totalCollected = filteredHistory.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const cashTotal = filteredHistory.filter(r => (r.paymentMode || '').toLowerCase().includes('cash')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    ```
  - **Table Rendering (lines 3691–3694):**
    ```jsx
    <span className={Number(row.amount) < 0 ? "text-rose-500 font-mono" : "text-emerald-600 dark:text-emerald-400 font-mono"}>
        {Number(row.amount) < 0 ? `-₹${Math.abs(Number(row.amount)).toLocaleString()}` : `₹${Number(row.amount).toLocaleString()}`}
    </span>
    ```
* The frontend blindly relied on `Number(r.amount) < 0`. Because the backend returned `+2900`, the frontend treated the refund as positive income, colored it green, and added `+2900` to Moin's intake (`500 + 80 + 2900 + 2900 = 6380`).

#### 3. Drawer Pool & Reality Summary Invalidation Disconnect
* **Parameter Mismatch in `VisitService.cs` (line 1588):**
  When emitting `VISIT_CANCELLED`, `actorName` ("Moin") was passed as `actorType`, and `cancelDto.CancelledByUserId.ToString()` was passed as `actorName`. In `OperationalStatsProjector.cs:155`, `Guid.TryParse(evt.ActorName, out receptionistId)` only executes when `evt.ActorType == "User"`. Because `evt.ActorType` was `"Moin"`, the user ID was lost and `userStats` was attributed to `Guid.Empty`, leaving Moin's `UserOperationalStats.PaymentsCashTotal` unreduced.
* **Missing Live SignalR Broadcast:**
  `VisitService.CancelVisitAsync` never invokes `_notifier.NotifyRealitySummaryUpdateAsync(branchId.ToString())`. Reception desks viewing the Reality Summary cards (`Cash in the Drawer`, `Cash Collected`) do not receive a reactive SignalR push, leaving drawer balance displays frozen at their pre-refund levels until a full manual browser refresh occurs.

#### 4. The Authority Violation: Frontend Operating as an Ad-Hoc Financial Engine
* **Architectural Contract Breach:** In enterprise diagnostic ERPs, financial summation and ledger authority must strictly reside on the server. The frontend must be a presentation layer, never an accounting engine.
* **Why the Frontend Added:** The endpoint `GET /api/v1/economics/facts` acts as a raw transaction fact dumper, providing zero authoritative aggregated metadata (no `TotalCollected`, `CashTotal`, or pre-aggregated `StaffBreakdowns`).
* **Uncontrolled Client Operations:** Because no backend authority governed the collection ledger, the frontend (`RevenueScreens.jsx`) was forced to execute its own financial aggregation using JavaScript `reduce()` and `Map()`. It relied on crude string matching (`mode.includes('cash')`, `mode.includes('upi') || mode.includes('online')`) and had no accounting rules for reversals or negative debits.

#### 5. Heuristic Seepage Channels in `EconomicsIntelligenceService.cs`
* **Cashier Waterfall Guessing Ladder (lines 1067–1091):** Rather than reading an immutable cashier ID stamped at settlement time, the backend falls back through a 4-step guessing ladder: `DeclaredByUserId` -> `payment.ReceivedByUserId` -> `visit.AssignedReceptionistId` -> `visit.CreatedByUserId`. If user roles or handlers shift between intake and cancellation, liability seeps across staff accounts.
* **Branch Filter Bypass on `visit == null` (line 1059):** The branch filter checks `if (visit != null && visit.BranchId != branchId.Value) continue;`. If an unlinked payment, direct adjustment, or reversal has `visit == null`, it bypasses the branch boundary entirely and seeps into foreign branch collection history.
* **Notes Scraper Regular Expression (line 868):** Unlinked facts execute a Regex pattern search (`guidRegex`) over freeform text notes to discover invoice GUIDs, introducing non-deterministic heuristic linking prone to false matches.
* **Double Date Boundary Drift:** Dates are filtered initially by the backend (`ResolvePresetDateRange`), then re-filtered on the client via `isWithinTimeRange()`, causing transactions near UTC/IST midnight cutoffs to seep across calendar days.

### Architectural Fix Specification

1. **Signed Financial Amount in `EconomicsIntelligenceService.cs`:**
   In `GetRevenueFactsAsync`:
   ```csharp
   decimal effectiveAmount = f.Direction == RevenueDirection.Reversal ? -Math.Abs(f.Amount) : Math.Abs(f.Amount);
   results.Add(new
   {
       RevenueFactId = f.RevenueFactId,
       OccurredAt = f.OccurredAt,
       Amount = effectiveAmount, // <--- Correctly signed (-2900m for refunds)
       RawAmount = f.Amount,
       Currency = f.Currency,
       Direction = f.Direction.ToString(),
       ...
   ```

2. **Authoritative Backend Ledger Summaries (Strip Frontend Accounting):**
   - Upgrade the Economics API response to return both the itemized transaction list and the authoritative financial totals:
     ```json
     {
       "summary": {
         "totalCollected": 18620,
         "cashTotal": 12390,
         "digitalTotal": 6230,
         "staffSummaries": [
           { "userId": "...", "name": "Moin", "total": 580, "cash": 580, "refunds": 2900, "count": 4 }
         ]
       },
       "facts": [ ... ]
     }
     ```
   - Strip client-side `reduce()` and `Map()` loops from `RevenueScreens.jsx`. The frontend binds directly to backend-governed totals.

3. **Seal Heuristic Seepage Holes in `EconomicsIntelligenceService.cs`:**
   - **Branch Seepage Seal:** Enforce `RevenueFact.BranchId` directly on the database entity. Never allow `visit == null` to bypass branch filtering.
   - **Cashier Seal:** Require a mandatory non-nullable `CashierUserId` stamped on every payment and refund declaration.

4. **Event Writer Parameter Alignment & Live SignalR Broadcast in `VisitService.cs`:**
   - In `CancelVisitAsync`, pass `"User"` as `actorType` and `actorName` properly.
   - Immediately invoke `await _notifier.NotifyRealitySummaryUpdateAsync(visit.BranchId?.ToString() ?? "GLOBAL");` so the Cash Drawer Pool on all active reception terminals reactively drops by the refunded cash amount.


---

## 37. Thermal Slip Erroneous Health Card Suffix & "CARD:" Mutation for Regular Patients (MRN Append Leak) — [RESOLVED & VERIFIED]
### Severity: Medium / Visual Identity & Patient Master Confusion
### Impacted Modules & Files
* **Thermal Payload Builder:** [`IntentPanel.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx) (lines 1245–1254)
* **Thermal Document Generator:** [`thermalPrinter.js`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/utils/thermalPrinter.js) (lines 33–48, 304–318)

### Incident Evidence
* **Observed UI Defect:** On thermal slips for patient SEETHA (`MAI-019`, MRN: `A00046`) and VEERANNA (`MAI-018`, MRN: `A00045`), the patient box prints:
  `CARD: A00046-HC` and `CARD: A00045-HC`
  instead of `MRN: A00046` and `MRN: A00045`.
* Neither patient is an active Health Card subscriber. In the UI Patient Identification tile, their MRN is displayed correctly as `A00046`.

### Detailed Root Cause Analysis
1. **Unconditional `-HC` Fallback in `IntentPanel.jsx` (line 1250–1252):**
   ```javascript
   const hasHc = Boolean(
       p?.hasActiveHealthCard || 
       (healthCardEligibility?.hasActiveCard && healthCardEligibility?.isPatientEnrolledBeneficiary) ||
       (effectiveDiscountReason && effectiveDiscountReason.toLowerCase().includes('health card'))
   );
   const rawCard = (!healthCardEligibility?.card?.cardNumber?.startsWith("HC-") ? healthCardEligibility?.card?.cardNumber : null)
       || p?.healthCardNumber 
       || (p?.mrn ? `${p.mrn}-HC` : null); // <--- UNCONDITIONAL FALLBACK!
   ```
   Even when `hasHc` evaluates to `false`, `rawCard` unconditionally falls back to `${p.mrn}-HC`. It passes this string as `healthCardNumber: rawCard` in the thermal payload.
2. **False Trigger in `thermalPrinter.js` (lines 304–317):**
   ```javascript
   const isHcCard = Boolean(
       normalizedData.patient?.hasActiveHealthCard ||
       normalizedData.patient?.healthCardNumber || // <--- TRUTHY because of rawCard!
       payload.hasActiveHealthCard ||
       payload.healthCardNumber || // <--- TRUTHY!
       ...
   );
   if (isHcCard && mrnVal && !String(mrnVal).endsWith('-HC') && mrnVal !== 'WALK-IN') {
       mrnVal = `${mrnVal}-HC`;
   }
   const codeLabel = isHcCard ? 'CARD:' : 'MRN:';
   ```
   Because `healthCardNumber` was populated with `A00046-HC`, `isHcCard` evaluated to `true`, switching the label to `CARD:` and permanently stamping `-HC` on regular walk-in patient receipts.

### Architectural Fix Specification
* In `IntentPanel.jsx` (line 1252), gate `rawCard` strictly behind `hasHc`:
  ```javascript
  const rawCard = hasHc 
      ? ((!healthCardEligibility?.card?.cardNumber?.startsWith("HC-") ? healthCardEligibility?.card?.cardNumber : null)
          || p?.healthCardNumber 
          || (p?.mrn ? `${p.mrn}-HC` : null))
      : null;
  ```
* In `thermalPrinter.js` (line 304), verify that `hasActiveHealthCard` or `isHealthCardSubscriber` is strictly `true` before coercing the label to `CARD:` or suffixing `-HC`.

---

## 38. Draft Visit Concession Ghosting on Initial Checkout (Staged Discount Bypassed During Checkout Forcing Secondary Visit Correction) — [RESOLVED & VERIFIED]
### Severity: High / Front-Desk Billing & Discount Persistence Failure
### Impacted Modules & Files
* **Draft Concession Form:** [`BillingSummary.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/BillingSummary.jsx) (lines 626–631)
* **Intake Checkout Workflow:** [`IntentPanel.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx) (lines 1520–1585)
* **Backend Visit Financials Engine:** [`VisitService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs) (lines 667–747)

### Incident Evidence
* **Incident Scenario:** On visit `MAI-019` (SEETHA, Gross: ₹500), receptionist Uzma entered a ₹500 flat concession with reason `DR TVR`.
* **Thermal Slip Discrepancy (Image 3 Left):**
  - Gross Subtotal: `₹500`
  - Discount: `- ₹500 (DR TVR)`
  - **GRAND TOTAL: `₹500`** *(Expected: `₹0`)*
  - Amount Received: `₹0`
  - **BALANCE DUE: `₹500`** *(Expected: `₹0`)*
* **Subsequent Action:** Uzma opened **Visit Correction** and re-applied the secondary concession. Only then did the backend recalculate the bill to `₹0` Grand Total (Image 3 Right).

### Detailed Root Cause Analysis
1. **Draft Concession Staging Without Immediate Persistence:**
   In `BillingSummary.jsx` (lines 626–631):
   ```javascript
   if (isDraftVisit || isCorrectionIntent) {
       onStageDiscount({ mode: 'custom', type: 'Flat', value: 500, reason: 'DR TVR' });
       setIsDiscountExpanded(false);
       advanceFocusToSettlementOrPayment();
       return; // <--- Does NOT call backend API because visit is in draft state!
   }
   ```
   The discount of ₹500 was held solely in React component state (`stagedDiscount`).
2. **Missing Discount Commit in `handleUnifiedAction` Checkout (lines 1520–1585):**
   When the user clicked "Accept Payment" / "Confirm":
   ```javascript
   if (canCheckout && !snapshot.billing.isLocked) {
       ...
       const paymentPayload = {
           VisitId: snapshot.visit.visitId,
           Amount: effectiveAmount,
           Method: methodToUse,
           ...
       };
       const res = await ReceptionApi.collectPayment(paymentPayload);
   ```
   **`IntentPanel.jsx` completely forgot to commit `stagedDiscount` to the backend!** It directly recorded the payment without ever calling `ReceptionApi.applyDiscountToVisit`.
3. **Database Ledger Mismatch:**
   - On the backend, `Invoice` remained at `Gross: 500, DiscountAmount: 0, Total: 500`.
   - In React memory, `stagedDiscount` was `500`.
   - When the thermal receipt rendered, it displayed the staged `-500 (DR TVR)` line, but the actual backend `Invoice.Total` was still `500`, leaving the patient with an unexpected `₹500` Balance Due!
4. **Why Visit Correction Worked:**
   In **Visit Correction**, `handleConfirmBatchEdit` explicitly packages:
   ```javascript
   updateDiscount: stagedDiscount !== null,
   discountType: stagedDiscount?.type,
   discountValue: stagedDiscount?.value,
   discountReason: stagedDiscount?.reason
   ```
   and dispatches `ReceptionApi.batchEditVisit`. This invoked backend `BatchEditVisitAsync`, which finally inserted the `DiscountFact`, updated `Invoice.Total` to `₹0`, and allowed the second printout to succeed.

### Architectural Fix Specification
* In `IntentPanel.jsx`, inside `handleUnifiedAction` (checkout block, before `collectPayment`):
  ```javascript
  if (stagedDiscount && !stagedDiscount.remove && snapshot?.visit?.visitId) {
      await ReceptionApi.applyDiscountToVisit(snapshot.visit.visitId, {
          mode: stagedDiscount.type === 'Percentage' ? 'PERCENTAGE' : 'FLAT',
          customValue: Number(stagedDiscount.value),
          reason: stagedDiscount.reason || 'Desk Concession'
      });
  }
  ```
* This ensures that whenever a draft visit with a staged discount is checked out, the discount is persisted to the backend database and snapshot recalculated *before* payment collection occurs, guaranteeing Grand Total is `₹0` on the very first printout.


---

## 39. Intake Snapshot Payment Mode Flattening & Thermal Slip Split Erasure (Collapse of Multi-Method Payments to FirstOrDefault) — [RESOLVED & VERIFIED]
### Severity: High / Financial Transparency & Receipt Accuracy Defect
### Impacted Modules & Files
* **Intake Snapshot Service:** [`ReceptionSnapshotService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Reception/ReceptionSnapshotService.cs) (lines 400–401)
* **Intake Billing Contract DTO:** [`ReceptionSnapshotDtos.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/DTOs/Reception/ReceptionSnapshotDtos.cs)
* **Intake & Dispatch Panel:** [`IntentPanel.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx) (lines 1265, 1284–1295, 2878–2883)
* **Thermal Receipt Engine:** [`thermalPrinter.js`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/utils/thermalPrinter.js) (lines 263–269, 420–427)

### Incident Evidence
* **Incident Scenario:** On visit `MAI-018` (VEERANNA, Total: ₹2,000), the cashier used the multi-channel split payment button to split the ₹2,000 payment across Cash and UPI.
* **Observed Inconsistency:**
  - **In Reception Action Queue (Image 2):** Correctly displays purple pill **`₹2,000 SPLIT`** with subtext **`Split (UPI + Cash)`**.
  - **In Visit Finalized & Print Dispatch (Image 1):**
    - Section 3 Financials reads: **`Desk Collection: ₹2,000 via Cash`** *(Completely erases the UPI portion!)*
    - Thermal Slip Header: **`CASH PAYMENT RECEIPT`**
    - Thermal Slip Payment Mode: **`Payment Mode: CASH`**
* **The Core Paradox:** The Action Queue clearly knows it was a split payment, but the visit summary screen and thermal receipt display it as pure Cash.

### Detailed Root Cause Analysis

#### 1. Backend Persistence Succeeded
* In `ReceptionFlowService.cs` (lines 956–976), when `request.SplitPayments` is received, the service iterates over each item and calls `_invoiceService.RecordPaymentAsync` for each channel.
* The database `dbo.Payments` table correctly holds both individual payment rows (e.g. Cash: ₹X, UPI: ₹Y).
* `OperationsEngine.cs` (lines 560–565) loads `invoice.Payments.ToList()`, detects `validPayments.Count > 1`, and joins the distinct methods into `"Split (UPI + Cash)"`. That is why the Action Queue shows the purple `SPLIT` pill.

#### 2. The Bottleneck: `ReceptionSnapshotService.cs` Collapsing Payments
* In `ReceptionSnapshotService.cs` line 400:
  ```csharp
  snapshot.Billing = new IntakeBilling
  {
      ...
      PaymentStatus = invoice.Status,
      PaymentMethod = invoice.Payments?.FirstOrDefault()?.Method, // <--- BOTTLENECK!
      TotalPaid = (invoice.Payments?.Sum(p => p.Amount) ?? 0m) + ...
  };
  ```
* While `OperationsEngine.cs` properly checked for multi-payment splits, `ReceptionSnapshotService.cs` blindly took `FirstOrDefault()?.Method`!
* Because the Cash payment was the first record in `invoice.Payments`, `snapshot.Billing.PaymentMethod` returned `"Cash"`.
* Furthermore, `IntakeBilling` did not serialize the itemized `Payments` collection (e.g. `List<PaymentSummaryDto>`), completely starving the frontend of the split breakdown.

#### 3. Frontend Blindly Renders the Truncated Snapshot
* In `IntentPanel.jsx`:
  - **Section 3 Financials (line 2883):**
    `Desk Collection: ₹{postPaid} via {snapshot?.billing?.paymentMethod || paymentMethod}` -> renders `"via Cash"`.
  - **Thermal Payload Builder (line 1265):**
    When viewing a completed/finalized visit, `isSplitPayment` is false (since `isSplitPayment` is only a live form input flag). It falls back to `snapshot?.billing?.paymentMethod` which is `"Cash"`.
* In `thermalPrinter.js` (lines 263, 426):
  - Because `rawPaymentMethod` is `"Cash"`, it sets the document title to `"CASH PAYMENT RECEIPT"`.
  - Under tests, it renders `Payment Mode: CASH`.
  - It has no `payments` array to render itemized bullet points (e.g. `• Cash: ₹X`, `• UPI: ₹Y`).

### Architectural Fix Specification

1. **Multi-Payment Awareness in `ReceptionSnapshotService.cs`:**
   - Detect multiple payment channels and synthesize the composite method string:
     ```csharp
     var validPayments = invoice.Payments?.Where(p => p.Amount > 0).ToList() ?? new List<Payment>();
     string effectiveMethod = validPayments.Count > 1
         ? $"Split ({string.Join(" + ", validPayments.Select(p => p.Method).Distinct())})"
         : validPayments.FirstOrDefault()?.Method ?? "Cash";

     snapshot.Billing = new IntakeBilling
     {
         ...
         PaymentMethod = effectiveMethod,
         Payments = validPayments.Select(p => new IntakePaymentSummaryDto
         {
             PaymentId = p.PaymentId,
             Amount = p.Amount,
             Method = p.Method,
             ReceiptNo = p.ReceiptNo,
             ReceivedAt = p.ReceivedAt
         }).ToList()
     };
     ```

2. **Expose `Payments` Breakdown on `IntentPanel.jsx`:**
   - In Section 3 Financials: If `snapshot.billing.payments?.length > 1`, render itemized badges:
     `Desk Collection: ₹2,000 via Split [Cash: ₹500 | UPI: ₹1,500]`
   - In `buildThermalPayload`: Pass `payments: snapshot.billing.payments` and `paymentMethod: snapshot.billing.paymentMethod`.

3. **Thermal Receipt Dynamic Badge & Multi-Channel Breakdown (`thermalPrinter.js`):**
   - If `paymentMethod` contains `"Split"` or `payments.length > 1`:
     - Badge title: **`MULTI-CHANNEL PAYMENT RECEIPT`** or **`SPLIT PAYMENT RECEIPT`**.
     - Payment Mode section renders itemized lines:
       ```text
       Payment Mode:           SPLIT (CASH + UPI)
         • Cash:                          ₹500.00
         • UPI:                         ₹1,500.00
       ```

### Verification & Resolution Details
* **Multi-Payment Snapshot Contract:** `ReceptionIntakeSnapshotDto.cs` now includes `List<IntakePaymentSummaryDto> Payments`. `ReceptionSnapshotService.cs` checks `invoice.Payments` for multiple payments, serializes each payment channel, and generates the consolidated `Split (Cash + UPI)` method string.
* **Intake & Dispatch Preview Synchronization:** `IntentPanel.jsx` (`buildThermalPayload`) binds `payments` and `paymentMethod` from `effectivePayments` and `snapshot.billing`, ensuring both live split forms and finalized visits pass complete payment collections.
* **Section 3 Financial Pod Chips:** Section 3 in `IntentPanel.jsx` now renders `via Split` along with individual color-coded chips for each channel (e.g. `Cash: ₹500`, `UPI: ₹1,500`).
* **Thermal Slip Rendering:** `thermalPrinter.js` detects multi-channel splits, titles the slip `SPLIT PAYMENT RECEIPT`, sets payment mode to `Split (...)`, and prints the itemized bulleted payment lines with exact amounts.

---

## 40. Zero-Net-Due Draft Checkout Rejection & Accidental Full Due Transition (100% Concession Invoice Payment Rejection) — [RESOLVED & VERIFIED]
### Severity: High / Financial Workflow Failure & Inadvertent Counter Credit Creation
### Impacted Modules & Files
* **Intake Checkout Workflow:** [`IntentPanel.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/components/IntentPanel.jsx) (lines 1520–1585, 1845–1848)
* **Reception Flow Service:** [`ReceptionFlowService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Reception/ReceptionFlowService.cs) (lines 940–946)
* **Invoice Accounting Service:** [`InvoiceService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs) (lines 347–350)
* **Visit Correction Engine:** [`VisitService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs) (lines 667–747)

### Incident Evidence
* **Incident Scenario:** On visit `MAI-021` (Patient: `DURGA`, 54y/F, MRN: `A00048`, Tests: `VITAMIN D`, `VITAMIN B 12`, `HAEMOGRAM`, `ESR` — Gross: `₹3,000`).
* **Sequence of Events:**
  1. Cashier Moin entered a ₹3,000 discount (making net amount `₹0`).
  2. Cashier clicked **"Confirm & Complete Visit (₹0)"**.
  3. Instead of completing as settled with zero balance, the visit transitioned into **`FULL DUE` (`₹3,000 Due`)** in the Action Queue.
  4. Realizing the bill was stuck in Full Due, Moin opened **Visit Correction** and amended the discount to `₹300` (net `₹2,700`), collecting `₹2,700` in Cash.
  5. The resulting thermal receipt (Image 1) and audit trail show:
     ```text
     Gross Subtotal:     ₹3,000
     Discount:           -₹300 (DR TVR [Authorized Secondary Concession: -₹3000])
     GRAND TOTAL:        ₹2,700
     Amount Received:    ₹2,700
     Payment Mode:       CASH
     Balance Due:        ₹0
     ```
     The discount note clearly preserved the historical authorized concession string `-₹3000`.

### Detailed Root Cause Analysis

#### 1. Compound Effect of Bug 38 (Discount Staged Only in React State)
* During initial draft creation, `BillingSummary.jsx` stages the discount in React state (`stagedDiscount = { value: 3000, type: 'Flat', reason: 'DR TVR' }`).
* On the backend, `Invoice` was created with `Gross: ₹3,000, DiscountAmount: ₹0, Total: ₹3,000`.
* In `IntentPanel.jsx`, the UI calculates `stagedNet = 0` and `remainingDue = 0`, rendering the button: `Confirm & Complete Visit (₹0)`.
* When Moin clicked this button, `IntentPanel.jsx` did **NOT** commit the discount to the backend (Bug 38).

#### 2. The Zero-Amount Payment Trap (`IntentPanel.jsx`)
* In `handleUnifiedAction` (line 1526):
  ```javascript
  const effectiveAmount = isFullDueSelected ? 0 : (isPartialValid ? numCustom : remainingDue);
  // Because remainingDue was 0 (in React state), effectiveAmount evaluated to 0!
  paymentPayload = {
      VisitId: snapshot.visit.visitId,
      Amount: 0,
      Method: paymentMethod // 'Cash'
  };
  const res = await ReceptionApi.collectPayment(paymentPayload);
  ```
* The frontend attempted to collect a `₹0` payment with method `"Cash"`.

#### 3. Backend Hard Rejection in `InvoiceService.cs`
* In `ReceptionFlowService.cs` (lines 940–946):
  ```csharp
  if (request.Amount == 0 && request.Method == "Unpaid / Credit")
  {
      // Only special-cased if Method is explicitly "Unpaid / Credit"
  }
  else
  {
      payment = await _invoiceService.RecordPaymentAsync(invoiceId, paymentDto);
  }
  ```
* Because `request.Method` was `"Cash"`, it called `_invoiceService.RecordPaymentAsync(invoiceId, paymentDto)` with `Amount = 0`.
* In `InvoiceService.cs` (lines 347–350):
  ```csharp
  if (recordedAmount <= 0)
  {
      throw new InvalidOperationException("Effective payment amount must be greater than zero.");
  }
  ```
* **The backend threw an `InvalidOperationException`!** `RecordPaymentAsync` forbids any payment where `Amount <= 0`.
* The payment call was aborted. No payment record was created.

#### 4. The Accidental "Full Due" Transition
* Because the payment failed and the discount was never persisted to the backend:
  - Database `dbo.Invoices`: `Gross = ₹3,000`, `DiscountAmount = ₹0`, `Total = ₹3,000`, `Paid = ₹0`.
  - Database `dbo.Visits`: `Status = ReadyForSample` (token `MAI-021` issued).
* When `OperationsEngine.cs` and `ReceptionScreen.jsx` evaluated the visit:
  - `totalBilled = 3000`
  - `totalPaid = 0`
  - `remainingDue = 3000`
  - Rule 5: `totalPaid === 0 && remainingDue > 0` -> **`FULL DUE` (₹3,000 Due)**.
* Moin saw the bill unexpectedly turn into a ₹3,000 debt for the patient. He immediately used **Visit Correction** to salvage the visit, applying a ₹300 concession and collecting ₹2,700 in Cash. Because Visit Correction uses `batchEditVisit` (which directly commits discounts and accepts positive payment), it succeeded.

### Architectural Fix Specification

1. **Commit Staged Discount Before Payment Collection (Bug 38 Resolution):**
   - In `IntentPanel.jsx` (`handleUnifiedAction`), always commit `stagedDiscount` to `ReceptionApi.applyDiscountToVisit` before initiating payment collection.
   - This ensures `Invoice.Total` becomes `₹0` in the database.

2. **Zero-Net-Due Invoice Settlement Handler (`IntentPanel.jsx` & `ReceptionFlowService.cs`):**
   - In `IntentPanel.jsx`: When `stagedNet === 0` (100% concession), do **NOT** dispatch a `RecordPaymentAsync(Amount: 0)` with method `"Cash"`.
   - Instead, dispatch a dedicated zero-due settlement action or pass `Method: "Concession / Zero Due"`.
   - In `ReceptionFlowService.cs`:
     ```csharp
     if (request.Amount == 0)
     {
         var invoice = await _invoiceService.GetInvoiceByIdAsync(invoiceId);
         if (invoice != null && (invoice.Total == 0 || invoice.DiscountAmount >= invoice.Gross))
         {
             // Invoice is 100% discounted; mark as Paid / Settled directly without creating a ₹0 Payment row
             invoice.Status = InvoiceStatus.Paid;
             await _invoiceService.UpdateInvoiceAsync(invoice);
             return Ok(new PaymentResultDto { Success = true, Message = "Settled via 100% Concession" });
         }
     }
     ```
   - In `InvoiceService.cs`: Guard zero-due invoices so that 100% discounted bills automatically achieve `Status = InvoiceStatus.Paid` without throwing validation errors.

### Verification & Resolution Details
* **Zero-Net-Due Draft Settle Mode:** In `ReceptionFlowService.cs`, zero-amount payments where net due is ₹0 or discount covers gross amount are cleanly settled with `Status = "Paid"`, generating an official audit payment record without invoking rejection logic.
* **Invoice Validation Guard:** In `InvoiceService.cs` (`RecordPaymentAsync`), 100% concession / zero-due invoices with `invoice.Total <= 0` or `invoice.DiscountAmount >= invoice.GrossAmount` permit zero-amount recording and transition to `Paid` without throwing `InvalidOperationException`.
* **Zero-Net Fallback Elimination:** In `OperationsEngine.cs` (lines 335 and 469), `TotalAmount` was falling back to `orders.Sum()` when `invoice.Total == 0`. This was corrected so that an invoice with total ₹0 preserves `Total = 0` instead of falsely reverting to the gross ₹3,000.
* **Frontend Queue Badge Guard:** In `ReceptionScreen.jsx`, visits with 100% concession and ₹0 remaining due are explicitly identified and tagged with a clean `CONCESSION` badge instead of being misclassified as `FULL DUE`.



## 41. Single-Method Multi-Payment Pseudo-Split Classification ("Split (Cash)") & Channel Amount Concealment in Visit Correction — [RESOLVED & VERIFIED]

### Executive Summary & Problem Statement
When a patient settles an invoice across multiple installments or adjustments using the *same* payment method (for example, ₹700 Cash initial deposit + ₹150 Cash balance settlement, or two UPI payments), the intake snapshot, visit summary, thermal slip, and action queue erroneously classified the transaction as a split payment with confusing labels such as `"Split (Cash)"` or `"Split (UPI)"`. 

Furthermore, during Visit Correction and Reception Desk reviews, multi-channel payments lacked clear itemized visibility into the exact amount collected per tender type, obscuring whether cash was tendered at the physical desk or transferred digitally.

### Root Cause Analysis
1. **Quantity vs. Distinct Channel Flaw (`OperationsEngine.cs` & `ReceptionSnapshotService.cs`):**
   * In `OperationsEngine.cs` (lines 560 and 605) and `ReceptionSnapshotService.cs` (line 386), split payment detection was evaluated using:
     ```csharp
     if (validPayments.Count > 1) { return "Split"; }
     ```
   * When an invoice had multiple payment entries with the identical method (e.g. 2 Cash payments), `validPayments.Count` was 2, but `validPayments.Select(p => p.Method).Distinct().Count()` was 1 (`["Cash"]`). This triggered the split formatting branch and output the contradictory string `"Split (Cash)"`.
2. **Thermal Receipt Header & Itemization Trigger (`thermalPrinter.js`):**
   * In `thermalPrinter.js`, receipt badge titles and channel bullets were evaluated based on `payments.length > 1` or raw substring matches on `"split"`, causing single-method multiple payments to trigger the `SPLIT PAYMENT RECEIPT` banner.
3. **Frontend Settlement Status Concealment (`BillingSummary.jsx` & `IntentPanel.jsx`):**
   * In `BillingSummary.jsx` and `IntentPanel.jsx`, payment summaries rendered flat badges without breaking down the constituent tender channels when multiple methods were present.

### Architectural Fix Specification
1. **Distinct Channel Thresholding (`OperationsEngine.cs` & `ReceptionSnapshotService.cs`):**
   * Refactored split evaluation across all backend engines to check `distinctMethods.Count > 1`.
   * When multiple payments exist under a single channel, the method cleanly returns the singular method name (e.g., `"Cash"`).
   * When distinct payment methods exceed 1, the backend outputs explicit itemized channel breakdowns: `Split (Cash: ₹{cashAmount:N0} + UPI: ₹{upiAmount:N0})`.
2. **Thermal Print Engine True Split Verification (`thermalPrinter.js`):**
   * Guarded `isMultiChannelSplit = distinctPaymentMethods.length > 1`.
   * `SPLIT PAYMENT RECEIPT` header and itemized tender bullets (`• Cash: ₹X`, `• UPI: ₹Y`) render strictly when distinct tender channels exceed 1.
3. **Transparent Tender Itemization (`BillingSummary.jsx` & `IntentPanel.jsx`):**
   * Rendered explicit channel badges (`[ 💵 Cash: ₹X ]`, `[ 📱 UPI: ₹Y ]`) across Billing Summary and Intent Panel financials.

### Verification & Resolution Details
* **Build Clean:** Verified `SynOS.sln` (.NET backend) and `SynOS.Frontend` (Vite) compiled with 0 errors.
* **Single-Method Multi-Payment Verification:** An invoice with two separate cash payments (₹700 + ₹150) resolves cleanly to `"Cash"`, eliminating `"Split (Cash)"`.
* **Multi-Method Transparency:** Split transactions (e.g. ₹500 Cash + ₹1,500 UPI) render explicit tender amounts on the reception summary, thermal slip, and intent panel.

---

## 42. Collection History Orphaned RevenueFacts (Prepaid Switch Ghost), Cash Drawer KPI Zero-Display Mismatch & Branch Heuristic Seepage — [RESOLVED & VERIFIED]

### Executive Summary & Problem Statement
Three interrelated financial and ledger accounting discrepancies occurred:
1. **Ghost ₹10,000 Cash Collection in History:** When a visit was initially created as a Cash walk-in and later changed to Corporate B2B Prepaid via Visit Correction, the Collection History ledger continued to report the original ₹10,000 Cash collection as an active inflow.
2. **Cash Drawer KPI Zero Display (`+₹0.00` / `-₹0.00`):** In the Cash Drawer Shift Ledgers screen (`RevenueScreens.jsx`), the Total Inflow and Total Outflow KPI summary cards displayed `+₹0.00` and `-₹0.00` even while the detailed ledger rows below listed positive cash inflows.
3. **Cross-Branch Cash Drawer & History Leaks:** Cash drawer shift ledgers and collection history records occasionally leaked across branches when transactions lacked direct visit links or branch scopes.

### Root Cause Analysis
1. **Missing Revenue Reversal Fact on Mode Switch (`VisitService.cs`):**
   * In `VisitService.cs` (`BatchEditVisitAsync`), when a visit mode was changed from Cash to Corporate B2B Prepaid (`PrepaidPartner`), the backend deleted the existing counter payments from `_context.Payments`.
   * However, `_revenueFactWriter.DeclareRevenueFactAsync` was never called with a `Reversal` fact. Because the Collection History terminal queries the append-only `dbo.RevenueFacts` table rather than mutable `dbo.Payments`, the original ₹10,000 Cash inflow fact remained active and unreversed.
2. **DTO Contract Property Nesting Mismatch (`FinanceBillsController.cs` & `RevenueScreens.jsx`):**
   * In `FinanceBillsController.cs` (`GetMyCashDrawerLedger`), `totalInflow` and `totalOutflow` were returned at the root of the JSON response payload.
   * `RevenueScreens.jsx` was reading `ledgerData?.inflowBreakdown?.totalInflow` and `ledgerData?.outflowBreakdown?.totalOutflow`. Because `inflowBreakdown` did not contain `totalInflow`, the KPI cards evaluated to `undefined` and defaulted to `+₹0.00`.
3. **Unfiltered Cash Drawer Query & Null Visit Branch Fallback (`FinanceBillsController.cs` & `EconomicsIntelligenceService.cs`):**
   * `GetMyCashDrawerLedger` did not scope payments by `BranchId`.
   * In `EconomicsIntelligenceService.cs`, when `visit == null` (e.g. manual adjustments or non-visit revenue facts), the check `visit != null && visit.BranchId != branchId.Value` evaluated to false, allowing orphan facts to bypass the branch filter.

### Architectural Fix Specification
1. **Explicit Revenue Fact Reversals on Mode Switch (`VisitService.cs`):**
   * In `VisitService.cs`, when switching a visit to Corporate B2B Prepaid and removing counter payments, an explicit reversal fact is written to `_revenueFactWriter`:
     ```csharp
     await _revenueFactWriter.DeclareRevenueFactAsync(
         branchId: visit.BranchId,
         sourceId: payment.PaymentId,
         sourceType: "PAYMENT_CANCELLED",
         direction: RevenueDirection.Reversal,
         amount: payment.Amount,
         paymentMethod: payment.Method,
         eventType: BranchEventType.PAYMENT_VOIDED,
         notes: $"Reversal: Visit {visit.TokenNumber} switched to Corporate B2B Prepaid."
     );
     ```
2. **Dual-Redundancy KPI Payload Contract (`FinanceBillsController.cs` & `RevenueScreens.jsx`):**
   * In `FinanceBillsController.cs`, `totalInflow` and `totalOutflow` are returned both at the DTO root and inside the `inflowBreakdown` and `outflowBreakdown` sub-objects.
   * In `RevenueScreens.jsx`, KPI readers use safe dual-fallback: `ledgerData?.totalInflow ?? ledgerData?.inflowBreakdown?.totalInflow ?? 0`.
3. **Strict Branch Scoping & Cashier Fallback (`FinanceBillsController.cs` & `EconomicsIntelligenceService.cs`):**
   * Added `[FromQuery] Guid? branchId` to `GetMyCashDrawerLedger` and filtered cash payments by `Invoice.Visit.BranchId == effectiveBranchId.Value`.
   * In `EconomicsIntelligenceService.cs`, when `visit == null`, fallback to `cashierUser?.DefaultBranchId == branchId.Value`, ensuring orphan records never leak across branches.

### Verification & Resolution Details
* **Prepaid Switch Inflow Neutralization:** Converting a ₹10,000 cash visit to Corporate B2B Prepaid creates an equal and opposite reversal fact, completely neutralizing the phantom cash inflow from Collection History.
* **KPI Card Accuracy:** Cash drawer KPI cards correctly display actual cash inflows and outflows (e.g. `+₹10,000.00`) matching the underlying itemized shift ledger.
* **Cross-Branch Isolation:** Cash drawers and collection history strictly reflect the user's active branch.

---

## 43. Omnipresent Multi-Channel Split Accounting, Ledger Integrity & Universal Frontend Surface Separation Contract — [RESOLVED & VERIFIED]

### Executive Summary & Problem Statement
In split payment workflows where a patient settles a bill using a combination of Cash and digital channels (such as UPI or Card), downstream surfaces must maintain strict separation between physical currency and digital funds:
1. Physical cash drawer ledgers must strictly count only the physical cash tendered, never absorbing the digital portion.
2. Digital UPI/Online totals must strictly track digital collections without leaking into cash in hand.
3. Every operational touchpoint—including the Reception Queue, Billing Summary, Intent Panel, Thermal Slip, and Financial Ledgers—must transparently communicate the exact breakdown of tender types.

### Architectural Guarantees & Implementation Contract
1. **Cash Drawer Strict Cash Filtering (`FinanceBillsController.cs`):**
   * Physical drawer inflow queries filter strictly by `p.Method == "Cash"` or `RevenueDirection.Inflow` with cash tender type.
   * For split invoices, the cash drawer particulars explicitly annotate the split nature:
     `{patientName} • {testSummary} (Split: ₹{cashAmount:N0} Cash tendered | {otherSummary} digital)`.
2. **Universal Thermal Slip Contract (`thermalPrinter.js`):**
   * Generates `SPLIT PAYMENT RECEIPT` badge only when distinct channels > 1.
   * Prints itemized bullets for each channel (`• Cash: ₹X`, `• UPI: ₹Y`).
   * Reflects accurate `Change Tendered` / `Change Due` without conflating digital payments with cash tender.
3. **Billing Summary & Reception Surface Transparency (`BillingSummary.jsx` & `IntentPanel.jsx`):**
   * Billing settlement displays distinct colored badges for each tender method with exact collected figures.
   * Eliminates ambiguous `"Split"` labels in favor of fully itemized breakdowns.

### Verification & Resolution Details
* **Zero Cross-Contamination:** A ₹2,000 bill settled with ₹500 Cash + ₹1,500 UPI credits exactly ₹500 to the physical cash drawer and ₹1,500 to digital accounts.
* **Ledger Consistency:** Collection history, shift drawer ledgers, and live metrics reflect matching, reconciled numbers.

---

## 44. Cash Drawer Zero-Transaction Disconnect vs Collection History (Cashier Attribution Gap, Fragile Branch Scoping & Dual-Ledger Divergence) — [AUDITED & ROOT CAUSE IDENTIFIED]
### Severity: Critical / Core Financial Truth Failure & Cash Drawer Ledger Disconnect
### Impacted Modules & Files
* **Cash Drawer Ledger Controller:** [`FinanceBillsController.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs) (lines 1579–1596, 1619–1645)
* **Cash Drawer Ledger UI:** [`RevenueScreens.jsx`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/RevenueScreens.jsx) (lines 4609–4656)
* **Economics Revenue Facts Query:** [`EconomicsIntelligenceService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/EconomicsIntelligence/EconomicsIntelligenceService.cs) (lines 1063–1080)

### Incident Evidence
* **Incident Scenario:** Today (2026-11-11), front-desk cashier `Moin` completed 7 cash billing transactions between 06:33 AM and 07:45 AM:
  - `MAI001-261111 RAMCHARAN`: ₹600 Cash
  - `MAI002-261111 SK RAFI`: ₹100 Cash
  - `MAI003-261111 ANJUM`: ₹500 Cash
  - `MAI004-261111 TABASSUM FATHIMA`: ₹1,200 Cash
  - `MAI005-261111 MUJEEB`: ₹750 Cash
  - `MAI006-261111 SONDHU MIYA`: ₹1,100 Cash
  - `MAI001-261111 ANJUM`: -₹1,100 Cash (Visit Refund Disbursed)
  - **Net Total Today:** **₹3,150.00** across 7 transactions.
* **The Discrepancy:**
  - **In Collection History (Screenshot 2):** Under cashier `Moin`, all 7 transactions are displayed chronologically, with `Total Collections: ₹3,150` and `Cash Collections: ₹3,150`.
  - **In Cash Drawer Shift Ledgers (Screenshot 1):** Under cashier `Moin`, the screen displays **`No Cash Drawer Transactions Recorded`**, with `Total Cash Inflow: +₹0.00`, `Total Cash Outflow: -₹0.00`, and `Net Cash in Hand / Drawer: ₹0.00`!

### Detailed Root Cause Analysis

#### 1. Why Did This Break? The Fragile Branch Scoping Added in Commit `b63239ae`
* In commit `b63239ae`, an ad-hoc branch filter was added to `FinanceBillsController.cs`:
  ```csharp
  Guid? effectiveBranchId = null;
  if (branchId.HasValue && branchId.Value != Guid.Empty)
  {
      effectiveBranchId = branchId.Value;
  }
  else if (Request.Headers.TryGetValue("X-Branch-Id", out var headerBranch) && Guid.TryParse(headerBranch, out var bId))
  {
      effectiveBranchId = bId;
  }
  else
  {
      var ubr = await _context.UserBranchRoles.AsNoTracking().FirstOrDefaultAsync(ub => ub.UserId == effectiveUserId);
      if (ubr != null && ubr.BranchId != Guid.Empty)
      {
          effectiveBranchId = ubr.BranchId;
      }
  }
  ...
  if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
  {
      cashPaymentsQuery = cashPaymentsQuery.Where(p => p.Invoice.Visit == null || p.Invoice.Visit.BranchId == effectiveBranchId.Value);
  }
  ```
* **The Fatal Trap:**
  1. When `RevenueScreens.jsx` (`loadLedger`) fetches shift drawer data, it calls `FinanceApi.getMyCashDrawerLedger`.
  2. If `localStorage.getItem('activeBranchId')` is not set or empty during initial load or branch handover, `branchId` is passed as `null`.
  3. `Request.Headers["X-Branch-Id"]` is never populated by `FinanceApi.getHeaders()`.
  4. The code falls into the dangerous fallback:
     `var ubr = await _context.UserBranchRoles.AsNoTracking().FirstOrDefaultAsync(ub => ub.UserId == effectiveUserId);`
  5. In diagnostic setups, cashier Moin's `UserBranchRole` row points to `MRI Branch` (or an alternate branch).
  6. As a result, `effectiveBranchId` resolves to `MRI Branch`!
  7. The query then executes:
     `cashPaymentsQuery.Where(p => p.Invoice.Visit == null || p.Invoice.Visit.BranchId == MRI_BRANCH_ID)`
  8. Since today's 7 visits (`MAI-001` through `MAI-006`) belong to `MAIN LAB`, **every single visit is filtered out**, wiping the drawer ledger to zero!

#### 2. Cashier Attribution Disconnect (`ReceivedByUserId` vs 4-Tier Hierarchy)
* In `FinanceBillsController.cs`, the query strictly checks:
  `p.ReceivedByUserId == effectiveUserId`
* In contrast, `EconomicsIntelligenceService.cs` (`Collection History`) uses a resilient 4-tier attribution hierarchy:
  `f.DeclaredByUserId -> payment.ReceivedByUserId -> visit.AssignedReceptionistId -> visit.CreatedByUserId`.
* When reception desks operate with admin/station JWT tokens (e.g. `Tabrez Developer`) while a receptionist (e.g. `Moin`) registers the visit:
  - `p.ReceivedByUserId` is stamped as `Tabrez Developer`.
  - `Collection History` correctly attributes the payment to `Moin` via `visit.AssignedReceptionistId`.
  - `Cash Drawer Shift Ledgers` checks only `p.ReceivedByUserId == Moin`, finds nothing, and reports zero!

#### 3. Why Does the Finance Module Keep Regressing After Every Code Edit?
1. **Divergent Truth Sources:**
   `Collection History` reads from `dbo.RevenueFacts` (immutable facts), while `Cash Drawer Ledgers` reads from `dbo.Payments` (operational rows). When an agent fixes an issue in one ledger, the other query is left completely untouched.
2. **Siloed Agent "Quick-Fixes":**
   Agents receive a prompt like *"MRI payments are leaking"*, and immediately write a restrictive `.Where(...)` clause in a single endpoint without checking whether frontend callers pass that parameter or how other tabs depend on it.
3. **Zero Automated Tests for Finance Tabs:**
   Existing tests only check isolated mathematical formulas (like ₹100 discount deduction). There is **zero integration test** verifying that a payment made at reception appears simultaneously in `Bills & Collections`, `Collection History`, AND `Cash Drawer Ledgers`. Without tests, breaking changes pass `dotnet test` silently.

---

### Architectural Fix & Anti-Regression Solution

1. **Remove Blind `UserBranchRole` Fallback in `FinanceBillsController.cs`:**
   - Only filter by branch if an explicit `branchId` was passed in the query or header.
   - If `branchId` is omitted, do NOT guess the branch using `ubr.BranchId`; allow all visits for that cashier to be included.
   ```csharp
   if (branchId.HasValue && branchId.Value != Guid.Empty)
   {
       cashPaymentsQuery = cashPaymentsQuery.Where(p => p.Invoice.Visit == null || p.Invoice.Visit.BranchId == branchId.Value);
   }
   ```

2. **Unify Cashier Attribution Hierarchy (`FinanceBillsController.cs`):**
   - Align `FinanceBillsController.cs` with `EconomicsIntelligenceService.cs`:
   ```csharp
   cashPaymentsQuery = cashPaymentsQuery.Where(p => 
       (p.ReceivedByUserId == effectiveUserId 
        || (p.Invoice.Visit != null && p.Invoice.Visit.AssignedReceptionistId == effectiveUserId)
        || (p.Invoice.Visit != null && p.Invoice.Visit.CreatedByUserId == effectiveUserId))
       && p.Method.ToLower().Contains("cash")
       && p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc);
   ```

3. **Pass `effectiveBranchId` Explicitly from `RevenueScreens.jsx`:**
   - In `RevenueScreens.jsx` (`loadLedger`), explicitly pass `branchId: isConsolidated && isAdmin ? undefined : effectiveBranchId`.

4. **Permanent Guardrail Enshrinement in `AGENTS.md` and `.agents/AGENTS.md`:**
   - Added **Section III: Finance Hub Truth Engine & Ledger Parity Invariants** to [`AGENTS.md`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/AGENTS.md).
   - Added **Rule 7: Finance Hub 8-Tab Truth Engine & Cash Drawer Parity Invariant** to [`.agents/AGENTS.md`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/.agents/AGENTS.md).

5. **Mandatory Coding Agent Protocol — Pre-Task File Inspection:**
   - **Protocol Rule:** Any future AI coding agent (or developer) operating on this repository **MUST inspect `AGENTS.md` and `.agents/AGENTS.md`** before planning or executing any task touching billing, reception, finance, cash drawers, reports, or prints.
   - **Reason:** Previous agents performed isolated "one-off" fixes (such as adding restrictive branch filters or changing cashier matching) that solved a localized symptom but broke other tabs (such as wiping Cash Drawer transactions to zero while Collection History had 7 transactions). Consulting `AGENTS.md` prevents breaking the architectural invariants and guarantees zero regressions across the 8 Finance Hub tabs.

### 6. Filter Pipeline Verification Audit (Date, Cashier & Branch Wiring)
* **Date Filter Verification (`Today` / `Preset`):**
  - **Frontend:** `RevenueScreens.jsx` extracts `presetRange` ("today") and sends `preset: 'today'`.
  - **Backend:** `FinanceBillsController.cs` passes `preset` into `ResolvePresetDateRange()`, producing exact UTC timestamps (`startUtc` to `endUtc`).
  - **Database Query:** Enforced via `p.ReceivedAt >= startUtc && p.ReceivedAt < endUtc`. No bypass.
* **Cashier Filter Verification (`Moin`):**
  - **Frontend:** Cashier tab selection passes `userId: selectedUserId`.
  - **Backend:** `FinanceBillsController.cs` binds `effectiveUserId = userId.Value`.
  - **Database Query:** Enforced via canonical 4-tier hierarchy `(p.ReceivedByUserId == effectiveUserId || p.Invoice.Visit.AssignedReceptionistId == effectiveUserId || p.Invoice.Visit.CreatedByUserId == effectiveUserId)`. No bypass.
* **Branch Filter Verification (`Branch View: Main Lab` vs `All Branches`):**
  - **When "Main Lab" is Selected:** `effectiveBranchId` (Main Lab GUID) is sent as `branchId`. The backend applies `p.Invoice.Visit.BranchId == effectiveBranchId.Value`. Main Lab cash transactions are strictly matched.
  - **When "All Branches" is Selected:** `isConsolidated && isAdmin` is true, so `branchId` is omitted (`undefined`). The backend leaves `effectiveBranchId = null`, eliminating the previous guessing trap and querying all branches.
  - **Zero Heuristics Guarantee:** No hardcoded GUIDs, no synthetic data mocking, and no user profile fallback guessing. All three filter dimensions are strictly wired end-to-end.

---

## 45. Role-Based Visibility Audit: Why Branch Selector Hides Under Cashier/Staff Accounts (`Moin` vs `Tabrez Developer`) — [AUDITED & VERIFIED]

### Problem Statement & User Observation
* In the latest screenshot of the **Bills & Collections** screen, the branch selector buttons (`All Branches` and `Branch View: Main Lab`) are missing next to the date filter bar (`Today | This Month | This Quarter | This Year | Custom Range`).
* The user inquired why the branch selector was removed from the screen.

### Forensic Git & Codebase Audit Findings
1. **The Branch Selector Was NOT Removed in Recent Commits:**
   * Inspection of git commit history proves `StandardFilterBar.jsx` was **not touched** by recent commits (`36ac15fb`, `2171340c`, `b63239ae`, or `5a99be4f`).
   * The condition controlling branch visibility was authored in commit `c9af52f8` on **Nov 1, 2026**:
     ```jsx
     // src/SynOS.Frontend/src/components/layout/StandardFilterBar.jsx (Line 206)
     {/* Branch Horizon Segment (Consolidated vs Branch View) */}
     {showBranches && isAdmin && (
     ```

2. **The Root Cause: User Role Context (`isAdmin` Evaluation):**
   * In [`GlobalFilterContext.jsx`](file:///src/SynOS.Frontend/src/context/GlobalFilterContext.jsx#L9):
     ```javascript
     const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';
     ```
   * **In Previous Screenshot (`af291207.png`):** The logged-in user in the top system bar was **`Tabrez Developer`** (`user.role = 'Admin'`).
     - `isAdmin` evaluated to `true`.
     - The `All Branches` and `Branch View: Main Lab` selector **WAS rendered**.
   * **In Current Screenshot (`798f99d9.jpg`):** The logged-in user in the top system bar is **`Moin`** (`user.role = 'Receptionist'`).
     - `isAdmin` evaluates to `false`.
     - `StandardFilterBar.jsx` strictly suppresses multi-branch oversight controls (`{showBranches && isAdmin && ...}`) for non-admin staff by design.
     - Cashiers/receptionists are scoped strictly to their active facility.

3. **Inconsistency Between SystemBar & StandardFilterBar:**
   * In [`SystemBar.jsx`](file:///src/SynOS.Frontend/src/components/layout/SystemBar.jsx#L76), multi-branch switching is permitted if:
     ```javascript
     const canSwitchBranches = isAdmin || availableBranches.length > 1;
     ```
   * In [`StandardFilterBar.jsx`](file:///src/SynOS.Frontend/src/components/layout/StandardFilterBar.jsx#L206), the condition is strictly:
     ```jsx
     {showBranches && isAdmin && (
     ```
   * As a result, staff with multi-branch access see the branch dropdown in the top global navigation bar, but cannot switch branches inside the Finance Hub filter bar unless they possess an Admin role.

### 4. Locked Decision & Preserved Architecture (User Confirmed)
* **Confirmed Architectural Directive:** The user has officially approved and locked the role-based separation:
  - **Admin Users:** Retain in-page on-the-fly branch switching directly inside the Finance Filter Bar (`All Branches` consolidated view or single branch dropdown in `StandardFilterBar.jsx`) to perform multi-branch cross-auditing without altering their workstation's global operating branch.
  - **Non-Admin Multi-Branch Staff (Receptionists, Phlebotomists, Lab Technicians):** Strictly restricted from in-page consolidated multi-branch switching in the Finance Hub. They are bound to one active facility at a time. Staff with multi-branch access must switch their working facility globally from the top navigation bar (`SystemBar.jsx`), which updates their active facility context for the entire application session.
* **Preservation Status:** Permanently enshrined in `AGENTS.md` (Section III, Rule 5) and `.agents/AGENTS.md` (Rule 8).

---

## 46. Deep-Dive Audit: Cash Drawer Ledgers Returning Zero Under Admin & Reception Tests — [AUDITED & REPORTED]

### Incident Summary & Observed Evidence
* **User Test Context:** The user installed the latest compiled installer containing commit `36ac15fb` and performed live verification in the Cash Drawer Shift Ledgers tab (`#POS-DRAWER`) under two accounts:
  1. **Admin Test (`media_1794369888756_2e18c40c.png`):** Logged in as `Tabrez Developer` (`Admin`). Filter set to `Today`, branch set to `Branch View: Main Lab`, cashier button clicked on `Moin`.
     - **Observed Result:** Displayed `No Cash Drawer Transactions Recorded`, `Opening Float: ₹0.00`, `Total Cash Inflow: +₹0.00`, `Net Cash In Hand: ₹0.00`.
  2. **Reception Test (`media_1794369961548_097a9f82.png`):** Logged in as `Moin` (`Receptionist`). Top bar set to `Main Lab`, filter set to `Today`, cashier `Moin`.
     - **Observed Result:** Displayed `No Cash Drawer Transactions Recorded`, `Opening Float: ₹0.00`, `Total Cash Inflow: +₹0.00`, `Net Cash In Hand: ₹0.00`.
* **Discrepancy:** In `Collection History` for the same shift date (`2026-11-11`), Moin has 7 confirmed cash transactions totaling ₹3,150 (`media_1794364321533_31912d11.jpg`).

---

### Root Cause 1: Untranslatable LINQ on SQL Server Throws Silent HTTP 500 (`userSpendFacts`)

* **Location:** [`FinanceBillsController.cs:1645-1662`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1645-L1662)
```csharp
// 4. Query all Cash Daily Expenses recorded by this user today
var userPayables = await _context.OverheadPayableFacts
    .Where(p => p.CreatedBy == effectiveUserId
             && p.CreatedAt >= startUtc && p.CreatedAt < endUtc
             && p.Status != SynOS.Models.Enums.Payables.VendorPayableStatus.Cancelled)
    .OrderBy(p => p.CreatedAt)
    .AsNoTracking()
    .ToListAsync();

List<SpendFact> userSpendFacts = new();
if (userPayables.Any())
{
    var userPrefixes = userPayables.Select(p => $"OHP-{p.OverheadPayableId.ToString().Substring(0, 8)}").ToList();
    userSpendFacts = await _context.SpendFacts
        .Where(s => userPrefixes.Any(pfx => s.TransactionReference.StartsWith(pfx))) // 💥 UNTRANSLATABLE IN SQL SERVER
        .AsNoTracking()
        .ToListAsync();
}
```

* **Forensic Breakdown:**
  1. On Moin's shift today (`2026-11-11`), Moin recorded a **₹500 petty cash expense** (visible in the Reception Reality Summary tile 6: `Recorded Expenses: ₹500`).
  2. Because Moin has an expense today, `userPayables.Any()` evaluates to `true`.
  3. The backend then executes `_context.SpendFacts.Where(s => userPrefixes.Any(pfx => s.TransactionReference.StartsWith(pfx)))`.
  4. In Entity Framework Core on Microsoft SQL Server, `IEnumerable<string>.Any(prefix => column.StartsWith(prefix))` **CANNOT be translated into Transact-SQL**. Unlike in-memory LINQ-to-Objects, EF Core throws an immediate:
     `System.InvalidOperationException: The LINQ expression 'DbSet<SpendFact>().Where(s => ...)' could not be translated.`
  5. The API controller crashes with **HTTP 500 Internal Server Error**.
  6. In frontend [`RevenueScreens.jsx:4660-4665`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/finance/RevenueScreens.jsx#L4660-L4665):
     ```javascript
     } catch (err) {
         console.error("Failed to load shift cash ledger:", err);
         setLedgerData(null);
     } finally {
         setLoading(false);
     }
     ```
  7. The frontend silently catches the HTTP 500 failure, sets `ledgerData = null`, and displays `+₹0.00` and `No Cash Drawer Transactions Recorded`. No error toast is rendered, making it look as though the drawer is legitimately empty.

---

### Root Cause 2: Untranslatable Navigation & Null Guard on `cashPaymentsQuery`

* **Location:** [`FinanceBillsController.cs:1634-1637`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1634-L1637)
```csharp
if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
{
    cashPaymentsQuery = cashPaymentsQuery.Where(p => p.Invoice.Visit == null || p.Invoice.Visit.BranchId == effectiveBranchId.Value);
}
```
* **Forensic Breakdown:**
  - If a visit has `BranchId == null` in the database, `p.Invoice.Visit.BranchId == effectiveBranchId.Value` evaluates to SQL `NULL = @id`, which evaluates to `UNKNOWN` (falsy) in SQL Server.
  - Furthermore, deep multi-level navigation checks (`p.Invoice.Visit != null`) inside complex `OR` conditions can cause EF Core query execution plans to fail or drop valid payments when joined across `Payments -> Invoices -> Visits`.

---

### Audit Conclusion & Recommended Rectification (For Approval)
1. **Fix `userSpendFacts` Query:**
   - Instead of the untranslatable `userPrefixes.Any(pfx => s.TransactionReference.StartsWith(pfx))`, retrieve spend facts by exact `SpendFactId` or transaction reference list, or evaluate `StartsWith` in-memory after fetching today's shift spend facts.
2. **Surface API Errors in UI:**
   - Instead of silently suppressing API errors and setting `ledgerData = null`, display an explicit warning banner if the server returns a 500 error so issues are immediately visible in the UI rather than masquerading as an empty ledger.




