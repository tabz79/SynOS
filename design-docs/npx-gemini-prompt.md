## ✅ Backend Status (Locked In)

Because this matters before UI:

You now have:

* Reliable **operational events** for:

  * Visit created
  * Sample collected / rejected
  * Result drafting started
  * Report ready for verification
  * Report signed / delivered
* A consistent **Operations Engine timeline**
* A clean **Action Queue data source**
* No magical frontend inference needed

So the frontend can now safely ask:

> “What is the latest operational truth for this visit?”

Good. Now we move.

---

## 🧠 Reality Check: What the Action Queue IS (and is NOT)

Let’s ground this hard, because earlier suggestions went off the rails.

### Action Queue is:

* **Post-payment only**
* **Operational, not financial**
* **Read-only**
* **Logged-in branch scoped**
* **A live conveyor belt of work**

### Action Queue is NOT:

* A draft state viewer
* A validation checklist
* A warning system
* A billing or referral debugger
* A decision engine

Once a patient enters Action Queue:
👉 **Money is done. Intent is done. Referral is done.**

Only **operations remain**.

---

## ✅ Finalized Action Queue Columns (Validated)

Based on everything you said (and correcting earlier nonsense), this is **clean and correct**:

### 1️⃣ Token ID

* Primary identity
* Clickable
* Opens **right-side visit drawer** (read-only details)

---

### 2️⃣ Patient (Composite Column)

Single column, dense but readable:

**Contents:**

* Patient Name
* Badges:

  * Age
  * Sex
  * Test Codes (ALL of them, not +2 nonsense)

Example:

```
T-0345  
Ramesh Kumar  
[45y] [M] [CBC] [LIPID] [TSH]
```

Why this matters:

* Reception instantly knows *who* and *what*
* No need to open details for basic context

---

### 3️⃣ Payment Mode

Reception-friendly, **not business-logic-revealing**:

Values:

* `Cash`
* `UPI`
* `Card`
* `Prepaid (Dr. Sharma)`

Important:

* No PartnerCollects / LabCollects
* No commission visibility
* No backend semantics

Reception already physically verified prepaid.
This column is **confirmation**, not discovery.

---

### 4️⃣ Live Status (MOST IMPORTANT COLUMN)

This is the heart of the Action Queue.

Derived from Operations Engine events only.

Examples:

* `Waiting for sample`
* `Sample collected`
* `In lab`
* `Result entry`
* `Awaiting verification`
* `Report ready`
* `Delivered`

This must:

* Update in real time
* Be driven purely by operational events
* Never depend on polling random tables

This is why sealing ResultService mattered.

---

### 5️⃣ ETA (Optional but Valuable)

* Computed
* Soft estimate
* Derived from test SLA + current operational stage

This is optional **now**, but future-proof.

---

### 6️⃣ Infinite Scroll Rule (History)

* Default: **Today only**
* Button at end: **“Load last 7 days”**
* That’s it. No more.

Action Queue ≠ medical history.

---

## 🚨 What We Explicitly Do NOT Add

Just to be crystal clear:

❌ Referral confirmation states
❌ “Risk / revenue unassigned” flags
❌ Finance reminders
❌ Editable actions
❌ Multi-owner views
❌ Audit noise

If it’s not **operational**, it doesn’t belong here.

---

## 🎯 Backend Verdict for Action Queue

Backend is now capable of emitting **this exact DTO** cleanly:

```ts
ActionQueueRow {
  visitId
  token
  createdAt

  patientName
  age
  sex
  testCodes[]

  paymentMode
  prepaidDoctorName?

  operationalStatus
  lastStatusChangeAt
}
```

No gaps. No hacks.

---

## 🧩 NOW — The Correct Frontend Prompt (Audit First)

As you requested, **first audit**, not implementation.

### 📌 Frontend Prompt — Action Queue Audit

Copy-paste this verbatim to Gemini (frontend):

---

### 🔍 Frontend Audit Prompt — Action Queue Readiness (SynOS)

**Objective:**
Audit the current frontend Action Queue implementation against the finalized SynOS operational model. Do NOT implement anything yet.

---

### 1️⃣ Scope of Audit

Audit the following strictly:

* Action Queue list UI
* Data consumption from backend
* Rendering correctness
* Missing / misaligned fields
* Incorrect assumptions

Ignore:

* New Walk-In cockpit
* Billing flows
* Referral creation UI

---

### 2️⃣ Canonical Truth Rules

Frontend MUST:

* Treat backend operational events as single source of truth
* Render **post-payment visits only**
* Never infer financial or referral logic
* Never display backend technical terms

---

### 3️⃣ Required Columns to Audit For

Confirm whether the frontend can currently render:

1. Token ID (clickable)
2. Patient name with badges:

   * Age
   * Sex
   * ALL test codes
3. Payment Mode:

   * Cash / UPI / Card / Prepaid (Doctor Name)
4. Live Operational Status:

   * Derived from Operations Engine events
5. Optional ETA
6. Infinite scroll (Today → last 7 days)

---

### 4️⃣ Audit Questions to Answer

* Which of the above data points are already rendered correctly?
* Which are missing entirely?
* Which are incorrectly inferred client-side?
* Are there any frontend assumptions not backed by backend data?
* Is the operational status currently polling tables instead of subscribing to events?

---

### 5️⃣ Output Format (MANDATORY)

Return:

1. ✅ What is correct
2. ❌ What is missing
3. ⚠️ What is risky
4. 📌 What changes are REQUIRED (not optional)

NO UI redesign suggestions yet.

---

