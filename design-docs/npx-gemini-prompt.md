You are in IMPLEMENTATION MODE.

IMPORTANT RULES:
- Modify ONLY BusinessIntelligenceService.cs (or the exact BI service that aggregates revenue metrics).
- Do NOT change any existing calculations.
- Do NOT remove existing logic.
- Do NOT touch EconomicsIntelligence.
- This step is ADDITIVE only.

GOAL (STEP 10):
Expose discount metrics in Business Intelligence using Discount Interpretation Layer.

TASKS:

1. Inject IDiscountInterpretationService into BusinessIntelligenceService
   - Constructor injection only
   - Do NOT remove or reorder existing dependencies

2. Identify the main BI summary method
   (e.g., GetOverallSummaryAsync or equivalent)

3. Using IDiscountInterpretationService:
   - Call GetDiscountSummaryAsync(from, to)
   - Retrieve:
     - TotalDiscountAmount
     - DiscountCount

4. Add these values to the BI response model
   - As NEW optional fields
   - Do NOT alter existing fields or meanings

   Example fields (names flexible):
   - TotalDiscountGiven
   - DiscountTransactionCount

5. Do NOT:
   - Join DiscountFacts directly
   - Read DbContext for discounts
   - Recalculate net revenue
   - Modify Econ-related outputs

6. Economics Intelligence:
   - Leave completely untouched
   - No new injections
   - No changes

7. Output:
   - Show ONLY the modified parts of BusinessIntelligenceService.cs
   - Show ONLY the modified parts of any BI DTOs (if extended)
   - No explanations
   - No commentary

REMINDER:
BI consumes interpretation.
Econ consumes derived revenue deltas indirectly.
