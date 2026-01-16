using System;
using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.ReadModels
{
    public class BranchOperationalEvent
    {
        [Key]
        public Guid EventId { get; set; }
        public string EventType { get; set; } = string.Empty;
        public DateTime OccurredAt { get; set; }
        public string ActorType { get; set; } = string.Empty; // "User" | "System"
        public string? ActorName { get; set; }
        public string BranchId { get; set; } = string.Empty;
        public string VisitId { get; set; } = string.Empty;
        public string TokenId { get; set; } = string.Empty;
        public string SummaryText { get; set; } = string.Empty;
        
        public Guid? SourceId { get; set; } // ADDED: For strict entity lookup
        public string? SourceType { get; set; } // ADDED: e.g. "Payment", "Report"
    }
}
