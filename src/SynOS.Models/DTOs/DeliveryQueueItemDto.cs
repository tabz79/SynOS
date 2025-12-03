using SynOS.Models.Enums;

namespace SynOS.Models.DTOs;

public sealed record DeliveryQueueItemDto(
    Guid ReportId,
    string TokenNumber,
    string PatientName,
    int Age,
    string Sex,
    string? PatientPhone,
    string? PatientEmail,
    List<string> Tests,
    DateTimeOffset SignedAt,
    int CriticalCount,
    string PdfUrl,
    DeliveryMethod? LastDeliveryMethod,
    DeliveryStatus? LastDeliveryStatus
);
