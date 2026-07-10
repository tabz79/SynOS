using System;

namespace TBZ.Middleware.Domain
{
    public class Deployment
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public Guid ReleaseId { get; set; }
        public string Status { get; set; } = "Pending"; // "Pending", "Downloading", "Installing", "Success", "Failed", "RolledBack", "Cancelled"
        public DateTime StartedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
