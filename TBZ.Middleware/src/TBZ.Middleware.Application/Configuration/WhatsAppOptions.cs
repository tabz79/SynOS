namespace TBZ.Middleware.Application.Configuration
{
    public class WhatsAppOptions
    {
        public const string SectionName = "WhatsApp";
        public string AccessToken { get; set; } = string.Empty;
        public string PhoneNumberId { get; set; } = string.Empty;
        public string BusinessAccountId { get; set; } = string.Empty;
        public string VerifyToken { get; set; } = string.Empty;
        public string AppSecret { get; set; } = string.Empty;
        public string GraphApiVersion { get; set; } = "v25.0";
        public string BaseUrl { get; set; } = "https://graph.facebook.com/";
        public string ActiveTemplateName { get; set; } = "report_ready";
        public string PublicTunnelUrl { get; set; } = string.Empty;
    }
}
