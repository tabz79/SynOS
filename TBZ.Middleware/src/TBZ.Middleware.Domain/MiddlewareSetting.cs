using System;

namespace TBZ.Middleware.Domain
{
    public class MiddlewareSetting
    {
        public int Id { get; set; }
        public string AllowedOrigins { get; set; } = "http://localhost:5173";
        public int RateLimitPermitLimit { get; set; } = 100;
        public int RateLimitWindowSeconds { get; set; } = 60;
        public int RateLimitQueueLimit { get; set; } = 10;
        public string DiagnosticsEncryptionKey { get; set; } = "TBZ-DIAGNOSTICS-KEY-12345-67890";

        // WhatsApp Configurations
        public string WhatsAppGraphApiVersion { get; set; } = "v25.0";
        public string WhatsAppAppSecret { get; set; } = "215160b4c9251805d723b4d4e48b4d42";
        public string WhatsAppVerifyToken { get; set; } = "TBZLabsWebhook2026";
        public string WhatsAppPhoneNumberId { get; set; } = "1264980080021563";
        public string WhatsAppBusinessAccountId { get; set; } = "1052572960618226";
        public string WhatsAppActiveTemplateName { get; set; } = "report_ready_v2";
        public string WhatsAppPublicTunnelUrl { get; set; } = "https://sectors-explain-estate-controllers.trycloudflare.com";
        public string WhatsAppAccessToken { get; set; } = "EAAS6edbZAxOgBR9wvZBRnuZBwgAg8p6O4NEV4lGOP4ZBraZAybUSMNqMnDmK7LChL6ZAGa5Xtln4rqZB9sqv8aZCqYyZC7jSFjrrc5BFNs4y81kdjWSgNsve5yZA2lXVSicC3CjRvD9vSRdJlUK9UWmBJyelX3iRlfPctBZAOJm0cURjNVW2hmmfBXtfz0J7i85JQZDZD";
    }
}
