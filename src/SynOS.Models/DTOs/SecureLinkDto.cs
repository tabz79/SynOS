namespace SynOS.Models.DTOs;

public sealed record SecureLinkDto(
    string Token,
    string Link, // This will be the PDF-only link
    string PackageLink, // New property for the ZIP package link
    DateTimeOffset ExpiresAt,
    int MaxDownloads,
    int DownloadsRemaining
);
