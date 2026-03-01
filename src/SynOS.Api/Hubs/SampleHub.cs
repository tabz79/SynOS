using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Api.Hubs
{
    [Authorize]
    public class SampleHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var branchIdClaim = Context.User?.FindFirst("branch_id")?.Value;
            if (string.IsNullOrEmpty(branchIdClaim) || !Guid.TryParse(branchIdClaim, out var branchId))
            {
                Context.Abort();
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch-{branchId}");
            await base.OnConnectedAsync();
        }

        public async Task SendSampleUpdate(SampleDto sample)
        {
            if (sample.BranchId != Guid.Empty)
            {
                await Clients.Group($"Branch-{sample.BranchId}").SendAsync("ReceiveSampleUpdate", sample);
            }
        }
    }
}
