# SynOS Operational Audit & Fix Registry

**Date:** 2026-10-27  
**Branch:** `cloud-testing-2`  
**Reference Video:** `/Users/tabrez/Blip/20261027_160956.mp4`

---

## 1. Walk-Ins Metric Inaccuracy & Draft Leakage
### Audit Findings & Root Causes
1. **Event Projection Premature Trigger:**
   * In `ReceptionFlowService.StartVisitAsync`, `BranchEventType.VISIT_STARTED` is emitted as soon as registration begins.
   * `OperationalStatsProjector.cs` immediately increments `userStats.WalkInsCount` and `branchStats.WalkInsCount`.
   * If a receptionist opens intake to check tests, tests a draft, cancels, or refreshes without collecting payment, `WalkInsCount` is permanently incremented.
2. **Fallback Query Defect in `InvoiceService.cs`:**
   * `_context.Visits.Where(v => v.BranchId == branchId && v.CreatedAt >= startOfToday && v.CreatedAt < endOfToday).CountAsync()` counts all visit rows without filtering `v.Status != VisitStatus.Draft && v.Status != VisitStatus.Cancelled`.
   * Also fails to distinguish Direct Walk-Ins from Corporate B2B Prepaid visits (`v.PaymentCollectionModel == "PartnerCollects"`), double-counting prepaid visits that are already tracked in the dedicated *Prepaid Bills Issued* card.

### Planned Fix
* Only increment `WalkInsCount` upon finalized visit / bill generation (or adjust on draft abandonment).
* Update `InvoiceService.cs` visits query to enforce:
  ```csharp
  v.Status != VisitStatus.Draft && 
  v.Status != VisitStatus.Cancelled && 
  v.PaymentCollectionModel != "PartnerCollects"
  ```

---

## 2. Pending Reports Metric Scope (All-Time vs. Today's Cohort)
### Audit Findings & Root Causes
1. **All-Time Unsigned Query:**
   * In `OperationsEngine.cs` (`GetDailyOperationsStatsAsync`), the query counts all reports where `r.Visit.BranchId == branchId && r.Visit.Status != VisitStatus.Cancelled && r.Status != "Signed" && r.Status != "ManualVerified"` with **no date filter**.
   * It aggregates all unsigned test/draft reports across history.
2. **Draft Visit Leakage:**
   * Does not filter out `r.Visit.Status == VisitStatus.Draft`.

### Planned Fix
* Separate **Today's Pending Reports** (scoped to today's intake cohort `r.CreatedAt >= todayStart` or `r.Visit.CreatedAt >= todayStart`) from **Total Lab Backlog**.
* Filter out draft visit reports (`r.Visit.Status != VisitStatus.Draft`).

---

## 3. Daily Expenses Disconnection & Vanishing Logged Entries
### Audit Findings & Root Causes
1. **Ephemeral Frontend State:**
   * In `DailyExpensesScreen` (`ExpenseScreens.jsx`), `recentLogs` is an in-memory state (`useState([])`).
   * No `useEffect` exists to fetch today's logged expenses on component mount. Any page reload, tab switch (e.g., viewing Overview and returning to Daily Expenses), or navigation resets the list to empty, showing *"No entries in current session / Session Total ₹0"*.
2. **Missing `BranchId` in `SpendFact`:**
   * In `OverheadExpensesController.cs` (`SettleExpense`), `new SpendFact(..., null, ...)` writes `BranchId = null`.
   * `EconomicsIntelligenceService.cs` filters spend facts by `f.BranchId == branchId.Value`. Because `BranchId` was `null`, the expense is excluded from the branch's financial summary, P&L, and expense feeds.
3. **Property Mismatch in `ExpenseOverviewTab`:**
   * In `ExpenseOverviewTab.jsx`, obligations are calculated via `o.amount`, whereas `OverheadPayableFact` entity returns `amountDue`. `o.amount` is `undefined`, breaking overview cards.

### Planned Fix
* Inject `IUserContext` in `OverheadExpensesController.cs` and assign `spendFact.BranchId = _userContext.CurrentBranchId`.
* Add `GET` endpoint / `loadTodayDailyExpenses()` in `DailyExpensesScreen` to hydrate `recentLogs` and `Session Total` directly from persisted backend truth.
* Fix property name in `ExpenseOverviewTab` (`o.amountDue`).

---

## 4. Keyboard Navigation Loop for Multi-Test Intake
### User Requirement & Problem
* When entering multiple tests via keyboard, pressing `Tab` to reach test selection and selecting a test currently traps or displaces cursor focus.
* To add another test, the operator is forced to tab through the entire modal loop to return to test selection. Entering 3–5 tests in a single visit becomes cumbersome and slow.

### Planned Enterprise Fix
* **Continuous Test Entry Loop:**
  * When a test is selected/added from the dropdown/search (via `Enter` or click), keep or immediately refocus the `Test Selection` search input (`searchInputRef.current?.focus()`).
  * Automatically clear the search input text on addition so the operator can instantly type the next test acronym (e.g., `CBP` -> `Enter` -> `LFT` -> `Enter` -> `URINE` -> `Enter`).
  * Provide an intuitive exit key: pressing `Tab` when the search input is empty smoothly navigates to the next logical section (Discount / Payment / Add Tests button).

---

## 5. Keyboard Tab Focus Ring & Card Backlight Styling
### User Requirement & Problem (Reference: `/Users/tabrez/Blip/20261027_160956.mp4`)
* On laptop displays, the active `Tab` focus ring is too faint and washed out.
* Selection cards (such as *Billing & Payer Mode* cards: Direct/Standard, Corporate B2B, Insurance) have minimal backlight/depth when active/focused.
* **Aesthetic Constraint:** Do not overdo or make focus indicators garish. Maintain the clean, sophisticated SynOS design system aesthetic without compromising visuals.

