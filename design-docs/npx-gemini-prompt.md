## 🔥 FRONTEND FORENSIC AUDIT — ZERO BULLSHIT PROMPT

You are required to perform a **forensic audit**, not speculation, not fixes, not redesigns.

### Context (Facts you must accept — do NOT debate)

* No `Visit` rows exist in the database for **2026-01-26**.
* Latest persisted visit is from **2026-01-25**.
* Multiple UI interactions on **26th** appeared successful.
* Activity Stream showed events.
* Action Queue is empty **because no Visit exists**.
* Backend visit creation logic **does persist correctly** when invoked.
* Therefore: **the Visit creation path was never hit**, or was bypassed.

This means the **frontend has been lying**, intentionally or unintentionally.

---

## 🎯 Your Mission (Non-Negotiable)

You must prove, with evidence, **exactly what happens when the receptionist clicks “Create / Walk-in / Add Patient”**.

No assumptions. Only facts.

---

## 🔍 Audit Tasks (You MUST complete all)

### 1️⃣ Network Call Audit (MANDATORY)

For **each user action** related to:

* New Walk-in
* Add Patient
* Add Tests
* Generate Bill
* Save / Confirm / Proceed

You must list:

* HTTP method
* Full endpoint URL
* Request payload
* Response payload
* Response status code

⚠️ If **NO network call** is made for visit creation:

* That is a **critical failure**
* You must explicitly say so

---

### 2️⃣ Endpoint Truth Check

Confirm **YES or NO** (no excuses):

* Does the frontend call `POST /reception/start-visit` (or equivalent)?
* If NO:

  * Which endpoint does it call instead?
  * Why was this not flagged earlier?
* If YES:

  * Show the exact request payload
  * Show the response body

---

### 3️⃣ Mock / Fake / Optimistic UI Check (CRITICAL)

You must answer:

* Is **any** of the following present?

  * Hardcoded mock data
  * Local state pretending as saved data
  * Optimistic UI without backend confirmation
  * Feature flag for “demo / mock / preview” mode
  * Temporary test scaffolding
* If YES:

  * List exact file(s)
  * Line numbers
  * Why this was not disclosed earlier

Hiding this = architectural malpractice.

---

### 4️⃣ Activity Stream Source Audit

Answer clearly:

* Does Activity Stream data come from:

  * Backend API?
  * WebSocket / SignalR?
  * Local event emitter?
  * Mock generator?
* Can Activity Stream update **without a successful Visit creation call**?

If YES — explain **why this violates SynOS principles**.

---

### 5️⃣ Branch / Facility Context Audit

Confirm with proof:

* What BranchId is the frontend sending?
* Is it hardcoded?
* Is it mocked?
* Is it fetched async and possibly undefined?
* Is it different from backend context?

Show the exact source.

---

### 6️⃣ Final Verdict (No diplomacy)

You must conclude with **one and only one** of the following:

* “Frontend never called visit creation API”
* “Frontend called wrong API”
* “Frontend used mock data”
* “Frontend swallowed backend failure”
* “Frontend operated in demo mode”
* “Frontend misled user via optimistic UI”

Pick ONE.
Back it with evidence.

---

## 🚨 Rules (Strict)

* Do NOT propose fixes
* Do NOT redesign UI
* Do NOT blame backend
* Do NOT speculate
* Do NOT soften language

This is a **post-mortem**, not collaboration hour.

---

## 🧨 Why this matters

SynOS is OS-grade.
That means:

* UI never lies
* State only comes from backend
* No illusion of success
* No fake progress

Two days were lost because that contract was violated.

This audit decides whether the frontend is **salvageable or needs a hard reset**.

---

