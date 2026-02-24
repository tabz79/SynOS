using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection; // For ScopeFactory
using SynOS.Api.Hubs;
using SynOS.Services.Operational;
using SynOS.Services.Operations; // For IOperationsEngine
using SynOS.Services; // For IInvoiceService

namespace SynOS.Api.Services
{
    public class SignalRNotifier : INotifier
    {
        private readonly IHubContext<DashboardHub> _hubContext;
        private readonly IServiceScopeFactory _scopeFactory;

        public SignalRNotifier(IHubContext<DashboardHub> hubContext, IServiceScopeFactory scopeFactory)
        {
            _hubContext = hubContext;
            _scopeFactory = scopeFactory;
        }

        public async Task NotifyDashboardRefresh(string branchId, string? visitId = null)
        {
            if (string.IsNullOrEmpty(branchId)) return;

            // 1. Trigger Action Queue Refresh (with Delta if available)
            try
            {
                bool deltaPushed = false;
                
                if (!string.IsNullOrEmpty(visitId) && Guid.TryParse(visitId, out var vGuid))
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var opsEngine = scope.ServiceProvider.GetRequiredService<IOperationsEngine>();
                        var delta = await opsEngine.ProjectActionQueueRowAsync(vGuid);
                        
                        if (delta != null)
                        {
                            await _hubContext.Clients.All.SendAsync("ActionQueueDeltaReceived", delta);
                            deltaPushed = true;
                        }
                    }
                }

                if (!deltaPushed)
                {
                    // Fallback to Thundering Herd if no Delta is provided or fetch failed
                    await _hubContext.Clients.All.SendAsync("ActionQueueUpdated");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalRNotifier] Delta Push Failed: {ex.Message}");
                try { await _hubContext.Clients.All.SendAsync("ActionQueueUpdated"); } catch { }
            }

            // 2. Push Revenue Stats (Calculate here via Scope to break cycle)
            try
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var invoiceService = scope.ServiceProvider.GetRequiredService<IInvoiceService>();
                    if (Guid.TryParse(branchId, out var guid))
                    {
                        var stats = await invoiceService.GetDailyRevenueStatsAsync(guid);
                        // Broadcast Summary Payload
                        await _hubContext.Clients.All.SendAsync("ReceptionSummaryUpdated", stats);
                    }
                }
            }
            catch (Exception ex)
            {
                // Never crash the upstream operational writer
                Console.WriteLine($"[SignalRNotifier] Failed to push stats: {ex.Message}");
            }
        }
    }
}
