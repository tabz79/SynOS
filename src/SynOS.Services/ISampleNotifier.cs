using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    /// <summary>
    /// Defines a contract for sending real-time notifications related to samples.
    /// This decouples the core service logic from the specific notification technology (e.g., SignalR).
    /// </summary>
    public interface ISampleNotifier
    {
        Task NotifySampleUpdateAsync(SampleDto sample);
    }
}
