using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.HR;
using SynOS.Models.DTOs.HR;
using BCrypt.Net;

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
            if (employee.EmployeeId == Guid.Empty) employee.EmployeeId = Guid.NewGuid();
            employee.CreatedAt = DateTime.UtcNow;
            employee.UpdatedAt = DateTime.UtcNow;
            
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateEmployee(Employee employee)
        {
            employee.UpdatedAt = DateTime.UtcNow;
            _context.Employees.Update(employee);
            await _context.SaveChangesAsync();
        }

        public async Task DeactivateEmployee(Guid employeeId)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee != null)
            {
                employee.IsActive = false;
                employee.UpdatedAt = DateTime.UtcNow;

                if (employee.UserId.HasValue)
                {
                    var user = await _context.Users.FindAsync(employee.UserId.Value);
                    if (user != null)
                    {
                        user.IsActive = false;
                        user.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<EmployeeProvisioningDto>> GetEmployeesPendingAccessAsync()
        {
            return await _context.Employees
                .Where(e => e.UserId == null && e.IsActive)
                .Select(e => new EmployeeProvisioningDto
                {
                    EmployeeId = e.EmployeeId,
                    DisplayName = $"{e.FirstName} {e.LastName}".Trim(),
                    Designation = e.JobTitle,
                    Department = e.Department,
                    JoinDate = e.JoinDate,
                    IsActive = e.IsActive
                })
                .ToListAsync();
        }

        public async Task ProvisionUserFromEmployeeAsync(Guid employeeId, string username, string? email, string password, List<string> roles)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null) throw new KeyNotFoundException("Employee not found.");
            if (employee.UserId != null) throw new InvalidOperationException("Employee already has a linked user account.");

            // Check if username is taken
            if (await _context.Users.AnyAsync(u => u.Username == username))
                throw new InvalidOperationException("Username is already in use.");

            // 1. Create User
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Username = username,
                Email = email,
                Name = $"{employee.FirstName} {employee.LastName}".Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Designation = employee.JobTitle,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);

            // 2. Assign Roles (Explicit Assignment)
            var roleEntities = await _context.Roles
                .Where(r => roles.Contains(r.Name))
                .ToListAsync();

            foreach (var role in roleEntities)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.UserId, RoleId = role.RoleId });
            }

            // 3. Link Employee
            employee.UserId = user.UserId;
            employee.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task DeactivateUserAccessAsync(Guid employeeId)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null || employee.UserId == null) return;

            var user = await _context.Users.FindAsync(employee.UserId);
            if (user != null)
            {
                user.IsActive = false;
                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task ReactivateUserAccessAsync(Guid employeeId)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null || employee.UserId == null) return;

            var user = await _context.Users.FindAsync(employee.UserId);
            if (user != null)
            {
                user.IsActive = true;
                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task SyncEmployeesFromUsersAsync()
        {
            // DEV-ONLY Migration Bridge: Ensures legacy seeded users have employee records
            var users = await _context.Users.ToListAsync();
            var employees = await _context.Employees.ToListAsync();

            foreach (var user in users)
            {
                if (!employees.Any(e => e.UserId == user.UserId))
                {
                    // Provision skeleton employee (HR identity)
                    var names = user.Name.Split(' ', 2);
                    var firstName = names[0];
                    var lastName = names.Length > 1 ? names[1] : "";

                    var newEmployee = new Employee
                    {
                        EmployeeId = Guid.NewGuid(),
                        UserId = user.UserId,
                        FirstName = firstName,
                        LastName = lastName,
                        JobTitle = user.Designation ?? "System Staff",
                        Department = "General",
                        JoinDate = DateTimeOffset.UtcNow,
                        IsActive = user.IsActive,
                        BaseSalary = 0, // Manual setup required
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Employees.Add(newEmployee);
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}
