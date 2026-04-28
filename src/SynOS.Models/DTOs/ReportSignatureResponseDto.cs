// File: src/SynOS.Models/DTOs/ReportSignatureResponseDto.cs
// Author: Gemini
// Date: 2025-11-30

using System;

namespace SynOS.Models.DTOs
{
    public class ReportSignatureResponseDto
    {
        public Guid ReportId { get; set; }
        public Guid SignedByUserId { get; set; }
        public DateTimeOffset SignedAt { get; set; }
        public string? SignatureHash { get; set; }
        public string? ContentHash { get; set; }
        public string Status { get; set; } = string.Empty;
        public int ReportVersion { get; set; }
    }
}
