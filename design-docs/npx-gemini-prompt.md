TASK: 16.7 B.iii — Allowed & forbidden references (FACT DISCIPLINE)

Context:
- SpendFact is an immutable Truth Engine fact
- Fields and constructor are already finalized
- This task is documentation-only

Instructions:
- Update ONLY SpendFact.cs
- Do NOT add or remove fields
- Do NOT change constructor or access modifiers

Add explicit documentation (XML comments or remarks) that states:

ALLOWED REFERENCES (FACT-LEVEL, ID ONLY):
- SupplierId
- EmployeeId
- InvoiceId
- ObligationId
- PayrollRunId
- ExternalReference

FORBIDDEN REFERENCES (MUST NEVER EXIST HERE):
- TestId
- TestExecutionId
- InventoryItemId
- InventoryLotId
- Cost Attribution facts
- Revenue records
- Pricing or rate configuration
- Analytics or reporting models

Clarify in comments:
- SpendFact represents money outflow only
- Resource usage attribution belongs to Cost Attribution Engine
- Physical movement belongs to Inventory Engine
- Profit, margins, and unit economics belong to read layers

Hard constraints:
- Documentation only
- No logic
- No cross-engine references in code
- Do NOT run dotnet build

FINAL INSTRUCTION — STOP CONDITION

After completing this task:
- DO NOT modify any other files
- DO NOT infer next steps
- DO NOT continue autonomously

STOP execution immediately and wait for explicit user input.
