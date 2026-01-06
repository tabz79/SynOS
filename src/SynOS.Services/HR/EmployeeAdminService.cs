using System;
using System.Threading.Tasks;
using SynOS.Data;
using SynOS.Models.Entities.HR;

namespace SynOS.Services.HR
{
    public class EmployeeAdminService : IEmployeeAdminService
    {
        private readonly SynOSDbContext _context;

        public EmployeeAdminService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task CreateEmployee(Employee employee)
        {
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateEmployee(Employee employee)
        {
            _context.Employees.Update(employee);
            await _context.SaveChangesAsync();
        }

        public async Task DeactivateEmployee(Guid employeeId)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee != null)
            {
                employee.IsActive = false;
                await _context.SaveChangesAsync();
            }
        }
    }
}
