### **Prompt: Implement Unified Referral Interpretation Layer – Phase 1 (Corrected Plan)**

**Context:**

* The Implementation Contract for the Unified Referral Interpretation Layer is LOCKED.
* This task implements **Phase 1 only**: internal normalization + `GetPartnerStatement`.
* The previous execution plan requires two corrections which must be enforced.

**Mandatory Corrections (Non-Negotiable):**

1. **Internal Normalized Event Layer**

   * Before creating any output DTOs, you MUST introduce an **internal-only normalized ledger event structure**.
   * This structure must:

     * Be private/internal to the interpretation service.
     * NOT live in the DTO folder.
     * NOT be exposed outside the service.
     * Represent a single financial event with:

       * OccurredAt
       * Amount
       * EntryType (Debit | Credit)
       * Description
       * SourceFactType (enum, internal use only)

2. **Fact Query Discipline**

   * Each truth fact type (ReceivableFact, PayableFact, RevenueFact) MUST:

     * Be queried independently.
     * Be immediately projected into the internal normalized event structure.
   * Only fully normalized events may be combined into a unified in-memory list.
   * No EF-level unions, mixed projections, or post-hoc normalization are allowed.

**Implementation Scope:**

* Implement:

  * Internal normalized ledger event mapping
  * `GetPartnerStatementAsync`
* Do NOT implement:

  * Partner summaries
  * System snapshots
  * Any write-side logic
  * Any optimization, caching, or reconciliation

**Behavioral Requirements:**

* Enforce debit/credit semantics exactly as per the contract.
* Sort events strictly by OccurredAt.
* Calculate running balance **in-memory only**, after sorting.
* Return a fully materialized `List<LedgerEntryDto>` (no IQueryable leaks).

**Strict Prohibitions:**

* No writes of any kind
* No static state or singletons
* No reference to Economic or Business Intelligence layers
* No exposure of internal normalized event types

**Output Expectation:**

* Clean, readable, reviewable code
* Structure that makes architectural violations obvious
* Implementation that can be extended in Phase-2 without refactoring Phase-1

---
