using SynOS.Models.Enums;
using System.Collections.Generic;

namespace SynOS.Services.Operational
{
    public class VisitLifecyclePolicy : IVisitLifecyclePolicy
    {
        public bool CanResume(VisitStatus status)
        {
            // ONLY resume visits that are in-progress.
            // NEVER resume terminal visits (Paid, FullPaid, Completed, etc.)
            return status == VisitStatus.Draft ||
                   status == VisitStatus.PendingPayment ||
                   status == VisitStatus.PartialPayment;
        }

        public bool IsTerminal(VisitStatus status)
        {
            // Terminal states represent "Finished" operational/financial work.
            return status == VisitStatus.Paid ||
                   status == VisitStatus.FullPaid ||
                   status == VisitStatus.Completed ||
                   status == VisitStatus.Finalized ||
                   status == VisitStatus.Cancelled ||
                   status == VisitStatus.Refunded ||
                   status == VisitStatus.Reversed ||
                   status == VisitStatus.Voided;
        }

        public bool ShouldAppearInLiveQueue(VisitStatus status)
        {
            // Operational relevance: show everything except accounting/archived states.
            // Note: In the new "Date-based" queue, this is a secondary filter.
            return status != VisitStatus.Reversed &&
                   status != VisitStatus.Voided;
        }

        public bool CanAcceptPayment(VisitStatus status)
        {
            // Can't pay if already fully paid or canceled.
            return status != VisitStatus.Paid &&
                   status != VisitStatus.FullPaid &&
                   status != VisitStatus.Cancelled &&
                   status != VisitStatus.Voided &&
                   status != VisitStatus.Reversed;
        }

        public bool IsEditable(VisitStatus status)
        {
            // Tests can only be modified in Draft or PendingPayment.
            // Once paid or in phlebotomy, we use Correction Flow (later).
            return status == VisitStatus.Draft ||
                   status == VisitStatus.PendingPayment;
        }

        public List<VisitStatus> GetTerminalStatuses()
        {
            return new List<VisitStatus>
            {
                VisitStatus.Paid,
                VisitStatus.FullPaid,
                VisitStatus.Completed,
                VisitStatus.Finalized,
                VisitStatus.Cancelled,
                VisitStatus.Refunded,
                VisitStatus.Reversed,
                VisitStatus.Voided
            };
        }
    }
}
