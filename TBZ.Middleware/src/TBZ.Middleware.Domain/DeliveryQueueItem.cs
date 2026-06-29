using System;

namespace TBZ.Middleware.Domain
{
    public class DeliveryQueueItem
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string MessageType { get; set; } = string.Empty;
        public string PayloadJson { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // "Pending", "Sent", "Failed"
        public DateTime CreatedAt { get; set; }
        public DateTime? SentAt { get; set; }

        // WhatsApp Manager V1 Fields
        public Guid? PatientId { get; set; }
        public Guid? VisitId { get; set; }
        public Guid? ReportId { get; set; }
        public string? TemplateName { get; set; }
        public string? TriggerEvent { get; set; }
        public int RetryCount { get; set; } = 0;
        public string? FailureReason { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public string Provider { get; set; } = "Meta"; // Meta, Twilio, Gupshup, etc.
        public string? ProviderMessageId { get; set; }
        public string Channel { get; set; } = "Operational"; // Operational, Marketing
    }
}
