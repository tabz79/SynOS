using System;

namespace TBZ.Middleware.Domain
{
    public class Lab
    {
        public string Id { get; set; } = string.Empty; // e.g. "LAB001"
        public string LabCode { get; set; } = string.Empty;
        public string LabName { get; set; } = string.Empty;
        public string ApiKeyHash { get; set; } = string.Empty;
        public string Status { get; set; } = "Active"; // "Active", "Suspended"
        public DateTime CreatedAt { get; set; }
        
        public string GeographicalRegion { get; set; } = string.Empty;
        public string ActiveVersion { get; set; } = string.Empty;
        public string HardwareToken { get; set; } = string.Empty;
        public string DotNetVersion { get; set; } = string.Empty;
        public string OSVersion { get; set; } = string.Empty;
        public DateTime? LastSeenAt { get; set; }
        public string RolloutRing { get; set; } = "General"; // "Canary", "Early", "Production"
    }
}
