using System;

namespace SynOS.Models.DTOs.Reporting
{
    public class ReportListItemDto
    {
        public Guid ReportId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string PatientAgeGender { get; set; } = string.Empty; // e.g., "30 / Male"
        public string TestName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsStat { get; set; }
        public int AbnormalCount { get; set; }
        public string Token { get; set; } = string.Empty;
        public string? TypedByUserName { get; set; }
        public string? VerifiedByUserName { get; set; }
        
        // GPT-5: Delivery & Verification Audit Flags
        public bool IsPhysicallyVerified { get; set; }
        public int SignaturesCount { get; set; }
        public bool Delivered { get; set; }
        public bool IsManualFlow { get; set; }
    }
}
