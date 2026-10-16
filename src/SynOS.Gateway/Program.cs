using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.HttpOverrides;
using SynOS.Gateway;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWindowsService();

var gatewayPortStr = Environment.GetEnvironmentVariable("GATEWAY_PORT");
int gatewayPort = int.TryParse(gatewayPortStr, out var gp) && gp > 0 ? gp : 59999;

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = null; // Unlimited for DICOM scans and database backups
    options.Listen(IPAddress.Any, gatewayPort);
    if (System.Net.Sockets.Socket.OSSupportsIPv6)
    {
        try
        {
            options.Listen(IPAddress.IPv6Any, gatewayPort);
        }
        catch { /* Ignore if dual-mode already handles it */ }
    }
});

builder.Services.AddSingleton<DynamicConfigProvider>();
builder.Services.AddSingleton<IProxyConfigProvider>(sp => sp.GetRequiredService<DynamicConfigProvider>());
builder.Services.AddReverseProxy();

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
});

// Control Endpoint: Status
app.MapGet("/_gateway/status", (DynamicConfigProvider configProvider) =>
{
    return Results.Ok(new
    {
        gateway = "SynOS Enterprise Edge Gateway",
        status = "online",
        listenPort = gatewayPort,
        activeUpstreamPort = configProvider.ActivePort,
        timestamp = DateTime.UtcNow
    });
});

// Control Endpoint: Switch Active Port (Local-only or internal loopback)
app.MapPost("/_gateway/switch", (HttpContext context, DynamicConfigProvider configProvider) =>
{
    var remoteIp = context.Connection.RemoteIpAddress;
    if (remoteIp != null && !IPAddress.IsLoopback(remoteIp))
    {
        return Results.StatusCode(403);
    }

    if (!int.TryParse(context.Request.Query["port"], out var port) || port <= 0 || port > 65535)
    {
        return Results.BadRequest(new { error = "Invalid or missing 'port' parameter." });
    }

    try
    {
        configProvider.SwitchPort(port);
        return Results.Ok(new
        {
            success = true,
            activePort = port,
            message = $"Upstream successfully switched to port {port}"
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message);
    }
});

// Resilient Fallback Middleware: Intercepts upstream outages/restarts and serves clinical updating page
app.Use(async (context, next) =>
{
    await next();

    var errorFeature = context.GetForwarderErrorFeature();
    if (errorFeature != null || context.Response.StatusCode == 502 || context.Response.StatusCode == 503 || context.Response.StatusCode == 504)
    {
        if (!context.Response.HasStarted)
        {
            var isApi = context.Request.Path.StartsWithSegments("/api") ||
                        context.Request.Path.StartsWithSegments("/hub") ||
                        (context.Request.Headers.Accept.ToString().Contains("application/json"));

            if (isApi)
            {
                context.Response.StatusCode = (int)HttpStatusCode.ServiceUnavailable;
                context.Response.ContentType = "application/json";
                context.Response.Headers.RetryAfter = "2";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    status = "warming_up",
                    message = "SynOS core engine is synchronizing or updating. Please retry in 2 seconds.",
                    retryAfterSeconds = 2
                }));
            }
            else
            {
                // Serve friendly clinical updating screen
                context.Response.StatusCode = (int)HttpStatusCode.OK;
                context.Response.ContentType = "text/html; charset=utf-8";
                await context.Response.WriteAsync(GetUpdatingHtml());
            }
        }
    }
});

app.MapReverseProxy();

app.Run();

static string GetUpdatingHtml()
{
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>SynOS Diagnostic Intelligence — System Optimizing</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                background: linear-gradient(135deg, #090d16 0%, #0f172a 100%);
                color: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 1.5rem;
            }
            .card {
                background: rgba(30, 41, 59, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(16px);
                border-radius: 1.25rem;
                padding: 2.5rem 2rem;
                max-width: 480px;
                width: 100%;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
            }
            .badge {
                display: inline-block;
                background: rgba(14, 165, 233, 0.15);
                border: 1px solid rgba(14, 165, 233, 0.4);
                color: #38bdf8;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding: 0.35rem 0.85rem;
                border-radius: 9999px;
                margin-bottom: 1.5rem;
            }
            .spinner {
                width: 44px;
                height: 44px;
                border: 3px solid rgba(56, 189, 248, 0.2);
                border-top-color: #38bdf8;
                border-radius: 50%;
                animation: spin 0.75s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
                margin: 0 auto 1.5rem auto;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            h1 {
                font-size: 1.45rem;
                font-weight: 600;
                color: #ffffff;
                margin-bottom: 0.75rem;
                letter-spacing: -0.01em;
            }
            p {
                color: #94a3b8;
                font-size: 0.925rem;
                line-height: 1.6;
                margin-bottom: 1.5rem;
            }
            .pulse-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                margin-right: 6px;
                box-shadow: 0 0 8px #10b981;
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
            .status-line {
                font-size: 0.825rem;
                color: #cbd5e1;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">SynOS Clinical Intelligence</div>
            <div class="spinner"></div>
            <h1>System Optimizing</h1>
            <p>SynOS is applying an automated diagnostic engine update in the background. Your session and clinical data are fully preserved.</p>
            <div class="status-line">
                <span class="pulse-dot"></span>
                <span>Connecting live (auto-refreshing in 2s)...</span>
            </div>
        </div>
        <script>
            setTimeout(function() {
                window.location.reload();
            }, 2000);
        </script>
    </body>
    </html>
    """;
}
