namespace SynOS.Models.Enums
{
    public enum BranchEventType
    {
        VISIT_STARTED,
        BILL_GENERATED,
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
