using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using SynOS.Models.DTOs;
using SynOS.Services;

namespace SynOS.Api.Hubs
{
    /// <summary>
    /// Implements the ISampleNotifier interface using SignalR to broadcast updates.
    /// This class lives in the API layer and depends on the SignalR HubContext.
    /// </summary>
    public class SampleNotifier : ISampleNotifier
    {
        private readonly IHubContext<SampleHub> _hubContext;

        public SampleNotifier(IHubContext<SampleHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifySampleUpdateAsync(SampleDto sample)
        {
            await _hubContext.Clients.All.SendAsync("ReceiveSampleUpdate", sample);
        }
    }
}
