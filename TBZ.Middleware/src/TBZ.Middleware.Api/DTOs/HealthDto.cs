using System;
using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class HealthDto
    {
        public string LabId { get; set; } = string.Empty;
        public int PendingOutboxEvents { get; set; }
        public int DeadLetterEvents { get; set; }
        public DateTime? LastEventReceived { get; set; }
        public DateTime? LastProjectionTime { get; set; }
        public List<WorkerHealthDto> Workers { get; set; } = new();
    }

    public class WorkerHealthDto
    {
        public string WorkerName { get; set; } = string.Empty;
        public long LastProcessedSequence { get; set; }
        public DateTime LastUpdatedAtUtc { get; set; }
        public bool IsHealthy { get; set; }
    }
}
