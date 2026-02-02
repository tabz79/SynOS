namespace SynOS.Models.Enums
{
    public enum BranchEventType
    {
        PATIENT_REGISTERED, // ADDED
        VISIT_STARTED,
        VISIT_UPDATED,
        BILL_GENERATED,
        DISCOUNT_APPLIED, // ADDED
        PAYMENT_RECEIVED,
        RECEIVABLE_CREATED, // ADDED: Stage 1 Financials
        VISIT_FINALIZED,
        VISIT_CORRECTED_AFTER_PAYMENT, // ADDED: Correction System
        MOVED_TO_SAMPLE_COLLECTION,
        SAMPLE_COLLECTED,
        SAMPLE_REJECTED, // ADDED
        RESULT_DRAFT_STARTED, // ADDED: Operations Engine Wiring
        REPORT_READY_FOR_VERIFICATION, // ADDED: Operations Engine Wiring
        REPORT_VERIFIED,
        REPORT_SIGNED, // ADDED
        REPORT_DELIVERED, // ADDED
        REPORT_READY,
        REFERRAL_CORRECTED // ADDED: Correction flow
    }
}
