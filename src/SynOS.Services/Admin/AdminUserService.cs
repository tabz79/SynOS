using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Entities.Operations;
using SynOS.Models.Entities.HR;
using BCrypt.Net;
using SynOS.Services;
using SynOS.Services.Security;

namespace SynOS.Services.Admin
{
    public class AdminUserService : IAdminUserService
    {
        private readonly SynOSDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IUserContext _userContext;

        public AdminUserService(SynOSDbContext context, IAuditService auditService, IUserContext userContext)
        {
            _context = context;
            _auditService = auditService;
            _userContext = userContext;
        }

        public async Task<User> CreateUserAsync(string username, string email, string name, string password, string? designation = null)
        {
            if (await _context.Users.AnyAsync(u => u.Username == username))
            {
                throw new InvalidOperationException("User with this username already exists.");
            }
            if (await _context.Users.AnyAsync(u => u.Email == email))
            {
                throw new InvalidOperationException("User with this email already exists.");
            }

            var user = new User
            {
                UserId = Guid.NewGuid(),
                Username = username,
                Email = email,
                Name = name,
                Designation = designation,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Auto-sync employee record (Dual Provisioning Approach Path B)
            var names = name.Split(' ', 2);
            var firstName = names[0];
            var lastName = names.Length > 1 ? names[1] : "";
            var employee = new Employee
            {
                EmployeeId = Guid.NewGuid(),
                UserId = user.UserId,
                FirstName = firstName,
                LastName = lastName,
                JobTitle = designation ?? "Staff",
                Department = "GENERAL",
                JoinDate = DateTimeOffset.UtcNow,
                IsActive = true,
                BaseSalary = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return user;
        }

        public async Task SetUserStatusAsync(Guid userId, bool isActive)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found.");

            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task AssignBranchRoleAsync(Guid userId, Guid branchId, Guid? roleId, string? roleName = null)
        {
            // Verify user and branch exist
            if (!await _context.Users.AnyAsync(u => u.UserId == userId)) throw new KeyNotFoundException("User not found.");
            if (!await _context.Branches.AnyAsync(b => b.BranchId == branchId)) throw new KeyNotFoundException("Branch not found.");

            // Resolve RoleId if only name is provided
            if (!roleId.HasValue || roleId == Guid.NewGuid() || roleId == Guid.Empty)
            {
                if (string.IsNullOrEmpty(roleName)) throw new ArgumentException("Either RoleId or RoleName must be provided.");
                var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == roleName.ToLower());
                if (role == null) throw new KeyNotFoundException($"Role '{roleName}' not found.");
                roleId = role.RoleId;
            }

            if (!await _context.Roles.AnyAsync(r => r.RoleId == roleId.Value)) throw new KeyNotFoundException("Role not found.");

            // Avoid duplicates
            if (await _context.UserBranchRoles.AnyAsync(ubr => ubr.UserId == userId && ubr.BranchId == branchId && ubr.RoleId == roleId.Value))
            {
                return; // Already assigned
            }

            var assignment = new UserBranchRole
            {
                UserBranchRoleId = Guid.NewGuid(),
                UserId = userId,
                BranchId = branchId,
                RoleId = roleId.Value,
                AssignedAt = DateTime.UtcNow
            };

            _context.UserBranchRoles.Add(assignment);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "AssignBranchRole",
                "User",
                userId,
                new { BranchId = branchId, RoleId = roleId.Value });
        }

        public async Task RemoveBranchRoleAsync(Guid userId, Guid branchId, Guid roleId)
        {
            var assignment = await _context.UserBranchRoles
                .FirstOrDefaultAsync(ubr => ubr.UserId == userId && ubr.BranchId == branchId && ubr.RoleId == roleId);

            if (assignment != null)
            {
                _context.UserBranchRoles.Remove(assignment);
                await _context.SaveChangesAsync();

                await _auditService.LogAsync(
                    _userContext.CurrentUserId,
                    "RemoveBranchRole",
                    "User",
                    userId,
                    new { BranchId = branchId, RoleId = roleId });
            }
        }

