# Payment Confirmation Boundary - Guardrails

## This Module is **SEALED** and **FACT-ONLY**

*   **Purpose:** To define the immutable `PaymentConfirmedFact` entity and provide a manual, explicit controller for declaring that "money has moved".
*   **Nature:** This boundary is append-only and contains no business logic. It is intentionally NOT a service or an engine.

## 🔒 Hard Constraints

*   **No Business Logic:** This module does not contain validation, inference, aggregation, or any other form of business logic beyond the shape of the DTO and the Fact.
*   **No Engine Triggers:** The components in this module MUST NOT directly trigger the Spend or Revenue engines. Orchestration must happen in a higher, separate layer.
*   **No External Integrations:** Do not add bank, payment gateway, or other external integrations here. This module only records facts that have already been confirmed by external systems.
*   **No `Program.cs` Changes:** Do not add registrations or configurations related to this module to `Program.cs`.
*   **No Service Layer:** The `PaymentDeclarationController` uses `DbContext` directly to prevent this from evolving into a "Payment Engine".