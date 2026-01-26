SECTION 1 – Discount Master
*   **Entity:** `SynOS.Models.Entities.Discounts.DiscountMaster`
*   **Table:** `DiscountMasters` (implied by convention and migration context).
*   **Columns:**
    *   `Code` (String, Unique)
    *   `Name` (String)
    *   `Value` (Decimal)
    *   `Type` (Enum: Percentage/Flat)
    *   `Scope` (Enum)
    *   `IsActive` (Bool)
    *   `EffectiveFrom` / `EffectiveTo` (DateTime?)
    *   `MaxLimit` (Decimal?)
*   **Management:** Created via `DiscountMasterController` (Admin).

SECTION 2 – Selection Flow
*   **API:** `ReceptionFlowService.StartVisitAsync` (via `ReceptionController`).
*   **Identifier:** `DiscountCode` (String). Passed in `VisitCreateDto`.
*   **Validation:** `VisitService.CreateVisitAsync` validates:
    *   Existence (`FirstOrDefaultAsync`)
    *   `IsActive` check
    *   Date range (`EffectiveFrom`, `EffectiveTo`)
*   **Override:** **No**. Reception cannot override values. The system looks up the Master by Code and uses the Master's `Value`. `DiscountAmount` / `DiscountPercent` in `ReceptionStartVisitRequest` are **ignored** by `CreateVisitAsync` logic (it strictly uses `DiscountCode` lookup).

SECTION 3 – Revenue Engine Math
*   **Method:** `VisitService.RecalculateFinancialsAsync`.
*   **Order:**
    1.  **Gross** = Sum of Order Prices.
    2.  **Discount** = Master.Value (if Flat) OR Gross * (Master.Value / 100).
        *   Capped by `MaxLimit` if present.
        *   Capped by `GrossAmount` (cannot exceed total).
    3.  **Net** = Gross - Discount.
    4.  **Tax** = Net * 0.05 (Hardcoded 5%).
    5.  **Total** = Net + Tax.

SECTION 4 – Persistence & Audit
*   **Storage:**
    *   **Reference:** `DiscountFact` links to `DiscountMaster` via `DiscountDefinitionId`.
    *   **Snapshot:** `DiscountFact` also stores `GrossAmount`, `DiscountAmount`, `NetAmountAfterDiscount`.
    *   **Invoice:** Stores `DiscountAmount` directly.
*   **Mutability:** Yes. `RecalculateFinancialsAsync` recalculates discount on every visit modification (Add/Remove Test).
*   **Audit:** `AuditService` logs `CreateVisit` and updates. `DiscountFact` has `AppliedBy` and `AppliedAt`.

SECTION 5 – Edge Cases
*   **Inactive/Deleted Master:** If a Discount Master becomes inactive/deleted, subsequent recalculations (e.g., adding a test) **silently remove** the discount (revert to 0) because the validation block is skipped.
*   **Data Inconsistency:** In the above case, the `DiscountFact` entity is **NOT** updated to 0. It retains the old snapshot values, while `Invoice.DiscountAmount` becomes 0. This creates a discrepancy between the Fact ledger and the Invoice.
*   **Partial Payment:** Handled correctly (Discount reduces Total; Payment matches against Total).

SECTION 6 – Verdict
*   **Status:** **Correct but risky.**
*   **Reason:** The calculation logic is sound and secure (no frontend overrides). However, the handling of invalidated discounts creates **zombie data** in `DiscountFacts` (facts that don't match the final invoice) and **silent price jumps** for the user if they modify a visit after a discount expires.
