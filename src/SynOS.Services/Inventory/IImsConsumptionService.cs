using System;
using System.Threading.Tasks;

namespace SynOS.Services.Inventory
{
    public interface IImsConsumptionService
    {
        Task ConsumeForVisitAsync(Guid visitId, Guid userId);
        Task ConsumeForSpecimenAsync(Guid specimenId, Guid userId);
        Task ConsumeForTestAsync(Guid orderId, Guid userId);
        Task ConsumeForPrintAsync(Guid visitId, Guid userId);
    }
}
