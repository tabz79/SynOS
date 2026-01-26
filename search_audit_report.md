# 🔍 System Search Audit Report (SynOS)

## 1. Executive Summary
SynOS currently **lacks a unified System Search**. Existing functionality is limited to **localized retrieval patterns** (queries) within specific modules. This absence is architecturally healthy as it provides a clean slate, avoiding the need to dismantle legacy, tightly-coupled search implementations.

## 2. Current "Search" Landscape (Ground Truth)
### A. No True Search
There is no central engine interpreting user intent. What exists are rigid, parameterized queries:
*   **Fetch-by-ID:** `visitId`, `invoiceId`.
*   **Token Lookup:** `AP-004`.
*   **Date-Bounded:** "Today's Action Queue".
*   **Role-Scoped:** Activity Stream logs.

### B. Implicit Search Behavior
Users currently perform "search" by navigating to specific modules and using constrained filters:
*   **Reception:** Navigates to Visit List -> Filters by Token/Name.
*   **Lab/Ops:** Navigates to Sample List -> Filters by Status.
*   **Admin:** Navigates to Audit Logs -> Filters by Time/User.

**Key Insight:** Users are asking questions, but the system forces them to pick the "room" (module) before asking the question.

## 3. Security & Permission Model Audit
*   **Current Enforcement:** Visibility is binary, enforced at the **Controller Endpoint** level via `[Authorize(Policy = "...")]`.
*   **Mechanism:** JWT Claims (`role`, `branch_id`).
*   **Risk:** There is **no shared permission logic** for data retrieval.
    *   *Reception Endpoint* knows how to filter Visits for Reception.
    *   *Lab Endpoint* knows how to filter Samples for Lab.
*   **Implication for Search:** A unified search cannot simply "query all tables" because it lacks a centralized logic to apply these diverse, module-specific visibility rules. Building a naïve global search poses a high risk of **Data Leakage**.

## 4. Architectural Placement & Risks
### A. Where Search Must Live
To avoid coupling, the Search Engine must act as a **Query Interpreter**, not a Data Owner.
*   **Above:** Feature Modules (Reception, Lab, Billing).
*   **Below:** Auth/Role Resolution.
*   **Function:** It should translate "User Intent" + "User Context" into specific queries to the relevant subsystems.

### B. Critical Risks (Non-Negotiable)
1.  **Leakage:** Bypassing module-specific filters (e.g., Receptionist seeing Lab-only internal notes).
2.  **Duplication:** Re-implementing filtering logic inside the Search engine instead of reusing domain logic.
3.  **Frontend Logic:** Allowing the frontend to interpret "what this string means" (violates the "Frontend is a Renderer" principle).
4.  **Operational Dependency:** Turning Search into a "Queue" where users manage daily work, rather than a retrieval tool.

## 5. Conclusion
The system is ready for a unified search layer. The foundation (clean Action Queues, strong Auth) is solid. The primary challenge is implementing a **"Search Brain"** that respects the existing endpoint-based security model without duplicating it.
