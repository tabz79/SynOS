using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace SynOS.Api.Hubs
{
    [Authorize]
    public class DashboardHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.Caller.SendAsync("ReceiveServerTime", System.DateTime.UtcNow);
            await base.OnConnectedAsync();
        }
    }
}