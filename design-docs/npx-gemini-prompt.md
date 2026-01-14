You are the frontend engineer for SynOS.

Context:
SynOS is an OS-grade healthcare operations system.
The backend is sealed and exposes a read-only operational event stream.

Your task is to IMPLEMENT the RIGHT-SIDE PANEL for the Receptionist screen,
now officially called:

→ “Activity Stream”

IMPORTANT:
This is NOT a new layout.
We are simply REPLACING the existing “Detail / Audit Panel” with “Activity Stream”.
NO layout changes are allowed.

The Universal Screen Skeleton remains unchanged.
Only the content and rendering of this panel changes.

--------------------------------
WHAT THIS PANEL IS
--------------------------------
Activity Stream is a LIVE, READ-ONLY operational awareness feed.

It shows:
- What has ACTUALLY happened
- Across the branch
- Across roles (Reception, Billing, Phlebotomy, Lab, Doctor)
- Using backend-emitted events only

It is NOT:
- A workflow controller
- A per-patient detail view
- A dashboard
- A reporting screen

--------------------------------
BACKEND CONTRACT (LOCKED)
--------------------------------
Endpoint:
GET /api/v1/branch/activity

Behavior:
- Returns last 50 events
- Ordered DESC by OccurredAt
- Automatically scoped to CURRENT UTC DAY
- Filtered by BranchId
- No pagination

Event fields:
- eventType (enum)
- occurredAt (UTC, ISO string)
- summaryText (human-readable, preformatted)
- actorType ("User" / "System")
- actorName (nullable)
- tokenId (primary human identifier)
- visitId
- branchId

--------------------------------
FRONTEND RULES (NON-NEGOTIABLE)
--------------------------------
1. DO NOT infer workflow state from events.
2. DO NOT parse or modify summaryText. Render verbatim.
3. DO NOT perform client-side calculations (money or time).
   Relative time display (“2m ago”) is allowed as pure formatting only.
4. Treat the stream as EPHEMERAL (resets daily UTC).
5. Poll every 30–60 seconds or refresh on relevant user actions.
6. NO mock data. Backend only.
7. If something is missing → STOP & REPORT.

--------------------------------
UI DESIGN INSTRUCTIONS
--------------------------------
Layout:
- Reuse the EXISTING right-side panel layout as-is.
- No resizing, no repositioning, no structural changes.
- Only the internal content changes.

Rendering:
- Vertical list, newest events at the top.
- High-density, calm, professional.
- Designed for continuous peripheral awareness.

Each row should visually contain:
- Token ID (most prominent anchor)
- summaryText (primary text)
- actorName (secondary, if present)
- occurredAt (subtle time indicator)

Behavior:
- Read-only
- No buttons
- No filters (for now)
- No pagination
- No charts
- No animations except subtle entry fade (optional)

--------------------------------
REFERENCE IMAGE
--------------------------------
I will provide a reference image showing:
- Density
- Typography
- Spacing
- Visual hierarchy

You MUST follow the reference image for visual presentation.
Do NOT invent a new visual style or structure.

--------------------------------
GOAL
--------------------------------
Replace the existing Detail/Audit panel with Activity Stream,
keeping the screen stable, predictable, and OS-grade.

This panel exists to keep multiple receptionists in sync,
not to drive actions.

Proceed with implementation.
