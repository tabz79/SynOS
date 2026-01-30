using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SynOS.Models.DTOs.Dashboard
{
    public class ActionQueueRowDto
    {
        // Identity
        [JsonPropertyName("VisitId")]
        public Guid VisitId { get; set; }

        [JsonPropertyName("Token")]
        public string Token { get; set; } = string.Empty;

        [JsonPropertyName("CreatedAt")]
        public DateTime CreatedAt { get; set; }

        // Patient Summary
        [JsonPropertyName("PatientName")]
        public string PatientName { get; set; } = string.Empty;

        [JsonPropertyName("PatientAgeGender")]
        public string PatientAgeGender { get; set; } = string.Empty; // "32y / F"

        // Tests (Operational visibility)
        [JsonPropertyName("TestCodes")]
        public List<string> TestCodes { get; set; } = new List<string>(); // ["CBC", "LIPID"]

        // Payment (Reception-friendly, NOT accounting terms)
        [JsonPropertyName("PaymentDisplay")]
        public string PaymentDisplay { get; set; } = string.Empty;
        // Examples: "Cash", "UPI", "Prepaid (Dr. Rao)"

        [JsonPropertyName("TotalAmount")]
        public decimal TotalAmount { get; set; }

        [JsonPropertyName("PaymentMethod")]
        public string PaymentMethod { get; set; } = string.Empty; // "Cash", "UPI", "Card", "Prepaid"

        [JsonPropertyName("ReferrerName")]
        public string ReferrerName { get; set; } = string.Empty;

        // Live Operations
        [JsonPropertyName("OperationalStatus")]
        public string OperationalStatus { get; set; } = string.Empty;
        // Examples: "Ready for Sample", "In Lab", "Completed"

        [JsonPropertyName("LastUpdatedAt")]
        public DateTime LastUpdatedAt { get; set; }

        // Grouping (Backend-owned)
        [JsonPropertyName("DateGroup")]
        public string DateGroup { get; set; } = string.Empty; // "Today", "Yesterday", "23 Jan"

        [JsonPropertyName("IsFinalized")]
        public bool IsFinalized { get; set; }
    }
}
