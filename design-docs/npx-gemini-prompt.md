GEMINI PROMPT — IMPLEMENTATION: SPEND ENGINE LINE-ITEM TRUTH (STEP 1)

Objective:
Implement the SpendLineItemFact truth entity inside the Spend Engine, strictly
following the finalized design document.

Scope (STRICT):
- Backend only
- No changes to existing SpendFact behavior
- No changes to Economics or BI layers
- No pricing logic, no inference, no policies

Tasks:

1. Model
- Create SpendLineItemFact.cs under:
  src/SynOS.Models/Entities/SpendEngine/
- Properties (init-only, immutable):
  - SpendLineItemFactId (Guid)
  - SpendFactId (Guid) // opaque reference, NO FK
  - PurchaseOrderItemId (Guid) // opaque reference, NO FK
  - Quantity (decimal)
  - UnitPrice (decimal)
  - Currency (string)
  - OccurredAt (DateTimeOffset)
  - RecordedAt (DateTimeOffset)

2. Persistence
- Add DbSet<SpendLineItemFact> to SynOSDbContext
- Configure table in OnModelCreating
- Constraints:
  - Primary Key only
  - NOT NULL where applicable
  - NO foreign keys
  - NO cascade rules
  - NO computed columns

3. Write Discipline
- Do NOT expose any read APIs
- Do NOT add joins or navigation properties
- Do NOT modify existing SpendFact or SpendService
- Validation rule (write-time only, documented):
  Sum(Quantity × UnitPrice) MUST equal parent SpendFact.Amount

4. Migration
- Generate migration: AddSpendLineItemFact
- Ensure existing data remains valid

5. STOP
- Do not proceed beyond this step
- Await explicit next instruction

Confirm before writing any code.
