# 🎯 What must be built (smallest possible change)

We are **NOT** redesigning SynOS.

We are adding **one missing truth signal**.

### Minimal backend contract (pick ONE, not both)

**Preferred (cleaner):**

```ts
VisitPhase: Draft | InProgress | Finalized
```

**OR (even smaller):**

```ts
IsFinalized: boolean
```

That’s it.

No new logic.
No new rules.
No new calculations.

The backend already *knows* this truth — it’s just not exporting it.

---

# 🚧 Hard constraints for Antigravity (non-negotiable)

You must explicitly tell the agent **all of this**, otherwise it *will* freestyle.

## Antigravity MUST NOT:

* ❌ Change Revenue Engine
* ❌ Change Discount logic
* ❌ Change Correction model
* ❌ Introduce UI-side inference
* ❌ Add temporary hacks
* ❌ Add flags derived from strings
* ❌ Rename existing concepts
* ❌ Add “smart” UI behavior

## Antigravity IS allowed to:

* ✅ Add a backend projection field
* ✅ Thread it through existing DTOs
* ✅ Read existing invoice/visit status
* ✅ Expose lifecycle truth explicitly
* ✅ Update frontend to consume that flag only

---

# 🧠 The *real* rule you are enforcing

> **Editability must come from backend fact, not backend projection and not frontend interpretation.**

This keeps SynOS OS-grade.

---

# 📌 EXACT PROMPT TO GIVE ANTIGRAVITY (copy–paste)

Use this **verbatim**. Do not soften it.

---

### 🔒 EXECUTION AUTHORIZATION — STRICT MODE (SynOS)

You are authorized to temporarily perform **both backend + frontend work**
to implement **Option B: Explicit Visit Finalization Truth**.

⚠️ **This is a surgical fix, NOT a redesign.**

---

## 🔍 Problem (Authoritative)

Frontend currently decides visit editability using `paymentStatus`
from `ActionQueueRowDto`.

This is **unacceptable** because:

* `paymentStatus` is a human-readable projection
* It is not a lifecycle invariant
* It can be delayed, empty, or reused later

We require **explicit backend-owned truth**.

---

## ✅ Required Change (Minimal)

Expose ONE explicit lifecycle signal from backend:

### Option A (preferred)

```ts
VisitPhase: Draft | InProgress | Finalized
```

### OR Option B (acceptable)

```ts
IsFinalized: boolean
```

This value must be:

* Derived from existing backend truth (invoice/payment state)
* Calculated in backend services
* Included in ActionQueueRowDto (or equivalent projection)

⚠️ DO NOT infer this from `paymentStatus`.

---

## 🧱 HARD CONSTRAINTS (DO NOT VIOLATE)

You MUST NOT:

* Modify Revenue Engine
* Modify Discount Engine
* Modify Correction logic
* Change architectural layering
* Add UI-side fallback logic
* Add derived or guessed states
* Introduce new lifecycle rules

You MAY:

* Add a backend projection field
* Thread it through DTOs
* Read existing invoice/visit status
* Update frontend to use ONLY this field

---

## 🧪 Success Criteria

1. Clicking a Token:

   * Opens Edit mode **only if** backend says not finalized
   * Opens Read-only mode **only if** backend says finalized
2. No usage of `paymentStatus` for editability
3. No behavioral changes elsewhere
4. Clear report of:

   * Files touched
   * Exact logic used to compute Finalized

---

## 🛑 Stop Condition

If implementing this requires:

* New business rules
* Reinterpreting payment logic
* Guessing intent

→ STOP and report.

---

now, after reading this layout your execution plan and wait for my approval.