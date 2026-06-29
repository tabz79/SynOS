using System.Collections.Generic;

namespace TBZ.Middleware.Application.DTOs
{
    public class NotificationRequest
    {
        public string Recipient { get; set; } = string.Empty;
        public string TemplateName { get; set; } = string.Empty;
        public Dictionary<string, string> Variables { get; set; } = new();
        public string? CorrelationId { get; set; }
        public string LabId { get; set; } = string.Empty;
    }
}
