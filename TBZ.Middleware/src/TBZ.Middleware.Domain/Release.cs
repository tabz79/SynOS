using System;

namespace TBZ.Middleware.Domain
{
    public class Release
    {
        public Guid Id { get; set; }
        public string Version { get; set; } = string.Empty; // Unique
        public string ReleaseNotes { get; set; } = string.Empty;
        public string RolloutRing { get; set; } = "Production"; // "Canary", "Early", "Production"
        public int CanaryPercentage { get; set; } = 100;
        public string Status { get; set; } = "Draft"; // "Draft", "Beta", "Stable", "Deprecated", "Paused", "Cancelled"
        public DateTime CreatedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
    }
}
