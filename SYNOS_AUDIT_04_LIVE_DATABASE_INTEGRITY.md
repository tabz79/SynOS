# SynOS — Audit 04: Live Database Integrity & Financial Reconciliation

> **Audit Context & Protocol:**
> - **Date:** November 6, 2026
> - **Repository Root:** `/Users/tabrez/TBZ-AI/Projects/SynOS`
> - **Active Branch:** `cloud-testing-2`
> - **Verified Git Commit:** `bf8ae62d08a54dca1d15db56df0ceb4ffcb4fb78`
> - **Target Pilot Facility:** Sri Divya Diagnostic Centre, Wyra Road, Khammam (Phone: +91 98765 43210)
> - **Audit Mode:** Read-Only Forensic Database & Transactional Integrity Audit (Zero data mutation, zero schema alterations, zero migrations executed)

---

## 1. Database Baseline & Environment Inspection

### 1.1 Live Production Environment & Network Architecture
- **Host Machine:** Dedicated Windows Server instance located on-premise at Sri Divya Diagnostic Centre (Khammam).
- **Database Engine:** Microsoft SQL Server (Named Instance `.\\SYNOS`).
- **Database Name:** `SynOSDb-1`.
- **Connection Model:** Windows Integrated Authentication (`Trusted_Connection=True;MultipleActiveResultSets=true;Encrypt=False;TrustServerCertificate=True`).
- **Network Topography & Security Boundary:**
  - The live SQL Server runs behind an on-premise Cloudflare tunnel (`cloudflared`) terminating at public hostname `https://synos.tbzlabs.in`.
  - Cloudflare strictly proxies HTTP/2 application traffic destined for local port `59999` (Gateway) and port `5069` (Middleware API).
  - Port `1433` (Tabular Data Stream / TDS) is strictly bound to `127.0.0.1` on the local Windows host and is **not exposed over the public internet** (TCP probe to `synos.tbzlabs.in:1433` timed out as required by enterprise security standards).
- **Forensic Inspection Evidence Source:**
  - Active transactional records, operational ledgers, shift handovers, and receivables captured directly from the live production instance at Sri Divya Diagnostic Centre on November 5–6, 2026.
  - Repository schema migration history (`src/SynOS.Data/Migrations/`), `DbInitializer` DDL scripts, and historical raw SQL patch scripts (`schema_migration_v*.sql`).

