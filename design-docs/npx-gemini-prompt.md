NEXT TASK: IMPLEMENTATION 16.6 I-5 — Cleanup & Decoupling (NO behavior change)

Context:
- 16.6 I-4 spike is complete and builds successfully.
- The current implementation is functionally correct but architecturally provisional.

Objective:
Refactor the existing wiring to reduce coupling and fix semantics,
WITHOUT changing runtime behavior or outputs.

Rules:
- Do NOT change logic or add new features
- Do NOT touch Program.cs
- Do NOT add new engines
- Do NOT change database schema
- Do NOT change UsageFact contents

Required Fixes:
1. Remove manual LoggerFactory creation.
2. Stop manually instantiating services inline where possible.
3. Correct SourceEventId to represent a true TestExecution identity (not OrderId).
4. Isolate Cost Attribution triggering into a dedicated private orchestrator
   that ResultService merely calls.

Deliver:
- Exact code changes
- Before vs after explanation
- Confirmation that behavior is unchanged

STOP after refactor.
