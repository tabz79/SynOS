using System;

namespace TBZ.Middleware.Domain
{
    public class SupportTicket
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "Medium";
        public string Category { get; set; } = "General";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Guid? DiagnosticBundleId { get; set; }
        public string Status { get; set; } = "Created";
        public Guid? SupportCaseId { get; set; }
    }
}
