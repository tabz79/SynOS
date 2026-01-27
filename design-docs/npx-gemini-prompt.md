
## 🔐 Backend Prompt — Order Status Canonicalization (FINAL HARDENING)

**Objective:**
Eliminate all string-based order status usage and enforce a compile-time safe, OS-grade lifecycle for Orders.

This is a **mandatory invariant hardening**, not a feature.

---

### 🔴 Problem Being Fixed

`Order.Status` is currently a raw string (`"Cancelled"`, `"Active"` etc).

This violates:

* Compile-time safety
* Workflow determinism
* Analytics integrity
* Medical audit requirements

Strings must never represent state.

---

## ✅ Canonical Rule (LOCKED)

> **Order.Status MUST be a strongly typed enum. No string literals allowed anywhere.**

---

## 🛠️ Execution Plan (Step-by-step)

### 1. Create Enum

Create a new enum:

```csharp
namespace SynOS.Models.Enums
{
    public enum OrderStatus
    {
        Active = 1,
        Cancelled = 2,
        Collected = 3,
        Completed = 4
    }
}
```

---

### 2. Update Order Entity

Modify `Order.cs`:

```csharp
public OrderStatus Status { get; set; }
```

❌ Remove / replace any `string Status`.

---

### 3. Database Migration

Create a migration that:

* Converts `Orders.Status` from `nvarchar` → `int`
* Maps existing values safely:

  * `"Cancelled"` → `OrderStatus.Cancelled`
  * `"Active"` → `OrderStatus.Active`

Example SQL inside migration (if needed):

```sql
UPDATE Orders SET Status = 2 WHERE Status = 'Cancelled';
UPDATE Orders SET Status = 1 WHERE Status = 'Active';
```

(Then alter column type.)

---

### 4. Fix All Assignments

Replace **every** occurrence of:

```csharp
order.Status = "Cancelled";
```

with:

```csharp
order.Status = OrderStatus.Cancelled;
```

This includes:

* `VisitService.RemoveTestFromVisitAsync`
* `CorrectionService`
* Any future correction flows

---

### 5. Fix All Queries

Replace string comparisons like:

```csharp
o.Status != "Cancelled"
```

with:

```csharp
o.Status != OrderStatus.Cancelled
```

---

### 6. Build & Verify

* `dotnet build` must pass
* No `"Cancelled"` string literals left in services
* Revenue engine must continue using:

  ```csharp
  Orders.Where(o => o.Status == OrderStatus.Active)
  ```

---

## 🚫 Explicit Prohibitions

❌ Do NOT introduce new string statuses
❌ Do NOT create conversion helpers
❌ Do NOT tolerate mixed enum/string logic
❌ Do NOT defer this to “later cleanup”

This is **foundational**.

---

## 🎯 Expected Outcome

After this change:

* Order lifecycle is compiler-enforced
* Cancellation semantics are unambiguous
* Lab + finance + analytics all agree on truth
* Future devs **cannot** accidentally corrupt state

---

