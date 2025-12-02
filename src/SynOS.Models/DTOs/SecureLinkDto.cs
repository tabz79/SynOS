namespace SynOS.Models.DTOs;

public sealed record SecureLinkDto(
    string Token,
    string Link,
    DateTimeOffset ExpiresAt,
    int MaxDownloads,
    int DownloadsRemaining
);
