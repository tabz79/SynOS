using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection; // For ScopeFactory
using SynOS.Api.Hubs;
using SynOS.Services.Operational;
using SynOS.Services.Operations; // For IOperationsEngine
using SynOS.Services.Dashboard; // For IDashboardService
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

        public async Task NotifyActionQueueDeltaAsync(string branchId, string visitId)
        {
            if (string.IsNullOrEmpty(branchId)) return;

            try
            {
                if (!string.IsNullOrEmpty(visitId) && Guid.TryParse(visitId, out var vGuid))
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var opsEngine = scope.ServiceProvider.GetRequiredService<IOperationsEngine>();
                        var delta = await opsEngine.ProjectActionQueueRowAsync(vGuid);
                        
                        if (delta != null)
                        {
                            // 1. Target Receptionist (Private Desktop)
                            if (delta.AssignedToUserId.HasValue && delta.AssignedToUserId.Value != Guid.Empty)
                            {
                                await _hubContext.Clients.User(delta.AssignedToUserId.Value.ToString()).SendAsync("ActionQueueDeltaReceived", delta);
                            }

                            // 2. Target Branch Admins (Observation Desk)
                            await _hubContext.Clients.Group($"BranchAdmins-{branchId}").SendAsync("ActionQueueDeltaReceived", delta);
                            
                            // 3. Target Department Queue (Workbench Sync)
                            if (!string.IsNullOrEmpty(delta.DepartmentCode))
                            {
                                await _hubContext.Clients.Group($"branch:{branchId}:dept:{delta.DepartmentCode}").SendAsync("ActionQueueDeltaReceived", delta);
                            }

                            return;
                        }
                    }
                }

                // Fallback to Thundering Herd (Scoped to Group) if no Delta is provided or fetch failed
                await _hubContext.Clients.Group($"BranchAdmins-{branchId}").SendAsync("ActionQueueUpdated");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalRNotifier] Delta Push Failed: {ex.Message}");
                try { await _hubContext.Clients.Group($"BranchAdmins-{branchId}").SendAsync("ActionQueueUpdated"); } catch { }
            }
        }

        public async Task NotifyAssignmentUpdateAsync(string branchId, string departmentCode, Guid assignmentId, string status, string visitId)
        {
            if (string.IsNullOrEmpty(branchId) || string.IsNullOrEmpty(departmentCode)) return;

            var payload = new
            {
                type = "assignment-update",
                assignmentId = assignmentId,
                status = status
            };

            // 1. Broadcast to specific department in branch
            await _hubContext.Clients.Group($"branch:{branchId}:dept:{departmentCode}").SendAsync("AssignmentUpdateReceived", payload);

            // 2. Also notify the general action queue delta (for receptionists/admins)
            if (!string.IsNullOrEmpty(visitId))
            {
                await NotifyActionQueueDeltaAsync(branchId, visitId);
            }
        }

        public async Task NotifyRealitySummaryUpdateAsync(string branchId, Guid? targetUserId = null)
        {
            if (string.IsNullOrEmpty(branchId)) return;

            try
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var dashboardService = scope.ServiceProvider.GetRequiredService<IDashboardService>();
                    
                    if (Guid.TryParse(branchId, out var guid))
                    {
                        // Broadcast Branch-Wide Reality Summary to Branch Admins Group
                        var branchStats = await dashboardService.GetTodaysSummaryAsync(guid, null);
                        await _hubContext.Clients.Group($"BranchAdmins-{branchId}").SendAsync("ReceptionSummaryUpdated", branchStats);

                        // If the event corresponds to a specific desk, push only to that desk
                        if (targetUserId.HasValue && targetUserId.Value != Guid.Empty)
                        {
                            var userStats = await dashboardService.GetTodaysSummaryAsync(guid, targetUserId.Value);
                            await _hubContext.Clients.User(targetUserId.Value.ToString()).SendAsync("ReceptionSummaryUpdated", userStats);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalRNotifier] Error pushing Reality Summary update to branch admins via SignalR: {ex.Message}");
            }
        }

        public async Task NotifyPrintJobAsync(string branchId, string printerType, string payload)
        {
            if (string.IsNullOrEmpty(branchId) || string.IsNullOrEmpty(payload)) return;

            // Broadcast to the standardized capability group for the branch
            await _hubContext.Clients.Group($"Branch-{branchId}-{printerType}")
                .SendAsync("PrintJobReceived", new { type = printerType, payload = payload });
        }

        public async Task NotifyInventoryShortageAsync(string branchId, string specimenId, string tubeCode, int required, int available)
        {
            if (string.IsNullOrEmpty(branchId)) return;

            await _hubContext.Clients.Group($"Branch-{branchId}")
                .SendAsync("InventoryShortageReceived", new
                {
                    specimenId,
                    tubeCode,
                    required,
                    available,
                    timestamp = DateTime.UtcNow
                });
        }
    }
}
