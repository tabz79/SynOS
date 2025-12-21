# Spend Engine Guardrails - Phase A (SEALED)

## This is a **Truth Engine**

*   **Purpose:** Records completed cash outflows only.
*   **Nature:** It is **write-only**.
*   **Immutability:** No updates or deletes are allowed (it is append-only). Corrections must be new entries.
*   **Logic Constraint:** No business logic is allowed within this engine.
*   **Forbidden Features:** No analytics, allocation, approvals, or workflows are allowed.
*   **Ownership:** Other modules may trigger spends but must not own the process of recording them here.

**Do NOT add code logic.**
**Do NOT modify existing classes.**
**Do NOT add new services or interfaces.**
**Do NOT touch Program.cs.**
**Do NOT reference Inventory, Cost Attribution, Revenue, or IMS.**
