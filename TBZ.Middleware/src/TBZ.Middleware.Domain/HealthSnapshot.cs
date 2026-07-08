using System;

namespace TBZ.Middleware.Domain
{
    public class HealthSnapshot
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public double CpuUsagePercent { get; set; }
        public double MemoryUsageMB { get; set; }
        public double DiskFreeSpaceGB { get; set; }
        public int PendingOutboxCount { get; set; }
        public int DeadLetterCount { get; set; }
    }
}
