### **Prompt: Design & Implement Phase-3 — System-Wide Referral Exposure Snapshot**

**Context:**

* Referral Interpretation Layer:

  * Phase-1 (Partner Ledger) → LOCKED
  * Phase-2 (Partner Financial Summary) → LOCKED
* The layer exposes **exposure-based** interpretation only:

  * TotalReceivables
  * TotalPayables
  * NetPosition
* Settlement / cash-movement logic is intentionally excluded.
* Business Intelligence is the **only downstream consumer**.

---

### **Objective:**

Design and implement **Phase-3** of the Referral Interpretation Layer:

> A **system-wide snapshot** of referral exposure across all partners, derived exclusively from Phase-2 summaries.

This snapshot answers:

> “As of now, what is our total referral exposure as a business?”

---

### **Requirements:**

1. **Snapshot Definition**

   * The snapshot must provide:

     * SystemTotalReceivables
     * SystemTotalPayables
     * SystemNetPosition
   * Values represent **exposure**, not settled cash.

2. **Derivation Rules**

   * The snapshot MUST be derived by:

     * Iterating over all referral partners
     * Calling `GetPartnerFinancialSummaryAsync` for each
     * Aggregating the results
   * No direct querying of referral truth facts is allowed.

3. **Statelessness**

   * The snapshot:

     * Is computed on-demand
     * Is never stored
     * Is never cached
     * Holds no memory between calls

4. **Strict Prohibitions**

   * Do NOT introduce:

     * Reconciliation logic
     * Settlement inference
     * Caching or persistence
     * Optimizations that bypass partner-level summaries
   * Do NOT modify Phase-1 or Phase-2 logic.

5. **Stop Condition**

   * After implementation:

     * Run a build
     * Stop
     * Await audit

---

### **Output Requirements:**

* Clear description of:

  * What the snapshot represents
  * What it explicitly does NOT represent
* Implementation consistent with existing Interpretation Layer contracts
* Treat the result as **lock-ready infrastructure**

---
