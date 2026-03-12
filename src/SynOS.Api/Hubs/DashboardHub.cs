using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Hubs
{
    [Authorize]
    public class DashboardHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var sessionMode = Context.User?.FindFirst("session_mode")?.Value;
            var branchIdClaim = Context.User?.FindFirst("branch_id")?.Value;

            if (sessionMode == "oversight")
            {
                // MANDATORY HARDENING (Requirement 4): Oversight users do not join branch groups automatically
                await Clients.Caller.SendAsync("ReceiveServerTime", System.DateTime.UtcNow);
                await base.OnConnectedAsync();
                return;
            }

            if (string.IsNullOrEmpty(branchIdClaim) || !Guid.TryParse(branchIdClaim, out var branchId))
            {
                Context.Abort();
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch-{branchId}");

            var deptCode = Context.User?.FindFirst("department_code")?.Value;
            if (!string.IsNullOrEmpty(deptCode))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"branch:{branchId}:dept:{deptCode}");
            }

            await Clients.Caller.SendAsync("ReceiveServerTime", System.DateTime.UtcNow);
            await base.OnConnectedAsync();
        }
    }
}