        public async Task<IEnumerable<UserAdminDto>> GetAllUsersAsync()
        {
            return await _context.Users
                .Select(u => new UserAdminDto
                {
                    UserId = u.UserId,
                    Username = u.Username,
                    Email = u.Email,
                    Name = u.Name,
                    Designation = u.Designation,
                    SignatureImageUrl = u.SignatureImageUrl,
                    IsActive = u.IsActive,
                    DepartmentCode = _context.OperationalResources
                        .Where(or => or.UserId == u.UserId)
                        .Select(or => or.DepartmentCode)
                        .FirstOrDefault() ?? "GENERAL",
                    BranchRoles = _context.UserBranchRoles
                        .Where(ubr => ubr.UserId == u.UserId)
                        .Select(ubr => new BranchRoleDto
                        {
                            BranchId = ubr.BranchId,
                            BranchName = ubr.Branch.Name,
                            RoleId = ubr.RoleId,
                            RoleName = ubr.Role.Name
                        }).ToList(),
                    WorkspaceIds = _context.UserWorkspaceAccesses
                        .Where(uwa => uwa.UserId == u.UserId)
                        .Select(uwa => uwa.WorkspaceId)
                        .ToList()
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<BranchDto>> GetAllBranchesAsync()
        {
            return await _context.Branches
                .Select(b => new BranchDto 
                { 
                    BranchId = b.BranchId, 
                    Code = b.Code, 
                    Name = b.Name, 
                    IsActive = b.IsActive,
                    Address = b.Address,
                    Phone = b.Phone,
                    Email = b.Email
                })
                .ToListAsync();
        }

        public async Task<Branch> CreateBranchAsync(string code, string name, string? address = null, string? phone = null, string? email = null)
        {
            // Enforce branch license limit
            var profile = await _context.LabProfiles.AsNoTracking().FirstOrDefaultAsync();
            var maxBranches = profile?.MaximumBranches ?? 1;
            var currentCount = await _context.Branches.CountAsync();
            if (currentCount >= maxBranches)
            {
                throw new InvalidOperationException($"Branch creation limit reached. Your license allows a maximum of {maxBranches} branches.");
            }

            var upperCode = code.Trim().ToUpperInvariant();
            if (await _context.Branches.AnyAsync(b => b.Code == upperCode))
            {
                throw new InvalidOperationException($"Branch with code '{upperCode}' already exists.");
            }

            var branch = new Branch
            {
                BranchId = Guid.NewGuid(),
                Code = upperCode,
                Name = name.Trim(),
                IsActive = true,
                Address = address?.Trim(),
                Phone = phone?.Trim(),
                Email = email?.Trim()
            };

            _context.Branches.Add(branch);
            await _context.SaveChangesAsync();

            // Log create event
            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "CreateBranch",
                "Branch",
                branch.BranchId,
                new { Code = branch.Code, Name = branch.Name, Address = branch.Address, Phone = branch.Phone, Email = branch.Email }
            );

            return branch;
        }

        public async Task<Branch> UpdateBranchAsync(Guid branchId, string code, string name, bool isActive, string? address = null, string? phone = null, string? email = null)
        {
            var branch = await _context.Branches.FindAsync(branchId);
            if (branch == null)
            {
                throw new KeyNotFoundException("Branch not found.");
            }

            var upperCode = code.Trim().ToUpperInvariant();
            if (branch.Code != upperCode && await _context.Branches.AnyAsync(b => b.Code == upperCode))
            {
                throw new InvalidOperationException($"Branch with code '{upperCode}' already exists.");
            }

            if (branch.Code == "MAIN" && !isActive)
            {
                throw new InvalidOperationException("Default branch (MAIN) cannot be deactivated.");
            }

            var oldDetails = new { branch.Code, branch.Name, branch.IsActive, branch.Address, branch.Phone, branch.Email };

            branch.Code = upperCode;
            branch.Name = name.Trim();
            branch.IsActive = isActive;
            branch.Address = address?.Trim();
            branch.Phone = phone?.Trim();
            branch.Email = email?.Trim();

            await _context.SaveChangesAsync();

            // Log update event
            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "UpdateBranch",
                "Branch",
                branch.BranchId,
                new { Old = oldDetails, New = new { branch.Code, branch.Name, branch.IsActive, branch.Address, branch.Phone, branch.Email } }
            );

            return branch;
        }

        public async Task DeleteBranchAsync(Guid branchId)
        {
            var branch = await _context.Branches.FindAsync(branchId);
            if (branch == null)
            {
                throw new KeyNotFoundException("Branch not found.");
            }

            if (branch.Code == "MAIN")
            {
                throw new InvalidOperationException("Default branch (MAIN) cannot be deleted.");
            }

            if (await _context.UserBranchRoles.AnyAsync(ubr => ubr.BranchId == branchId))
            {
                throw new InvalidOperationException("Cannot delete branch with active user assignments. Deactivate it instead.");
            }

            _context.Branches.Remove(branch);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<RoleDto>> GetAllRolesAsync()
        {
            return await _context.Roles
                .Select(r => new RoleDto { RoleId = r.RoleId, Name = r.Name })
                .ToListAsync();
        }

        public async Task<IEnumerable<OperationalResourceDto>> GetOperationalResourcesAsync()
        {
            return await _context.OperationalResources
                .Include(r => r.User)
                .Select(r => new OperationalResourceDto
                {
                    OperationalResourceId = r.OperationalResourceId,
                    UserName = r.User.Name,
                    Role = r.Role,
                    DepartmentCode = r.DepartmentCode,
                    IsActive = r.IsActive
                })
                .ToListAsync();
        }

        public async Task UpdateOperationalResourceAsync(Guid resourceId, string departmentCode)
        {
            var resource = await _context.OperationalResources.FindAsync(resourceId);
            if (resource == null) throw new KeyNotFoundException("Operational resource not found.");

            resource.DepartmentCode = departmentCode;
            await _context.SaveChangesAsync();
        }

        public async Task SyncOperationalResourcesAsync()
        {
            // 1. Get all users who have at least one branch role
            var branchRoles = await _context.UserBranchRoles
                .Include(ubr => ubr.User)
                .Include(ubr => ubr.Role)
                .ToListAsync();

            var userIdsWithRoles = branchRoles.Select(br => br.UserId).Distinct().ToList();
            
            // 2. Get existing resources
            var existingResources = await _context.OperationalResources.ToListAsync();

            foreach (var userId in userIdsWithRoles)
            {
                var resource = existingResources.FirstOrDefault(r => r.UserId == userId);
                var primaryRole = branchRoles.FirstOrDefault(br => br.UserId == userId);
                
                if (primaryRole == null) continue;

                if (resource == null)
                {
                    // PROVISION MISSING RESOURCE
                    resource = new OperationalResource
                    {
                        OperationalResourceId = Guid.NewGuid(),
                        UserId = userId,
                        BranchId = primaryRole.BranchId,
                        Role = primaryRole.Role.Name,
                        DepartmentCode = "GENERAL",
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.OperationalResources.Add(resource);
                }
                else
                {
                    // SYNC EXISTING
                    resource.Role = primaryRole.Role.Name;
                    resource.IsActive = true;
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task UpdateUserAsync(Guid userId, string name, string username, string email, string? designation, bool isActive, string departmentCode)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found.");

            // Check username/email uniqueness
            if (user.Username != username && await _context.Users.AnyAsync(u => u.Username == username))
                throw new InvalidOperationException("Username is already in use.");
            if (user.Email != email && await _context.Users.AnyAsync(u => u.Email == email))
                throw new InvalidOperationException("Email is already in use.");

            user.Name = name;
            user.Username = username;
            user.Email = email;
            user.Designation = designation;
            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;

            // Sync Employee details
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee != null)
            {
                var names = name.Split(' ', 2);
                employee.FirstName = names[0];
                employee.LastName = names.Length > 1 ? names[1] : "";
                employee.JobTitle = designation ?? employee.JobTitle;
                employee.IsActive = isActive;
                employee.UpdatedAt = DateTime.UtcNow;
            }

            // Sync OperationalResource details
            var resource = await _context.OperationalResources.FirstOrDefaultAsync(r => r.UserId == userId);
            if (resource != null)
            {
                resource.DepartmentCode = departmentCode;
                resource.IsActive = isActive;
            }

            await _context.SaveChangesAsync();
        }

        public async Task ResetPasswordAsync(Guid userId, string newPassword)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task UnlockUserAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found.");

            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<DepartmentMaster>> GetAllDepartmentsAsync()
        {
            return await _context.DepartmentMasters.Where(d => d.IsActive).OrderBy(d => d.Name).ToListAsync();
        }

        public async Task<DepartmentMaster> CreateDepartmentAsync(string code, string name, string? macroDepartment = null)
        {
            var upperCode = code.Trim().ToUpperInvariant();
            if (upperCode == "GENERAL" || upperCode == "RAD")
            {
                throw new InvalidOperationException("Reserved system department codes (GENERAL, RAD) cannot be created manually.");
            }
            if (await _context.DepartmentMasters.AnyAsync(d => d.Code == upperCode))
            {
                throw new InvalidOperationException($"Department with code '{upperCode}' already exists.");
            }

            var dept = new DepartmentMaster
            {
                DepartmentId = Guid.NewGuid(),
                Code = upperCode,
                Name = name.Trim(),
                MacroDepartment = string.IsNullOrWhiteSpace(macroDepartment) ? "Pathology" : macroDepartment.Trim(),
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.DepartmentMasters.Add(dept);
            await _context.SaveChangesAsync();
            return dept;
        }

        public async Task<DepartmentMaster> UpdateDepartmentAsync(Guid departmentId, string name, string? macroDepartment, bool isActive)
        {
            var dept = await _context.DepartmentMasters.FindAsync(departmentId);
            if (dept == null)
            {
                throw new KeyNotFoundException("Department not found.");
            }

            if (dept.Code == "GENERAL" || dept.Code == "RAD" || 
                dept.Name.Equals("General Laboratory Operations", StringComparison.OrdinalIgnoreCase) || 
                dept.Name.Equals("Radiology", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Reserved system departments (General/Radiology) cannot be modified.");
            }

            dept.Name = name.Trim();
            dept.MacroDepartment = string.IsNullOrWhiteSpace(macroDepartment) ? "Pathology" : macroDepartment.Trim();
            dept.IsActive = isActive;
            
            await _context.SaveChangesAsync();
            return dept;
        }

        public async Task DeleteDepartmentAsync(Guid departmentId)
        {
            var dept = await _context.DepartmentMasters.FindAsync(departmentId);
            if (dept == null)
            {
                throw new KeyNotFoundException("Department not found.");
            }

            if (dept.Code == "GENERAL" || dept.Code == "RAD" || 
                dept.Name.Equals("General Laboratory Operations", StringComparison.OrdinalIgnoreCase) || 
                dept.Name.Equals("Radiology", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Reserved system departments (General/Radiology) cannot be deleted.");
            }

            _context.DepartmentMasters.Remove(dept);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Workspace>> GetWorkspacesAsync()
        {
            return await _context.Workspaces.OrderBy(w => w.Name).ToListAsync();
        }

        public async Task<Workspace> CreateWorkspaceAsync(string name, string routePath)
        {
            var cleanRoute = routePath.Trim().ToLowerInvariant();
            if (await _context.Workspaces.AnyAsync(w => w.RoutePath.ToLower() == cleanRoute))
            {
                throw new InvalidOperationException($"Workspace with route '{routePath}' already exists.");
            }

            var ws = new Workspace
            {
                WorkspaceId = Guid.NewGuid(),
                Name = name.Trim(),
                RoutePath = routePath.Trim(),
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Workspaces.Add(ws);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "CreateWorkspace",
                "Workspace",
                ws.WorkspaceId,
                new { Name = ws.Name, RoutePath = ws.RoutePath }
            );

            return ws;
        }

        public async Task<Workspace> UpdateWorkspaceAsync(Guid workspaceId, string name, string routePath, bool isActive)
        {
            var ws = await _context.Workspaces.FindAsync(workspaceId);
            if (ws == null) throw new KeyNotFoundException("Workspace not found.");

            var cleanRoute = routePath.Trim().ToLowerInvariant();
            if (ws.RoutePath.ToLower() != cleanRoute && await _context.Workspaces.AnyAsync(w => w.RoutePath.ToLower() == cleanRoute))
            {
                throw new InvalidOperationException($"Workspace with route '{routePath}' already exists.");
            }

            var oldValues = new { ws.Name, ws.RoutePath, ws.IsActive };

            ws.Name = name.Trim();
            ws.RoutePath = routePath.Trim();
            ws.IsActive = isActive;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "UpdateWorkspace",
                "Workspace",
                ws.WorkspaceId,
                new { Old = oldValues, New = new { ws.Name, ws.RoutePath, ws.IsActive } }
            );

            return ws;
        }

        public async Task DeleteWorkspaceAsync(Guid workspaceId)
        {
            var ws = await _context.Workspaces.FindAsync(workspaceId);
            if (ws == null) throw new KeyNotFoundException("Workspace not found.");

            var wsData = new { ws.Name, ws.RoutePath };

            _context.Workspaces.Remove(ws);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "DeleteWorkspace",
                "Workspace",
                workspaceId,
                wsData
            );
        }

        public async Task SetUserWorkspaceAccessesAsync(Guid userId, IEnumerable<Guid> workspaceIds)
        {
            if (!await _context.Users.AnyAsync(u => u.UserId == userId))
            {
                throw new KeyNotFoundException("User not found.");
            }

            // Remove existing workspace accesses
            var existingAccesses = await _context.UserWorkspaceAccesses
                .Where(uwa => uwa.UserId == userId)
                .ToListAsync();

            var oldAccesses = existingAccesses.Select(ea => ea.WorkspaceId).ToList();

            _context.UserWorkspaceAccesses.RemoveRange(existingAccesses);

            // Add new workspace accesses
            var newAccesses = new List<Guid>();
            foreach (var wsId in workspaceIds)
            {
                if (await _context.Workspaces.AnyAsync(w => w.WorkspaceId == wsId))
                {
                    var uwa = new UserWorkspaceAccess
                    {
                        UserWorkspaceAccessId = Guid.NewGuid(),
                        UserId = userId,
                        WorkspaceId = wsId,
                        AssignedAt = DateTimeOffset.UtcNow
                    };
                    _context.UserWorkspaceAccesses.Add(uwa);
                    newAccesses.Add(wsId);
                }
            }

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                _userContext.CurrentUserId,
                "SetUserWorkspaces",
                "User",
                userId,
                new { OldWorkspaceIds = oldAccesses, NewWorkspaceIds = newAccesses }
            );
        }

        public async Task<IEnumerable<ModalityMaster>> GetAllModalitiesAsync()
        {
            return await _context.ModalityMasters
                .Include(m => m.DepartmentMaster)
                .OrderBy(m => m.Name)
                .ToListAsync();
        }

        public async Task<ModalityMaster> CreateModalityAsync(string code, string name, Guid departmentId)
        {
            var upperCode = code.Trim().ToUpperInvariant();

            var dept = await _context.DepartmentMasters.FindAsync(departmentId);
            if (dept == null)
            {
                throw new KeyNotFoundException($"Department with ID '{departmentId}' not found.");
            }

            if (await _context.ModalityMasters.AnyAsync(m => m.Code == upperCode))
            {
                throw new InvalidOperationException($"Modality with code '{upperCode}' already exists.");
            }

            var modality = new ModalityMaster
            {
                ModalityId = Guid.NewGuid(),
                Code = upperCode,
                Name = name.Trim(),
                DepartmentId = departmentId,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.ModalityMasters.Add(modality);
            await _context.SaveChangesAsync();
            return modality;
        }

        public async Task DeleteModalityAsync(Guid modalityId)
        {
            var modality = await _context.ModalityMasters.FindAsync(modalityId);
            if (modality == null)
            {
                throw new KeyNotFoundException("Modality not found.");
            }

            var referencesTest = await _context.Tests.AnyAsync(t => t.ModalityId == modalityId && t.IsActive);
            if (referencesTest)
            {
                throw new InvalidOperationException("Cannot delete modality because it is currently assigned to one or more active tests.");
            }

            _context.ModalityMasters.Remove(modality);
            await _context.SaveChangesAsync();
        }
    }
}
