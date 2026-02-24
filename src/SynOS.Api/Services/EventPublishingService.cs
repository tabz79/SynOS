using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SynOS.Api.Hubs;
using SynOS.Models.Events.Reception;
using SynOS.Services;

namespace SynOS.Api.Services
{
    public class EventPublishingService : IEventPublishingService
    {
        private readonly IHubContext<BranchOperationsHub> _hubContext;
        private readonly ILogger<EventPublishingService> _logger;

        public EventPublishingService(IHubContext<BranchOperationsHub> hubContext, ILogger<EventPublishingService> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task PublishVisitFinalizedAsync(PrintThermalReceiptEvent @event)
        {
            string groupName = $"Branch-{@event.BranchId}-Lead-Thermal80mm";
            
            _logger.LogInformation("Publishing PrintThermalReceiptEvent to {GroupName} (VisitId: {VisitId})", groupName, @event.VisitId);

            // Fire-and-forget broadcast to the strictly-gated Lead group
            await _hubContext.Clients.Group(groupName).SendAsync("OnPrintThermalReceipt", @event);
        }
    }
}