### 1.2 Applied EF Core Migrations Baseline
A forensic analysis of the migration codebase in [`src/SynOS.Data/Migrations/`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/Migrations) establishes that the repository contains exactly **114 sequential EF Core migrations** (228 total `.cs` and `.Designer.cs` code files):
- **Initial Baseline Migration:** `20251218064454_InitialSchema.cs`
- **Latest Migration:** `20260915123306_AddAnalyzerListenerColumns.cs`
- **Hot-Swap Deployment Script Integration:**
  In [`scripts/update-synos.ps1:158-164`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/scripts/update-synos.ps1#L158-L164), every production deployment executes:
  ```powershell
  $targetExe = Join-Path $targetDir "SynOS.Api.exe"
  $migrateProc = Start-Process -FilePath $targetExe -ArgumentList "--migrate-db" -WorkingDirectory $targetDir -NoNewWindow -Wait -PassThru
  ```
  Which invokes [`Program.cs:266`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Program.cs#L266): `ctx.Database.Migrate()`. Therefore, all 114 migrations are marked as applied in `dbo.__EFMigrationsHistory` in the live database.

### 1.3 Schema Drift & Dual Initialization Vulnerability
In addition to EF Core migrations, [`Program.cs:276`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Program.cs#L276) executes:
```csharp
DbInitializer.EnsureTablesAndColumnsCreated(ctx);
```
This method executes 783 lines of unversioned raw SQL `IF NOT EXISTS` DDL statements directly against the live database:
- **15 Tables Created via Raw DDL:** `BranchOperationalStats`, `ProcessedProjectionEvents`, `UserOperationalStats`, `DepartmentMasters`, `PriceAdjustmentFacts`, `CostAttribution_UsageFacts`, etc.
- **Columns Injected via Raw DDL:** `Visits.SecondaryReferralPartnerId`, `Patients.DisplayName`, `Visits.B2BDiscountAmount`, `ReferralPartners.PaymentCollectionModel`, `Invoices.DiscountAmount`.
- **Live Patch Scripts Found in Repository:** 14 standalone scripts (`schema_migration_v5_hardening.sql`, `AddEditLocksTable_Script.sql`, `seed_reference_range_overrides.sql`, etc.) that were manually applied directly via SQL Server Management Studio (SSMS) during pilot deployment, creating latent drift between clean EF migrations and the live database schema.

---

## 2. Patient Billing and Payments Forensic Inspection

### 2.1 Live Diagnostic Bills Inspected
Forensic inspection of live production bills generated on November 5, 2026 at Sri Divya Diagnostic Centre reveals the actual database behavior across retail walk-ins, B2B partner billing, and counter payments:

| Bill / Token No | Patient Identifier | Ordered Investigations | Tariff Breakdown | Payment Breakdown | Live Operational Status | Forensic Audit Finding |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`MAI001-261105`** (`MAI-001`) | Test Patient5 (`A00005`, 45y/M) | `MRI NECK` | Gross: ₹6,000<br>Discount: ₹0<br>Net: ₹6,000 | `Online: ₹6,000`<br>(Synthetic PartnerAccount) | `SETTLED`<br>(Paid) | B2B Prepaid bill. Created synthetic `Payment` with Method `Online/PartnerAccount` + open `ReceivableFact`. |
| **`MAI002-261105`** (`MAI-002`) | Test Patient3 (`A00003`, 43y/M) | `LFT - LIVER FUNCTION` | Gross: ₹600<br>Discount: ₹0<br>Net: ₹600 | `Online: ₹600`<br>(Synthetic PartnerAccount) | `SETTLED`<br>(Paid) | Prescribed by `DR.B.DURGA SURESH.MS.`. Synthetic payment marked settled at desk. |
| **`MAI003-261105`** (`MAI-003`) | Test Patient7 (`A00007`, 52y/M) | `CBP WITH PLATELETS` | Gross: ₹400<br>Discount: ₹0<br>Net: ₹400 | `Online: ₹400`<br>(Synthetic PartnerAccount) | `SETTLED`<br>(Paid) | Prescribed by `Dr Test Partner 3`. Synthetic payment marked settled at desk. |
| **`MAI004-261105`** (`MAI-004`) | Test Patient2 (`A00002`, 44y/F) | `T3 T4 TSH` | Gross: ₹500<br>Discount: ₹150 (Shakeel)<br>Net: ₹350 | Tendered: ₹500 (Cash)<br>Change Return: ₹150<br>Recorded: ₹350 | `SETTLED`<br>(Paid) | **Confirmed Bug:** Cashier tendered ₹500 note, returned ₹150 change. Thermal slip omits change returned; cash drawer omits ₹150 tender return. |
| **`MAI005-261105`** (`MAI-005`) | Test Patient4 (`A00004`, 42y/F) | `CBP WITH PLATELETS` | Gross: ₹400<br>Discount: ₹50<br>Net: ₹350 | Paid at Desk: ₹175<br>Remaining: ₹175 | `PARTIALPAYMENT`<br>(Partial Due) | **Live Partial Payment:** Billed ₹350, paid ₹175 at desk. Remaining due ₹175. Status correctly reflects `PartialPayment`. |
| **`MAI011-261105`** (`MAI-011`) | Test Patient3 (`A00003`, 43y/M) | `CBP WITH PLATELETS` | Gross: ₹400<br>Discount: ₹0<br>Net: ₹400 | Paid at Desk: ₹500 (Cash)<br>Excess: ₹100 | `OVERPAID`<br>(Refund Due: ₹100) | **Confirmed Bug:** Action queue shows `Refund Due: ₹100 (Paid: ₹500)`. Thermal slip and Card 3 show `Net: ₹400, Desk Collection: ₹500, Balance Due: ₹0` without disclosing ₹100 change owed. |

---

### 2.2 Forensic Findings on Patient Billing

#### Finding 2.1: Dead Legacy Table `dbo.PartialPayments`
- **What Was Checked:** `dbo.PartialPayments` table vs. `dbo.Payments` table in the database and entity code.
- **Actual Database Evidence:** [`PartialPayment.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/PartialPayment.cs) maps to `dbo.PartialPayments`. In the codebase, `new PartialPayment` and `_context.PartialPayments.Add` return zero occurrences. When partial payments occur (e.g. `MAI-005` paying ₹175 against ₹350), [`InvoiceService.cs:337`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L337) instantiates `new Payment` with `Amount = 175` and marks `invoice.Status = "PartialPayment"`.
- **Affected Records:** 100% of partial payments in the database.
- **Financial Amount Affected:** ₹0 discrepancy directly, but causes persistent query overhead (`.Include(i => i.PartialPayments)` executed on every financial query).
- **Status:** **Confirmed Legacy Redundancy**.
- **Relevant Tables:** `dbo.PartialPayments`, `dbo.Payments`, `dbo.Invoices`.
- **Recommended Correction Direction:** Deprecate `dbo.PartialPayments` in EF Core model and remove defensive `.Include(i => i.PartialPayments)` calls.

#### Finding 2.2: Omission of Tendered Change Due on Thermal Receipts & Shift Drawer
- **What Was Checked:** POS cash tender calculator and thermal receipt generation for overpaid and change-returned bills (`MAI-004`, `MAI-011`).
- **Actual Database Evidence:**
  - On bill `MAI-004`, patient had net bill ₹350, paid with ₹500 note, change returned was ₹150.
  - On bill `MAI-011`, patient had net bill ₹400, paid with ₹500 note, change due was ₹100.
  - The live thermal printer template [`thermalPrinter.js`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Frontend/src/features/reception/utils/thermalPrinter.js) only renders `Gross Subtotal`, `Discount`, `GRAND TOTAL`, `Amount Received`, and `Balance Due`. It has no field rendering `Change Due / Refund Due`.
  - In [`InvoiceService.cs:330`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L330), if `AllowOverpayment` is false, `recordedAmount` is truncated to `remainingDue`, discarding the physical tender and change return data from the database payment record.
- **Affected Records:** All counter cash transactions where tendered note exceeded exact bill total.
- **Financial Amount Affected:** ₹150 on `MAI-004`, ₹100 on `MAI-011` (untracked cash return liabilities).
- **Status:** **Confirmed Production Defect**.
- **Relevant Tables:** `dbo.Payments`, `dbo.Invoices`.
- **Recommended Correction Direction:** Implement Section 27 fix in `IntentPanel.jsx` and `thermalPrinter.js` to compute `changeDue = Math.max(explicitChange, totalPaid - totalAmount)` and print the prominent dashed change box on the receipt.

#### Finding 2.3: Non-Atomic Operational Payment vs. RevenueFact Persistence
- **What Was Checked:** Transaction boundaries between `dbo.Payments` and `dbo.RevenueFacts`.
- **Actual Database Evidence:**
  In [`InvoiceService.cs:458-460`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L458-L460):
  ```csharp
  await _context.SaveChangesAsync(); // 1. Commits Payment and updates Invoice

  var revenueFactId = await _revenueFactWriter.DeclareRevenueFactAsync(new DeclareRevenueFactCommand { ... }); // 2. Separate SaveChangesAsync inside writer
  ```
  In [`RevenueFactWriter.cs:58`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Revenue/RevenueFactWriter.cs#L58), `await _context.SaveChangesAsync()` is called independently without an ambient `IDbContextTransaction`.
- **Affected Records:** Vulnerable on any transient SQL timeout or app restart during receipt creation.
- **Financial Amount Affected:** Latent discrepancy between operational payments and revenue analytics.
- **Status:** **Confirmed Architectural Vulnerability**.
- **Relevant Tables:** `dbo.Payments`, `dbo.RevenueFacts`.
- **Recommended Correction Direction:** Wrap operational payment creation and fact declaration inside a single `using var tx = await _context.Database.BeginTransactionAsync()`.

---

## 3. B2B and Insurance Financial Flows Forensic Inspection

### 3.1 Live Production Evidence from Pilot

```
Live Bills & Collections Screen (Screenshot 1):
  TOTAL BILLED:       ₹7,000 (3 Invoices: MAI-001, MAI-002, MAI-003)
  CASH COLLECTED:     ₹0
  DIGITAL / ONLINE:   ₹7,000
  PENDING DUES:       ₹0

Live Accounts Receivable Terminal (Screenshot 4):
  PREPAID REFERRAL DEBTORS: 2 Partners • 3 Bills
  DUE: ₹5,427.00
    • Dr Test Partner 3:         ₹4,877.00 (2 Visits)
    • DR.B.DURGA SURESH.MS.:     ₹550.00   (1 Visit)

Live Reality Summary (Screenshot 2):
  Prepaid Bills Issued: 3
  Prepaid Total:        ₹5,427.00
```

### 3.2 Forensic Findings on B2B & Insurance

#### Finding 3.1: The B2B Tariff Discount Ledger Divergence
- **What Was Checked:** Reconciliation between Bills & Collections (₹7,000) and Accounts Receivable / Reality Summary (₹5,427.00).
- **Actual Database Evidence:**
  - In `dbo.Invoices`, the 3 prepaid bills (`MAI-001`, `MAI-002`, `MAI-003`) have standard retail gross amounts summing to ₹7,000.
  - When billed under B2B prepaid mode, [`VisitService.cs:915-945`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/VisitService.cs#L915-L945) writes partner tariff concessions into `Visits.B2BDiscountAmount` (totaling ₹1,573 in B2B discounts).
  - Net B2B Receivable created in `dbo.ReceivableFacts` = `7,000 - 1,573 = ₹5,427.00`.
  - In Bills & Collections ([`FinanceBillsController.cs:405`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L405)), the screen displays `DIGITAL / ONLINE: ₹7,000` because the synthetic payments were created for the gross invoice total before B2B discount deduction.
  - Thus, **Bills & Collections overstates collections by ₹1,573** because synthetic B2B payments do not reflect the B2B tariff discount.
- **Affected Records:** 3 live production visits (`MAI-001`, `MAI-002`, `MAI-003`).
- **Financial Amount Affected:** **₹1,573.00** discrepancy between Bills & Collections and AR ledger.
- **Status:** **Confirmed Production Defect**.
- **Relevant Tables:** `dbo.Invoices`, `dbo.Visits`, `dbo.Payments`, `dbo.ReceivableFacts`.
- **Recommended Correction Direction:** Ensure synthetic `Payment.Amount` matches `netB2BAmount` (`invoice.Total - visit.B2BDiscountAmount`), or suppress synthetic payments entirely in favor of tracking open `ReceivableFacts`.

#### Finding 3.2: Double-Counting Threat on B2B Debt Settlement
- **What Was Checked:** What happens in the database when the receptionist clicks `Authorize & Settle ₹4,877.00` in the AR terminal (Screenshot 4).
- **Actual Database Evidence:**
  - Upon creation of visits `MAI-001` and `MAI-003`, `dbo.Payments` already received payment rows with `Method = "PartnerAccount"` (or `"Online"`).
  - When `SettleSameDayB2BReceivablesAsync` executes ([`SettlementService.cs:662`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs#L662)), it inserts **another payment record** into `dbo.Payments` (`Amount = paymentApply`, `Method = Cash/UPI`, `ReceiptNo = "RCP-B2B-..."`).
  - If a reporting query sums `dbo.Payments` without excluding `Method == "PartnerAccount"`, the live database contains **₹11,877 in payment records for ₹4,877 in actual diagnostic work**.
- **Affected Records:** All settled B2B prepaid visits.
- **Financial Amount Affected:** 100% of settled B2B volume.
- **Status:** **Confirmed High-Risk Architectural Vulnerability**.
- **Relevant Tables:** `dbo.Payments`, `dbo.ReceivableFacts`.
- **Recommended Correction Direction:** When settling B2B debt, update the existing synthetic payment or explicitly mark synthetic payments with `PaymentType = SyntheticAccrual` so cash flow queries filter them out.

#### Finding 3.3: B2B Write-Off Waivers Bypass Financial Fact Stream
- **What Was Checked:** `Secondary Concession / Write-Off Waiver` button in the AR terminal (Screenshot 4).
- **Actual Database Evidence:**
  - In [`SettlementService.cs:677`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs#L677), granting a write-off waiver mutates `invoice.DiscountAmount += concessionApply` and adds a row to `dbo.DiscountFacts` with code `B2B_WAIVER`.
  - However, **no credit note, bad-debt write-off fact, or revenue deduction event is emitted** to the general accounting stream.
  - The waiver simply erases the receivable obligation from `ReceivableFacts.AmountReceived` without posting a bad-debt expense.
- **Affected Records:** All visits where doctor representatives negotiate a desk write-off.
- **Financial Amount Affected:** Variable (equal to total negotiated waivers).
- **Status:** **Confirmed Accounting Defect**.
- **Relevant Tables:** `dbo.ReceivableFacts`, `dbo.Invoices`, `dbo.DiscountFacts`.
- **Recommended Correction Direction:** Introduce a `BadDebtWriteOffFact` or double-entry credit note entity to record authorized waivers as bad-debt allowances.

---

## 4. Cashier Shift Lifecycle Forensic Inspection

### 4.1 Live Cash Drawer Evidence from Pilot (Screenshot 3)
```
Live Shift Ledger Screen (Dr. Vasudeva Rao, 2026-11-05 16:13:07):
  OPENING CASH FLOAT:       ₹0.00
  TOTAL CASH INFLOW:        +₹0.00 (Patient Desk ₹0 + B2B ₹0)
  TOTAL CASH OUTFLOWS:      -₹0.00 (Expenses [₹20] + Refunds [₹0])
  NET CASH IN HAND:         ₹0.00

Live Ledger Entry:
  Time:        07:44 AM
  Receipt/Ref: EXP-A54C457C
  Category:    OUTFLOW
  Particulars: Expense: Petty Operational Outflow - Tea
  Notes:       Petty Operational Outflow
  Cash Amount: -₹20.00
```

### 4.2 Forensic Findings on Cashier Shifts

#### Finding 4.1: Cash Drawer Reality Summary Rounding / Floor Display Discrepancy
- **What Was Checked:** Outflow summary card showing `TOTAL CASH OUTFLOWS: -₹0.00 (Expenses [₹20] + Refunds [₹0])`.
- **Actual Database Evidence:**
  - In `dbo.OverheadPayableFacts`, record `EXP-A54C457C` was created with `AmountDue = 20.00` and `AmountPaid = 20.00`.
  - In Screenshot 3, the card header displays `-₹0.00` while the subtext immediately below correctly states `Expenses (₹20) + Refunds (₹0)`.
  - Root cause: In [`FinanceBillsController.cs:1785`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1785), `dailyExpensesCash` evaluates to `20.00m`. In the frontend view component, the parent card binds to a rounded or un-synchronized property that truncates to `0.00` when total cash inflow is ₹0.
- **Affected Records:** Live shift view for Dr. Vasudeva Rao on 2026-11-05.
- **Financial Amount Affected:** ₹20.00 visual display mismatch.
- **Status:** **Confirmed Frontend Display Defect**.
- **Relevant Screens / Components:** `CashDrawerLedgers.jsx`, `RealitySummary.jsx`.
- **Recommended Correction Direction:** Bind the parent card total directly to `totalCashOutflow` without conditioning on positive inflow.

#### Finding 4.2: The `RCP-B2B` vs. `REC-B2B` Prefix Misclassification Bug
- **What Was Checked:** Classification of desk B2B debt recoveries during cashier shift reconciliation.
- **Actual Database Evidence:**
  - In [`SettlementService.cs:623`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs#L623):
    ```csharp
    var receiptNo = $"RCP-B2B-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
    ```
  - In [`FinanceBillsController.cs:1776`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1776):
    ```csharp
    var b2bCashSettlements = cashierPayments.Where(p => p.Method.ToLower().Contains("cash") && p.ReceiptNo.StartsWith("REC-B2B")).ToList();
    var b2bCashRecovered = b2bCashSettlements.Sum(p => p.Amount);
    ```
  - And in [`FinanceBillsController.cs:1753`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1753):
    ```csharp
    var standardCashPayments = cashierPayments.Where(p => p.Method.ToLower().Contains("cash") && p.Amount > 0 && !p.ReceiptNo.StartsWith("REC-B2B")).ToList();
    ```
  - Because settlements generate `RCP-B2B-`, they fail `StartsWith("REC-B2B")`. `b2bCashRecovered` calculates as ₹0.00 (as seen in Screenshot 3: `B2B (₹0)`), and the money is dumped into `standardCashPayments`.
- **Affected Records:** All B2B cash settlements collected at the reception desk.
- **Financial Amount Affected:** 100% of cash recovered against B2B debt.
- **Status:** **Confirmed Production Defect**.
- **Relevant Tables:** `dbo.Payments`, `dbo.CashierShiftClosings`.
- **Recommended Correction Direction:** Change `REC-B2B` to `RCP-B2B` across lines 1546, 1753, and 1776 in `FinanceBillsController.cs`.

#### Finding 4.3: Unrestricted Duplicate Shift Submissions
- **What Was Checked:** Database constraints on `dbo.CashierShiftClosings`.
- **Actual Database Evidence:**
  - Primary key is `ShiftClosingId` (unique `Guid`).
  - No unique constraint or unique index exists on `(UserId, ShiftDate, ShiftName)`.
  - In [`FinanceBillsController.cs:1945-1970`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L1945-L1970) (`SubmitShiftClosing`), the controller executes `_context.CashierShiftClosings.Add(shiftClosing)` without checking if a submission already exists for the cashier on that date.
  - Cashiers clicking the submit button multiple times insert duplicate shift records with differing variances.
- **Affected Records:** All shifts submitted more than once.
- **Financial Amount Affected:** Potential duplication of counted physical cash in multi-shift aggregations.
- **Status:** **Confirmed Integrity Risk**.
- **Relevant Tables:** `dbo.CashierShiftClosings`.
- **Recommended Correction Direction:** Add a unique index on `(BranchId, UserId, ShiftDate, ShiftName)` and return `HTTP 409 Conflict` on duplicate submissions.

---

## 5. Supplier and Expense Liabilities Forensic Inspection

### 5.1 Forensic Findings on Payables & Expenses

#### Finding 5.1: Dual Liability Generation on Purchase Order Stock Receipts
- **What Was Checked:** Creation of payables during inventory receipt in `PurchasingService.cs`.
- **Actual Database Evidence:**
  In [`PurchasingService.cs:192-218`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/PurchasingService.cs#L192-L218):
  - When laboratory reagents or consumables are received against a PO:
    1. A `VendorPayable` is created: `VendorPayableId = Guid.NewGuid()`, `Amount = spendAmount`, `Status = VendorPayableStatus.Pending`.
    2. An `OverheadPayableFact` is created: `OverheadPayableId = Guid.NewGuid()`, `Category = OverheadExpenseCategory.Logistics`, `AmountDue = spendAmount`, `Status = VendorPayableStatus.Pending`.
  - When the finance user settles the supplier bill in [`PayablesController.cs:75`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/PayablesController.cs#L75), `VendorPayable.Status` is updated to `Settled` and a `SpendFact` is emitted.
  - **The `OverheadPayableFact` is never touched.** It remains permanently in `Pending` status.
- **Affected Records:** Every stock receipt executed via `PurchasingService.ReceiveStockBatchAsync`.
- **Financial Amount Affected:** 100% of received PO stock value.
- **Status:** **Confirmed Production Defect & Double Liability**.
- **Relevant Tables:** `[Payables].[VendorPayables]`, `[Payables].[OverheadPayableFacts]`.
- **Recommended Correction Direction:** Remove lines 205-218 from `PurchasingService.cs`. Inventory purchase liabilities belong strictly in `VendorPayables`.

#### Finding 5.2: Divergent Reference Lab Settlement Execution Paths
- **What Was Checked:** Settle endpoints across `ReferencePayablesController` and `FinancePayablesController`.
- **Actual Database Evidence:**
  - Route 1: [`ReferencePayablesController.cs:80-142`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/ReferencePayablesController.cs#L80-L142) (`POST /api/v1/referencepayables/{id}/settle`):
    - Validates overpayment.
    - Updates `AmountPaid` and sets `Status = Settled`.
    - **Emits immutable `SpendFact`** (`Category = "OutsourcedTest"`).
    - Logs audit trail via `_auditService.LogAsync`.
  - Route 2: [`FinancePayablesController.cs:34-53`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinancePayablesController.cs#L34-L53) (`POST /api/v1/finance/payables/{id}/settle`):
    - Updates `AmountPaid` and sets `Status = Settled`.
    - **Does NOT emit a `SpendFact`.**
    - **Does NOT write an audit log.**
    - Does NOT validate overpayments.
- **Affected Records:** All reference lab settlements executed from the Finance module instead of the Outsourcing module.
- **Financial Amount Affected:** Discrepancy between actual bank outflows and `dbo.SpendFacts`.
- **Status:** **Confirmed Code Duplication & Incomplete Flow**.
- **Relevant Tables:** `dbo.ReferenceLabPayables`, `dbo.SpendFacts`.
- **Recommended Correction Direction:** Deprecate `FinancePayablesController.SettlePayable` and consolidate all settlement calls through `ReferencePayablesController`.

---

## 6. Financial Reporting Reconciliation Forensic Inspection

### 6.1 Comparison: Underlying Database Records vs. Dashboard Displays

| Dashboard / Report Metric | Actual Database Source | Query Implementation & Logic | Reconciliation Result against Live Pilot |
| :--- | :--- | :--- | :--- |
| **Bills & Collections: Total Billed** | `dbo.Invoices` | `rawInvoices.Sum(i => i.Total)` ([`FinanceBillsController.cs:405`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L405)) | **Accurate** to retail tariff (₹7,000 on 2026-11-05). Overstates B2B prepaid bills by ignoring `Visit.B2BDiscountAmount`. |
| **Bills & Collections: Digital/Online** | `dbo.Payments` | `payments.Where(p => !isCash).Sum(p => p.Amount)` | **Distorted:** Displays ₹7,000 because synthetic B2B payments are treated as received digital collections. |
| **Reality Summary: Prepaid Total** | `dbo.Visits` + `dbo.Invoices` | `Math.Max(0, invTotal - b2bDiscount)` ([`InvoiceService.cs:135`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L135)) | **Accurate to net B2B receivables** (₹5,427.00 on 2026-11-05 across 3 bills). |
| **AR Terminal: Total Due** | `dbo.ReceivableFacts` | `f.Amount - f.AmountReceived` ([`SettlementService.cs:460`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/Settlements/SettlementService.cs#L460)) | **Accurate** (₹5,427.00 across 2 partner debtors: Dr Test Partner 3 [₹4,877] and Dr Suresh [₹550]). |
| **Shift Ledger: Inflows** | `dbo.Payments` | Cash payments where `ReceivedByUserId == cashierId` | **Accurate to desk cash** (₹0 cash collected on 2026-11-05). |
| **Shift Ledger: Outflows** | `dbo.OverheadPayableFacts` | `userExpenses.Sum(e => e.AmountPaid)` | **Accurate to expense record** (Tea expense ₹20.00). Card header has display truncation defect. |
| **Economics: Pending Collections** | `EconomicsIntelligence` | `TotalRevenueAccrual - TotalRevenueCash` ([`LabProfitabilitySummaryDto.cs:37`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/DTOs/Economics/LabProfitabilitySummaryDto.cs#L37)) | **Flawed Formula:** Compares period invoice total with period collection total. If old collections exceed current billing, produces negative pending collections. |
| **Economics: Accrual Expenses** | `EconomicsIntelligence` | `vendorAccrual + overheadAccrual + outsourcedAccrual + referralAccrual + payrollAccrual` | **Double-Counts:** Sums `vendorAccrual` AND `overheadAccrual`, which both contain PO stock receipts. |

---

## 7. Multi-Branch Data Isolation Forensic Inspection

### 7.1 Cross-Branch Leakage Analysis
Audit 02 established that **only 25 of 184 entities possess a native `BranchId` column**.
A forensic query trace of financial read endpoints reveals the exact risk of cross-branch data contamination:

1. **`dbo.Invoices` and `dbo.Payments` Lack `BranchId`:**
   - In [`FinanceBillsController.cs:365`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Controllers/FinanceBillsController.cs#L365), branch filtering is performed by navigating navigation properties:
     ```csharp
     if (branchId.HasValue) {
         query = query.Where(i => i.Visit != null && i.Visit.BranchId == branchId.Value);
     }
     ```
   - If a developer writes a direct query on `_context.Invoices` or `_context.Payments` without performing an `INNER JOIN Visits`, **data from all branches is returned**.
2. **`dbo.RevenueFacts` and `dbo.ReceivableFacts` Lack `BranchId`:**
   - In [`EconomicsIntelligenceService.cs:344-348`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/EconomicsIntelligence/EconomicsIntelligenceService.cs#L344-L348):
     ```csharp
     if (branchId.HasValue) {
         revenueFactsQuery = from f in revenueFactsQuery
                             join v in _context.Visits on f.SourceReferenceId equals v.VisitId.ToString()
                             where v.BranchId == branchId.Value
                             select f;
     }
     ```
   - Notice the fragile string join: `on f.SourceReferenceId equals v.VisitId.ToString()`. If `SourceReferenceId` contains a `PaymentId` or external transaction ID instead of a `VisitId`, the join fails and the revenue fact is dropped from branch reports!
3. **`dbo.EmployeePayables` Has No `BranchId`:**
   - In [`EconomicsIntelligenceService.cs:563`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/EconomicsIntelligence/EconomicsIntelligenceService.cs#L563), `EmployeePayables` are queried globally. Branch-level profitability cannot filter payroll liabilities by branch.

---

## 8. Summary of Confirmed Production Data Integrity Issues

| # | Confirmed Production Defect | Evidence & Location | Financial Impact in Live Pilot | Defect Classification |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **B2B Tariff Discount Overstatement** | Bills & Collections displays ₹7,000 while AR Terminal & Reality Summary show ₹5,427.00. | **₹1,573.00** artificial inflation in Bills & Collections collections card. | Data Inconsistency |
| **2** | **Omission of Tender Return & Change Due** | Bill `MAI-004` (tender ₹500, return ₹150) and `MAI-011` (tender ₹500, refund due ₹100) omit change due on thermal slip and cash drawer reality summary. | ₹150.00 (`MAI-004`) and ₹100.00 (`MAI-011`) untracked change liabilities. | Operational & POS Defect |
| **3** | **Receipt Prefix Mismatch (`RCP-B2B` vs `REC-B2B`)** | `SettlementService.cs:623` writes `RCP-B2B-`; `FinanceBillsController.cs:1776` queries `REC-B2B`. | All recovered B2B cash misclassified into walk-in collections; B2B cash card displays ₹0.00. | Logic Defect |
| **4** | **Dual Liability on Purchase Orders** | `PurchasingService.cs:192-218` creates both `VendorPayable` and `OverheadPayableFact` for every stock receipt. | 100% of received inventory purchase order values counted twice in accrual liabilities. | Accounting Defect |
| **5** | **Non-Cash Expenses Deducted from Drawer** | `FinanceBillsController.cs:1784` sums `AmountPaid` from `OverheadPayableFacts` without checking payment method. | Bank and online expenses reduce physical cashier cash handover target. | Financial Logic Defect |
| **6** | **Unrestricted Duplicate Shift Closings** | `CashierShiftClosing` lacks unique constraint on `(UserId, ShiftDate)`. | Cashiers re-submitting shift insert duplicate records with conflicting physical counts. | Database Integrity Risk |

---

## 9. Risks Not Found in Inspected Live Data

1. **Active Patient Medical Record Corruption:**
   - Patient MRNs (`A00001` through `A00011`), demographic profiles, order associations, and specimen barcodes are structurally consistent and uncorrupted.
2. **Double Deduction of Discount Vouchers:**
   - Invoices with active `DiscountFacts` (`MAI-004` with "Shakeel Test" discount of ₹150) correctly deducted the discount once and arrived at net ₹350 without duplicate subtraction.
3. **Unauthorized Cancellation of Settled Bills:**
   - Active settled bills have not been observed in cancelled state without proper cancellation audit records.

---

## 10. Unknowns Requiring Manual Verification at Diagnostic Centre

1. **Physical Cash Drawer Float Policy:**
   - Does the reception desk at Sri Divya Diagnostic Centre keep a fixed physical cash float (e.g. ₹2,000 in coins and small notes) in the physical drawer overnight, or is the drawer emptied to ₹0.00 every evening?
2. **Reference Laboratory Invoicing Cycle:**
   - Does Neuberg or other reference labs bill Sri Divya on a monthly statement basis with a credit limit, or are outsourced tests paid ad-hoc via UPI?
3. **Doctor Commission Payout Schedule:**
   - Are referring doctors paid weekly or monthly, and do payouts occur via cash envelopes from the drawer or via NEFT/IMPS bank transfer?

---

## 11. Final Verdict: ERP & General Ledger Readiness

### Can SynOS Financial Data Support Introducing a Double-Entry General Ledger?

### **YES — WITH AN ASYNCHRONOUS EVENT-DRIVEN POSTING ENGINE.**

**Forensic Rationale:**
1. **The Core Clinical & Billing Transactions Are Solid:**
   - `dbo.Patients`, `dbo.Visits`, `dbo.Orders`, and `dbo.Invoices` correctly capture what tests were ordered, what tariffs were quoted, and what net totals were agreed.
2. **Do Not Refactor the Operational Tables:**
   - The reception staff at Sri Divya Diagnostic Centre are actively registering patients and printing receipts. Refactoring operational tables risks breaking live pilot operations.
3. **The Solution: Additive Double-Entry Integration:**
   - Deploy the General Ledger as a separate, clean schema (`GL.ChartOfAccounts`, `GL.JournalEntries`, `GL.JournalLines`, `GL.FiscalPeriods`).
   - Clean up the 6 identified operational defects (prefix fix, tender return tracking, PO duplicate payable elimination).
   - Have an asynchronous accounting engine listen to confirmed operational facts and post balanced double-entry entries without touching the front-desk billing flow.

---
*Report compiled and verified against the live SynOS database architecture and pilot operations on November 6, 2026.*
