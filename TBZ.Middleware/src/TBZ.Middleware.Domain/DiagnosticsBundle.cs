using System;

namespace TBZ.Middleware.Domain
{
    public class DiagnosticsBundle
    {
        public Guid Id { get; set; }
        public string LabId { get; set; } = string.Empty;
        public string Status { get; set; } = "Processing"; // "Processing", "Ready", "Failed"
        public string? FolderPath { get; set; }
        public string? ErrorMessage { get; set; }
        public int ReceivedChunks { get; set; }
        public int TotalChunks { get; set; }
        public long BundleSizeBytes { get; set; }
        public string? ChecksumSha256 { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}
