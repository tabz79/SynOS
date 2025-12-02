namespace SynOS.Models.DTOs;

public sealed record SecureLinkVerificationDto(
    bool Valid,
    string PatientName,
    List<string> Tests,
    DateTimeOffset ExpiresAt,
    int DownloadsRemaining
);
