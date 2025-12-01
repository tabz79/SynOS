// File: src/SynOS.Models/DTOs/UserSignatureDto.cs
// Author: Gemini
// Date: 2025-11-30

using System;

namespace SynOS.Models.DTOs
{
    public class UserSignatureDto
    {
        public Guid UserId { get; set; }
        public string? SignatureImageUrl { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
