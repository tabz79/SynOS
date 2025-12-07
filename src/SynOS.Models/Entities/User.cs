// File: src/SynOS.Models/Entities/User.cs
// Author: Gemini
// Date: 2025-11-13

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class User
    {
        [Key]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)] // Assuming max length for designation
        public string? Designation { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? LockoutEnd { get; set; }

        // New properties for signature
        [MaxLength(500)]
        public string? SignatureImageUrl { get; set; }
        public DateTimeOffset? SignatureUpdatedAt { get; set; }

        // RowVersion for optimistic concurrency
        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
        public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>(); // Added for FK from Payment
        public ICollection<VisitCancellation> VisitCancellations { get; set; } = new List<VisitCancellation>(); // Added for FK from VisitCancellation
    }
}
