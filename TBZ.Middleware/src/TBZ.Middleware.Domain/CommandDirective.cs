using System;

namespace TBZ.Middleware.Domain
{
    public class CommandDirective
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string CommandType { get; set; } = string.Empty;
        public string PayloadJson { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // "Pending", "Dispatched", "Executed", "Failed"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DispatchedAt { get; set; }
        public DateTime? ExecutedAt { get; set; }
    }
}
