namespace SynOS.Models.Enums
{
    public enum WorkAssignmentStatus
    {
        PendingAssignment, // "Empty Lab" fallback state
        Assigned,
        InProgress,
        Completed,
        Reassigned,
        Cancelled
    }
}
