# Revenue Engine — Canonical Specification

## 1. Purpose

The Revenue Engine's sole and permanent responsibility is to record declarations that money has been received. It functions as a write-only, append-only vault for immutable `RevenueFact`s. It will **never** do more than accept and persist a `RevenueFact`. It will forever serve as the foundational ledger for all cash inflows and reversals. It does not interpret, validate, or enrich the facts it stores.

## 2. RevenueFact Truth Model

This section defines the `RevenueFact` data model, representing one real-world declaration that money was received. This is a fact contract, not a reporting model.

### RevenueFact — Field Table

| Field Name | C# Type | Description | Immutable |
| :--- | :--- | :--- | :--- |
| `RevenueFactId` | `Guid` | The unique identifier for this specific revenue fact. | Yes |
| `OccurredAt` | `DateTimeOffset` | The real-world timestamp when the money was actually received. | Yes |
| `DeclaredAt` | `DateTimeOffset` | The system timestamp when this fact was declared or recorded. | Yes |
| `Amount` | `decimal` | The exact amount of money received. | Yes |
| `Currency` | `string` | The currency of the amount (e.g., "INR", "USD"). | Yes |
| `Direction` | `RevenueDirection` | Whether this fact represents money coming in (`Inflow`) or going out (`Reversal`). | Yes |
| `SourceType` | `RevenueSourceType` | The category of the entity from which the money was received. | Yes |
| `SourceReferenceId` | `string` | An opaque, non-interpreted identifier for the source (e.g., Patient MRN, Corporate ID). | Yes |
| `PaymentMode` | `PaymentMode` | The method by which the payment was made. | Yes |
| `DeclaredByUserId` | `Guid` | The ID of the user who declared this fact. | Yes |
| `Notes` | `string?` | Optional, un-parsed, human-readable notes about the transaction. | Yes |
| `ExternalTransactionId` | `string?` | An optional external payment gateway ID for cross-system traceability. | Yes |

### Enum Definitions

```csharp
// To be placed in a file like: src/SynOS.Models/Entities/Revenue/RevenueEnums.cs

namespace SynOS.Models.Entities.Revenue
{
    public enum RevenueDirection
    {
        Inflow,
        Reversal // For refunds, chargebacks, etc.
    }

    public enum RevenueSourceType
    {
        Patient,
        Corporate,
        Insurance,
        Other
    }

    public enum PaymentMode
    {
        Cash,
        UPI,
        Card,
        BankTransfer,
        Other
    }
}
```

### Invariants

*   **Immutability:** A `RevenueFact` is immutable once created. Any correction (e.g., a refund) must be recorded as a new, separate `RevenueFact` with a `Direction` of `Reversal`.
*   **Append-Only:** The set of all `RevenueFact`s is an append-only log. Facts are never updated or deleted.
*   **Declaration of Truth:** The existence of a `RevenueFact` is a declaration that a cash inflow (or reversal) has already occurred in the real world. The engine's job is to record this declaration, not to verify its correctness against other systems.
*   **One Fact, One Declaration:** Each `RevenueFact` corresponds to a single, discrete declaration of money received.
*   **No Business Logic:** The `RevenueFact` entity contains no business logic, validation, or calculations. It is a pure data container for a recorded truth.

## 3. Negative Boundaries — RevenueFact IS NOT

This section permanently fences off scope creep by explicitly defining what `RevenueFact` will **never** be.

### RevenueFact IS NOT

*   **NOT a Bill:** It does not represent an amount owed for services or goods.
*   **NOT an Invoice:** It is not a formal document requesting or detailing payment from a customer.
*   **NOT an Expected Payment:** It does not signify a future receivable or a planned financial transaction.
*   **NOT a Test Charge:** It does not directly represent the price or cost of a specific laboratory test or service.
*   **NOT an Account Balance:** It is not a running total or a snapshot of a customer's or entity's outstanding balance.
*   **NOT Revenue Recognition:** It does not reflect accounting principles for when revenue is considered earned or realized.
*   **NOT Settlement:** It is not a record of financial reconciliation between parties.
*   **NOT Profitability:** It has no intrinsic knowledge of associated costs, margins, or overall financial gain.
*   **NOT a Workflow State:** It does not indicate any stage of a business process (e.g., pending, approved, collected).
*   **NOT a Payment Request:** It is a declaration that money *has* moved, not a command to move money.

### Forbidden Fields & Concepts