### Planned Aesthetic Fix
* Refine the focus ring classes across interactive cards and form controls:
  * Replace washed-out borders with a crisp, balanced focus ring: `focus-visible:ring-2 focus-visible:ring-synos-primary/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900`.
  * Add a subtle, ambient backlit elevation glow for active/focused cards:
    `shadow-sm focus-visible:shadow-[0_0_15px_rgba(var(--synos-primary-rgb),0.18)] transition-all duration-200`.
  * Ensure clear visual distinction in both light and dark themes without heavy harsh outlines.

---

## 6. Duplicate Key Collision on `Payments.ReceiptNo` (`SYS-{Token}`) During Visit Correction & Prepaid Intake
### Severity: High / Crash (HTTP 500 `DbUpdateException`)
### Impacted Workflows
* **Visit Correction / Batch Edit:** `POST /api/v1/visits/{id}/batch-edit`
* **Intake Registration for Corporate B2B:** `POST /api/v1/reception/intake/register`
* **Prepaid Settle Flow:** `POST /api/v1/reception/visit/prepaid`

### Incident & Evidence
* **Incident:** Batch edit on Visit `MAI-003` (`SANTHOSH`, Nov 4, 2026) crashed with:
  `"Batch edit failed: An error occurred while saving the entity changes. See the inner exception for details."`
* **Database Constraint:**
  Table `dbo.Payments` has a strict unique index on column `ReceiptNo`:
  ```csharp
  entity.HasIndex(e => e.ReceiptNo).IsUnique();
  ```
* **Live DB Audit:**
  On Nov 2, 2026, visit `MAI-003` (`MAI003-261102`) was billed as Corporate B2B. The system generated a B2B partner settlement payment record with:
  `ReceiptNo = "SYS-MAI-003"`
  On Nov 4, 2026, when today's visit `MAI-003` (`SANTHOSH`) was corrected, EF Core attempted to insert:
  `ReceiptNo = "SYS-MAI-003"`
  SQL Server threw a `Cannot insert duplicate key row in object 'dbo.Payments' with unique index 'IX_Payments_ReceiptNo'`.

### Root Cause Analysis
1. **Missing Date/Temporal Scoping in `ReceiptNo`:**
   In [`VisitService.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs), normal receipts and refunds include date stamps:
   * Cash/UPI Payment: `$"REC-{DateTime.UtcNow:yyyyMMdd}-{visit.Token}"`
   * Refund: `$"REF-{DateTime.UtcNow:yyyyMMdd}-{visit.Token}"`
   However, for Corporate B2B prepaid settlements, the code hardcodes:
   * Line 264: `ReceiptNo = $"SYS-{visit.Token}"`
   * Line 1206: `ReceiptNo = $"SYS-{visit.Token}"`
   * Line 2275: `ReceiptNo = $"SYS-{visit.Token}"`
2. **Token Cyclic Reuse:**
   Tokens reset daily (`MAI-001`, `MAI-002`, `MAI-003`, ...). Without the calendar date or unified invoice number, any B2B visit or visit correction on `Token N` will collide with `Token N` from previous days.

### Architecture Clarification: Unified Bill No. vs. Payment Receipt No.
* **Unified Bill No (`YYYYMMDD-TOKEN` or `TOKEN-YYMMDD`):**
  Identifies the **Invoice / Visit**. For example, `20261104-MAI003`. Because tokens are sequential per branch per day, this number is mathematically guaranteed to be 100% unique across all calendar time. Pairing with MRN is **redundant** and counterproductive (bloats barcode density and thermal slip widths; patient ID is already linked via foreign key).
* **Payment Receipt No (`ReceiptNo`):**
  Identifies individual financial transactions / settlement vouchers against that bill. A single bill can have multiple payments or adjustments.
  Receipt numbers must strictly inherit the unified bill identifier with a transaction prefix:
  * Patient Desk Receipts: `$"REC-{canonicalBillNo}"` (or `$"REC-{canonicalBillNo}-1"`)
  * Patient Refunds: `$"REF-{canonicalBillNo}"` (or `$"REF-{canonicalBillNo}-1"`)
  * B2B Ledger Settlement: `$"SYS-{canonicalBillNo}"`

### Prescribed Fix Specifications (For Implementation Agent)
1. In `src/SynOS.Services/VisitService.cs`:
   Replace all un-scoped `$"SYS-{visit.Token}"` generations (lines 264, 1206, 2275) with the canonical date-scoped format:
   ```csharp
   // Format: SYS-{yyyyMMdd}-{token} or SYS-{invoiceNumber}
   ReceiptNo = $"SYS-{DateTime.UtcNow:yyyyMMdd}-{visit.Token.Replace(" ", "")}"
   ```
   Or dynamically tie to `visit.InvoiceNumber`:
   ```csharp
   ReceiptNo = $"SYS-{visit.InvoiceNumber ?? $"{DateTime.UtcNow:yyyyMMdd}-{visit.Token}"}"
   ```
2. Handle multi-payment suffixes if multiple adjustments occur on the same visit:
   ```csharp
   var existingCount = await _context.Payments.CountAsync(p => p.VisitId == visit.Id);
   var suffix = existingCount > 0 ? $"-{existingCount + 1}" : "";
   ReceiptNo = $"SYS-{DateTime.UtcNow:yyyyMMdd}-{visit.Token}{suffix}";
   ```
3. Run safe migration / sanitization script on existing historical collisions in `dbo.Payments` where `ReceiptNo` was saved without a date stamp.

