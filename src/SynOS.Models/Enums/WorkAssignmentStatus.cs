namespace SynOS.Models.Enums
{
    public enum WorkAssignmentStatus
    {
        PendingAssignment, // "Empty Lab" fallback state
        PendingClaim,      // Manual claim queue
        Assigned,

        InProgress,
        Completed,
        Reassigned,
        Cancelled
    }
}
