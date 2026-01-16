using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace SynOS.Api.Hubs
{
    [Authorize]
    public class DashboardHub : Hub
    {
        // Hub methods can be added here if client-to-server comms needed
    }
}