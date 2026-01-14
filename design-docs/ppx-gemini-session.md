✦ 🔒 Frontend Readiness Audit Report — Branch Operational Event Stream

  Date: Wednesday, 14 January 2026
  Target: SynOS Backend Subsystem: Branch Operational Event Stream
  Verdict: READY FOR CONSUMPTION

  ---

  1️⃣ Backend Surface Area Summary

   * Endpoint: GET /api/v1/branch/activity
   * Authentication: Requires Authentication (JWT Bearer). Roles with access not explicitly enforced by policy on this specific endpoint but typically requires
     staff/admin roles.
   * Query Parameters:
       * branchId (Required, string): Scopes data to a specific branch.
   * Time Scoping: Hard-coded to Current UTC Day (00:00:00 UTC to 23:59:59 UTC).
       * Frontend Note: This means "Today" is defined by the server's UTC clock, not the user's local browser time. Events from "yesterday" (UTC) will disappear from this
         feed automatically at midnight UTC.
   * Ordering: Always Descending by Time (OccurredAt DESC). Newest events first.
   * Limits: Hard-limit of 50 items. No pagination support.

  ---

  2️⃣ BranchOperationalEvent — Frontend Contract


  ┌─────────────┬───────────────────┬───────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┐
  │ Field Name  │ Type              │ Meaning                                                       │ Rendering Expectation                                   │
  ├─────────────┼───────────────────┼───────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ eventId     │ string (uuid)     │ Unique ID of this specific log entry.                         │ Hidden (Key only).                                      │
  │ eventType   │ string            │ The machine-readable category of the event.                   │ Use for icon mapping or filtering.                      │
  │ occurredAt  │ string (ISO8601)  │ The exact UTC moment the event happened.                      │ Render as relative time (e.g., "2m ago") or local time. │
  │ summaryText │ string            │ A human-readable, pre-composed sentence describing the event. │ Display Verbatim. Do not try to parse or rephrase.      │
  │ actorType   │ string            │ Who triggered it? ("User", "System").                         │ Optional context.                                       │
  │ actorName   │ string (nullable) │ Name of the specific user (if known).                         │ Display if present (e.g., "by John Doe").               │
  │ tokenId     │ string            │ The Visit Token (e.g., "A-001").                              │ Prominent display. The primary human identifier.        │
  │ visitId     │ string (uuid)     │ The underlying Visit ID.                                      │ Navigation link target (e.g., click to open visit).     │
  │ branchId    │ string            │ The branch this belongs to.                                   │ Redundant if filtering by branch, but confirms context. │
  └─────────────┴───────────────────┴───────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┘

  ---

  3️⃣ EventType Semantics Table


  ┌─────────────────┬─────────────────────────────────────────────────┬──────────────────┬─────────────────────────────────────────┬─────────────────────────────────────┐
  │ EventType       │ Meaning                                         │ Who Emitted It   │ Answers Question                        │ UI Category                         │
  ├─────────────────┼─────────────────────────────────────────────────┼──────────────────┼─────────────────────────────────────────┼─────────────────────────────────────┤
  │ VISIT_STARTED   │ A new patient visit has been created/registe... │ ReceptionFlow    │ "Did we start checking in Patient X?"   │ Contextual                          │
  │ BILL_GENERATED  │ An invoice has been finalized for a visit.      │ Visit / Billing  │ "Is the bill ready?"                    │ Contextual                          │
  │ `PAYMENT_REC... │ Money has been successfully collected.          │ Invoice / Rev... │ "Has the patient paid?"                 │ Action-driving (Unlocks collecti... │
  │ `SAMPLE_COLL... │ Phlebotomist has physically collected the sa... │ SampleService    │ "Is the sample in the lab yet?"         │ Action-driving (Unlocks processing) │
  │ REPORT_VERIFIED │ Results entered and verified by technician.     │ ReportService    │ "Are results ready for doctor review?"  │ Action-driving (Unlocks signing)    │
  │ REPORT_READY    │ Doctor has signed; report is final.             │ ReportService    │ "Can we give the report to the patie... │ Terminal (Deliverable)              │
  │ VISIT_FINALIZED │ The entire visit operational loop is closed.    │ ReceptionFlow    │ "Is this patient done?"                 │ Terminal                            │
  └─────────────────┴─────────────────────────────────────────────────┴──────────────────┴─────────────────────────────────────────┴─────────────────────────────────────┘

  ---

  4️⃣ Frontend Consumption Rules (NON-NEGOTIABLE)

   1. NEVER Infer Status: Do not assume "Report is ready" just because SAMPLE_COLLECTED happened. Wait for REPORT_READY. The stream is the only truth for these
      milestones.
   2. NEVER Parse `SummaryText`: Do not try to extract amounts or names from the string. The backend owns the formatting. Display it as-is.
   3. Treat `OccurredAt` as Absolute: This timestamp comes from the Transaction Write time. Do not adjust it based on when the frontend received the data.
   4. No Local Sorting: The backend guarantees DESC order. Rely on it.
   5. Ephemeral Data: Do not cache this stream long-term. It is a "Live Activity Feed," not a permanent audit log. Refresh it frequently (e.g., every 30-60s) or on user  
      action.

  ---

  5️⃣ UI-Relevant Guarantees

   * Ordering: Guaranteed DESC by OccurredAt.
   * Concurrency: Two events can share the same timestamp (millisecond precision limits). The frontend lists should respect the array order returned by the API.
   * ActorName: Can be null (e.g., system auto-events). UI must handle null gracefully (e.g., fallback to "System").
   * SummaryText Stability: The format of the text is owned by the backend. It may change (e.g., adding currency symbols) without versioning. Frontend must be
     text-agnostic.
   * Event Exhaustiveness: Only the 7 listed event types are emitted. No "unknown" types will appear currently.

  ---

  6️⃣ Known Gaps & Risk Flags

   * ⚠️ BranchId Fallback: In some flows (e.g., Invoice Service), BranchId is inferred or defaults to "Main" if the Visit entity lacks explicit branch data. This might   
     cause events for sub-branches to appear under "Main" in edge cases.
   * ⚠️ Timezone Day Boundary: The API strictly uses UTC days. A user in IST (UTC+5:30) looking at the screen at 5:00 AM IST (which is 11:30 PM UTC previous day) might   
     see "yesterday's" events until 5:30 AM IST.
       * Risk: Users might ask "Where are the events from this morning?" if "this morning" is still "yesterday" in UTC.
       * Mitigation: Frontend label should clarify "Showing activity for UTC Day" or similar, or just treat it as a "Recent Activity" stream.
   * ⚠️ No Pagination: The limit is hard-coded to 50. High-volume centers might lose visibility of events older than the last 50 in this specific view. This is by design 
     (Situational Awareness ≠ Reporting), but frontend should not promise "Full History" here.