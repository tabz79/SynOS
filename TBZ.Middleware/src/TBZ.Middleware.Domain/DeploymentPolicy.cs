using System;

namespace TBZ.Middleware.Domain
{
    public class DeploymentPolicy
    {
        public Guid Id { get; set; }
        public Guid ReleaseId { get; set; }
        public int DeploymentTimeoutSeconds { get; set; } = 600;
        public int HeartbeatTimeoutSeconds { get; set; } = 300;
        public double RollbackThresholdPercentage { get; set; } = 5.0;
    }
}
