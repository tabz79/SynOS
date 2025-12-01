// File: src/SynOS.Models/Entities/ReportSignature.cs
// Author: Gemini
// Date: 2025-11-30

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class ReportSignature
    {
        [Key]
        public Guid ReportSignatureId { get; set; }

        [Required]
        public Guid ReportId { get; set; }

        [ForeignKey("ReportId")]
        public Report? Report { get; set; }

        [Required]
        public Guid SignedByUserId { get; set; }

        [ForeignKey("SignedByUserId")]
        public User? SignedByUser { get; set; }

        [Required]
        public DateTimeOffset SignedAt { get; set; }

        [MaxLength(500)]
        public string? SignatureImageUrl { get; set; }

        [Required]
        [MaxLength(200)]
        public string SignatureHash { get; set; } = string.Empty;

        [Required]
        public int ReportVersion { get; set; } = 1;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
