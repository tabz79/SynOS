### 🛠️ **Gemini Fix Prompt — Payroll Foundation Mechanical Corrections (STRICT)**

You previously implemented the Payroll Engine V1 foundation.

This task is a **MECHANICAL FIX PASS ONLY**.

❗ **DO NOT redesign, rename, or extend anything.**
❗ **DO NOT add new fields, entities, enums, or logic.**

---

## REQUIRED FIXES (ALL FOUR ARE MANDATORY)

### 1️⃣ Remove all default initializers in DbContext

In `SynOSDbContext.cs`:

* Remove **all** `= null!` initializers from Payroll DbSet properties
* Leave DbSet declarations as plain auto-properties

✅ Allowed:

```csharp
public DbSet<PayComponent> PayComponents { get; set; }
```

❌ Not allowed:

```csharp
public DbSet<PayComponent> PayComponents { get; set; } = null!;
```

---

### 2️⃣ Make all string properties nullable in Payroll entities

In **all Payroll entity classes**:

* Change every `string` property to `string?`
* This applies to:

  * Names
  * Notes
  * Descriptions
  * Codes
  * Any free-text field

❗ Do NOT add `[Required]`, `[MaxLength]`, or validation attributes.

---

### 3️⃣ Remove explicit decimal precision from migration

In the Payroll migration file:

* Remove **all** explicit precision definitions such as:

  * `decimal(18,2)`
* Allow EF Core to use its default decimal mapping for now

❗ Do NOT change:

* Column names
* Table names
* Nullable flags
* Relationships

This is a **precision deferral**, not a schema redesign.

---

### 4️⃣ Ensure single `using` directive

In `SynOSDbContext.cs`:

* Ensure `using SynOS.Models.Entities.Payroll;` appears **exactly once**
* Remove any duplicate occurrences

---

## CONSTRAINTS (NON-NEGOTIABLE)

* ❌ Do NOT add defaults anywhere
* ❌ Do NOT add data annotations
* ❌ Do NOT add logic or methods
* ❌ Do NOT add navigation properties
* ❌ Do NOT change entity structure
* ❌ Do NOT touch HR Master or other engines
* ❌ Do NOT introduce new migrations unless required by the above fixes

---

## OUTPUT RULES (STRICT)

1. Output **ONLY** the modified Payroll entity files
2. Output **ONLY** the modified portion of `SynOSDbContext.cs`
3. Output the **FULL corrected migration file**
4. No explanations
5. No summaries
6. No commentary

---

## FINAL RULE

If you are unsure whether a change is required, **do not make it**.

This is a correction pass, not a redesign.

---

