namespace SynOS.Models.Enums
{
    public enum OrderStatus
    {
        Pending = 0,   // Created, billable, not yet operational
        Active = 1,    // In progress
        Cancelled = 2, // Removed/Void
        Collected = 3, // Sample collected
        Completed = 4  // Resulted
    }
}
