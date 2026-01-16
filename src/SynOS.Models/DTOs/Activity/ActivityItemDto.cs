using System;

namespace SynOS.Models.DTOs.Activity
{
    public class ActivityItemDto
    {
        public Guid EventId { get; set; }
        public DateTime OccurredAt { get; set; } // UTC
        public string ActorName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty; // Semantic: check, alert, user, etc.
        public string Color { get; set; } = string.Empty; // Semantic: success, warning, info
        public string? Token { get; set; }
    }
}