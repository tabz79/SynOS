using System;
using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TBZ.Middleware.Application.Configuration;
using TBZ.Middleware.Application.Core;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Application.Providers.WhatsApp;
using TBZ.Middleware.Application.Providers.WhatsApp.Services;

namespace TBZ.Middleware.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddNotificationEngine(this IServiceCollection services, IConfiguration configuration)
        {
            // Configure WhatsApp Options
            services.Configure<WhatsAppOptions>(configuration.GetSection(WhatsAppOptions.SectionName));

            // Register Services
            services.AddSingleton<NotificationTemplateRenderer>();
            services.AddScoped<IWhatsAppService, WhatsAppService>();
            
            // Register providers
            services.AddScoped<INotificationProvider, WhatsAppProvider>();
            
            // Register Resolver and Notification Service
            services.AddScoped<INotificationProviderResolver, NotificationProviderResolver>();
            services.AddScoped<INotificationService, NotificationService>();

            // Configure named HttpClient
            services.AddHttpClient("WhatsAppClient", (sp, client) =>
            {
                var options = sp.GetRequiredService<IOptionsMonitor<WhatsAppOptions>>().CurrentValue;
                var baseUrl = options.BaseUrl ?? "https://graph.facebook.com/";
                if (!baseUrl.Contains("/v") && !string.IsNullOrEmpty(options.GraphApiVersion))
                {
                    baseUrl = baseUrl.TrimEnd('/') + "/" + options.GraphApiVersion.Trim('/');
                }
                if (!baseUrl.EndsWith("/"))
                {
                    baseUrl += "/";
                }
                client.BaseAddress = new Uri(baseUrl);
                if (!string.IsNullOrEmpty(options.AccessToken))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.AccessToken);
                }
            });

            return services;
        }
    }
}
