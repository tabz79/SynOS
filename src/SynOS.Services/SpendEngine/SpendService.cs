using System;
using System.Threading.Tasks;
using SynOS.Data; // Added for SynOSDbContext
using SynOS.Models.DTOs.SpendEngine;
using SynOS.Models.Entities.SpendEngine; // Added for SpendFact

namespace SynOS.Services.SpendEngine
{
    /// <summary>
    /// Implements the persistence layer for the Spend Engine.
    /// This service is the ONLY component allowed to write SpendFacts to the database.
    /// </summary>
    /// <remarks>
    /// **ENGINE SEALED (Phase A):**
    /// This service is a core part of a sealed **Truth Engine**. Its responsibilities are
    /// intentionally minimal and must not be expanded without formal architectural review.
    ///
    /// - **Nature:** Write-only, append-only.
    /// - **Allowed Logic:** ONLY insert-only persistence of pre-constructed SpendFact objects.
    /// - **Forbidden Logic:** No business logic, no validation, no aggregation, no analytics,
    ///   no workflows, no approvals, no inference, no updates, and no deletes are allowed.
    /// - **Orchestration:** This service does not trigger other processes. It is triggered by
    ///   explicit, local orchestration from specific, authorized callers only.
    /// - **Wiring:** This service MUST NOT be registered globally or automatically. It should
    ///   only be reachable via an explicit, opt-in registration and local service provider resolution.
    /// </remarks>
    public class SpendService : ISpendService
    {
        private readonly SynOSDbContext _context;

        public SpendService(SynOSDbContext context)
        {
            _context = context;
        }

        public Task RecordSpendAsync(RecordSpendDto spendDto)
        {
            // As per instructions, method body must either be empty or throw NotImplementedException.
            throw new NotImplementedException("This method is retained for ISpendService contract but not the primary entry point for SpendFacts.");
        }

        /// <summary>
        /// This method is the ONLY entry point for recording SpendFacts into the Spend Engine.
        /// It accepts an already-created SpendFact instance and is responsible for persisting it.
        /// </summary>
        /// <remarks>
        /// **GUARDRAILS:**
        /// - This is the **sole write gate** for SpendFacts.
        /// - SpendFacts provided MUST represent **completed cash outflows**.
        /// - The authority for deciding "money has left the system" and constructing the valid SpendFact
        ///   lives **outside** this engine. This engine merely records the fact.
        /// - Do NOT create, modify, calculate, enrich, or infer anything about the SpendFact here.
        /// - Do NOT validate business rules here.
        /// - Do NOT integrate with procurement, invoices, HR, inventory, or payments here.
        /// - Do NOT emit events or triggers here.
        /// - Do NOT write database persistence yet (this is a structural phase).
        ///
        /// **CALL-SITE DISCIPLINE:**
        /// Who is ALLOWED to call RecordSpendFactAsync (conceptual, not code):
        /// - Explicit orchestration layers
        /// - Payment completion handlers
        /// - Administrative confirmation flows
        ///
        /// Who is FORBIDDEN from calling it:
        /// - Inventory Engine
        /// - Cost Attribution Engine
        /// - Test execution flows
        /// - UI controllers
        /// - Background jobs without explicit payment confirmation
        ///
        /// **DUPLICATE & MISUSE PROTECTION:**
        /// - The same SpendFact (identified by SpendFactId) must never be recorded more than once.
        /// - Calling this method multiple times with the same SpendFactId is considered a misuse.
        /// - Misuse must fail fast once persistence is implemented.
        /// - Idempotency and duplicate protection will be enforced at the persistence layer (not in this method).
        /// </remarks>
        /// <param name="spendFact">The already-created and immutable SpendFact instance to record.</param>
        /// <returns>A Task representing the asynchronous operation.</returns>
        public async Task RecordSpendFactAsync(SpendFact spendFact)
        {
            // Implement insert-only persistence for SpendFact using SynOSDbContext
            _context.SpendFacts.Add(spendFact);
            await _context.SaveChangesAsync();
            // Let duplicate key violations surface naturally as per instructions.
        }
    }
}