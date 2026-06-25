using System;

namespace TBZ.Middleware.Domain
{
    public class DeliveryFact
    {
        public Guid ReportId { get; set; } // Primary Key
        public Guid PatientId { get; set; }

        public string? DeliveryMethod { get; set; } // e.g. "WhatsApp", "Email", "Print"

        public DateTime? RequestedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }

        public string Status { get; set; } = "Pending"; // "Pending", "Delivered"

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
