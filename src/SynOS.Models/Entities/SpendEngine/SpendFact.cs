using System;

namespace SynOS.Models.Entities.SpendEngine
{
    /// <summary>
    /// Represents a single, immutable fact of a cash outflow within the Spend Engine.
    /// This is a Truth Engine entity. It records what happened (the cash outflow), not why.
    /// </summary>
    /// <remarks>
    /// **IMMUTABILITY INTENT LOCK:**
    /// - This entity is **immutable by design** once created.
    /// - **Mutation is forbidden** after construction. All properties are get-only.
    /// - Any future relaxation of immutability MUST be a conscious architectural decision
    ///   and requires explicit approval, as it violates a core principle of Truth Engines.
    /// - No status fields, workflow enums, update methods, or delete methods are allowed.
    /// - No validation logic is allowed here; validation belongs in higher layers.
    ///
    /// **FACT DISCIPLINE & REFERENCES:**
    /// This entity represents **money outflow only**. It must not be polluted with concepts from other domains.
    /// - Resource usage attribution belongs to the **Cost Attribution Engine**.
    /// - Physical inventory movement belongs to the **Inventory Engine**.
    /// - Profit, margins, and unit economics belong to **read layers**, not here.
    ///
    /// **ALLOWED REFERENCES (FACT-LEVEL, ID ONLY):**
    /// - SupplierId
    /// - EmployeeId
    /// - InvoiceId
    /// - ObligationId
    /// - PayrollRunId
    /// - ExternalReference
    ///
    /// **FORBIDDEN REFERENCES (MUST NEVER EXIST HERE):**
    /// - TestId, TestExecutionId
    /// - InventoryItemId, InventoryLotId
    /// - Cost Attribution facts
    /// - Revenue records
    /// - Pricing or rate configuration
    /// - Analytics or reporting models
    /// </remarks>
    public sealed class SpendFact // Class is sealed to reinforce immutability intent
    {
        // --- APPROVED MANDATORY FIELDS (ONLY THESE) ---

        /// <summary>
        /// Unique identifier for the spend fact.
        /// </summary>
        public Guid SpendFactId { get; }

        /// <summary>
        /// The amount of money that was spent.
        /// </summary>
        public decimal Amount { get; }

        /// <summary>
        /// The currency of the amount (e.g., "INR", "USD").
        /// </summary>
        public string Currency { get; }

        /// <summary>
        /// The exact moment the cash outflow occurred in the real world.
        /// </summary>
        public DateTimeOffset OccurredAt { get; }

        /// <summary>
        /// The exact moment this fact was recorded in the system.
        /// </summary>
        public DateTimeOffset RecordedAt { get; }

        /// <summary>
        /// The source of the money (label only, e.g., "Cash", "HDFC Bank").
        /// </summary>
        public string Account { get; }

        /// <summary>
        /// The destination category of the money (label only, e.g., "Salary", "Supplier").
        /// </summary>
        public string Channel { get; }

        // --- APPROVED OPTIONAL REFERENCES (IDs only, nullable) ---

        /// <summary>
        /// Optional: Link to a supplier entity.
        /// </summary>
        public Guid? SupplierId { get; }

        /// <summary>
        /// Optional: Link to an employee entity.
        /// </summary>
        public Guid? EmployeeId { get; }

        /// <summary>
        /// Optional: Link to an invoice entity.
        /// </summary>
        public Guid? InvoiceId { get; }

        /// <summary>
        /// Optional: Link to a specific financial obligation record.
        /// </summary>
        public Guid? ObligationId { get; }

        /// <summary>
        /// Optional: Link to a payroll run.
        /// </summary>
        public Guid? PayrollRunId { get; }

        /// <summary>
        /// Optional: A string for any other external reference or identifier.
        /// </summary>
        public string? ExternalReference { get; }

        /// <summary>
        /// Constructor for creating a new, immutable spend fact.
        /// </summary>
        public SpendFact(
            Guid spendFactId,
            decimal amount,
            string currency,
            DateTimeOffset occurredAt,
            DateTimeOffset recordedAt,
            string account,
            string channel,
            Guid? supplierId = null,
            Guid? employeeId = null,
            Guid? invoiceId = null,
            Guid? obligationId = null,
            Guid? payrollRunId = null,
            string? externalReference = null)
        {
            SpendFactId = spendFactId;
            Amount = amount;
            Currency = currency;
            OccurredAt = occurredAt;
            RecordedAt = recordedAt;
            Account = account;
            Channel = channel;
            SupplierId = supplierId;
            EmployeeId = employeeId;
            InvoiceId = invoiceId;
            ObligationId = obligationId;
            PayrollRunId = payrollRunId;
            ExternalReference = externalReference;
        }
    }
}