namespace SynOS.Models.DTOs.Notifications;

public sealed record EmailPayload(
    string Subject,
    string HtmlBody,
    string? AttachmentPath
);
