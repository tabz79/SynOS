using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SynOS.Data;

namespace SynOS.Api.Hubs
{
    public class SessionValidationHubFilter : IHubFilter
    {
        public async ValueTask<object?> InvokeMethodAsync(
            HubInvocationContext invocationContext, 
            Func<HubInvocationContext, ValueTask<object?>> next)
        {
            var user = invocationContext.Context.User;
            if (user?.Identity?.IsAuthenticated == true)
            {
                var sessionIdClaim = user.FindFirst("session_id")?.Value;
                var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var sessionModeClaim = user.FindFirst("session_mode")?.Value;

                // NEW: Enforce anchoring ONLY for operational mode. 
                // Missing or non-operational claims bypass the ActiveSessionId check.
                if (string.IsNullOrWhiteSpace(sessionModeClaim) || sessionModeClaim != "operational")
                {
                    return await next(invocationContext);
                }

                if (!string.IsNullOrEmpty(sessionIdClaim) && !string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
                {
                    // Performance: Minimal Projection Check
                    var db = invocationContext.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    
                    var activeSessionId = await db.OperationalResources
                        .Where(r => r.UserId == userId)
                        .Select(r => r.ActiveSessionId)
                        .FirstOrDefaultAsync();

                    bool isValid = activeSessionId != null && activeSessionId.ToString() == sessionIdClaim;

                    if (!isValid)
                    {
                        invocationContext.Context.Abort();
                        throw new HubException("SessionExpiredOperationalContext");
                    }
                }
            }

            return await next(invocationContext);
        }

        public async Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
        {
             var user = context.Context.User;
            if (user?.Identity?.IsAuthenticated == true)
            {
                var sessionIdClaim = user.FindFirst("session_id")?.Value;
                var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var sessionModeClaim = user.FindFirst("session_mode")?.Value;

                // NEW: Enforce anchoring ONLY for operational mode. 
                // Missing or non-operational claims bypass the ActiveSessionId check.
                if (string.IsNullOrWhiteSpace(sessionModeClaim) || sessionModeClaim != "operational")
                {
                    await next(context);
                    return;
                }

                if (!string.IsNullOrEmpty(sessionIdClaim) && !string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
                {
                    var db = context.ServiceProvider.GetRequiredService<SynOSDbContext>();
                    
                    var activeSessionId = await db.OperationalResources
                        .Where(r => r.UserId == userId)
                        .Select(r => r.ActiveSessionId)
                        .FirstOrDefaultAsync();

                    bool isValid = activeSessionId != null && activeSessionId.ToString() == sessionIdClaim;

                    if (!isValid)
                    {
                        context.Context.Abort();
                        return; // Reject connection
                    }
                }
            }
            await next(context);
        }
    }
}
