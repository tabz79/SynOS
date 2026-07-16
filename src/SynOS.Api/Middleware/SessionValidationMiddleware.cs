using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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

        private static readonly string[] AllowedPathsPostExpiry = new[]
        {
            "/api/v1/auth",
            "/api/v1/admin/settings",
            "/api/v1/admin/setup",
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
                var isAdmin = context.User.IsInRole("Administrator") || context.User.IsInRole("Admin");
                var path = context.Request.Path.Value ?? "";

                using var scope = context.RequestServices.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<SynOSDbContext>();
                var profile = await dbContext.LabProfiles.AsNoTracking().FirstOrDefaultAsync();

                if (profile != null)
                {
                    bool isRestricted = false;
                    if (profile.LicenseStatus == "Suspended")
                    {
                        isRestricted = true;
                    }
                    else if (profile.LicenseExpiryDate.HasValue && DateTime.UtcNow > profile.LicenseExpiryDate.Value.AddDays(7))
                    {
                        isRestricted = true;
                    }

                    if (isRestricted)
                    {
                        if (!isAdmin)
                        {
                            var isAllowedPath = path.EndsWith("/auth/logout", StringComparison.OrdinalIgnoreCase) || 
                                                path.EndsWith("/auth/refresh", StringComparison.OrdinalIgnoreCase);
                                                
                            if (!isAllowedPath)
                            {
                                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                                context.Response.ContentType = "application/json";
                                await context.Response.WriteAsync("{\"code\":\"SUBSCRIPTION_RESTRICTED\",\"message\":\"Operational access is locked due to expired or invalid subscription. Please contact your system administrator.\"}");
                                return;
                            }
                        }
                        else
                        {
                            var isAllowedPath = false;
                            foreach (var allowed in AllowedPathsPostExpiry)
                            {
                                if (path.Contains(allowed, StringComparison.OrdinalIgnoreCase))
                                {
                                    isAllowedPath = true;
                                    break;
                                }
                            }

                            if (!isAllowedPath)
                            {
                                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                                context.Response.ContentType = "application/json";
                                await context.Response.WriteAsync("{\"code\":\"SUBSCRIPTION_RESTRICTED\",\"message\":\"Operational access is locked. Only database backup, data export, and license update activities are allowed.\"}");
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
