You are implementing REAL, production-grade frontend code for SynOS.
This is NOT a UI mockup task and NOT a static form-building task.

SYSTEM CONTEXT (LOCKED):
- SynOS is an OS-grade healthcare operating system.
- The frontend is a STATE-REFLECTIVE SURFACE, not a workflow driver.
- The backend architecture and truth engines are SEALED.
- Frontend must strictly reflect backend truth and backend state.

CRITICAL UI CONCEPT (NON-NEGOTIABLE):
SynOS uses a SINGLE, ADAPTIVE, RIGHT-SIDE INTENT PANEL as its primary interaction mechanism.

This panel is:
- Context-aware
- State-driven
- Dynamically adaptive
- NOT static
- NOT step-based
- NOT a wizard
- NOT a generic modal
- NOT a decorative side panel

The panel behaves like an OS intent surface, similar to:
- System dialogs in operating systems
- Context panels in professional terminals
- Operational consoles, not SaaS forms

The word “smart” here means:
- Dynamically adapting its visible sections based on backend state
- Conditionally revealing or hiding sections
- Reacting to backend responses in real time
- WITHOUT embedding business logic in the frontend

There is NO AI logic in the panel.

---

VISUAL & INTERACTION REFERENCE:
- You are provided with a Nanobanana-generated SynOS Receptionist screen image.
- Treat this image as the CANONICAL VISUAL AND INTERACTION REFERENCE.
- DO NOT redesign layout, spacing philosophy, or interaction model.
- DO NOT simplify the panel into a flat form.

---

ABSOLUTE PROHIBITIONS:
- DO NOT use mock or placeholder data.
- DO NOT hardcode patients, tests, prices, totals, or statuses.
- DO NOT invent API endpoints.
- DO NOT simulate backend logic in the frontend.
- DO NOT calculate money, discounts, referrals, or inventory client-side.
- DO NOT assume workflow order.
- DO NOT convert the panel into a multi-step wizard.

If required backend APIs or contracts are missing:
STOP and REPORT instead of inventing.

---

TASK SCOPE:
Implement the REAL Receptionist flow using the OS-grade adaptive panel pattern.

---

1️⃣ ACTION QUEUE (CORE WORK SURFACE)
- Populate Action Queue strictly from backend Visit / Queue projections.
- Show only ACTIVE visits requiring attention.
- No static rows.
- No demo data.
- Queue rows represent BACKEND STATE, not UI state.

---

2️⃣ “+ New Walk-In” TOP-LEVEL INTENT

The SynOS Receptionist screen MUST include a visible top-level button labeled:

“+ New Walk-In”

This button DOES NOT exist in the current frontend and MUST be newly implemented.

Placement:
- Positioned above the Action Queue
- Visually aligned with the OS-grade layout shown in the reference image
- Styled consistently with the existing SynOS design system (dark, dense, professional)

Behavior:
- Clicking “+ New Walk-In” opens the RIGHT-SIDE ADAPTIVE INTENT PANEL
- The panel slides in from the right
- It overlays or replaces the Audit / Detail panel
- The Action Queue and Reality Summary remain visible in the background

Purpose:
- This is the PRIMARY and ONLY entry point for:
  - Creating a new Visit
  - Optionally creating or linking a Patient
  - Initiating billing for that Visit

The panel opened by this button is NOT static.
It is a dynamically adaptive, state-driven panel whose visible sections change
based on backend responses (existing patient vs new patient, etc.).

The agent MUST implement this button and wire it to the adaptive panel behavior.

---

3️⃣ ADAPTIVE PANEL BEHAVIOR (VERY IMPORTANT)

The panel is ONE CONTINUOUS SURFACE whose visible sections adapt dynamically:

SECTION A — Patient Identification (ALWAYS VISIBLE)
- Mobile number input
- Live backend lookup as the user types
- NO explicit “Search” button

Backend responses determine panel behavior:
- If patient exists → show read-only identity summary
- If patient does not exist → reveal identity input fields

Frontend does NOT decide this — backend response does.

---

SECTION B — Identity Facts (CONDITIONAL)
- Visible ONLY when backend indicates patient does not exist
- Minimal required fields only (e.g. name, gender)
- No ERP-style long form
- No optional noise

---

SECTION C — Visit Details (ALWAYS VISIBLE)
- Test selection sourced ONLY from backend Test Master API
- Real test names
- Real prices
- No hardcoded catalog
- UI submits intent; backend returns computed values

---

SECTION D — Billing & Financial Summary (STATE-REFLECTIVE)
- Billing data returned from backend
- Discounts applied ONLY through backend Discount Engine
- Referral handling through backend Referral Engine (Flow A / Flow B)
- Frontend shows backend-calculated payable amounts
- NO client-side calculations

This section updates dynamically as backend responses change.

---

SECTION E — COMMIT ACTION (SINGLE COMMIT)
Primary button:
- “Create Visit & Generate Bill”

This triggers ONE backend command that:
- Creates Visit
- Links or creates Patient
- Applies billing
- Emits Revenue facts
- Triggers Inventory and Cost Attribution hooks

Frontend waits for backend confirmation.
NO optimistic UI.

---

ERROR & STATE HANDLING:
- Backend rejections must be surfaced verbatim.
- Truth-blocking errors are persistent and blocking.
- No silent retries.
- No fallback assumptions.

---

DELIVERABLE EXPECTATIONS:
- REAL frontend components
- REAL API wiring
- Zero mock data
- Clear comments where backend contracts are assumed

IMPLEMENTATION PROCESS:
- First: audit and list existing backend endpoints relevant to Receptionist flow
- Second: confirm data contracts
- Third: wire UI incrementally to real APIs
- Only THEN write UI logic

BEGIN WITH:
Backend API audit and mapping for the Receptionist role.