*   **Status Fields:** (`IsPaid`, `IsPending`, `IsSettled`, `IsApproved`, `IsReconciled`, `PaymentStatus`).
*   **Pending / Expected Flags:** (`ExpectedAmount`, `PendingAmount`, `EstimatedRevenue`).
*   **Totals or Aggregates:** (`DailyTotal`, `MonthlyRevenue`, `LineItemSum`).
*   **Foreign Keys to Operational Entities:** (`TestId`, `VisitId`, `AppointmentId`, `OrderId`, `BillingId`).
*   **Cost, Margin, Profit:** Any fields that would allow for calculation of business profitability.
*   **Tax Breakdowns:** (`TaxAmount`, `GSTCharged`, `VAT`).
*   **Allocation Logic:** Fields or concepts implying distribution of revenue.
*   **Settlement Indicators:** (`SettlementBatchId`, `ReconciliationStatus`, `BatchTotal`).
*   **Billing Specifics:** (`LineItems`, `DiscountApplied`, `AdjustmentAmount`, `ServiceCode`).
*   **Derived/Computed Fields:** Any field whose value is calculated from other data within the system.

### What RevenueFact Will NEVER Do

*   **Never Validate Against Spend Engine:** It will never compare its facts or interact with `SpendFact`s for consistency.
*   **Never Check Inventory:** It will never query or interact with the `Inventory Engine` or related physical assets.
*   **Never Infer Correctness:** It will never attempt to verify if the declared amount, direction, or source is logically sound or correct in the real world. Its job is solely to record what it was told.
*   **Never Auto-Create Facts:** It will never generate new `RevenueFact`s based on internal system events or logic without explicit instruction from an authorized source.
*   **Never Reconcile Mismatches:** It will never identify discrepancies between declared facts or external records, nor will it attempt to resolve them.
*   **Never "Fix" Human Mistakes:** If a `RevenueFact` is declared incorrectly, it is immutable. A new `RevenueFact` with a `Reversal` `Direction` would be declared to counteract it, but the original fact remains.
*   **Never Execute Payments:** It is a record of a payment, not the initiator or processor of the payment.
*   **Never Trigger Other Engines Directly:** It will never directly activate or send messages to other engines (like Spend Engine or analytical layers). Its existence provides a data point for others to consume.
*   **Never Perform Analytics or Reporting:** It will not compute or present summary data, dashboards, or trends.
*   **Never Manage Workflows or Approvals:** It does not have logic to guide or enforce business processes or require human approval.

## 4. Write Path — DeclareRevenueFact

The `DeclareRevenueFact` write path is the API for ingesting new `RevenueFact`s. It adheres to strict write-only, append-only discipline.

*   **Command Intent:** To provide a mechanism for an external caller (e.g., a human user, an integration) to declare that a single cash inflow or reversal has occurred.
*   **Write-Only Guarantees:** The API is exclusively for `POST` operations. There are no endpoints or methods for `GET`, `PUT`, or `DELETE` operations on `RevenueFact`s.
*   **Idempotency Rules:** The API supports idempotency primarily via the `RevenueFactId` provided by the caller (if supplied) and the `ExternalTransactionId`. If a `RevenueFact` with a given `RevenueFactId` or `ExternalTransactionId` (if constrained as unique) is submitted multiple times, the persistence layer will fail fast on subsequent attempts, preventing duplicate facts.
*   **No Read Behavior:** The API will return an acknowledgement of successful declaration, including the `RevenueFactId` and `RecordedAt` timestamp. It will **never** return the full `RevenueFact` object or any computed data.

## 5. Persistence Discipline

The storage model for `RevenueFacts` is designed to be a "write-once ledger carved into stone," structurally preventing misuse and enforcing truth.

### Storage Model Characteristics

*   **Append-Only Nature:** The `RevenueFacts` store is fundamentally append-only. New records representing new revenue declarations are always inserted; existing records are never altered.
*   **Immutability Expectations:** Once a record is written, it is considered permanent and immutable. The data within a row must never change.
*   **Independence from Other Stores:** The `RevenueFacts` store is logically independent. It does not rely on the state of any other data store for its integrity, and its records are self-contained truths.
*   **Ordering Assumptions:** Records are primarily ordered by their creation timestamp (`DeclaredAt`). While they can be retrieved in any order, the chronological sequence of declarations is preserved.

### Allowed Constraints

*   **Primary Key:** A primary key on `RevenueFactId` is **required** to guarantee the absolute uniqueness of every single fact recorded.
*   **Uniqueness (Idempotency):** An optional unique constraint on `ExternalTransactionId` (where not null) is **allowed** solely to enable idempotent writes from external systems.
*   **NOT NULL Constraints:** Constraints enforcing that all mandatory fields (`Amount`, `Currency`, `OccurredAt`, `DeclaredAt`, `Direction`, `SourceType`, `SourceReferenceId`, `PaymentMode`, `DeclaredByUserId`) are never null are **required** to ensure every fact is a complete, minimal declaration.
*   **Data Type & Length Constraints:** Strict data type constraints (e.g., `decimal(18, 4)`, `string(10)`) are **required** to ensure data integrity.

