using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Api.Hubs
{
    public class SampleHub : Hub
    {
        public async Task SendSampleUpdate(SampleDto sample)
        {
            await Clients.All.SendAsync("ReceiveSampleUpdate", sample);
        }
    }
}
