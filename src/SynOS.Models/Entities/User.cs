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
        public int UserId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? LockoutEnd { get; set; }

        // RowVersion for optimistic concurrency
        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public ICollection<UserRole> UserRoles { get; set; }
        public ICollection<RefreshToken> RefreshTokens { get; set; }
        public ICollection<AuditLog> AuditLogs { get; set; }
    }
}
