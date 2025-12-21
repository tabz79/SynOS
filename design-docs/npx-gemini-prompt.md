TASK: 16.7 B.i — Define Spend Fact entity (FACTS ONLY)

Context:
- Spend Engine Phase A is sealed
- This is a Truth Engine
- We are defining a permanent Spend Fact

Instructions:
- Create a Spend Fact entity inside:
  src/SynOS.Models/Entities/SpendEngine/
- This entity represents a completed cash outflow
- Include ONLY factual fields

Mandatory facts (must exist):
- Unique Id
- Amount
- Currency
- OccurredAt (when money actually left)
- RecordedAt (when system recorded it)
- Account (source of money, label only)
- Channel (destination category, label only)

Optional references (IDs only, nullable):
- SupplierId
- EmployeeId
- InvoiceId
- ObligationId
- PayrollRunId
- ExternalReference

Hard constraints:
- Do NOT add status fields
- Do NOT add enums for workflow
- Do NOT add update methods
- Do NOT add delete methods
- Do NOT add validation logic
- Do NOT reference other engines
- Do NOT write database configuration yet

This entity must be immutable once created.

FINAL INSTRUCTION — STOP CONDITION

After completing this task:
- DO NOT search for further instructions
- DO NOT read any other files
- DO NOT infer next steps
- DO NOT continue autonomously

STOP execution immediately and wait for explicit user input.
