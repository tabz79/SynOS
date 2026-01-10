## 🔒 **GEMINI FORCE-EXECUTION PROMPT — PAYROLL FACT IDEMPOTENCY FIX (MANDATORY)**

You previously failed to implement **two explicitly approved, blocking requirements**.

This task is a **corrective patch only**.
You must execute **exactly what is specified below** and nothing else.

If any required artifact is missing at the end, the task is considered **FAILED**.

---

## ❗❗ BLOCKING ISSUES TO FIX (NON-NEGOTIABLE)

### ❌ ISSUE 1 — Database idempotency is NOT enforced

### ❌ ISSUE 2 — DbUpdateException is NOT wrapped

Both **must** be fixed in this run.

---

## 🎯 OBJECTIVE

Enforce **physical, database-level idempotency** for payroll facts and ensure **provider-agnostic failure semantics** in `PayrollFactWriter`.

---

## ✅ REQUIRED FIX #1 — UNIQUE CONSTRAINT (MANDATORY)

### You MUST do all of the following:

#### A. Modify **exact file**:

```
src/SynOS.Data/SynOSDbContext.cs
```

Inside `OnModelCreating`, add **entity configuration for PayrollFact**:

```csharp
modelBuilder.Entity<PayrollFact>()
    .HasIndex(e => new { e.PayrollRunId, e.EmployeeId, e.PayComponentId })
    .IsUnique();
```

No alternatives. No variations.

---

#### B. Generate a NEW migration

* Migration name:

  ```
  AddUniqueConstraintToPayrollFacts
  ```

* Migration must:

  * Add a **unique index**
  * Be **additive**
  * Touch **only PayrollFacts**
  * NOT recreate tables
  * NOT modify existing columns

If the migration does anything else → FAIL.

---

## ✅ REQUIRED FIX #2 — DbUpdateException WRAPPING (MANDATORY)

### Modify **exact file**:

```
src/SynOS.Services/Payroll/Facts/PayrollFactWriter.cs
```

### Required behavior:

* Wrap **SaveChangesAsync + CommitAsync** in:

```csharp
try
{
    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch (DbUpdateException ex)
{
    throw new PayrollFactWriteViolationException(
        "Payroll fact persistence failed due to a database constraint violation.",
        ex
    );
}
```

### Hard rules:

* ❌ Do NOT inspect inner exceptions
* ❌ Do NOT check error codes
* ❌ Do NOT retry
* ❌ Do NOT log
* ❌ Do NOT introduce new exception types

Any `DbUpdateException` == **fatal payroll law violation**.

---

## ⛔ ABSOLUTE CONSTRAINTS

* ❌ Do NOT re-generate previous migrations
* ❌ Do NOT touch PayrollFact entity (already correct)
* ❌ Do NOT touch orchestration code
* ❌ Do NOT touch calculation logic
* ❌ Do NOT add comments like “future support”
* ❌ Do NOT refactor unrelated code

This is a **surgical patch**, not a redesign.

---

## 📦 REQUIRED FINAL OUTPUT (ALL REQUIRED)

You MUST output:

1. **The full code diff** for `SynOSDbContext.cs` (showing the unique index)
2. **The full migration file** `AddUniqueConstraintToPayrollFacts`
3. **The updated `PayrollFactWriter.cs`** showing the try–catch

If any one is missing → FAIL.

---

## 🧠 FINAL REMINDER (DO NOT IGNORE)

> Payroll truth must be correct **even if the application is wrong**.

Database constraints are the **last line of defense**.

---

## 🔒 END OF FORCE-EXECUTION PROMPT

---
