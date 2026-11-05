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

## 27. Overpaid Bills & Refund/Change Due Omission on Thermal POS Slip and Finalization Financials (Regression Audit) — [AUDITED & SPECIFIED]
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

















