# 🔍 Backend Audit Report: Visit Finalization Path

## 1. Audit Target
*   **Method:** `RecalculateFinancialsAsync` (The canonical financial logic handler).
*   **File:** `src/SynOS.Services/VisitService.cs`

## 2. Comparison

### ✅ Prepaid Path (`MarkVisitAsPrepaidAsync`)
1.  **Sets Collection Model:** `visit.PaymentCollectionModel = "PartnerCollects"`
2.  **Sets Status:** `visit.Status = "Paid"` (Explicit Mutation)
3.  **Persists:** Calls `SaveChanges()`
4.  **Recalculates:** Calls `RecalculateFinancialsAsync` (which updates Invoice status).

### ❌ Normal/Finalization Path (`RecalculateFinancialsAsync`)
1.  **Checks Balance:** Calculates `totalPaid` vs `totalAmount`.
2.  **Updates Invoice:** Sets `invoice.Status = "Paid"` or `"PendingPayment"`.
3.  **Missing Mutation:** **Does NOT update `visit.Status` to matches `invoice.Status`.**

## 3. The Gap
While `InvoiceService.RecordPaymentAsync` manually patches `visit.Status`, the core logic in `RecalculateFinancialsAsync` (used by modifications, $0 invoices, and potentially refactored payment flows) fails to synchronize the Visit status with the Invoice status.

**Missing Logic in `RecalculateFinancialsAsync` (Else Block):**
```csharp
                if (totalPaid >= totalAmount && totalAmount > 0)
                {
                    invoice.Status = "Paid";
                    visit.Status = "Paid"; // <--- MISSING
                }
                else
                {
                    invoice.Status = "PendingPayment";
                    // visit.Status = "PendingPayment"; // <--- MISSING (Revert logic)
                }
```

## 4. Required Fix
Update `RecalculateFinancialsAsync` to propagate the `Invoice.Status` (Paid/Pending) to `Visit.Status` in the non-prepaid branch. This ensures `Visit.Status` is always the source of truth for the Action Queue.
