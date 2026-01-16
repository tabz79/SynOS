using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using SynOS.Api.Hubs;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Services.Dashboard;

namespace SynOS.Api.Services
{
    public class SignalRDashboardNotificationService : IDashboardNotificationService
    {
        private readonly IHubContext<DashboardHub> _hubContext;

        public SignalRDashboardNotificationService(IHubContext<DashboardHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifyReceptionSummaryUpdateAsync(string userId, TodaysSummaryDto summary)
        {
            await _hubContext.Clients.User(userId).SendAsync("ReceptionSummaryUpdated", summary);
        }
    }
}