using SynOS.Models.Enums;

namespace SynOS.Models.DTOs;

public sealed record DeliveryAttemptDto(
    DeliveryMethod Method,
    string Recipient,
    int Attempt,
    DateTimeOffset SentAt,
    NotificationStatus Status,
    string? ErrorMessage,
    int RetryCount
);
