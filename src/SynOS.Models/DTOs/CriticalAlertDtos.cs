using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class CriticalAlertSummaryDto
    {
        public Guid AlertId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string Mrn { get; set; } = string.Empty;
        public string ParameterCode { get; set; } = string.Empty;
        public string ParameterName { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string CriticalThreshold { get; set; } = string.Empty;
        public DateTimeOffset TriggeredAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReferrerName { get; set; }
    }

    public class CriticalAlertDetailDto
    {
        public AlertDetailsDto Alert { get; set; } = new();
        public List<AuditDto> Audit { get; set; } = new();
    }

    public class AlertDetailsDto
    {
        public Guid AlertId { get; set; }
        public Guid ResultId { get; set; }
        public string ParameterCode { get; set; } = string.Empty;
        public string ParameterName { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string CriticalThreshold { get; set; } = string.Empty;
        public PatientSummaryDto Patient { get; set; } = new();
        public VisitSummaryDto Visit { get; set; } = new();
        public ReferrerSummaryDto? Referrer { get; set; }
        public DateTimeOffset TriggeredAt { get; set; }
        public DateTimeOffset? NotifiedAt { get; set; }
        public DateTimeOffset? AcknowledgedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class VisitSummaryDto
    {
        public Guid Id { get; set; }
        public string Token { get; set; } = string.Empty;
    }
    
    public class ReferrerSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class AuditDto
    {
        public DateTimeOffset ActedAt { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? Details { get; set; }
    }

    public class AcknowledgeAlertRequestDto
    {
        public string Method { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    public class AcknowledgeAlertResponseDto
    {
        public Guid AlertId { get; set; }
        public DateTimeOffset AcknowledgedAt { get; set; }
        public Guid AcknowledgedBy { get; set; }
        public string Status { get; set; } = string.Empty;
    }

     public class EscalateAlertResponseDto
    {
        public Guid AlertId { get; set; }
        public DateTimeOffset EscalatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
