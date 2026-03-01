using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SynOS.Data;

namespace SynOS.Api.Middleware
{
    public class SessionValidationMiddleware
    {
        private readonly RequestDelegate _next;

        public SessionValidationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // 1. Skip if not authenticated or missing session_id claim
            var user = context.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            var sessionIdClaim = user.FindFirst("session_id")?.Value;
            var sessionModeClaim = user.FindFirst("session_mode")?.Value;

            // MANDATORY HARDENING (Requirement 1): Oversight sessions bypass anchors
            if (sessionModeClaim == "oversight")
            {
                await _next(context);
                return;
            }

            if (string.IsNullOrEmpty(sessionIdClaim))
            {
                await _next(context);
                return;
            }

            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                await _next(context);
                return;
            }

            // 2. Performance: Minimal Lookup (Covering Index)
            // Caching in HttpContext.Items to avoid double lookups if multiple filters trigger
            if (!context.Items.ContainsKey("IsSessionValid"))
            {
                var db = context.RequestServices.GetRequiredService<SynOSDbContext>();
                
                var activeSessionId = await db.OperationalResources
                    .Where(r => r.UserId == userId)
                    .Select(r => r.ActiveSessionId)
                    .FirstOrDefaultAsync();

                bool isValid = activeSessionId != null && activeSessionId.ToString() == sessionIdClaim;
                context.Items["IsSessionValid"] = isValid;
                
                if (!isValid)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "SessionExpiredOperationalContext", message = "Your session has been terminated by a newer login." });
                    return;
                }
            }
            else if (!(bool)context.Items["IsSessionValid"]!)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            await _next(context);
        }
    }
}
