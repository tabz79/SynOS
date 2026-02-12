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
        
        public Guid? SourceId { get; set; }
        public string? SourceType { get; set; }
        
        // Operational Timeline Enhancements
        public TimelineVisibility Visibility { get; set; } = TimelineVisibility.Hide; 
        public Guid? IntentId { get; set; } 
        public string? Metadata { get; set; } // JSON: { "Amount": 500, "PartnerName": "Dr. X" }
    }

    public enum TimelineVisibility
    {
        Hide = 0,    // Audit only (Noise)
        Merge = 1,   // Context for a Surface event
        Surface = 2  // Headline event (Signal)
    }
}
