using System;

namespace TBZ.Middleware.Domain
{
    public class ProjectionCheckpoint
    {
        public string ProjectionName { get; set; } = string.Empty; // Primary Key
        public long LastProcessedSequence { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
