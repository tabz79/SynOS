using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SynOS.Models.Entities
{
    public class RefreshToken
    {
        [Key]
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime Expires { get; set; }
        public bool IsExpired => DateTime.UtcNow >= Expires;
        public DateTime Created { get; set; }
        public string CreatedByIp { get; set; } = string.Empty;
        public DateTime? Revoked { get; set; }
        public string RevokedByIp { get; set; } = string.Empty;
        public string ReplacedByToken { get; set; } = string.Empty;
        public string? SessionMode { get; set; } // ADDED for Phase 1B
        public bool IsActive => Revoked == null && !IsExpired;

        public Guid UserId { get; set; }
        [ForeignKey("UserId")]
        public User? User { get; set; }
    }
}
