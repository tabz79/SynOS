Backend Readiness Audit — SynOS

1. Payment Modeling
   - Current State: Payments are modeled as a mutable collection of `Payment` entities within an `Invoice`. A separate `PaymentConfirmedFact` exists in the Economics namespace but appears isolated from the core Visit/Invoice transaction flow.
   - Gaps: No unified `PaymentFact` in the core operational domain. Financial truth relies on the mutable `Payment` entity list inside `Invoice`, which lacks immutable audit characteristics for reception workflows.

2. Payment Methods
   - Current State: `Payment.Method` is a raw `string`, despite a `PaymentMethod` Enum existing. Logic relies on string comparisons (e.g., `!= "PartnerAccount"`).
   - Gaps: Explicit Method modeling is weak. "Online" is not a first-class citizen and likely requires string inference or frontend logic to aggregate "UPI + Card".

3. Prepaid Handling
   - Current State: "Prepaid" is handled by setting `PaymentCollectionModel = "PartnerCollects"` and instantly marking the visit as `Paid`.
   - Gaps: **Design Gap.** Prepaid is treated as "Assumed Paid" by the Partner. There is no tracking of the actual money collection event if the collection is deferred or asynchronous. The system assumes the Partner *has* collected it.

4. Operational Stats Pipeline
   - Current State: Stats are computed via `OperationalStatsProjector` listening to `BranchOperationalEvents`.
     - **Walk-ins:** Incremented on `VISIT_STARTED` (Creation time).
     - **Payments:** Incremented on `PAYMENT_RECEIVED` (Event driven).
   - Gaps: None critical. The definition (Walk-in = Created) aligns with standard reception volume tracking.

5. Role Scoping
   - Current State: `UserOperationalStats` table keys statistics by `UserId` + `BranchId` + `Date`. Dashboard fetches based on `_userContext.CurrentUserId`.
   - Gaps: None. The backend correctly distinguishes between different receptionists' collections.

6. Real-Time Capability
   - Current State: `OperationalStatsProjector` calls `_notificationService.NotifyReceptionSummaryUpdateAsync` immediately after processing an event transaction.
   - Gaps: The pipeline exists and is reusable. No gap.

Final Verdict:
- **PARTIALLY READY**
- **Justification:** The operational stats and role scoping are solid and ready for real-time tiles. However, the core Payment Modeling relies on mutable entities and string-based methods, creating a risk for accurate financial reporting ("Online" vs "Cash"). Additionally, the "Prepaid" logic is a simple state switch ("Assumed Paid") rather than a traceable financial lifecycle, which may hide uncollected revenue.
