using System;

namespace TBZ.Middleware.Domain
{
    public class DeploymentEvent
    {
        public Guid Id { get; set; }
        public Guid DeploymentId { get; set; }
        public string EventType { get; set; } = string.Empty; // e.g. "Downloading", "Staged", "Installing", "Healthy", "Completed", "Failed", "RolledBack"
        public DateTime OccurredAt { get; set; }
        public string? PayloadJson { get; set; }
    }
}
