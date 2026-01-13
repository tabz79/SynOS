# SynOS Intelligence Wiring: Final Validation

## 1. Economic Intelligence Layer (Accrual Burden)
*   **Source:** `IHrmsEconomicIntelligenceAdapter`
*   **Inputs:** `PayrollFacts` + `StatutoryObligationFacts`
*   **Mandate:** These facts represent the **Accrual Cost of Labor**. They establish the financial obligation incurred by the organization during a specific period, regardless of when the payment is physically executed. This is the canonical basis for Unit Economics and Cost-per-Test calculations.

## 2. Business Intelligence Layer (Cash Velocity)
*   **Source:** `IHrmsBusinessIntelligenceAdapter`
*   **Inputs:** `SpendFacts` (Filtered by Salary/Contractor channels)
*   **Mandate:** These facts represent **Actual Cash Flow**. They record the physical movement of money out of the organization. This is the canonical basis for Cash-based P&L analysis and Liquidity Forecasting.

## 3. Anti-Duplication Protocol (Double Counting)
*   **Strict Rule:** No intelligence logic or view may sum `PayrollFacts` and `SpendFacts` for the same labor event.
*   **Reasoning:** `PayrollFact` records the **Recognition of Liability**; `SpendFact` records the **Settlement of Liability**. Summing them results in double-counting labor costs (once when owed, once when paid).
*   **Execution Policy:** 
    *   When analyzing **Margins or Resource Burden**, use `PayrollFacts`.
    *   When analyzing **Cash Outflow or Treasury Impact**, use `SpendFacts`.
