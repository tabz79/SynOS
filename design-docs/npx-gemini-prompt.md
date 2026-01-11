## 🔒 **GEMINI FORCE-FIX PROMPT — PAYROLL WORKFLOW ORCHESTRATION (PATCH ONLY)**

This is a **corrective patch task**.

🚫 **DO NOT redesign**
🚫 **DO NOT add features**
🚫 **DO NOT refactor unrelated code**
🚫 **DO NOT introduce new abstractions**

You previously implemented PayrollWorkflowOrchestrationService, but it contains **blocking violations**.
You must fix **only what is listed below**.

---

## ❗ BLOCKING FIXES (MANDATORY)

### 🔴 FIX 1 — Explicitly DEFINE `PayrollRunStatus` enum (NO REUSE)

You MUST ensure `PayrollRunStatus` is **explicitly defined** with **exactly** the following values:

```
Draft
Processing
Calculated
Finalized
Voided
```

Rules:

* Do NOT reuse an existing enum silently
* If an enum already exists, **replace it** so it matches exactly
* No extra values
* No reordered semantics
* File path must be:

  ```
  src/SynOS.Models/Enums/PayrollRunStatus.cs
  ```

---

### 🔴 FIX 2 — REMOVE orchestration-level transaction in `FinalizePayrollRunAsync`

Current behavior is illegal.

#### Required correction:

* ❌ REMOVE any `BeginTransactionAsync()` or orchestration-owned transaction in `FinalizePayrollRunAsync`
* ✅ `PayrollFactWriter.WriteFactsAsync(...)` must be called **without wrapping it**
* ✅ Only AFTER FactWriter succeeds:

  * Update `PayrollRun.Status = Finalized`
  * Update `PayrollPeriod.Status = Finalized`
  * Save changes normally

Rule:

> **FactWriter owns atomicity. Orchestrator must not.**

---

### 🔴 FIX 3 — REMOVE illegal re-execution semantics

You MUST remove **any implication** that a PayrollRun can be re-executed.

Specifically:

* ❌ Remove code or comments that:

  * Reset `CompletedAt`
  * Imply recalculation
  * Reuse a PayrollRun for multiple attempts
* ✅ A PayrollRun is **one attempt only**
* ✅ `CompletedAt` is set once (Calculated / Voided / Finalized) and never reset

---

## 🟡 REQUIRED CLEANUP (NOT OPTIONAL)

### 🟡 FIX 4 — `ExecuteCalculationAsync` MUST NOT return calculation data

Current behavior leaks internal proposal data.

#### Required correction:

* Change `ExecuteCalculationAsync` return type to:

  * `Task` or `Task<bool>`
* ❌ Do NOT return `PayrollCalculationResult`
* The calculation proposal must remain:

  * Internal
  * Persisted only via `ProvisionalResultData`
  * Not returned to callers

---

## ⛔ HARD CONSTRAINTS

* ❌ Do NOT change:

  * State machines
  * Command names
  * FactWriter
  * Calculation logic
  * ProvisionalResultData design
* ❌ Do NOT add logging
* ❌ Do NOT add retries
* ❌ Do NOT add comments about “future improvements”

This is a **surgical correction**, not a redesign.

---

## 📦 REQUIRED OUTPUT (ALL REQUIRED)

You MUST output:

1. The corrected `PayrollRunStatus.cs`
2. The corrected `PayrollWorkflowService.cs` (showing all fixes)
3. Any interface changes required to support Fix #4

Nothing else.

---

## 🧠 FINAL REMINDER

> Payroll systems are hostile environments.
> Ambiguity equals corruption.

---

## 🔒 END OF PROMPT

---
