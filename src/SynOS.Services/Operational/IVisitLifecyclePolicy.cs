using SynOS.Models.Enums;
using System.Collections.Generic;

namespace SynOS.Services.Operational
{
    public interface IVisitLifecyclePolicy
    {
        /// <summary>
        /// Determines if a visit can be resumed in the Reception/Intake panel.
        /// </summary>
        bool CanResume(VisitStatus status);

        /// <summary>
        /// Determines if a visit has reached a terminal operational state.
        /// </summary>
        bool IsTerminal(VisitStatus status);

        /// <summary>
        /// Determines if a visit should appear in the Live Operational Queue today.
        /// </summary>
        bool ShouldAppearInLiveQueue(VisitStatus status);

        /// <summary>
        /// Determines if a visit can accept payments in its current state.
        /// </summary>
        bool CanAcceptPayment(VisitStatus status);

        /// <summary>
        /// Determines if tests can be added or modified for this visit.
        /// </summary>
        bool IsEditable(VisitStatus status);
        /// <summary>
        /// Returns a list of statuses that are considered terminal.
        /// </summary>
        List<VisitStatus> GetTerminalStatuses();
    }
}
