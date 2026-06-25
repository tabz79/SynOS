using System;
using System.Text.Json.Serialization;

namespace TBZ.Middleware.Api.DTOs
{
    public class IngestEventDto
    {
        [JsonPropertyName("eventId")]
        public Guid EventId { get; set; }

        [JsonPropertyName("eventType")]
        public string EventType { get; set; } = string.Empty;

        [JsonPropertyName("aggregateType")]
        public string AggregateType { get; set; } = string.Empty;

        [JsonPropertyName("aggregateId")]
        public string AggregateId { get; set; } = string.Empty;

        [JsonPropertyName("labId")]
        public string LabId { get; set; } = string.Empty;

        [JsonPropertyName("branchId")]
        public string? BranchId { get; set; }

        [JsonPropertyName("payloadJson")]
        public string PayloadJson { get; set; } = string.Empty;

        [JsonPropertyName("occurredAt")]
        public DateTime OccurredAt { get; set; }
    }
}
