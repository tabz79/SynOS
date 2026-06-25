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
    }
}
