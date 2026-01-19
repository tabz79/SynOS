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
        VISIT_FINALIZED,
        MOVED_TO_SAMPLE_COLLECTION,
        SAMPLE_COLLECTED,
        SAMPLE_REJECTED, // ADDED
        REPORT_VERIFIED,
        REPORT_SIGNED, // ADDED
        REPORT_DELIVERED, // ADDED
        REPORT_READY
    }
}
