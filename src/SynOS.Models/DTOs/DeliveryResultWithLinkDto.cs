namespace SynOS.Models.DTOs;

public sealed record DeliveryResultWithLinkDto(
    Guid LogId,
    string Status,
    string Link,
    string Token,
    DateTimeOffset ExpiresAt
);
