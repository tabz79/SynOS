using System;

namespace SynOS.Models.Events
{
    public record PatientRegisteredEvent(
        Guid PatientId,
        string FirstName,
        string LastName,
        string MRN,
        string Gender,
        DateTime DateOfBirth,
        string CurrentPhoneNumber,
        Guid? BranchId = null,
        string? PatientLocation = null,
        string? PatientPincode = null
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "PatientRegistered";
        public string AggregateType => "Patient";
        public string AggregateId => PatientId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record BillCreatedEvent(
        Guid InvoiceId,
        Guid VisitId,
        decimal GrossAmount,
        decimal DiscountAmount,
        decimal NetAmount,
        decimal TaxAmount,
        decimal Total,
        string Status,
        DateTime DueDate,
        Guid? BranchId,
        string? Gender = null,
        DateTime? DateOfBirth = null,
        Guid? ReferringDoctorId = null,
        string? ReferringDoctorName = null,
        Guid? ReferralPartnerId = null,
        string? ReferralPartnerName = null,
        string? ReferralPartnerLocation = null,
        string? PatientLocation = null,
        string? PatientPincode = null
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "BillCreated";
        public string AggregateType => "Invoice";
        public string AggregateId => InvoiceId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record PaymentReceivedEvent(
        Guid PaymentId,
        Guid InvoiceId,
        Guid VisitId,
        decimal Amount,
        string Method,
        Guid ReceivedByUserId,
        DateTime ReceivedAt,
        Guid? BranchId,
        string? Gender = null,
        DateTime? DateOfBirth = null,
        Guid? ReferringDoctorId = null,
        string? ReferringDoctorName = null,
        Guid? ReferralPartnerId = null,
        string? ReferralPartnerName = null,
        string? ReferralPartnerLocation = null,
        string? PatientLocation = null,
        string? PatientPincode = null
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "PaymentReceived";
        public string AggregateType => "Payment";
        public string AggregateId => PaymentId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record SampleCollectedEvent(
        Guid SpecimenId,
        Guid VisitId,
        string AccessionNumber,
        string SpecimenTypeCode,
        DateTime? CollectedAt,
        Guid? CollectedByUserId,
        Guid? BranchId
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "SampleCollected";
        public string AggregateType => "Specimen";
        public string AggregateId => SpecimenId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record ProcessingStartedEvent(
        Guid OrderId,
        Guid VisitId,
        Guid TestId,
        string TestCode,
        string Department,
        string Status,
        DateTime StartedAt,
        Guid? BranchId,
        string? Gender = null,
        DateTime? DateOfBirth = null,
        Guid? ReferringDoctorId = null,
        string? ReferringDoctorName = null,
        Guid? ReferralPartnerId = null,
        string? ReferralPartnerName = null,
        string? ReferralPartnerLocation = null,
        string? PatientLocation = null,
        string? PatientPincode = null
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "ProcessingStarted";
        public string AggregateType => "Order";
        public string AggregateId => OrderId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record ReportDraftedEvent(
        Guid ReportId,
        Guid VisitId,
        Guid PatientId,
        string Department,
        string SourceType,
        Guid SourceId,
        string Status,
        Guid? BranchId,
        string? Gender = null,
        DateTime? DateOfBirth = null,
        Guid? ReferringDoctorId = null,
        string? ReferringDoctorName = null,
        Guid? ReferralPartnerId = null,
        string? ReferralPartnerName = null,
        string? ReferralPartnerLocation = null,
        string? PatientLocation = null,
        string? PatientPincode = null
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "ReportDrafted";
        public string AggregateType => "Report";
        public string AggregateId => ReportId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record ReportSignedEvent(
        Guid ReportId,
        Guid VisitId,
        Guid PatientId,
        string Department,
        string Status,
        Guid? SignedByUserId,
        DateTimeOffset? SignedAt,
        Guid? BranchId,
        string? Gender = null,
        DateTime? DateOfBirth = null,
        Guid? ReferringDoctorId = null,
        string? ReferringDoctorName = null,
        Guid? ReferralPartnerId = null,
        string? ReferralPartnerName = null,
        string? ReferralPartnerLocation = null,
        string? PatientLocation = null,
        string? PatientPincode = null
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "ReportSigned";
        public string AggregateType => "Report";
        public string AggregateId => ReportId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record ReportDeliveredEvent(
        Guid ReportId,
        Guid LogId,
        string Method,
        string? RecipientPhone,
        string? RecipientEmail,
        DateTimeOffset DeliveredAt,
        Guid DeliveredBy,
        Guid? BranchId
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "ReportDelivered";
        public string AggregateType => "Report";
        public string AggregateId => ReportId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }

    public record WhatsappDeliveryRequestedEvent(
        Guid QueueId,
        Guid TargetId,
        string Recipient,
        string Content,
        string Status,
        DateTimeOffset CreatedAt,
        Guid? BranchId
    ) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public string EventType => "WhatsappDeliveryRequested";
        public string AggregateType => "NotificationQueue";
        public string AggregateId => QueueId.ToString();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public object Payload => this;
    }
}
