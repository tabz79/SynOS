using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TBZ.Middleware.Infrastructure.Security
{
    public class DbConfigurationSource : IConfigurationSource
    {
        private readonly string _connectionString;

        public DbConfigurationSource(string connectionString)
        {
            _connectionString = connectionString;
        }

        public IConfigurationProvider Build(IConfigurationBuilder builder)
        {
            return new DbConfigurationProvider(_connectionString);
        }
    }

    public class DbConfigurationProvider : ConfigurationProvider
    {
        private readonly string _connectionString;

        public DbConfigurationProvider(string connectionString)
        {
            _connectionString = connectionString;
        }

        public override void Load()
        {
            var optionsBuilder = new DbContextOptionsBuilder<MiddlewareDbContext>();
            optionsBuilder.UseSqlite(_connectionString);

            using var context = new MiddlewareDbContext(optionsBuilder.Options);
            bool loaded = false;
            try
            {
                var setting = context.MiddlewareSettings.AsNoTracking().FirstOrDefault();
                if (setting != null)
                {
                    var dataDict = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

                    if (!string.IsNullOrEmpty(setting.AllowedOrigins))
                        dataDict["AllowedOrigins:0"] = setting.AllowedOrigins;

                    dataDict["RateLimit:PermitLimit"] = setting.RateLimitPermitLimit.ToString();
                    dataDict["RateLimit:WindowSeconds"] = setting.RateLimitWindowSeconds.ToString();
                    dataDict["RateLimit:QueueLimit"] = setting.RateLimitQueueLimit.ToString();

                    if (!string.IsNullOrEmpty(setting.DiagnosticsEncryptionKey))
                        dataDict["Diagnostics:EncryptionKey"] = setting.DiagnosticsEncryptionKey;

                    if (!string.IsNullOrEmpty(setting.WhatsAppGraphApiVersion))
                        dataDict["WhatsApp:GraphApiVersion"] = setting.WhatsAppGraphApiVersion;

                    if (!string.IsNullOrEmpty(setting.WhatsAppAppSecret))
                        dataDict["WhatsApp:AppSecret"] = setting.WhatsAppAppSecret;

                    if (!string.IsNullOrEmpty(setting.WhatsAppVerifyToken))
                        dataDict["WhatsApp:VerifyToken"] = setting.WhatsAppVerifyToken;

                    if (!string.IsNullOrEmpty(setting.WhatsAppPhoneNumberId))
                        dataDict["WhatsApp:PhoneNumberId"] = setting.WhatsAppPhoneNumberId;

                    if (!string.IsNullOrEmpty(setting.WhatsAppBusinessAccountId))
                        dataDict["WhatsApp:BusinessAccountId"] = setting.WhatsAppBusinessAccountId;

                    if (!string.IsNullOrEmpty(setting.WhatsAppActiveTemplateName))
                        dataDict["WhatsApp:ActiveTemplateName"] = setting.WhatsAppActiveTemplateName;

                    if (!string.IsNullOrEmpty(setting.WhatsAppPublicTunnelUrl))
                        dataDict["WhatsApp:PublicTunnelUrl"] = setting.WhatsAppPublicTunnelUrl;

                    if (!string.IsNullOrEmpty(setting.WhatsAppAccessToken))
                        dataDict["WhatsApp:AccessToken"] = setting.WhatsAppAccessToken;

                    Data = dataDict;
                    loaded = true;
                }
            }
            catch
            {
                // Db is not migrated yet, ignore
            }

            if (!loaded)
            {
                // Default fallbacks if table doesn't exist
                Data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
                {
                    { "AllowedOrigins:0", "http://localhost:5173" },
                    { "RateLimit:PermitLimit", "100" },
                    { "RateLimit:WindowSeconds", "60" },
                    { "RateLimit:QueueLimit", "10" },
                    { "Diagnostics:EncryptionKey", "TBZ-DIAGNOSTICS-KEY-12345-67890" },
                    { "WhatsApp:GraphApiVersion", "v25.0" },
                    { "WhatsApp:AppSecret", "215160b4c9251805d723b4d4e48b4d42" },
                    { "WhatsApp:VerifyToken", "TBZLabsWebhook2026" },
                    { "WhatsApp:PhoneNumberId", "1264980080021563" },
                    { "WhatsApp:BusinessAccountId", "1052572960618226" },
                    { "WhatsApp:ActiveTemplateName", "report_ready_v2" },
                    { "WhatsApp:PublicTunnelUrl", "https://cloud.tbzlabs.in" },
                    { "WhatsApp:AccessToken", "EAAS6edbZAxOgBR9wvZBRnuZBwgAg8p6O4NEV4lGOP4ZBraZAybUSMNqMnDmK7LChL6ZAGa5Xtln4rqZB9sqv8aZCqYyZC7jSFjrrc5BFNs4y81kdjWSgNsve5yZA2lXVSicC3CjRvD9vSRdJlUK9UWmBJyelX3iRlfPctBZAOJm0cURjNVW2hmmfBXtfz0J7i85JQZDZD" }
                };
            }
        }
    }
}
