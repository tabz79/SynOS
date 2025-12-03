namespace SynOS.Models.DTOs.Notifications;

public sealed record NotificationSendResult(
    bool Success,
    string? ProviderMessageId,
    string? ErrorMessage,
    string? RawResponseJson
);
