# Spend Engine - Services Guardrails

## This Module is **SEALED**

This module defines the **persistence service** for the Spend Engine.

- **Purpose:** To provide the single, controlled write gate (`RecordSpendFactAsync`) for persisting `SpendFact` entities.
- **Nature:** The service is write-only and append-only.
- **Allowed Logic:** The service contains ONLY the logic required for insert-only persistence.

## 🔒 Hard Constraints

- **No Business Logic:** No validation, inference, aggregation, approvals, or workflows are allowed.
- **No Engine Triggers:** This service does not trigger other engines.
- **No `Program.cs` Changes:** Do not add global registrations for this service to `Program.cs`. It must remain opt-in and locally orchestrated.
- **No Global Wiring:** This service is not part of any auto-wiring or global service registration scheme.
- **No Updates or Deletes:** The service must not expose any methods or logic for updating or deleting records.
