using System;

namespace SynOS.Models.Enums
{
    public enum VisitStatus
    {
        Draft,
        PendingPayment,
        Paid,
        FullPaid,
        PartialPayment,
        Cancelled,
        InPhlebotomy,
        InLab,
        Completed,
        Finalized
    }
}
