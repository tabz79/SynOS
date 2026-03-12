using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class ResultEntryResponseDto
    {
        public ResultEntryStatus Status { get; set; }
        public string? Message { get; set; }
        public IEnumerable<ResultDto> Results { get; set; } = new List<ResultDto>();
    }

    public enum ResultEntryStatus
    {
        Success,
        Forbidden,
        BadRequest
    }

    public class ResultEntryRequestDto
    {
        public Guid OrderId { get; set; }
        public List<ParameterResultDto> Results { get; set; } = new();
        public string? OverrideReason { get; set; }
    }

    public class ParameterResultDto
    {
        public Guid OrderId { get; set; } // Added to link result to order
        public string ParameterCode { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string? TechComments { get; set; }
    }

    public class AutosaveRequestDto
    {
        public Guid OrderId { get; set; }
        public string DraftJson { get; set; } = string.Empty;
    }

    public class SubmitRequestDto
    {
        public Guid OrderId { get; set; }
    }

    public class ResultDto
    {
        public Guid ResultId { get; set; }
        public string ParameterCode { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string? Flag { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ModifyResultRequestDto
    {
        public string NewValue { get; set; } = null!;
        public string Reason { get; set; } = null!;
    }

    public class ResultChangeAuditDto
    {
        public Guid AuditId { get; set; }
        public string OldValue { get; set; } = null!;
        public string NewValue { get; set; } = null!;
        public string Reason { get; set; } = null!;
        public Guid ChangedByUserId { get; set; }
        public string? ChangedByName { get; set; }
        public DateTimeOffset ChangedAt { get; set; }
        public string? Source { get; set; }
    }
}
