using System.Threading.Tasks;
using SynOS.Models.Events.Reception;

namespace SynOS.Services
{
    public interface IEventPublishingService
    {
        Task PublishVisitFinalizedAsync(PrintThermalReceiptEvent @event);
    }
}
