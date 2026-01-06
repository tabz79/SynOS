using System;
using System.Threading.Tasks;
using SynOS.Models.Entities.HR;

namespace SynOS.Services.HR
{
    public interface IEmployeeAdminService
    {
        Task CreateEmployee(Employee employee);
        Task UpdateEmployee(Employee employee);
        Task DeactivateEmployee(Guid employeeId);
    }
}
