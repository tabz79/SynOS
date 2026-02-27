using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SynOS.Models.DTOs.Dashboard
{
    public class ActionQueueRowDto
    {
        // Identity
        public Guid VisitId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        // Patient Summary
        public string PatientName { get; set; } = string.Empty;
        public string PatientAgeGender { get; set; } = string.Empty; // "32y / F"

        // Tests (Operational visibility)
        public List<string> TestCodes { get; set; } = new List<string>(); // ["CBC", "LIPID"]

        // Payment (Reception-friendly, NOT accounting terms)
        public string PaymentDisplay { get; set; } = string.Empty;
        // Examples: "Cash", "UPI", "Prepaid (Dr. Rao)"

        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty; // "Cash", "UPI", "Card", "Prepaid"
        public string ReferrerName { get; set; } = string.Empty;

        // Live Operations
        public string OperationalStatus { get; set; } = string.Empty;
        // Examples: "Ready for Sample", "In Lab", "Completed"

        public DateTime LastUpdatedAt { get; set; }

        // Grouping (Backend-owned)
        public string DateGroup { get; set; } = string.Empty; // "Today", "Yesterday", "23 Jan"

        public bool IsFinalized { get; set; }
        public string? AssignedResource { get; set; } // Phase 12 Alignment
        public Guid? AssignedToUserId { get; set; }
        public string? AssignedToName { get; set; }
        public bool? IsTokenPrinted { get; set; }
    }
}
