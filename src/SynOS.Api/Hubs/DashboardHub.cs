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

            var httpContext = Context.GetHttpContext();
            var queryBranchId = httpContext?.Request.Query["branchId"].ToString();
            if (!string.IsNullOrEmpty(queryBranchId) && Guid.TryParse(queryBranchId, out var parsedQueryBranch))
            {
                branchIdClaim = queryBranchId;
            }

            if (sessionMode == "oversight" && string.IsNullOrEmpty(queryBranchId))
            {
                // MANDATORY HARDENING (Requirement 4): Oversight users do not join branch groups automatically unless branch is explicitly selected
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
            await Groups.AddToGroupAsync(Context.ConnectionId, $"BranchAdmins-{branchId}");

            var deptCode = Context.User?.FindFirst("department_code")?.Value;
            if (!string.IsNullOrEmpty(deptCode))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"branch:{branchId}:dept:{deptCode}");
            }

            await Clients.Caller.SendAsync("ReceiveServerTime", System.DateTime.UtcNow);
            await base.OnConnectedAsync();
        }

        public async Task JoinBranchGroup(string branchId)
        {
            if (Guid.TryParse(branchId, out var bGuid))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch-{bGuid}");
                await Groups.AddToGroupAsync(Context.ConnectionId, $"BranchAdmins-{bGuid}");
            }
        }

        public async Task LeaveBranchGroup(string branchId)
        {
            if (Guid.TryParse(branchId, out var bGuid))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Branch-{bGuid}");
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"BranchAdmins-{bGuid}");
            }
        }
    }
}