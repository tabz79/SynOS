using System;
using System.Collections.Generic;

namespace SynOS.Models.DTOs
{
    public class ResultEntryRequestDto
    {
        public Guid OrderId { get; set; }
        public List<ParameterResultDto> Results { get; set; } = new();
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
}
