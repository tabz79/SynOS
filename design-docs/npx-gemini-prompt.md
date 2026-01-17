## 📌 **FRONTEND PROMPT — Reception Dashboard (Operational Cockpit Wiring)**

### Context (READ CAREFULLY)

The backend has been **fundamentally upgraded**.

This is **NOT a SaaS dashboard**.
This is a **real-time operational cockpit** (airport terminal / ATC style).

Two backend streams now exist and are FINAL:

---

### 1️⃣ Activity Stream (Already Wired)

* Source: `GET /api/v1/branch/activity/{role}`
* Nature: **Immutable operational facts**
* Delivery: Pull + SignalR
* Backend decides:

  * `message`
  * `icon`
  * `color`
* Frontend is a **pure renderer**
  ❌ No inference
  ❌ No switching on event type
  ❌ No guessing

This part is already implemented and working.

---

### 2️⃣ Today’s Summary Tiles (NEW — This Task)

These **4 tiles are NOT summaries**.
They are **LIVE OPERATIONAL GAUGES**.

They are now powered by **event-driven counters**, not DB aggregation.

#### Tiles:

* Walk-ins Today (USER-scoped)
* Payments Collected (USER-scoped)
* Pending Reports (BRANCH-scoped)
* Avg Report Time (USER-scoped)

Backend architecture:

* Counters are updated **atomically** by a Projection Handler
* Backend pushes **complete snapshots** via SignalR
* Backend also exposes a snapshot pull endpoint

Authoritative DTO:

```ts
ReceptionSummaryDto {
  walkInsToday: number
  paymentsCollected: number
  pendingReports: number
  avgReportTimeMinutes: number
}
```

---

## 🚨 HARD RULES (NON-NEGOTIABLE)

1. ❌ NO mock data
2. ❌ NO polling loops
3. ❌ NO frontend math (counting, averaging, summing)
4. ❌ NO inferred state
5. ❌ NO timers like “refresh every 60s”
6. ❌ NO duplication of backend logic

Frontend is a **display panel only**.

---

## 🧪 TASK 1 — AUDIT (MANDATORY)

First, **audit the current Reception frontend**:

Specifically inspect:

* `ReceptionScreen.jsx`
* Any `statTiles` / hardcoded values
* Any `useEffect` fetching summary data
* Any mock numbers or placeholders

Answer explicitly:

1. Are tiles still using mock/static data?
2. Is polling being used?
3. Are tiles updated only on refresh?
4. Is any math done client-side?
5. Is there any coupling with Activity Stream events?

👉 **DO NOT FIX YET. REPORT FIRST.**

---

## 🧠 TASK 2 — REQUIRED FRONTEND BEHAVIOR (AFTER AUDIT)

After audit approval, propose a **correct wiring plan** that does ALL of the following:

### Initial Load

* Fetch snapshot from:

  ```
  GET /api/v1/dashboard/reception/summary
  ```
* Render values directly into tiles

### Live Updates

* Subscribe to SignalR (`DashboardHub`)
* Listen for:

  ```
  "ReceptionSummaryUpdated"
  ```
* Payload is a **full ReceptionSummaryDto**
* On receipt:

  * Replace state entirely
  * Re-render tiles

### Rendering Rules

* Currency formatting = UI only (₹, commas)
* Time formatting = UI only (`XX min`)
* Values come 100% from backend
* No debounce, throttle, or math

---

## 🧩 TASK 3 — EDGE CASES YOU MUST HANDLE

You must account for:

* Initial empty state (no stats yet)
* Reconnect after SignalR drop
* User switching branch or logging out
* Backend pushing update while screen is open

Explain how your design handles these **without extra logic**.

---

## 📦 DELIVERABLE FORMAT

Respond in **this exact order**:

1. **Audit Report** (current frontend state)
2. **Violations Found** (if any)
3. **Proposed Wiring Plan**
4. **Component Changes**
5. **State Flow Diagram (textual)**
6. **Why this complies with “Pure Renderer” doctrine**

⚠️ Do NOT write code until explicitly asked.

---

### Final Reminder

If the frontend **calculates**, **infers**, or **guesses** anything —
it is **architecturally wrong**, even if it “works”.

Proceed with **Audit First**.

---
