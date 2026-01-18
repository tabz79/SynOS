EXECUTION MODE — FRONTEND ONLY

Context:
Backend is COMPLETE for:
- GET /api/v1/reception/intake/snapshot
- POST /api/v1/reception/intake/register-patient

Current Problem:
Frontend uses a legacy multi-step SaaS wizard (ReceptionCheckinFlow.tsx),
which violates the Snapshot architecture and creates clicking hell.

Goal:
Convert the Reception experience into a SINGLE-PANEL,
SNAPSHOT-DRIVEN intake flow.

MANDATES (Non-Negotiable):

1. DELETE / ABANDON WIZARD
- ReceptionCheckinFlow.tsx must be removed or bypassed.
- No step-based navigation (Step 1–7).
- No “simulate” buttons.
- No modal/page switches.

2. ONE PANEL RULE
- Intake screen must always stay on ONE screen.
- UI sections appear/disappear ONLY based on snapshot contents:
  - snapshot.patient
  - snapshot.visit
  - snapshot.billing

3. Patient Identification (Inline)
- PatientSearchForm:
  - Search existing patients
  - If no result → show INLINE “Register Patient” form
- On register:
  - Call POST /api/v1/reception/intake/register-patient
  - Receive real GUID
  - Immediately reload snapshot with patientId
- NO fake IDs
- NO frontend-generated state

4. Snapshot Is Truth
- All rendering comes from GET /snapshot
- Frontend holds ONLY:
  - patientId
  - visitId
- No calculations
- No derived state
- No wizard flags

5. Acceptance Criteria
- Receptionist flow:
  - Click “New Walk-in”
  - Search patient
  - Register if missing (inline)
  - Patient locks in panel
  - Flow continues without navigation or extra clicks

Deliverables:
- Remove or isolate ReceptionCheckinFlow
- Refactor Intake panel to snapshot-driven rendering
- Wire register-patient command
- Provide a short walkthrough of the new flow

DO NOT:
- Add new backend APIs
- Introduce sessions
- Reintroduce wizard logic

Start with deleting/bypassing ReceptionCheckinFlow.tsx.
Then proceed step-by-step.
