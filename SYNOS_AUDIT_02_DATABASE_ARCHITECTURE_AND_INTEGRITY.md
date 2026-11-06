# SYNOS — AUDIT 02: DATABASE ARCHITECTURE, RELATIONSHIPS & DATA INTEGRITY
**Target System:** SynOS (Diagnostic Laboratory Operating System & Enterprise ERP)  
**Repository Path:** `/Users/tabrez/TBZ-AI/Projects/SynOS`  
**Active Git Branch:** `cloud-testing-2`  
**Audit Date:** November 6, 2026  
**Audit Type:** Read-Only Database Architecture, Schema Mapping & Data Integrity Forensic Audit  
**Author:** DeepMind Antigravity Pair-Programming Agent (Antigravity 2.0)  
**Status:** Canonical Reference Document (Do Not Overwrite)

---

## 1. Executive Summary

This forensic audit evaluates the database architecture of SynOS to determine its readiness to support a fully integrated diagnostic business Enterprise Resource Planning (ERP) platform—including double-entry general ledger accounting, accounts receivable/payable, inventory valuation, cash/bank treasury, and payroll—while maintaining operational continuity for the active pilot at *Sri Divya Diagnostic Centre*.

### Primary Architectural Findings

1. **Massive Schema Footprint with Hybrid Paradigms:**
   - The data tier is managed by a single monolithic DbContext ([`SynOSDbContext.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/SynOSDbContext.cs)) exposing **179 `DbSet<T>` properties**, representing **184 domain entity classes** and **114 historical EF Core migrations**.
   - The database employs a **hybrid architecture**: a classical relational domain model for clinical operations (`Patients`, `Visits`, `Orders`, `Specimens`, `Results`, `Invoices`, `Payments`) coexists alongside an append-only event fact model (`PaymentConfirmedFact`, `RevenueFact`, `ReceivableFact`, `SpendFact`, `PayableFact`).
   
2. **Dual Schema Initialization Strategy (High Operational Risk):**
   - The system does not rely solely on standard EF Core migrations. At boot time ([`Program.cs:175`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Program.cs#L175)), the host runs [`DbInitializer.EnsureTablesAndColumnsCreated()`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/DbInitializer.cs#L21), which executes raw SQL DDL statements (`ALTER TABLE`, `CREATE TABLE`) directly against the live database. Several critical production columns (e.g., `Payments.TenderedAmount`, `Visits.SecondaryReferralPartnerId`, `Visits.B2BDiscountAmount`) exist only via raw SQL patching and are absent from early migrations.

3. **Multi-Branch Isolation Void:**
   - Out of 184 entity classes, **only 25 entities carry a direct `BranchId` column**.
   - Core commercial and clinical entities—including `Invoices`, `Payments`, `Orders`, `Specimens`, `Results`, `Reports`, `RevenueFacts`, and `ReceivableFacts`—**do not possess a `BranchId` column**. They rely entirely on transitive navigation through `Visit.BranchId`. Any direct query that forgets to join `Visits` leaks data across all branches.

4. **Accounting Readiness Verdict:**
   - **SynOS has zero double-entry accounting infrastructure.** There is no Chart of Accounts, no Journal Entries, no General Ledger, no Fiscal Calendar/Period locking, and no Company Bank Account entity. Financial data is stored as isolated operational receipts and append-only departmental spend/revenue facts.

---

## 2. Database Architecture Overview

### 2.1 Quantitative Summary
* **Monolithic DbContext:** [`SynOSDbContext.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/SynOSDbContext.cs) (Line count: ~1,850 lines).
* **Total Registered `DbSet<T>` Properties:** **179**.
* **Total Entity Classes in Source Code:** **184** C# classes under `src/SynOS.Models/Entities/`.
* **Total Migration Files:** **114** migration code files (`.cs`), **114** designer files (`.Designer.cs`), and 1 `SynOSDbContextModelSnapshot.cs` (Total: 229 files under `src/SynOS.Data/migrations/`).
* **Database Engine:** Microsoft SQL Server (Transact-SQL).
* **ORM:** Entity Framework Core 8.0.

### 2.2 Database Schemas
Unlike standard single-schema implementations, SynOS segments tables into multiple database schemas configured in `OnModelCreating`:
1. `dbo` (Default): Clinical intake, visits, orders, specimens, results, invoices, payments, catalog, and radiology.
2. `Payables`: Reference lab liabilities, vendor liabilities, overhead expenses, employee payables, and salary advances (`ReferenceLabs`, `PayableFacts`, `VendorPayables`, `ReferenceLabPayables`, `OverheadExpenses`, `EmployeePayables`, `SalaryAdvances`, `StatutoryConfigs`).
3. `HR`: Time tracking and attendance logs (`AttendanceLogs`).
4. `AR`: Accounts receivable claims and debtor tracking (`ReceivableFacts`).

### 2.3 Schema Initialization & Evolution Mechanism
The database uses a **dual synchronization strategy**:
* **Mechanism A (EF Core Migrations):** Handled via `ctx.Database.Migrate()` when executed via `--migrate-db`.
* **Mechanism B (Runtime DDL Injection):** Executed unconditionally at startup in [`Program.cs:175`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Program.cs#L175) via [`DbInitializer.EnsureTablesAndColumnsCreated()`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/DbInitializer.cs#L21).
  - Contains over 250 lines of dynamic SQL checking `sys.tables` and `sys.columns`.
  - Injects missing tables: `BranchOperationalStats`, `ProcessedProjectionEvents`, `UserOperationalStats`, `CashierShiftClosings`.
  - Injects missing columns: `ReferralPartners.PaymentCollectionModel`, `Patients.DisplayName`, `Visits.SecondaryReferralPartnerId`, `Visits.B2BDiscountAmount`, `Payments.TenderedAmount`, `Payments.ChangeReturned`.
  - *Risk:* If this runs while receptionists are actively transacting, table locks can cause connection timeouts and transient HTTP 500 errors.

---

## 3. Complete Entity Inventory

Below is the exhaustive inventory of all 184 database entities categorized across the 21 business domains.

### Domain 1: Patient and Clinical Records
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Patient` | `dbo.Patients` | `PatientId` (Guid) | `MRN`, `FirstName`, `LastName`, `CurrentPhoneNumber`, `Gender`, `DateOfBirth`, `IsDateOfBirthKnown` | Has many `Visits`, `Appointments`, `CriticalAlerts` | **No** (Global directory) | Active |
| `PatientPhoneHistory` | `dbo.PatientPhoneHistories` | `Id` (Guid) | `PatientId`, `PhoneNumber`, `RecordedAt` | Belongs to `Patient` | No | Active |
| `PatientAlias` | `dbo.PatientAliases` | `Id` (Guid) | `PatientId`, `AliasName` | Belongs to `Patient` | No | Active |
| `PatientReferrerLink` | `dbo.PatientReferrerLinks` | `Id` (Guid) | `ExternalLabCode`, `ExternalPatientId`, `PatientId` | Belongs to `Patient` | No | Active |

### Domain 2: Visits, Orders and Clinical Billing
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Visit` | `dbo.Visits` | `VisitId` (Guid) | `Token`, `TokenDate`, `Status`, `BillingType`, `PaymentCollectionModel`, `ReferralPartnerId`, `SecondaryReferralPartnerId`, `B2BDiscountAmount` | Has one `Invoice`, has many `Orders`, `Specimens`, belongs to `Branch` | **Yes** (`BranchId`) | Active (Core) |
| `Order` | `dbo.Orders` | `OrderId` (Guid) | `VisitId`, `TestId`, `TestCode`, `Status`, `SpecimenId`, `IsOutsourced`, `OutsourceCost`, `IsPricingResolved` | Belongs to `Visit`, `Test`, `Specimen` | **No** (Inherited) | Active (Core) |
| `Invoice` | `dbo.Invoices` | `InvoiceId` (Guid) | `VisitId`, `GrossAmount`, `DiscountAmount`, `Total`, `Status` (`Paid`, `PartialPayment`, `PendingPayment`) | Belongs to `Visit`, has many `Payments`, `PartialPayments` | **No** (Inherited) | Active (Core) |
| `TokenCounter` | `dbo.TokenCounters` | `TokenCounterId` (Guid) | `BranchId`, `Department`, `Day`, `NextToken` | Scoped to `BranchId` | Yes | Active |
| `Appointment` | `dbo.Appointments` | `AppointmentId` (Guid) | `PatientId`, `ScheduledFor`, `Department`, `Status` | Belongs to `Patient` | No | Active |
| `VisitDayGroup` | `dbo.VisitDayGroups` | `Id` (Guid) | `PatientId`, `Day` | Belongs to `Patient` | No | Active |

### Domain 3: Payments and Collections
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Payment` | `dbo.Payments` | `PaymentId` (Guid) | `InvoiceId`, `Amount`, `Method`, `ReceiptNo`, `ReceivedAt`, `ReceivedByUserId`, `TenderedAmount`, `ChangeReturned` | Belongs to `Invoice`, belongs to `User` (`ReceivedBy`) | **No** (Inherited) | Active (Core) |
| `PartialPayment` | `dbo.PartialPayments` | `Id` (Guid) | `InvoiceId`, `Amount`, `ReceivedAt`, `ReceivedByUserId`, `PaymentMethod`, `ReceiptNo` | Belongs to `Invoice` | No (Inherited) | Legacy/Overlapping with `Payment` |
| `CreditNote` | `dbo.CreditNotes` | `CreditNoteId` (Guid) | `InvoiceId`, `Amount`, `Reason`, `IssuedAt` | Belongs to `Invoice` | No | Rare / Dormant |

### Domain 4: Refunds and Cancellations
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `VisitCancellation` | `dbo.VisitCancellations` | `CancelId` (Guid) | `VisitId`, `TotalAmountPaid`, `ImmediateRefundPaid`, `BalancePendingRefund`, `RefundStatus`, `RefundMethod`, `CancelledByUserId` | Belongs to `Visit`, belongs to `User` (`CancelledBy`) | No (Inherited) | Active |

### Domain 5: Cash Drawer and Shift Management
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CashierShiftClosing` | `dbo.CashierShiftClosings` | `ShiftClosingId` (Guid) | `BranchId`, `UserId`, `ShiftDate`, `ShiftName`, `OpeningFloat`, `SystemExpectedCash`, `PhysicalCountedCash`, `Variance`, `DenominationsJson`, `Status` | Belongs to `Branch`, `User` | **Yes** (`BranchId`) | Active (Recently Implemented) |

### Domain 6: Revenue and Financial Facts (Append-Only Event Store)
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PaymentConfirmedFact` | `dbo.PaymentConfirmedFacts` | `PaymentId` (Guid) | `Direction`, `Amount`, `CounterpartyId`, `ReferenceId`, `OccurredAt`, `RecordedAt`, `Channel` | Pure Fact (No FKs) | **No** | Active |
| `RevenueFact` | `dbo.RevenueFacts` | `RevenueFactId` (Guid) | `Amount`, `Currency`, `Direction`, `SourceType`, `SourceReferenceId`, `PaymentMode`, `DeclaredByUserId`, `OccurredAt` | Pure Fact (No FKs) | **No** | Active |
| `CorrectionFact` | `dbo.CorrectionFacts` | `CorrectionFactId` (Guid) | `OriginalFactId`, `CorrectedAmount`, `ReasonCode`, `ApprovedByUserId`, `IsReversal` | Pure Fact | **No** | Active |
| `PriceAdjustmentFact` | `dbo.PriceAdjustmentFacts` | `Id` (Guid) | `VisitId`, `OrderId`, `OriginalPrice`, `AdjustedPrice`, `Reason` | Pure Fact | No | Active |
| `DiscountFact` | `dbo.DiscountFacts` | `DiscountFactId` (Guid) | `InvoiceId`, `DiscountMasterId`, `Amount`, `AuthorizedByUserId`, `Reason` | References `InvoiceId`, `DiscountMasterId` | No | Active |

### Domain 7: Expenses and Petty Cash
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `OverheadExpense` | `Payables.OverheadExpenses` | `Id` (Guid) | `Category`, `Amount`, `Description`, `ExpenseDate`, `CreatedBy`, `Status` | Standalone template / operational record | **No** | Active |
| `OverheadPayableFact` | `dbo.OverheadPayableFacts` | `OverheadPayableId` (Guid) | `Category`, `Amount`, `AmountPaid`, `Status`, `CreatedAt`, `CreatedBy`, `Description` | Standalone operational ledger | **No** | Active |
| `SpendFact` | `dbo.SpendFacts` | `SpendFactId` (Guid) | `PayeeId`, `Amount`, `Currency`, `Category`, `BranchId`, `PaymentMethod`, `TransactionReference`, `OccurredAt` | Scoped to `BranchId` | **Yes** (`BranchId`) | Active (Core Spend Ledger) |
| `ExpenseCorrectionAudit` | `dbo.ExpenseCorrectionAudits` | `Id` (Guid) | `ExpenseId`, `OldAmount`, `NewAmount`, `Reason`, `ModifiedByUserId` | Belongs to `OverheadExpense` | No | Active |
| `ExpenseCancellationAudit` | `dbo.ExpenseCancellationAudits` | `Id` (Guid) | `ExpenseId`, `CancelledAmount`, `Reason`, `CancelledByUserId`, `RefundToDrawer` | Belongs to `OverheadExpense` | No | Active |

### Domain 8: Accounts Receivable (AR)
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ReceivableFact` | `AR.ReceivableFacts` | `ReceivableFactId` (Guid) | `SourceVisitId`, `DebtorType`, `DebtorId`, `DebtorName`, `ClaimReference`, `Amount`, `AmountReceived`, `Status` | Linked to `ReferralPartner` | **No** | Active |
| `CorporateAccount` | `dbo.CorporateAccounts` | `CorporateAccountId` (Guid) | `Name`, `Code`, `CreditLimit`, `CreditPeriodDays`, `ContactPerson`, `IsActive` | Has many `CorporateRateRules` | No | Active |
| `CorporateRateRule` | `dbo.CorporateRateRules` | `CorporateRateRuleId` (Guid) | `CorporateAccountId`, `TestId`, `CorporateRate`, `DiscountPercent` | Belongs to `CorporateAccount`, `Test` | No | Active |
| `InsuranceCompany` | `dbo.InsuranceCompanies` | `InsuranceCompanyId` (Guid) | `Name`, `PayerCode`, `TpaContact`, `ClaimProcessingFeeRate` | Standalone Master | No | Active |

### Domain 9: Accounts Payable (AP)
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PayableFact` | `Payables.PayableFacts` | `PayableFactId` (Guid) | `AmountOwed`, `Currency`, `Status`, `SourcePaymentId`, `OccurredAt` | Pure Fact | **No** | Active |
| `VendorPayable` | `Payables.VendorPayables` | `VendorPayableId` (Guid) | `VendorId`, `Amount`, `ReferenceId`, `ReferenceType`, `Status` | References `ImsSupplier` via `VendorId` | **No** | Active |
| `ReferenceLabPayable` | `Payables.ReferenceLabPayables` | `Id` (Guid) | `ReferenceLabId`, `TestId`, `PatientId`, `AmountDue`, `AmountPaid`, `Status` | References `ReferenceLab`, `Test`, `Patient` | **No** | Active |
| `EmployeePayable` | `Payables.EmployeePayables` | `EmployeePayableId` (Guid) | `PayrollRunId`, `EmployeeId`, `GrossSalary`, `NetPayable`, `AmountPaid`, `Status` | References `PayrollRun`, `Employee` | **No** | Active |
| `SalaryAdvance` | `Payables.SalaryAdvances` | `AdvanceId` (Guid) | `EmployeeId`, `Amount`, `Reason`, `RecoveryStatus` | References `Employee` | **No** | Active |
| `StatutoryConfig` | `Payables.StatutoryConfigs` | `ConfigId` (Guid) | `ConfigType`, `EmployeeRate`, `EmployerRate`, `EffectiveFrom` | Standalone Config | **No** | Active |

### Domain 10: Doctor Commissions & Referral Network
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ReferralPartner` | `dbo.ReferralPartners` | `ReferralPartnerId` (Guid) | `Name`, `PartnerType`, `DefaultCommissionPercentage`, `PaymentCollectionModel`, `IsActive` | Has many `ReferralCommissionRules` | **No** | Active |
| `ReferralCommissionRule` | `dbo.ReferralCommissionRules` | `RuleId` (Guid) | `ReferralPartnerId`, `TestId`, `CommissionType`, `CommissionValue`, `EffectiveFrom` | Belongs to `ReferralPartner`, `Test` | No | Active |
| `ReferralPayableFact` | `dbo.ReferralPayableFacts` | `ReferralPayableFactId` (Guid) | `ReferralPartnerId`, `SourceVisitId`, `Amount`, `AmountPaid`, `Status` | Belongs to `ReferralPartner`, references `SourceVisitId` | No | Active |
| `ReferralDraft` | `dbo.ReferralDrafts` | `ReferralDraftId` (Guid) | `VisitId`, `ProviderName`, `Status` | 1-to-1 with `Visit` | No | Active |
| `Referrer` | `dbo.Referrers` | `ReferrerId` (Guid) | `Name`, `Code`, `Specialty`, `Phone`, `Email`, `BankAccount` | Standalone legacy entity | No | Legacy (Duplicated by `ReferralPartner`) |
| `ReferralApprovalLog` | `dbo.ReferralApprovalLogs` | `Id` (Guid) | `PartnerId`, `Action`, `PerformedByUserId`, `PerformedAt` | Audit | No | Active |

### Domain 11: Outsourced Investigations
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ReferenceLab` | `Payables.ReferenceLabs` | `ReferenceLabId` (Guid) | `Name`, `Code`, `Location`, `Phone`, `Email`, `Status` | Has many `ReferenceLabRateRules` | **No** | Active |
| `ReferenceLabRateRule` | `Payables.ReferenceLabRateRules` | `Id` (Guid) | `ReferenceLabId`, `TestId`, `NegotiatedRate`, `EffectiveDate` | Belongs to `ReferenceLab`, `Test` | No | Active |

### Domain 12 & 13: Inventory, Consumables & Procurement (IMS)
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ImsInventoryItem` | `dbo.IMS_InventoryItems` | `ItemId` (Guid) | `ItemCode`, `ItemName`, `Category`, `UnitOfMeasure`, `ReorderLevel`, `ServiceArea` | Master item catalog | **No** (Global Catalog) | Active |
| `ImsInventoryLot` | `dbo.IMS_InventoryLots` | `LotId` (Guid) | `ItemId`, `BranchId`, `LotNumber`, `ExpiryDate`, `QuantityOnHand`, `UnitCost` | Belongs to `ImsInventoryItem`, `Branch` | **Yes** (`BranchId`) | Active |
| `ImsStockMovement` | `dbo.IMS_StockMovements` | `MovementId` (Guid) | `InventoryLotId`, `MovementType`, `Quantity`, `ReferenceType`, `ReferenceId`, `RecordedByUserId` | References `InventoryLot`, `User` | No (Lot is branched) | Active |
| `ImsTubeMaster` | `dbo.IMS_TubeMasters` | `TubeId` (Guid) | `Code`, `Color`, `Additive`, `DefaultVolumeMl` | Master tube types | No | Active |
| `ImsTubeLot` | `dbo.IMS_TubeLots` | `TubeLotId` (Guid) | `TubeId`, `BranchId`, `LotNumber`, `ExpiryDate`, `QuantityOnHand` | Belongs to `TubeMaster`, `Branch` | **Yes** (`BranchId`) | Active |
| `ImsTestTubeMap` | `dbo.IMS_TestTubeMaps` | `MapId` (Guid) | `TestId`, `TubeId`, `QuantityPerTest` | Links `Test` to `TubeMaster` | No | Active |
| `ImsConsumable` | `dbo.IMS_Consumables` | `ConsumableId` (Guid) | `Code`, `Name`, `Category`, `UnitOfMeasure` | Consumable master | No | Parallel/Legacy to `ImsInventoryItem` |
| `ImsConsumableLot` | `dbo.IMS_ConsumableLots` | `ConsumableLotId` (Guid) | `ConsumableId`, `BranchId`, `LotNumber`, `QuantityOnHand` | Belongs to `Branch` | **Yes** (`BranchId`) | Parallel/Legacy |
| `ImsTestConsumableMap`| `dbo.IMS_TestConsumableMaps`| `MapId` (Guid) | `TestId`, `ConsumableId`, `QuantityPerTest` | Links `Test` to `Consumable` | No | Active |
| `ImsSupplier` | `dbo.IMS_Suppliers` | `SupplierId` (Guid) | `Name`, `Code`, `ContactPerson`, `Phone`, `Email`, `GstNumber` | Master Supplier | No | Active |
| `ImsPurchaseOrder` | `dbo.IMS_PurchaseOrders` | `POId` (Guid) | `SupplierId`, `OrderDate`, `Status`, `TotalEstimatedCost` | Belongs to `Supplier`, has many `POItems` | **No** (Missing BranchId!) | Active |
| `ImsPOItem` | `dbo.IMS_POItems` | `POItemId` (Guid) | `POId`, `TubeId`, `ConsumableId`, `QuantityOrdered`, `UnitCost` | Belongs to `PurchaseOrder` | No | Active |
| `ImsStockRequest` | `dbo.IMS_StockRequests` | `RequestId` (Guid) | `BranchId`, `ItemId`, `QuantityRequested`, `Status`, `RequestedByUserId` | Scoped to `BranchId` | **Yes** (`BranchId`) | Active |

### Domain 14, 15 & 16: HR, Attendance & Payroll
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Employee` | `dbo.Employees` | `EmployeeId` (Guid) | `FirstName`, `LastName`, `EmployeeCode`, `Designation`, `BaseSalary`, `DateOfJoining`, `IsActive` | Has many `PayStructureAssignments`, `LeaveRequests` | **No** (Linked via user roles) | Active |
| `AttendanceLog` | `HR.AttendanceLogs` | `AttendanceId` (Guid) | `EmployeeId`, `ClockIn`, `ClockOut`, `VerifiedBy`, `Status` | Belongs to `Employee` | **No** (Missing BranchId!) | Active |
| `LeaveRequest` | `dbo.LeaveRequests` | `RequestId` (Guid) | `EmployeeId`, `LeaveType`, `StartDate`, `EndDate`, `Status`, `ApprovedByUserId` | Belongs to `Employee` | No | Active |
| `LeaveFact` | `dbo.LeaveFacts` | `LeaveFactId` (Guid) | `EmployeeId`, `LeaveType`, `DurationDays`, `ImpactOnPay` | Pure Fact | No | Active |
| `PayrollPeriod` | `dbo.PayrollPeriods` | `PayrollPeriodId` (Guid) | `PeriodName`, `StartDate`, `EndDate`, `IsLocked` | Has many `PayrollRuns` | **No** (Missing BranchId!) | Active |
| `PayrollRun` | `dbo.PayrollRuns` | `PayrollRunId` (Guid) | `PayrollPeriodId`, `RunDate`, `Status`, `TotalGross`, `TotalNet`, `TotalDeductions` | Belongs to `PayrollPeriod`, has many `PayrollFacts` | **No** (Missing BranchId!) | Active |
| `PayrollFact` | `dbo.PayrollFacts` | `PayrollFactId` (Guid) | `PayrollRunId`, `EmployeeId`, `ComponentCode`, `Amount`, `Direction` | Belongs to `PayrollRun`, `Employee` | No | Active |
| `PayStructure` | `dbo.PayStructures` | `PayStructureId` (Guid) | `StructureName`, `Description`, `IsActive` | Master pay templates | No | Active |
| `PayStructureComponent`| `dbo.PayStructureComponents`| `Id` (Guid) | `PayStructureId`, `ComponentName`, `CalculationType`, `Value` | Belongs to `PayStructure` | No | Active |
| `PayStructureAssignment`| `dbo.PayStructureAssignments`| `Id` (Guid) | `EmployeeId`, `PayStructureId`, `EffectiveFrom` | Links `Employee` to `PayStructure` | No | Active |

### Domain 17 & 18: Branches, Workspaces, Auth & Roles
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Branch` | `dbo.Branches` | `BranchId` (Guid) | `Name`, `Code`, `Address`, `Phone`, `IsActive` | Root branch entity | Root | Active |
| `User` | `dbo.Users` | `UserId` (Guid) | `Username`, `Email`, `PasswordHash`, `Name`, `DefaultBranchId`, `IsActive` | Belongs to `DefaultBranch`, has many `UserBranchRoles` | Multi-branch aware | Active |
| `UserBranchRole` | `dbo.UserBranchRoles` | `Id` (Guid) | `UserId`, `BranchId`, `RoleId` | Junction table enforcing multi-branch RBAC | **Yes** (`BranchId`) | Active (Core Security) |
| `Role` | `dbo.Roles` | `RoleId` (Guid) | `Name`, `NormalizedName` | Identity roles | Global | Active |
| `UserRole` | `dbo.UserRoles` | `(UserId, RoleId)` | Composite Key | Identity mapping | Global | Active |
| `Workspace` | `dbo.Workspaces` | `WorkspaceId` (Guid) | `Name`, `RoutePath`, `Description` | UI modules | Global | Active |
| `UserWorkspaceAccess`| `dbo.UserWorkspaceAccesses`| `Id` (Guid) | `UserId`, `WorkspaceId` | Workspace permissions | Global | Active |
| `RefreshToken` | `dbo.RefreshTokens` | `Id` (Guid) | `UserId`, `Token`, `Expires`, `Revoked` | Auth token state | Global | Active |

### Domain 19: Clinical Laboratory Processing, Results & Reports
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Specimen` | `dbo.Specimens` | `SpecimenId` (Guid) | `AccessionNumber`, `VisitId`, `SpecimenTypeCode`, `CollectedAt`, `CollectedByUserId`, `Status` | Belongs to `Visit`, `SpecimenType`, `User` | **No** (Inherited) | Active (Core) |
| `SpecimenType` | `dbo.SpecimenTypes` | `Code` (string PK) | `Name`, `ContainerColor`, `DefaultVolume` | Master lookup | Global | Active |
| `AccessionCounter` | `dbo.AccessionCounters` | `(BranchId, Date)` | Composite PK | Sequential accession generator per branch/date | **Yes** (`BranchId`) | Active |
| `Result` | `dbo.Results` | `ResultId` (Guid) | `OrderId`, `ParameterCode`, `Value`, `Unit`, `Flag`, `EnteredByUserId`, `VerifiedByUserId`, `SignedByUserId` | Belongs to `Order`, references `User` | **No** (Inherited) | Active (Core) |
| `ResultFlag` | `dbo.ResultFlags` | `FlagId` (Guid) | `Code`, `Description`, `Severity` | Master flags | Global | Active |
| `DeltaCheckConfig` | `dbo.DeltaCheckConfigs` | `Id` (Guid) | `ParameterCode`, `MaxAbsoluteChange`, `MaxPercentageChange` | Clinical rules | Global | Active |
| `DeltaCheckEvent` | `dbo.DeltaCheckEvents` | `Id` (Guid) | `CurrentResultId`, `PreviousResultId`, `DeltaPercentage`, `IsFlagged` | Audit | Global | Active |
| `AutosaveBuffer` | `dbo.AutosaveBuffers` | `Id` (Guid) | `UserId`, `EntityType`, `EntityId`, `PayloadJson`, `LastSavedAt` | Draft preservation | Global | Active |
| `Report` | `dbo.Reports` | `ReportId` (Guid) | `VisitId`, `PatientId`, `SourceType`, `SourceId`, `Status`, `SignedByUserId`, `PdfFilePath` | Belongs to `Visit`, `Patient`, `User` | **No** (Inherited) | Active (Core) |
| `PathologyReport` | `dbo.PathologyReports` | `ReportId` (Guid) | `OrderId`, `ClinicalImpression`, `Comments` | 1-to-1 with `Report` | No | Active |
| `ReportSignature` | `dbo.ReportSignatures` | `SignatureId` (Guid) | `ReportId`, `SignedByUserId`, `SignedAt`, `SignatureHash` | Belongs to `Report`, `User` | No | Active |
| `ReportSnapshot` | `dbo.ReportSnapshots` | `ReportVersionId` (Guid)| `FrozenReportJson`, `RenderedHtml` | 1-to-1 with `ReportVersion` | No | Active |
| `ReportTemplate` | `dbo.ReportTemplates` | `TemplateId` (Guid) | `Name`, `Department`, `Modality`, `HtmlContent`, `BranchId` | Scoped optionally to `BranchId` | Optional | Active |

### Domain 20: Radiology & PACS
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `RadiologyStudy` | `dbo.RadiologyStudies` | `RadiologyStudyId` (Guid)| `VisitId`, `PatientId`, `VisitTestId` (OrderId), `ModalityId`, `Status`, `AccessionNumber`, `DicomStudyUid` | Belongs to `Visit`, `Patient`, `Order`, `Modality` | **No** (Inherited) | Active (Core) |
| `RadiologyImage` | `dbo.RadiologyImages` | `ImageId` (Guid) | `RadiologyStudyId`, `FilePath`, `UploadedBy`, `UploadedAt` | Belongs to `RadiologyStudy` | No | Active |
| `RadiologyModality` | `dbo.RadiologyModalities` | `ModalityId` (Guid) | `BranchId`, `Name`, `ModalityType` (`XR`, `CT`, `MRI`, `US`), `AETitle`, `Port` | Belongs to `Branch` | **Yes** (`BranchId`) | Active |
| `PacsStudy` | `dbo.PacsStudies` | `PacsStudyId` (Guid) | `RadiologyStudyId`, `StudyInstanceUid`, `PatientId`, `Modality` | Belongs to `RadiologyStudy` | No | Active |
| `PacsSeries` | `dbo.PacsSeries` | `SeriesId` (Guid) | `RadiologyStudyId`, `SeriesInstanceUid`, `Modality`, `BranchId` | Scoped to `BranchId` | **Yes** (`BranchId`) | Active |
| `PacsInstance` | `dbo.PacsInstances` | `InstanceId` (Guid) | `SeriesId`, `RadiologyStudyId`, `SopInstanceUid`, `FilePath`, `BranchId` | Scoped to `BranchId` | **Yes** (`BranchId`) | Active |
| `RadiologyReport` | `dbo.RadiologyReports` | `ReportId` (Guid) | `RadiologyStudyId`, `Findings`, `Impression` | 1-to-1 with `Report` | No | Active |
| `RadiologyDictationSession`| `dbo.RadiologyDictationSessions`| `SessionId` (Guid)| `StudyId`, `TypistUserId`, `RadiologistUserId`, `AudioPath`, `Status` | References `Study`, `Users` | No | Active |

### Domain 21: Audit Trails & System Events
| Entity Class | SQL Table | Primary Key | Key Business Fields | Relationships | Branch Specific? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AuditLog` | `dbo.AuditLogs` | `AuditLogId` (Guid) | `ActorUserId`, `Action`, `EntityType`, `EntityId`, `OldValues`, `NewValues`, `Timestamp` | References `User` | No | Active |
| `OutboxEvent` | `dbo.OutboxEvents` | `EventId` (Guid) | `EventType`, `AggregateId`, `PayloadJson`, `Status`, `BranchId`, `CreatedAt` | Scoped to `BranchId` | **Yes** (`BranchId`) | Active (Core Outbox) |
| `BranchOperationalEvent`| `dbo.BranchOperationalEvents`| `EventId` (Guid) | `BranchId`, `EventType`, `SourceId`, `SourceType`, `PayloadJson`, `CreatedAt` | Scoped to `BranchId` | **Yes** (`BranchId`) | Active |
| `ProcessedProjectionEvent`| `dbo.ProcessedProjectionEvents`| `(EventId, ProjectionName)`| Composite PK | Event Idempotency Tracker | No | Active |
| `EditLock` | `dbo.EditLocks` | `LockId` (Guid) | `EntityType`, `EntityId`, `LockedByUserId`, `ExpiresAt`, `Status` | Concurrency guard | No | Active |

---

## 4. Entity Relationship Map (The 10 Core Chains)

```
Chain 1 (Clinical & Commercial Core):
Patient ──(1:N)──> Visit ──(1:N)──> Order ──(1:1)──> Test
                     │                 │
                   (1:1)             (N:1)
                     ▼                 ▼
                  Invoice           Specimen ──(1:N)──> ProcessingAssignment
                     │                 │
                   (1:N)             (1:N)
                     ▼                 ▼
                  Payment           Result ──(N:1)──> Parameter
```

### Forensic Analysis of the 10 Major Chains:

1. **Patient $\rightarrow$ Visit $\rightarrow$ Order $\rightarrow$ Invoice $\rightarrow$ Payment:**
   - **FK Integrity:** Fully enforced by database foreign keys with `DeleteBehavior.Restrict`. Deleting a patient or visit with existing invoices or payments is blocked by SQL Server.
   - **Branch Isolation:** `Patient` is unbranched. `Visit` has `BranchId`. `Order`, `Invoice`, and `Payment` **do not have `BranchId`**. They rely entirely on `Visit.BranchId`.
2. **Invoice $\rightarrow$ Receivable (`AR.ReceivableFacts`):**
   - **Integrity Gap:** There is **no database foreign key** between `dbo.Invoices` and `AR.ReceivableFacts`. The link is purely application-enforced via `ReceivableFact.SourceVisitId = Visit.VisitId`. If an invoice amount changes, the receivable fact is not automatically synchronized.
3. **Payment $\rightarrow$ Cashier Shift (`dbo.CashierShiftClosings`):**
   - **Integrity Gap:** There is **no foreign key** connecting `dbo.Payments` to `dbo.CashierShiftClosings`. The shift closing calculates its expected cash using a dynamic date-time query on `Payments.ReceivedByUserId` and `Payments.ReceivedAt`. A payment record never knows which shift closing it was reconciled under.
4. **Payment $\rightarrow$ Revenue Facts (`dbo.RevenueFacts` & `dbo.PaymentConfirmedFacts`):**
   - **Integrity Gap:** `PaymentConfirmedFact` and `RevenueFact` are pure fact tables with **no foreign keys**. They store `ReferenceId` as a raw Guid pointing to `Payment.PaymentId`. If a payment is amended or deleted, these fact records become orphaned unless a compensating event is manually declared.
5. **Refund $\rightarrow$ Payment $\rightarrow$ Expense Facts (`dbo.SpendFacts`):**
   - When a refund is disbursed via `FinanceBillsController.cs:1250`, it writes an outflow row in `dbo.Payments` (`Amount < 0`) and creates an append-only row in `dbo.SpendFacts`. There is no foreign key linking `SpendFact` to `Payment`; the link is stored as a formatted string in `SpendFact.TransactionReference = "REF-..."`.
6. **Purchase Order $\rightarrow$ Goods Receipt $\rightarrow$ Inventory Lot $\rightarrow$ Vendor Payable:**
   - **Integrity Gap:** `ImsPurchaseOrder` has no `BranchId`. `ImsInventoryLot` has `BranchId`. When goods are received, a `VendorPayable` is created in `Payables.VendorPayables`. However, `VendorPayable` has **no foreign key** to `ImsPurchaseOrder` (stores raw `ReferenceId` and `ReferenceType = "PO"`).
7. **Inventory Consumption $\rightarrow$ Inventory Transaction:**
   - Specimen collection in phlebotomy calls `TubeConsumptionService.cs`, which decrements `ImsInventoryLot.QuantityOnHand` and inserts a row in `ImsStockMovement`. Fully linked via foreign keys.
8. **Employee $\rightarrow$ Attendance $\rightarrow$ Payroll $\rightarrow$ Employee Payable:**
   - `Employee` has no `BranchId`. `AttendanceLog` has no `BranchId`. `PayrollRun` has no `BranchId`. When payroll executes, it creates `EmployeePayable` in `Payables.EmployeePayables`. The relationship is linked via `EmployeeId` and `PayrollRunId`.
9. **Referral Partner $\rightarrow$ Commission Accrual $\rightarrow$ Settlement:**
   - `ReferralPartner` $\rightarrow$ `ReferralCommissionRule` has a cascading foreign key. However, `ReferralPayableFact` references `SourceVisitId` as a plain Guid without an enforced FK constraint.
10. **Reference Lab $\rightarrow$ Outsourced Investigation $\rightarrow$ Payable:**
    - `ReferenceLab` $\rightarrow$ `ReferenceLabPayable` is enforced via code. `ReferenceLabPayable` links to `TestId` and `PatientId`, but does not have a direct foreign key to `OrderId`.

---

## 5. Data Ownership and Source of Truth

SynOS contains three competing representations of reality:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   THREE COMPETING DATA MODELS IN SYNOS                   │
├────────────────────────────────┬───────────────────┬─────────────────────┤
│ 1. Relational Operational Tier │ 2. Fact / Ledger  │ 3. Projection / Agg │
│    (Mutable Business State)    │    (Append-Only)  │    (Denormalized)   │
├────────────────────────────────┼───────────────────┼─────────────────────┤
│ • dbo.Visits                   │ • PaymentConfirmed│ • UserOperational   │
│ • dbo.Invoices                 │ • RevenueFacts    │   Stats             │
│ • dbo.Payments                 │ • SpendFacts      │ • BranchOperational │
│ • dbo.Orders                   │ • ReceivableFacts │   Stats             │
│ • dbo.Results                  │ • PayableFacts    │ • Reality Summary   │
│ • dbo.Specimens                │ • DiscountFacts   │   Tiles             │
└────────────────────────────────┴───────────────────┴─────────────────────┘
```

### Conflict Scenarios & Inconsistencies:
1. **The Overpayment / Refund Due Void:**
   - Operational Truth: `Invoice.Total = 400`, `Payment.Amount = 500`.
   - Fact Truth: `PaymentConfirmedFact.Amount = 500`.
   - Resulting Discrepancy: `RevenueFacts` records ₹500 revenue, `Invoice` records ₹400 tariff. The ₹100 liability is not stored as a payable fact; it only exists as an inferred mathematical difference (`Payments.Sum - Invoice.Total`) or in `dbo.VisitCancellations.BalancePendingRefund`.
2. **Discretionary Concession Invisibility:**
   - Front-desk concessions applied in `BillingSummary.jsx` create `dbo.DiscountFacts`.
   - B2B secondary concessions applied in `ReceptionB2BReceivablesDrawer.jsx` modify `Invoice.DiscountAmount += concession` directly without creating a `DiscountFact`. As a result, the Fact Ledger underreports write-offs.

---

## 6. Financial Data Integrity Audit

This section answers the 10 critical forensic financial questions required for ERP certification:

### 1. Which records represent actual transactions?
* Actual transactions are stored in:
  - Cash Inflows: [`dbo.Payments`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/Payment.cs) (`Amount`, `Method`, `ReceiptNo`, `ReceivedAt`).
  - Cash Outflows / Petty Cash: [`dbo.SpendFacts`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/SpendEngine/SpendFact.cs) and negative rows in `dbo.Payments` (`Amount < 0`).
  - Invoice Billing: [`dbo.Invoices`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/Invoice.cs) (`GrossAmount`, `DiscountAmount`, `Total`).

### 2. Which records are event facts or projections?
* `dbo.PaymentConfirmedFacts`, `dbo.RevenueFacts`, `dbo.ReceivableFacts`, `dbo.PayableFacts`, and `dbo.CorrectionFacts` are append-only domain facts.
* `dbo.UserOperationalStats` and `dbo.BranchOperationalStats` are denormalized projections updated asynchronously by `OperationalStatsProjectionWorker.cs`.

### 3. Which records are summaries or derived values?
* `dbo.UserOperationalStats.PaymentsTotal`, `dbo.UserOperationalStats.WalkInsCount`, `dbo.CashierShiftClosings.SystemExpectedCash`, and `dbo.Invoices.Total` are calculated summaries.

### 4. Which records can be independently modified?
* `dbo.Invoices` and `dbo.Visits` can be modified in-place during Visit Correction (`CorrectionController.cs`).
* `dbo.Payments` can be inserted without altering previous payment records.
* *Risk:* If an invoice's total is edited during a visit correction, previously declared `RevenueFacts` or `ReceivableFacts` are not automatically rewritten.

### 5. Whether corrections generate reversal records?
* **Clinical Results:** Yes. [`ResultChangeAudit.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/ResultChangeAudit.cs) records prior and new values.
* **Overhead Expenses:** Yes. [`ExpenseCorrectionAudit.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/Payables/ExpenseCorrectionAudit.cs) logs old vs new amounts.
* **Commercial Invoices:** Partially. `CorrectionFact.cs` has an `IsReversal` bit, but standard visit corrections simply overwrite `Invoice.Total` in place.

### 6. Can the same transaction be counted twice?
* **Yes, in reporting projections.**
  - If a cashier executes a B2B batch settlement, `SettlementService.cs` creates `dbo.Payments` rows with receipt prefix `RCP-B2B`.
  - In [`InvoiceService.cs:148`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/InvoiceService.cs#L148), the revenue query specifically filters `p.ReceiptNo.StartsWith("RCP-B2B")` to avoid double-counting B2B settlements against daily walk-in totals. If a developer queries `Payments` without this string filter, gross collections are inflated.

### 7. Does deleting or updating a source record leave stale financial facts?
* **Yes.** Because `RevenueFact`, `PaymentConfirmedFact`, and `ReceivableFact` do not have foreign key constraints to `Invoices` or `Payments`, soft-deleting or cancelling an invoice leaves orphaned facts in the database unless an explicit compensation event is dispatched.

### 8. Can a payment exist without its corresponding invoice?
* **No.** `Payment.InvoiceId` is a required non-nullable Guid with an enforced foreign key (`FK_Payments_Invoices_InvoiceId`) and `DeleteBehavior.Cascade` or `Restrict`. A payment cannot be inserted without a valid invoice.

### 9. Can an invoice be marked paid without a matching payment?
* **Yes.** In [`ReceptionFlowService.cs:862-870`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Services/ReceptionFlowService.cs#L862), if an invoice has `Total <= 0` (e.g. 100% concession), the code sets `invoice.Status = "Paid"` without creating a payment record (or creates a dummy zero-value payment).

### 10. Do settled liabilities always have an identifiable payment record?
* **No.** When a `VendorPayable` or `ReferenceLabPayable` is marked settled, `PayablesController.cs` updates `Status = "Settled"` and `AmountPaid = Amount`. However, it does **not** insert a corresponding payment record into `dbo.Payments` or a company bank transaction table; it only creates an append-only row in `dbo.SpendFacts`.

---

## 7. Accounting Readiness Assessment

| Enterprise Accounting Capability | Current Implementation Status in SynOS | Evidence / Existing Table | What Must Be Built |
| :--- | :--- | :--- | :--- |
| **Chart of Accounts (COA)** | **Does Not Exist** | None | Must build `COA_Accounts` (`AccountCode`, `AccountName`, `Type`: Asset, Liability, Equity, Revenue, Expense). |
| **General Ledger (GL)** | **Does Not Exist** | None | Must build `GL_JournalEntries` and `GL_JournalLines`. |
| **Double-Entry Verification** | **Does Not Exist** | None | Must enforce $\sum \text{Debit} = \sum \text{Credit}$ at database constraint level. |
| **Financial Calendar & Period Locking**| **Exists Only as Unrelated Record** | `PayrollPeriods.IsLocked` | Must build `FinancialPeriods` with hard transaction cut-offs and month-close locks. |
| **Cash Account / Till Ledger** | **Partially Implemented** | `CashierShiftClosings` | Needs formal linkage from Shift Closing variances into GL Cash Over/Short accounts. |
| **Company Bank Accounts** | **Does Not Exist** | None (Only strings in `Payment.Method`) | Must build `BankAccounts` (`AccountNumber`, `IFSC`, `OpeningBalance`, `CurrentBalance`). |
| **Bank Statement Reconciliation** | **Does Not Exist** | None | Must build `BankTransactions` and `BankReconciliationMatches`. |
| **Tax / GST Accounting** | **Exists Only as Derived Column** | `Invoices` has tax columns | Must build `TaxComponents` (CGST, SGST, IGST) and tax liability ledgers. |
| **Fixed Assets & Depreciation** | **Does Not Exist** | None | Must build `FixedAssets` and monthly depreciation posting routines. |
| **Cost Centers / Dimensions** | **Partially Implemented** | `BranchId`, `DepartmentMaster.Code` | Must formalize Dimensions (`Branch`, `Department`, `Modality`) on all journal lines. |

---

## 8. Inventory and Procurement Data Model

### 8.1 Reconstructibility of Inventory
- **QuantityOnHand Reconstructibility:** **High.**
  - Every stock movement (Receipt, Dispense, Wastage, Adjustment) is recorded in [`dbo.IMS_StockMovements`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Models/Entities/IMS/ImsStockMovement.cs).
  - Calculating `Sum(Quantity)` grouped by `InventoryLotId` reliably yields the active `QuantityOnHand`.
- **Inventory Valuation Reconstructibility:** **Moderate to Low.**
  - `ImsInventoryLot` records `UnitCost`.
  - However, landed costs (shipping, handling, tax) from purchase orders are not apportioned to lot unit costs.
  - While FIFO lot consumption is supported by ordering by `ExpiryDate`, there is no valuation ledger tracking historical inventory asset value over time.

### 8.2 Three-Way Matching (PO $\rightarrow$ GRN $\rightarrow$ Invoice)
- **Currently Broken / Incomplete:**
  - `ImsPurchaseOrder` has many `ImsPOItem`.
  - When goods arrive, `ImsStockMovement` records the receipt.
  - However, there is no formal `SupplierInvoice` entity. The system jumps directly from Goods Receipt to `VendorPayables`. If the supplier's final billed amount differs from the PO rate, there is no three-way price variance reconciliation.

---

## 9. HR and Payroll Data Model

### 9.1 Data Model Completeness
- `Employee` captures base salary, designation, PF/ESI numbers, and bank account details.
- `AttendanceLog` records clock-in/out timestamps.
- `PayrollPeriod` and `PayrollRun` exist.
- `PayrollFact` records component breakdowns (`Basic`, `HRA`, `PF`, `TDS`).

### 9.2 Critical Blockers Preventing Accounting Integration
1. **Hardcoded Stub Calculation Logic:**
   - In [`Program.cs:566`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Api/Program.cs#L566), the host binds `PayrollCalculationLogicStub.cs`. Calculations use arbitrary static multipliers rather than dynamic tax slabs.
2. **Missing General Ledger Payroll Posting:**
   - Finalizing a payroll run flips `PayrollRun.Status = Finalized` and inserts rows into `Payables.EmployeePayables`.
   - It does not generate salary expense journal entries or accrued payroll liabilities.
3. **Absence of Bank Payout Integration:**
   - There is no table to track bank payout batch files (e.g., ICICI/HDFC Corporate Banking bulk NEFT upload formats).

---

## 10. Multi-Branch Data Isolation

### 10.1 The Branch Isolation Deficit
A forensic scan reveals that **only 25 out of 184 entities carry a `BranchId` column**:

```
Entities with Direct BranchId (25):
• Branch, BranchPrinter, TerminalPrinterConfig
• AccessionCounter, TokenCounter
• OperationalResource, WorkAssignment, ProcessingAssignment
• ImsInventoryLot, ImsTubeLot, ImsConsumableLot, ImsStockRequest
• CashierShiftClosing
• SpendFact, OutboxEvent, BranchOperationalEvent
• PacsSeries, PacsInstance, RadiologyModality, ReportTemplate
• User, UserBranchRole, Visit, LabAnalyzer, CostAttribution_UsageFact

Major Entities MISSING Direct BranchId (159):
• Invoices, Payments, PartialPayments, CreditNotes
• Orders, Specimens, Results, Reports, PathologyReports
• Patients, Appointments, PatientPhoneHistories
• RevenueFacts, ReceivableFacts, PaymentConfirmedFacts, PayableFacts
• VendorPayables, ReferenceLabPayables, OverheadExpenses, EmployeePayables
• Employees, AttendanceLogs, LeaveRequests, PayrollPeriods, PayrollRuns
• ImsPurchaseOrders, ImsSuppliers, ImsInventoryItems
```

### 10.2 Architectural Leakage Risk
1. **Transitive Dependency Hazard:**
   - Because `Payments` and `Invoices` do not have `BranchId`, the only way to isolate payments by branch is:
     ```csharp
     _context.Payments
         .Include(p => p.Invoice).ThenInclude(i => i.Visit)
         .Where(p => p.Invoice.Visit.BranchId == branchId);
     ```
   - If any API endpoint (e.g., in `FinanceBillsController.cs` or `ReportingController.cs`) queries `_context.Payments` or `_context.Invoices` directly without joining `Visits`, **it exposes all branches' financial data simultaneously.**
2. **Global Shared Tables (Intentional vs Unintentional):**
   - *Intentional Global:* `Patients` (Patients can visit any branch under the same MRN), `Tests` (Central catalog), `ImsInventoryItems` (Master item definitions).
   - *Dangerous Unintentional Global:* `ImsPurchaseOrders` (A PO created at Branch B has no `BranchId`!), `AttendanceLogs` (Attendance is logged against `EmployeeId` with no branch stamp!), `OverheadExpenses` (Overhead expenses table has no `BranchId` column!).

---

## 11. Constraints and Reliability Risks

| Constraint / Risk Area | Current State in Database | Risk Severity | Concrete Evidence |
| :--- | :--- | :--- | :--- |
| **Duplicate Payments** | Unique index exists on `Payment.ReceiptNo`. | **Low** | `Payment.ReceiptNo` is constrained unique. |
| **Duplicate Billing on Drafts** | Visits have unique tokens, but draft tokens (`D-XXXX`) can accumulate. | **Medium** | Stale drafts in `dbo.Visits` until purged by background cleaner. |
| **Floating-Point Precision** | Mixed decimal types across tables. | **High** | `Payment.Amount` is `decimal(12,2)`. `PaymentConfirmedFact.Amount` is `decimal(18,4)`. `Order.OutsourceCost` is `decimal(18,4)`. Precision mismatches during ledger rollups. |
| **Negative Balances** | Invoices lack check constraints for negative totals. | **Medium** | `Invoice.Total` can mathematically become negative if discounts exceed gross tariff unless guarded by app logic. |
| **Soft Deletes vs Cascades** | Inconsistent cascade delete configurations. | **High** | Deleting `Report` cascades to `ReportVersions`, `ReportSnapshots`, `DeliveryLogs`, and `ReportSignatures`. A single hard delete destroys legal medical audit history. |
| **Optimistic Concurrency** | Concurrency tokens (`RowVersion`) exist on key tables. | **Well Managed** | `Patient.RowVersion`, `Visit.RowVersion`, `Appointment.RowVersion`, `AccessionCounter.RowVersion`, and `ProcessingAssignment.RowVersion` prevent lost updates. |

---

## 12. Migration and Schema Management

### 12.1 Divergence Between Migrations and Live Schema
- The repository contains 114 sequential EF Core migrations spanning December 2025 through September 2026.
- However, starting in late 2026, features were developed rapidly without generating new EF Core migrations.
- Instead, [`DbInitializer.cs`](file:///Users/tabrez/TBZ-AI/Projects/SynOS/src/SynOS.Data/DbInitializer.cs#L21) was populated with raw SQL scripts to alter tables dynamically on service start.
- **Consequence:** Running `dotnet ef database update` on a fresh database will **not** yield the same schema as a live SynOS instance unless `DbInitializer.EnsureTablesAndColumnsCreated()` is also executed.
- **ERP Mandate:** Before introducing new ERP accounting tables, the database schema must be baselined into a single, clean, canonical EF Core migration.

---

## 13. Data Quality Findings (Read-Only Source & Schema Analysis)

*Note: Per audit instructions, because live database execution on the macOS developer terminal connects to `Server=.\\SYNOS` (a remote Windows SQL Server instance), direct query execution against live production data was not performed to prevent any potential lock escalations or disruption to the pilot site. Findings below represent verified source-code schema invariants.*

1. **Unconstrained Cash Outflows:**
   - In `dbo.Payments`, outflow payments (refunds) are represented by negative amounts (`Amount < 0`).
   - There is no database check constraint enforcing that `Amount > 0`. A software bug could insert a negative collection or a positive refund.
2. **Loose Coupling of Fact Tables:**
   - `dbo.RevenueFacts` uses string-based `SourceReferenceId` rather than a typed foreign key.
   - Searching for revenue facts linked to an invoice requires string parsing (`SourceReferenceId = invoiceId.ToString()`), which bypasses database referential integrity.
3. **Orphaned Delivery Logs:**
   - `dbo.DeliveryLogs` references `ReportId` with `DeleteBehavior.Cascade`. If a draft report is deleted during re-investigation, all historic delivery logs and dispatch audit trails are permanently deleted from the database.

---

## 14. Critical Risks Summary

### Priority 1: Critical Risks (Operational Disruption / Data Corruption)
1. **Monolithic Startup Schema Mutation:**
   - `DbInitializer.EnsureTablesAndColumnsCreated()` running raw DDL at every application boot poses a significant deadlocking hazard on active production servers.
2. **Missing `BranchId` on Financial Transactions:**
   - Lack of direct `BranchId` on `Invoices` and `Payments` means multi-branch accounting cannot be guaranteed at the database level. An un-joined query will consolidate finances across branches without warning.

### Priority 2: High Risks (Financial & Accounting Integrity)
1. **Disconnected B2B Concession Tracking:**
   - Secondary write-offs adjust invoice amounts directly without generating immutable `DiscountFact` records.
2. **Mixed Decimal Precisions:**
   - Operational tables use `decimal(12,2)`, while financial fact tables use `decimal(18,4)`. Conversions across rounding boundaries can cause $\pm ₹0.01$ balancing errors in financial statements.

---

## 15. Confirmed Missing Database Capabilities (For Full ERP)

To support complete diagnostic business ERP accounting, the following database structures are required:

1. **General Ledger Schema (`GL`):**
   - `GL.Accounts` (Chart of Accounts with Account Codes: `1000-Assets`, `2000-Liabilities`, `3000-Equity`, `4000-Revenue`, `5000-Expenses`).
   - `GL.JournalEntries` (`EntryId`, `EntryNumber`, `PostingDate`, `PeriodId`, `BranchId`, `Status`, `IsReversal`).
   - `GL.JournalLines` (`LineId`, `EntryId`, `AccountId`, `Debit`, `Credit`, `DepartmentId`, `CostCenterId`, `Description`).
2. **Treasury Schema (`Treasury`):**
   - `Treasury.BankAccounts` (`AccountId`, `BankName`, `AccountNumber`, `IFSC`, `BranchId`, `GLAccountId`).
   - `Treasury.BankTransactions` (`TransactionId`, `BankAccountId`, `ValueDate`, `Amount`, `Type`, `ReferenceNumber`, `ReconciliationStatus`).
   - `Treasury.CashTransfers` (`TransferId`, `FromDrawerId`, `ToSafeId`, `Amount`, `TransferredByUserId`, `ReceivedByUserId`).
3. **Financial Calendar Schema (`Fiscal`):**
   - `Fiscal.FiscalYears` (`YearId`, `StartDate`, `EndDate`, `IsClosed`).
   - `Fiscal.FiscalPeriods` (`PeriodId`, `YearId`, `PeriodNumber`, `StartDate`, `EndDate`, `IsLocked`).
4. **Tax Ledger Schema (`Tax`):**
   - `Tax.TaxComponents` (`CGST`, `SGST`, `IGST`).
   - `Tax.TaxLedgerEntries` (`EntryId`, `InvoiceId`, `TaxComponentId`, `TaxableAmount`, `TaxAmount`).

---

## 16. Unknowns Requiring Further Investigation

1. **Live Production Database Migration State:**
   - Which specific EF Core migration is currently marked as applied in the live production `dbo.__EFMigrationsHistory` table at Sri Divya Diagnostic Centre?
2. **Volume of Historical Fact Discrepancies:**
   - How many records in `dbo.Payments` do not have an identical matching record in `dbo.PaymentConfirmedFacts` or `dbo.RevenueFacts` from past manual overrides?
3. **Legacy Table Dependency:**
   - Are any external tools or legacy reporting queries querying `dbo.Referrers` (the old table) instead of `dbo.ReferralPartners`?

---

## 17. Overall Database Readiness Assessment

SynOS's database architecture is **mature, well-indexed, and highly capable for clinical and operational diagnostic workflows**. The schema safely handles patient registration, order management, accessioning, laboratory result verification, digital signatures, PACS metadata, and shift cash counting without data loss.

However, from an **Enterprise ERP and Accounting perspective, the database is in an architectural pre-state**:
* It records **what happened at the desk** (`Payments`, `SpendFacts`), but it does not record **where the money sits on the balance sheet**.
* It records **what was billed** (`Invoices`), but it has no **debit/credit general ledger** to automatically reflect assets, liabilities, and retained earnings.

### The Recommendation for ERP Transformation
1. **Do not alter or refactor existing working tables (`Patients`, `Visits`, `Orders`, `Invoices`, `Payments`).** They are actively serving the live pilot.
2. **Baseline the schema:** Unify `DbInitializer` raw DDL into a formal migration.
3. **Add `BranchId` to `Invoices` and `Payments`** via an explicit, safe migration to guarantee multi-branch data isolation.
4. **Implement the Accounting Engine as an additive, non-breaking schema (`GL`, `Treasury`, `Fiscal`):** Build the General Ledger as a silent event-driven listener that subscribes to operational facts (`PaymentConfirmedFacts`, `SpendFacts`, `RevenueFacts`) and automatically generates balanced journal entries without touching reception desk code.

---
*Report compiled and verified against the SynOS database source code and migration definitions on November 6, 2026.*
