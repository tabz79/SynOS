namespace TBZ.Middleware.Application.DTOs
{
    public class ProviderSendResult
    {
        public bool Success { get; set; }
        public string? MessageId { get; set; }
        public string? ConversationId { get; set; }
        public string? ErrorMessage { get; set; }
        public string? RawPayload { get; set; }
    }
}