### Forbidden Constraints & Structures

*   **Foreign Keys:** **NEVER** allowed. Foreign key constraints would create a hard dependency on other tables.
*   **Cascades:** **NEVER** allowed. No `ON DELETE CASCADE` or `ON UPDATE CASCADE` behavior is permissible.
*   **Update Triggers:** **NEVER** allowed. The database must not have any mechanism that automatically modifies a `RevenueFact` row after insertion.
*   **Soft Deletes:** **NEVER** allowed. There must be no `IsDeleted` or `Active` flags.
*   **Partitioning for Reporting:** **NEVER** allowed. The table must not be structured to optimize for read-heavy analytical queries.
*   **Computed Columns:** **NEVER** allowed. Every piece of data must be explicitly declared at the time of insertion.
*   **Aggregation Helpers:** **NEVER** allowed. No indexed views or materialized views for pre-calculation are permitted.
*   **Cross-Table Indexes:** **NEVER** allowed. Indexes are only for PK and optional idempotency keys.

### Mutation & Access Rules

*   **Who/What is Allowed to INSERT:** Only the Revenue Engine's single, designated write-gate method (e.g., `RecordRevenueFactAsync`) is permitted to perform `INSERT` operations into the `RevenueFacts` store.
*   **Forbidden Operations:** All `UPDATE` and `DELETE` operations on the `RevenueFacts` store are strictly forbidden for any application-level role or process.
*   **Violation Handling:** Any attempt to perform a forbidden operation must fail fast at the lowest possible level (database constraint violation).
*   **"Rebuildability" Meaning:** The store guarantees that all higher-level read models or analytical databases can be perfectly reconstructed by re-processing its immutable log.

## 6. Interpretation Layer (Read-Only)

This layer is a "formatter and sorter sitting directly on top of the vault — it cannot see outside the vault."

### Read Principles (self-contained, no joins)

*   **Self-Contained:** This layer **must not** perform any joins, lookups, or queries to any table or data store outside of `RevenueFacts`. It operates solely on the data present within individual `RevenueFact` instances.
*   **No External Enrichment:** It does not depend on any external state, nor does it attempt to enrich `RevenueFact`s with data from other sources (e.g., `Users`, `Suppliers`).
*   **Rebuildable from `RevenueFacts` Alone:** The entire output of this layer can be perfectly and completely reconstructed at any time by re-processing the immutable log of `RevenueFacts` **alone**.
*   **Stateless & Disposable:** It is a stateless formatting and projection utility. It contains no unique state or truth of its own. If this layer is deleted, no data or authoritative logic is lost.
*   **No Side Effects:** It is strictly read-only and performs no writes.

### Allowed Read View Shapes

*   **Chronological Ledger View:** A simple, reverse-chronological list of individual `RevenueFact` records, ordered by `OccurredAt` or `DeclaredAt`.
*   **Filtered List View:** A subset of `RevenueFact` records based on direct values of its internal fields (e.g., `Direction = REVERSAL`).
*   **Grouped Display View (Visual Grouping Only):** Visually groups records by shared field values without mathematical aggregation.

### Explicitly Forbidden View Shapes

*   **Totals by Day/Month/Year:** Any view that presents a sum of `Amount` over any time period.
*   **Revenue Summaries:** Any view that summarizes facts (e.g., "Total revenue from Patients today?").
*   **Profit & Loss Views:** Any view that attempts to determine profitability.
*   **Trend Charts or Velocity Data:** Any view that calculates change over time, averages, or forecasts.
*   **Counterparty Balance Sheets:** Any view that attempts to calculate a running balance for a given `CounterpartyId`.
*   **Top-N or Ranked Lists:** Any view that aggregates and ranks data.
*   **Any view that answers "how much?" beyond the `Amount` of a single, individual fact.**

## 7. Lock & Seal Declaration

The Revenue Engine is hereby declared **complete and architecturally sealed**. Its scope is permanently limited to the append-only persistence of immutable `RevenueFact` declarations. All its constituent components, principles, and boundaries are finalized. Any future change that contradicts the rules defined herein is a violation of the system's core architecture and requires a formal review and approval process to proceed. The integrity of the system relies on the fact that the complete history of revenue declarations can be perfectly rebuilt from this engine's immutable log.

## 8. Engine Status

```
ENGINE STATUS: SEALED
SCOPE CHANGES: FORBIDDEN
```
