using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class FinalReportDto
    {
        public Guid ReportId { get; set; }
        public Guid OrderId { get; set; }
        public PatientSummaryDto Patient { get; set; }
        public VisitSummaryDto Visit { get; set; }
        public Guid? ReportTemplateId { get; set; }
        public string Status { get; set; }
        public string? VerificationMode { get; set; }
        public DateTimeOffset? SignedAt { get; set; }
        public DateTimeOffset? VerifiedAt { get; set; }
        public bool Delivered { get; set; }
        public DateTimeOffset? DeliveredAt { get; set; }
        public string? TypedByUserName { get; set; }
        public string? VerifiedByUserName { get; set; }
        public string? PathologistComments { get; set; }
        public string? Interpretation { get; set; }
        public string? Recommendations { get; set; }
        public List<TestResultDto> TestResults { get; set; }
    }

    public class TestResultDto
    {
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public List<ReportParameterResultDto> Parameters { get; set; }
    }

    public class ReportParameterResultDto
    {
        public string ParameterCode { get; set; }
        public string ParameterName { get; set; }
        public string Value { get; set; }
        public string? Unit { get; set; }
        public string? ReferenceRange { get; set; }
        public string? Remarks { get; set; }
        public string? Flag { get; set; }
    }
}
