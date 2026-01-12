You are designing a SINGLE TRUTH RECORD for SynOS.

Context:
System: SynOS
Module: 6 — Payments & Disbursement

Modules 1–6 are architecturally defined.
This task is NOT about workflows or execution.
This task is about the FINAL, IMMUTABLE FACT.

────────────────────────
LOCKED CONTEXT
────────────────────────

• Spend Fact is a TRUTH ENGINE record
• It represents that money actually left the organization
• It is APPEND-ONLY and IMMUTABLE
• It is written ONLY after a successful payment attempt
• It must be auditable years later

Spend Fact:
- Consumes Payroll Facts indirectly
- Is consumed later by Compliance, Audit, Intelligence

────────────────────────
OBJECTIVE
────────────────────────

Define the **Spend Fact structure**.

Fields ONLY.
No logic.
No calculations.
No UI.
No retries.
No balances.

────────────────────────
DESIGN CONSTRAINTS
────────────────────────

Spend Fact MUST:
• Be immutable
• Be self-describing
• Allow full audit trace (who was paid, why, how, when)
• Link back to Payroll without recalculating anything

Spend Fact MUST NOT:
• Store derived balances
• Store payroll calculations
• Reference Time or Leave
• Mutate or overwrite past facts

────────────────────────
REQUIRED OUTPUT (STRICT)
────────────────────────

Return ONLY:

1. SpendFact — Field List
   - Each field name
   - One-line explanation of why it exists

2. Mandatory Linkages
   - Which upstream records it must reference
   - Why those references are required

3. Fields that are EXPLICITLY NOT allowed
   - And why they would be dangerous

Use PRESENT TENSE.
Write as FINAL DESIGN.
Do NOT ask questions.
Do NOT propose alternatives.
