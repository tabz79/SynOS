✦ 🔒 SynOS Frontend Architecture — EXECUTION PLAN (SEALED DRAFT)

  PURPOSE

  Design an OS-grade frontend architecture for SynOS that:

   * Reflects backend truth without distortion
   * Supports long-hour, high-stakes healthcare operations
   * Preserves auditability, financial correctness, and clinical integrity
   * Remains stable for years without architectural drift

  Frontend is a window, not a brain.

  ---

  1️⃣ Frontend Architectural Layers (LOCKED)

  Frontend SHALL be structured into the following logical layers:

  1. Presentation Layer (Pure UI)

  Responsibilities:

   * Render data exactly as received
   * Display status, timestamps, deltas
   * Apply semantic visual rules

  Prohibitions:

   * No calculations
   * No derived truth
   * No eligibility logic
   * No workflow assumptions

  ---

  2. Data Access & Subscription Layer

  Responsibilities:

   * Fetch backend-exposed resources
   * Subscribe to server updates
   * Handle pagination, retries, timeouts

  Explicit Prohibitions:

   * ❌ No data reshaping
   * ❌ No aggregation across engines
   * ❌ No “smart” fallback logic
   * ❌ No inferred states

  This layer mirrors backend contracts 1:1.

  ---

  3. Intent Dispatch Layer

  Responsibilities:

   * Emit single, atomic user intents
   * Perform explicit confirmation
   * Surface backend acceptance / rejection verbatim

  Rules:

   * One user action → one command
   * No intent chaining
   * No client-side orchestration

  ---

  4. State Reflection Layer

  Definition:
  Frontend state is a reflection of backend facts, never a source of truth.

  Rules:

   * All UI state derives from server responses
   * Pending ≠ completed
   * Rejections are first-class citizens

  No optimistic mutation for financial or clinical actions.

  ---

  2️⃣ Role-Based UI Philosophy (LOCKED)

  Roles in SynOS are lenses, not owners.

  Role Lenses:

   * Filter visibility
   * Enable permitted intents
   * Adjust emphasis — never logic

  Role Lens Examples (Illustrative, Non-Exhaustive)

   * Receptionist: Primary Queues: UnregisteredVisits, PendingPayments. Permitted Intents: CreatePatient, AddTestOrder, RecordPaymentFact.
   * Phlebotomist: Primary Queues: PendingCollections. Permitted Intents: RecordSampleCollection.
   * Pathologist: Primary Queues: UnverifiedResults, FinalizationQueue. Permitted Intents: VerifyResult, FinalizeReport.
   * Radiologist: Primary Queues: UnreportedStudies. Permitted Intents: RecordImpression, SignRadiologyReport.
   * X-Ray / MRI Technician: Primary Queues: ModalityWorklist. Permitted Intents: RecordScanStart, RecordScanComplete.
   * Delivery Desk: Primary Queues: FinalizedReports. Permitted Intents: RecordPhysicalDelivery, TriggerDigitalShare.
   * Inventory Manager: Primary Queues: LowStockFacts, ExpiringLots. Permitted Intents: RecordStockIncrement, RecordWastageFact.
   * HR Manager: Primary Queues: EmployeeRegistry, ActiveLeaveFacts. Permitted Intents: RecordEmployeeIdentity, WriteLeaveFact.
   * Accounts / Finance: Primary Queues: DuePayables, PayrollFactSummaries. Permitted Intents: GroupPaymentBatch, RecordSpendFact.
   * System Admin: Primary Queues: GovernancePolicyFacts, AuditNarratives. Permitted Intents: ModifyAssignment, WriteApprovalRule.

  Hard Rule:

  > Roles do NOT change data shape, data meaning, or workflows.
  > They only control what is visible and which intents are enabled.

  Same facts.
  Different windows.

  ---

  3️⃣ Queue-Driven Interface Model (LOCKED)

  Definition

  Queues are direct visual representations of backend-exposed projections.

  Rules:

   * Queues are backend-defined
   * Frontend renders them verbatim
   * Frontend NEVER creates or reshapes queues

  Principle

  > Users do not navigate to work.
  > Work appears in queues when backend facts allow it.

  Queues drive attention — not navigation flows.

  ---

  4️⃣ OS-Grade UX Principles (2026+)

  1. High Density, Low Noise

   * Information-rich
   * Visually calm
   * No decorative elements

  2. Time-First Design

   * Every fact shows:

     * When it occurred
     * How long it has been pending
     * What it blocks

  Latency & Sync Visibility:
   * UI explicitly displays the fact RecordedAt timestamp.
   * UI displays the LastSynchronized timestamp for the active view.
   * UI distinguishes between “intent accepted but fact not yet written” vs “fact written” using visual state markers.
   * No optimistic UI is used for state transitions.

  Age > priority flags.

  ---

  3. Fatigue-Aware UI

   * Dark mode by default
   * High contrast
   * No unnecessary motion
   * Keyboard-first interaction

  Keyboard-First Support:
   * Primary navigation and high-frequency intents are keyboard-accessible.
   * Keyboard shortcuts serve as accelerators only.
   * Shortcuts map 1:1 to existing intents with no alternate logic.

  Built for hours, not minutes.

  ---

  4. Audit-Forward UX (MANDATORY)

   * Timelines visible by default
   * “Why is this blocked?” always explainable
   * No hidden system decisions

  SynOS assumes audits are inevitable.

  ---

  5️⃣ Interaction & Navigation Model (LOCKED)

  Interaction

   * Buttons represent atomic intents
   * Names are explicit:

     * “Receive Payment”
     * “Mark Sample Collected”
     * “Sign Report”

  Error Surfacing Policy:
   * Truth-blocking errors: Persistent and blocking; must be resolved to clear the UI state.
   * Validation rejections: Rendered as contextual inline messages.
   * Informational rejections: Persistent and non-transient.
   * Financial and clinical integrity errors must never be transient.

  No:

   * Continue
   * Next
   * Proceed

  ---

  Navigation

   * Responds to backend state changes
   * Never assumes success
   * Never guides the user through workflows

  State drives UI.
  Clicks do not.

  ---

  6️⃣ Universal Screen Skeleton (LOCKED)

  This defines the invariant structure shared by all role screens. Roles change what fills the slots, not the slots themselves.

  Mental Model:
  Every screen answers exactly three questions, in this order:
  1. What is true right now?
  2. What needs attention?
  3. Why is it like this?

  Structure:
  1. Global Frame: Top System Bar (Role, Facility, Time, Sync Status, Audit indicator). No interaction logic.
  2. Section 1 — Reality Summary (Read-Only): 3–6 tiles showing pure factual state (e.g., Bills today). Incorporates **Micro-Visuals** (Sparklines, Trend Indicators, Progress Bars) for instant contextual awareness. No buttons.
  3. Section 2 — Action Queues: Core center of gravity. 1:1 backend projections. Prominent age/wait time. Inline atomic intents.
  4. Section 3 — Detail / Audit Panel: Fact timeline and explanations. Expandable but impossible to hide completely. Deep infographics/analytics for intelligence roles live here, contextually bound to the selected item.

  **Dashboard Consolidation:**
  Standalone dashboards are eliminated. The Universal Skeleton *is* the dashboard. The work environment provides the pulse of the system in real-time, removing the cognitive gap between "monitoring" and "executing."

  Enforcement Rule:
  If two role screens look structurally different, the skeleton has been violated.

  ✦ Assessment of "SynOS Universal Screen Skeleton":
  The skeleton is highly compatible with the core architecture. It enforces cognitive discipline and prevents UI clutter. The "Skeleton Enforcement Rule" ensures cross-role consistency and predictable usability.

  Minor Observations:
  * For high-throughput roles, ensure inline actions do not preclude future bulk-intent implementations if backend facts allow.
  * Ensure "Dedicated detail views" do not break queue context; they should augment rather than replace the primary queue view.

  ---

  7️⃣ Visual & Design System Philosophy (LOCKED)

  Color

   * Semantic only:

     * Red → blocked / irreversible
     * Amber → pending
     * Green → finalized
     * Neutral → informational

  No decorative color usage.

  ---

  Typography

   * Monospace → IDs, money, codes
   * Sans-serif → reading
   * Numbers dominate labels

  ---

  Motion

   * Allowed only to signal state change
   * No delight animations
   * No micro-interaction noise

  ---

  “Futuristic” Definition

  > Precision, consistency, speed, and absence of clutter.

  Consistency > novelty.
  The UI must feel the same on day 300.

  ---

  8️⃣ Explicit Anti-Patterns (FORBIDDEN)

  ❌ Client-side calculations (money, tax, inventory, eligibility)
  ❌ Frontend state ownership
  ❌ Role-owned workflows
  ❌ Wizard-based flows
  ❌ Cross-engine summaries
  ❌ Optimistic UI for clinical / financial actions
  ❌ Frontend orchestration (intent chaining, silent auto-actions)

  Violation of any rule is a stop-the-line event.

  ---

  STATUS

   * Frontend architecture defined
   * Backend integrity preserved
   * Safe to proceed to screen design
