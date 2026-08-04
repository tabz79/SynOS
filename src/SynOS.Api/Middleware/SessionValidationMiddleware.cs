using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace SynOS.Api.Middleware
{
    public class SessionValidationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SessionValidationMiddleware> _logger;
        private readonly IWebHostEnvironment _env;

        private static readonly string[] AlwaysAllowedPaths = new[]
        {
            "/api/v1/auth",
            "/api/v1/admin/settings",
            "/api/v1/settings",
            "/api/v1/admin/setup",
            "/api/v1/setup",
            "test-middleware",
            "/api/v1/operations/backup",
            "/api/v1/operations/export",
            "export"
        };

        public SessionValidationMiddleware(RequestDelegate next, ILogger<SessionValidationMiddleware> logger, IWebHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var path = context.Request.Path.Value ?? "";

                // Always allow auth, license renewal, setup, and backup/export endpoints
                bool isAlwaysAllowed = false;
                foreach (var allowed in AlwaysAllowedPaths)
                {
                    if (path.Contains(allowed, StringComparison.OrdinalIgnoreCase))
                    {
                        isAlwaysAllowed = true;
                        break;
                    }
                }

                if (!isAlwaysAllowed)
                {
                    using var scope = context.RequestServices.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    var profile = await dbContext.LabProfiles.AsNoTracking().FirstOrDefaultAsync();

                    if (profile != null && profile.LicenseExpiryDate.HasValue)
                    {
                        var expiry = profile.LicenseExpiryDate.Value;
                        var now = DateTime.UtcNow;
                        var isAdmin = context.User.IsInRole("Administrator") || context.User.IsInRole("Admin");

                        // Stage 3: Soft Lock (Days 8 to 14 post Expiry)
                        // Days 1-7 (Grace Period) remain fully operational.
                        // Days 8-14 pause creation of NEW patient registrations/billing.
                        if (now > expiry.AddDays(7) && now <= expiry.AddDays(14))
                        {
                            bool isNewVisitCreation = context.Request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase) && 
                                                       (path.Contains("/api/v1/visits", StringComparison.OrdinalIgnoreCase) || 
                                                        path.Contains("/api/v1/reception", StringComparison.OrdinalIgnoreCase));

                            if (isNewVisitCreation)
                            {
                                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                                context.Response.ContentType = "application/json";
                                await context.Response.WriteAsync("{\"code\":\"SUBSCRIPTION_SOFT_LOCK\",\"message\":\"Subscription Renewal Required: Registration of new patient visits is paused until your subscription is renewed.\"}");
                                return;
                            }
                        }
                        // Stage 4: Hard Lock (Day 15+ post Expiry or Explicit HardLock Status)
                        else if (now > expiry.AddDays(14) || profile.LicenseStatus == "HardLock")
                        {
                            if (!isAdmin)
                            {
                                var isLogout = path.EndsWith("/auth/logout", StringComparison.OrdinalIgnoreCase) || 
                                               path.EndsWith("/auth/refresh", StringComparison.OrdinalIgnoreCase);
                                if (!isLogout)
                                {
                                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                                    context.Response.ContentType = "application/json";
                                    await context.Response.WriteAsync("{\"code\":\"SUBSCRIPTION_HARD_LOCK\",\"message\":\"Lab subscription expired. Please notify your administrator to renew.\"}");
                                    return;
                                }
                            }
                            else
                            {
                                // Admin in Hard Lock: restricted strictly to settings, setup, backup, and export
                                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                                context.Response.ContentType = "application/json";
                                await context.Response.WriteAsync("{\"code\":\"SUBSCRIPTION_HARD_LOCK\",\"message\":\"Subscription Expired. Operational access is locked. Please use System Settings to sync or renew your license.\"}");
                                return;
                            }
                        }
                    }
                }
            }

            await _next(context);
        }
    }
}
