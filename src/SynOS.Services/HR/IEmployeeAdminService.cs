using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.Entities.HR;
using SynOS.Models.DTOs.HR;

namespace SynOS.Services.HR
{
    public interface IEmployeeAdminService
    {
        Task CreateEmployee(Employee employee);
        Task UpdateEmployee(Employee employee);
        Task DeactivateEmployee(Guid employeeId);

        // --- Identity-Workforce Governance ---
        Task<IEnumerable<EmployeeProvisioningDto>> GetEmployeesPendingAccessAsync();
        Task ProvisionUserFromEmployeeAsync(Guid employeeId, string username, string? email, string password, List<string> roles);
        Task DeactivateUserAccessAsync(Guid employeeId);
        Task ReactivateUserAccessAsync(Guid employeeId);
        Task SyncEmployeesFromUsersAsync(); // Dev-only migration bridge
    }
}
