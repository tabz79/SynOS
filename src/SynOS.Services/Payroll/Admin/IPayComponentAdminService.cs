using System;
using System.Threading.Tasks;
using SynOS.Models.Enums; // For PayComponentType
using SynOS.Models.Entities.Payroll;

namespace SynOS.Services.Payroll.Admin
{
    public interface IPayComponentAdminService
    {
        Task<PayComponent> CreatePayComponentAsync(string name, PayComponentType componentType); // V1: Returns entity as technical debt
        Task<PayComponent> UpdatePayComponentAsync(Guid payComponentId, string name); // V1: Returns entity as technical debt
        Task DeactivatePayComponentAsync(Guid payComponentId);
    }
}
