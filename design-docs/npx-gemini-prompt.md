## 🔎 Backend Audit Prompt — SynOS Financials & Dashboard Readiness

**Mode:** AUDIT ONLY
**No code changes. No implementation. No refactors. No assumptions.**

---

### Context

SynOS is adding **Reception Dashboard financial tiles** and **explicit payment modeling**.

We already have:

* Immutable facts philosophy
* Projector-based aggregates
* Role-scoped operational stats
* Existing real-time tile pipeline (SignalR + Projectors)

This audit is to verify **backend readiness**, **current state**, and **gaps** — nothing else.

---

### What to Audit (STRICT)

#### 1️⃣ Payment Modeling (Ground Truth)

Audit the current backend for:

* How **payments** are currently represented
  (Entities, Facts, Events — list exact classes/files)

Answer explicitly:

* Is there a `PaymentFact` or equivalent immutable record?
* Does it capture:

  * VisitId
  * Amount
  * Method (Cash / UPI / Card)
  * UserId (who collected)
  * Timestamp

❗ If not present, **state the gap**, do not design a solution.

---

#### 2️⃣ Payment Method Semantics

Confirm:

* Whether payment method is:

  * Explicitly modeled (enum/value object), OR
  * Inferred / implicit

Clarify:

* Is “Online” stored as a method?
* Or is Online expected to be a **projection (UPI + Card)**?

Flag any place where **method inference** happens instead of explicit capture.

---

#### 3️⃣ Prepaid — Canonical Meaning (Critical)

Audit how **Prepaid** is handled today:

Answer clearly:

* Is Prepaid modeled as:

  * Visit State?
  * Billing Model?
  * Payment Method?
  * Receivable?
  * Or not modeled at all?

Check for:

* Any fact/event emitted when a visit is marked prepaid
* Any way to track **money yet to be collected**

❗ IMPORTANT
Prepaid ≠ Paid.
If backend currently treats prepaid as “assumed paid” or does nothing, **flag this as a design gap**.

---

#### 4️⃣ Operational Stats / Tiles Pipeline

Audit the existing dashboard stats flow:

* Where are **Walk-in**, **Pending Reports**, **Avg TAT** coming from?
* Which projector computes them?
* Which DTO serves them?
* Are they:

  * Event-driven?
  * Role-scoped (per logged-in user)?
  * Branch-scoped?

Specifically verify:

* Is **Walk-in** currently incremented on Visit creation or on Payment acceptance?
* Is this definition aligned with real-world billing truth?

---

#### 5️⃣ Role Scoping (Receptionist vs Accountant)

Verify whether backend stats:

* Are scoped per `UserId`
* Or aggregated globally

Confirm:

* Can the backend distinguish:

  * Payments collected by Receptionist A vs B?
  * Receivables later collected by Accountant?

If not, **explicitly mark the limitation**.

---

#### 6️⃣ Real-Time Update Capability

Audit:

* What events currently trigger:

  * Tile updates
  * SignalR broadcasts
* Whether the same pipeline can be reused for:

  * Cash collected
  * Online payments
  * Prepaid counts/amounts

Do **not** propose new pipelines.

---

### Output Format (MANDATORY)

Your response must be structured as:

```
Backend Readiness Audit — SynOS

1. Payment Modeling
   - Current State:
   - Gaps:

2. Payment Methods
   - Current State:
   - Gaps:

3. Prepaid Handling
   - Current State:
   - Gaps:

4. Operational Stats Pipeline
   - Current State:
   - Gaps:

5. Role Scoping
   - Current State:
   - Gaps:

6. Real-Time Capability
   - Current State:
   - Gaps:

Final Verdict:
- READY / PARTIALLY READY / NOT READY
- One paragraph justification
```

---

### Hard Rules

* ❌ Do NOT suggest schema changes unless a gap truly exists
* ❌ Do NOT design new features
* ❌ Do NOT assume frontend behavior
* ❌ Do NOT auto-fill missing logic with guesses

If something is missing → **state “Gap exists” and stop there**.

---

### Objective

This audit will be **cross-checked** against an independent frontend/architecture audit.
Consistency matters more than creativity.

---

