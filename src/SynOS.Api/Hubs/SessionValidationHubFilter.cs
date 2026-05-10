using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SynOS.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace SynOS.Api.Hubs
{
    public class SessionValidationHubFilter : IHubFilter
    {
        private readonly IWebHostEnvironment _env;

        public SessionValidationHubFilter(IWebHostEnvironment env)
        {
            _env = env;
        }

        public async ValueTask<object?> InvokeMethodAsync(
            HubInvocationContext invocationContext, 
            Func<HubInvocationContext, ValueTask<object?>> next)
        {
            // Session anchoring disabled for UX
            return await next(invocationContext);
        }

        public async Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
        {
            // Session anchoring disabled for UX
            await next(context);
        }
    }
}
