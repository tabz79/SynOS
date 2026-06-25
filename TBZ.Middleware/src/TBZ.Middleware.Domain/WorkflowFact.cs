using System;

namespace TBZ.Middleware.Domain
{
    public class WorkflowFact
    {
        public Guid VisitId { get; set; } // Primary Key
        public Guid PatientId { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string? BranchId { get; set; }

        public DateTime? PatientRegisteredAt { get; set; }
        public DateTime? VisitCreatedAt { get; set; }
        public DateTime? PaymentReceivedAt { get; set; }
        public DateTime? SampleCollectedAt { get; set; }
        public DateTime? ProcessingStartedAt { get; set; }
        public DateTime? ReportSignedAt { get; set; }
        public DateTime? ReportDeliveredAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
