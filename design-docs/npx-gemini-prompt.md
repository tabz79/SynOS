## 🧠 Gemini Anti-Gravity Frontend Prompt — Activity Stream Wiring

```
Context:
SynOS backend has undergone a major architectural upgrade.

The Activity Stream is now:
- Backed by a canonical, atomic event spine
- Fully backend-driven (Backend-For-Frontend projections)
- Free of frontend inference, enums, or mock logic

This prompt is for FRONTEND AUDIT + WIRING ONLY.

---

### WHAT HAS CHANGED (READ CAREFULLY)

1. Backend Truth Model
- All operational facts (tokens, payments, samples, reports) are emitted as canonical events
- Events are persisted atomically with state changes
- No event can exist without a real backend fact

2. Activity Stream Architecture
- Frontend MUST NOT interpret event types
- Frontend MUST NOT compose activity messages
- Frontend MUST NOT infer state

3. Backend provides projection endpoints:

- GET /api/v1/branch/activity/reception
- GET /api/v1/branch/activity/lab
- GET /api/v1/branch/activity/doctor

Each endpoint returns:
```

ActivityItemDto {
eventId: string
occurredAt: string (UTC)
actorName: string
message: string        // fully human-readable
icon: string           // semantic identifier
color: string          // semantic color
token?: string
}

```

The frontend’s job is **render only**.

---

### HOW ACTIVITY STREAM SHOULD WORK (AUTHORITATIVE)

- Activity Stream shows REAL-TIME operational facts
- Multiple reception screens must stay in sync by reading the same stream
- UI never guesses, computes, or re-labels events
- UI does not care about enums like SAMPLE_COLLECTED
- UI only renders what backend projects

If frontend logic decides:
- which events to show
- how to word messages
- how to group states

That is a BUG.

---

### STEP 1 — FRONTEND AUDIT (MANDATORY, DO NOT SKIP)

Audit the current Activity Stream implementation:

Answer explicitly:

1. Data Source
- Where does the Activity Stream data currently come from?
- Is it:
  - hardcoded mock data?
  - local arrays?
  - derived from other screens?
  - fetched from backend?

2. Interpretation Logic
- Does frontend:
  - switch on event types?
  - map enums to messages/icons?
  - infer states (e.g., “pending”, “completed”)?

3. Consistency Risks
- Can two reception screens show different activity?
- Does refresh reorder or recompute entries?
- Is any timestamp generated on client?

4. Violations
- List every place where frontend:
  - invents meaning
  - fabricates data
  - guesses state
  - uses placeholders

Return a clear verdict:
- SAFE / PARTIALLY SAFE / UNSAFE

DO NOT FIX YET.
Audit only.

---

### STEP 2 — WIRED IMPLEMENTATION PLAN (ONLY AFTER AUDIT)

If audit verdict is NOT SAFE:

Propose a wiring plan that:

- Removes all mock / placeholder activity data
- Replaces it with API calls to:
  /api/v1/branch/activity/reception
- Stores activity items as immutable read-only state
- Renders directly from ActivityItemDto
- Uses backend-provided icon & color
- Preserves ordering from backend

Rules:
- No frontend filtering
- No frontend message composition
- No frontend enum usage
- No “smart” UI logic

---

### CONSTRAINTS (NON-NEGOTIABLE)

- Do NOT modify backend
- Do NOT invent new fields
- Do NOT add frontend heuristics
- Do NOT merge or collapse events
- Treat ActivityItemDto as truth

---

### DELIVERABLE

Return in order:

1. Frontend Activity Stream Audit Report
2. List of violations (if any)
3. Wiring plan to connect Reception UI to real Activity Stream
4. Explicit confirmation that:
   “Frontend is a pure renderer of backend truth”

```

---
