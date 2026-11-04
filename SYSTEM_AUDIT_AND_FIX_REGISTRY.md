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

## 11. Reception Action Queue Payment Column Semantic Confusion & Secondary Concession Overpayment / Refund Gap
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

### Prescribed Fix Specifications (For Implementation Agent)
1. **Reception Action Queue Disambiguation (`ReceptionScreen.jsx`):**
   * Detect overpayment condition: `const isOverpaid = totalPaid > totalBilled;`
   * When `isOverpaid`:
     - Render the bill amount with an explicit excess/refund alert:
       `₹{totalBilled}` with subtext `Paid: ₹{totalPaid}` and a distinct badge `REFUND DUE: ₹{totalPaid - totalBilled}`.
   * When normally paid (`totalPaid === totalBilled`):
     - Render `₹{totalPaid}` with badge `CASH` / `UPI`.
2. **Secondary Concession Overpayment Flow (`VisitService.cs` & `BillingSummary.jsx`):**
   * When applying a secondary concession where `newTotal < existingTotalPaid`:
     - Warn the user in the Secondary Concession drawer: *"Applying this concession creates an excess collection of ₹{excess}. Do you want to disburse a cash refund from drawer or credit patient account?"*
     - If refund is confirmed, atomically insert refund `Payment` (`Amount = -excess`, `ReceiptNo = REF-...`) and reversal `RevenueFact` to reconcile the cash drawer and collection ledger to ₹200 net.

---

## 12. Walk-Ins Metric Inaccuracy (Showing 7 vs 12 Actual) & Fragility Root Cause
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
  ```csharp
  var branchVisitsQuery = _context.Visits
      .Where(v => v.BranchId == branchId 
               && (v.TokenDate == today || (v.CreatedAt >= startUtc && v.CreatedAt < endUtc))
               && v.Status != VisitStatus.Cancelled
               && v.Status != VisitStatus.Draft
               && (v.Token == null || !v.Token.StartsWith("D-"))
               && v.PaymentCollectionModel != "PartnerCollects"  // <-- EXCLUDES PREPAID
               && v.BillingType != BillingType.PrepaidPartner); // <-- EXCLUDES PREPAID

  var walkIns = await branchVisitsQuery.CountAsync(); // Result: Exactly 7

  // FATAL REUSE BUG:
  var deskVisitsQuery = branchVisitsQuery; // Inherits the exclusion above!
  ...
  var prepaidVisits = await deskVisitsQuery
      .Where(v => v.PaymentCollectionModel == "PartnerCollects" ...); // IMPOSSIBLE QUERY!
  ```
* Because `deskVisitsQuery` starts from `branchVisitsQuery` which already contains `WHERE PaymentCollectionModel != 'PartnerCollects'`, chaining `.Where(PaymentCollectionModel == 'PartnerCollects')` creates an unsatisfiable SQL clause (`!= 'PartnerCollects' AND == 'PartnerCollects'`).
* The database returns `0` prepaid visits!
* Line 128 then executes:
  `var finalPrepaidCount = prepaidCount > 0 ? prepaidCount : (stats?.PrepaidCount ?? 0);`
  Falling back to stale projector stats, which happened to freeze at `1` (₹340).

#### 3. Semantic Definition Gap: Physical Human Walk-In vs Accounting Retail Direct Payer
* **Physical Clinical Reality (Lab Owner Perspective):**
  Every human who walks through the front door, receives an official accession token (`MAI-xxx`), and enters the phlebotomy queue is a **Physical Walk-In Patient**.
* **Flawed Code Logic:**
  The developer equated "Walk-In" with "Retail Cash/UPI Payer" and subtracted all Corporate B2B visits from Walk-Ins.
  Meanwhile, the UI tile subtitle explicitly promises: **`Walk-Ins (Paid/Credit)`**.
  When 11 patients are sitting in the Action Queue with tokens `MAI-001` to `MAI-012`, displaying `7` makes the lab owner think the software has lost records.

#### 4. Role Scoping Bleed (`Receptionist` vs `Admin`)
* In `InvoiceService.cs:67-71` and `110-114`:
  ```csharp
  else if (_userContext.CurrentRole == "Receptionist")
  {
      var currentUserId = _userContext.CurrentUserId;
      deskVisitsQuery = deskVisitsQuery.Where(v => v.AssignedReceptionistId == currentUserId || v.CreatedByUserId == currentUserId);
  }
  ```
* If staff member A (e.g. Uzma) registers 4 visits, and staff member B (e.g. Dr. Vasudeva Rao) registers 3 visits, logging in as a Receptionist truncates the branch total to only the logged-in user's intake, while logging in as Admin/Pathologist shows the aggregate. This causes numbers to unpredictably jump based solely on who is logged in.

---

### Enterprise ERP Grade Solution Specification (For Implementation Agent)

#### 1. Single Source of Truth: Canonical Database State
Abolish ad-hoc event projection counters for live operational counts. Base all dashboard summary tiles directly on canonical relational database state:
```csharp
// Canonical query scoped to branch and calendar day
var todayVisits = await _context.Visits
    .AsNoTracking()
    .Where(v => v.BranchId == branchId
             && (v.TokenDate == today || (v.CreatedAt >= startUtc && v.CreatedAt < endUtc))
             && v.Status != VisitStatus.Draft
             && v.Status != VisitStatus.Cancelled
             && (v.Token == null || !v.Token.StartsWith("D-")))
    .Include(v => v.Invoices)
    .ToListAsync();
```

#### 2. Partitioning Taxonomy (Mutually Exclusive & Collectively Exhaustive)
Split `todayVisits` deterministically without cross-contamination:
```csharp
// 1. All Valid Confirmed Intake Patients Today (Tokens Issued)
int totalIntakeCount = todayVisits.Count; // 11 active today

// 2. Retail Direct Walk-Ins (Cash, UPI, Card, Desk Credit / Due)
var retailWalkIns = todayVisits
    .Where(v => v.PaymentCollectionModel != "PartnerCollects" && v.BillingType != BillingType.PrepaidPartner)
    .ToList();
int retailWalkInCount = retailWalkIns.Count; // 7

// 3. Corporate B2B / Doctor Referral Prepaid
var prepaidVisits = todayVisits
    .Where(v => v.PaymentCollectionModel == "PartnerCollects" || v.BillingType == BillingType.PrepaidPartner)
    .ToList();
int prepaidCount = prepaidVisits.Count; // 4
decimal prepaidTotal = prepaidVisits.Sum(v => v.Invoices.FirstOrDefault()?.Total ?? 0m);

// INVARIANT: totalIntakeCount == retailWalkInCount + prepaidCount (7 + 4 = 11)
```

#### 3. Clear UI Presentation
* **Card 1 (Walk-Ins):** Display either:
  * Option A (Clinical Reality): **Total Patient Intake: 11** with sub-badge *(7 Direct + 4 B2B)*.
  * Option B (Mutually Exclusive): Keep **Walk-Ins (Direct/Credit): 7** and ensure Card 5 displays **Prepaid Bills: 4 (₹2,290)** so that 7 + 4 = 11 perfectly matches the queue tokens.
* Fix the `branchVisitsQuery` variable overwrite in `InvoiceService.cs` so prepaid visits are never queried against a filter that already excluded them.





