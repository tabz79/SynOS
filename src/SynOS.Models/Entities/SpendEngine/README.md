# Spend Engine - Models Guardrails

## This Module is **SEALED**

This module defines the **immutable facts** for the Spend Engine.

- **Purpose:** To define the structure of a `SpendFact` as a write-only, append-only truth record.
- **Contents:** Contains ONLY the `SpendFact` entity, which is immutable by design.
- **Evolution:** The structure is considered final. No new fields, logic, or entities should be added without formal architectural review.

## 🔒 Hard Constraints

- **No Business Logic:** No validation, inference, aggregation, or any other form of business logic is allowed.
- **No Engine Triggers:** The entities in this module MUST NOT trigger other engines.
- **No `Program.cs` Changes:** Do not add registrations or configurations related to this module to `Program.cs`.
- **No Global Wiring:** This module and its contents are not part of any auto-wiring or global service registration scheme.
