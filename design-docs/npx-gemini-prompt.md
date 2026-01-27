
# 🛑 FRONTEND + INTEGRATION EXECUTION PROMPT — SynOS (Reception & Billing)

## Context (Non-Negotiable Ground Truth)

SynOS is an **OS-grade Diagnostic Lab Operating System**, not a CRUD app.

Core architectural rules (LOCKED):

* **Backend owns truth**
* **Frontend is a renderer + intent sender**
* **Facts are immutable**
* **Corrections are append-only**
* **Snapshots / Projections represent current reality**
* **No UI inference of business logic**
* **No silent UI patching for backend gaps**

You must work within these constraints at all times.

---

## Objective

Wire and stabilize the **Reception → Billing → Payment → Post-Payment Correction** flow in the frontend **based on real backend behavior**, while:

1. Respecting SynOS invariants
2. Identifying gaps where backend contracts are missing or insufficient
3. Filling gaps **only when explicitly justified** (with audit)
4. Never inventing UI-side logic to compensate for missing backend truth

This is an **integration + discovery task**, not pure UI work.

---

## IMPORTANT EXECUTION MODE

You are authorized to:

* Audit backend behavior against expected system truth
* Surface mismatches and blockers explicitly
* Propose backend contract changes **when unavoidable**
* Implement missing backend endpoints **only when approved**
* Stop and report when a gap violates SynOS rules

You are **not** authorized to:

* Mock or fake backend state
* Infer permissions
* Locally compute totals, discounts, or eligibility
* Invent lifecycle states without backend alignment

---

## CANONICAL SYSTEM MODEL (Use This)

### Visit Lifecycle (Implicit Today, Must Be Made Explicit)

A Visit progresses through **phases**, not UI screens:

* `Draft` → visit started, editable, no financial commitment
* `InProgress` → tests/discounts changing, still editable
* `Finalized` → payment completed, billing committed

**Payment is the ONLY transition to Finalized.**

Token creation ≠ Finalization.

---

## PHASED EXECUTION PLAN (MANDATORY ORDER)

### 🔹 PHASE 1 — Visit State Truth & Editability

**Goal:**
Ensure UI behavior matches Visit lifecycle reality.

**You must:**

* Remove speculative UI labels (e.g. “cash/card”) before payment exists
* Ensure token click:

  * Reopens Draft / InProgress visits fully editable
  * Does NOT force read-only mode prematurely
* Align editability strictly with backend state (not UI guesses)

**If backend does not expose VisitPhase:**

* Stop
* Propose the minimal backend projection needed
* Do NOT simulate it in UI

---

### 🔹 PHASE 2 — Snapshot Re-Hydration Discipline

**Rule (Absolute):**
After *any* backend mutation → re-fetch snapshot.

Applies to:

* Add test
* Remove / cancel test
* Apply discount
* Replace discount

**You must NOT:**

* Locally splice arrays
* Optimistically hide cards without re-sync
* Maintain shadow UI state

This phase must eliminate:

* Lingering test cards
* Partial UI updates
* Totals changing without structure updating

---

### 🔹 PHASE 3 — Discount Replace / Undo Flow

**Reality:**
Receptionists make mistakes. Discounts must be reversible.

**Required behavior:**

* If a discount is applied:

  * Render it as read-only fact
* Provide explicit actions:

  * Replace discount
  * Remove discount

**Backend expectation:**

* New DiscountFact is created
* Old DiscountFact is inactivated
* No deletion, no mutation

If backend API does not support this cleanly:

* Stop
* Report the exact missing intent endpoint
* Do NOT hack UI toggles

---

### 🔹 PHASE 4 — Payment Projection in Action Queue (Gap-Aware)

**Observation:**
Payment completion exists, but projection is missing.

**UI rule:**

* Do NOT invent payment badges or methods
* Render only what backend truth provides

**You must:**

* Identify what the Action Queue DTO is missing
* Propose a minimal, audit-safe payment projection:

  * Paid / Partial
  * Amount
  * Method (if backend captures it)

Until backend emits this:

* Show neutral “Paid”
* No method guessing

---

### 🔹 PHASE 5 — Post-Payment Corrections (Controlled Unlock)

After `Finalized`:

* Visit becomes read-only by default
* **Explicit correction actions** must be available:

  * Change tests
  * Change discount
  * Change referral partner (if applicable)

These must:

* Trigger CorrectionFact / PriceAdjustmentFact flows
* Never mutate original orders or facts

If frontend is hard-locking everything today:

* Relax only via explicit intent actions
* Never via free edit mode

---

## GAP HANDLING RULES (VERY IMPORTANT)

When a mismatch is found:

1. **Name the gap**
2. **Classify it**

   * Missing projection
   * Missing intent endpoint
   * Ambiguous lifecycle state
3. **State the impact**
4. **Propose the smallest fix**
5. **Wait for approval if backend change is required**

Do NOT:

* Quietly patch UI
* Introduce temporary logic “just to test”
* Proceed past a broken invariant

---

## DELIVERABLES EXPECTED

You must produce:

1. A running UI that:

   * Correctly resumes unfinished visits
   * Refreshes consistently after mutations
   * Allows discount replace/remove
2. A **Gap Report** documenting:

   * Missing VisitPhase exposure (if any)
   * Missing payment projections
   * Missing correction intent endpoints
3. A list of **exact backend changes required** (if any)

---

## DEFINITION OF DONE

* Receptionist can:

  * Start a visit
  * Add/remove tests
  * Apply/replace discount
  * Close and resume before payment
  * Pay and finalize
  * Perform corrections after payment
* UI never diverges from backend truth
* No frontend business logic leakage
* All gaps are explicitly identified, not hidden

---

## FINAL INSTRUCTION

phase by phase execution needed.
Do not skip ahead.
Stop and report when invariants are threatened.

layout your execution plan and wait for my approval.