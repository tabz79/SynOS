using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using BCrypt.Net;

namespace SynOS.Services.Admin
{
    public class AdminUserService : IAdminUserService
    {
        private readonly SynOSDbContext _context;

        public AdminUserService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<User> CreateUserAsync(string email, string name, string password)
        {
            if (await _context.Users.AnyAsync(u => u.Email == email))
            {
                throw new InvalidOperationException("User with this email already exists.");
            }

            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = email,
                Name = name,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
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

        public async Task AssignBranchRoleAsync(Guid userId, Guid branchId, Guid roleId)
        {
            // Verify user, branch, and role exist
            if (!await _context.Users.AnyAsync(u => u.UserId == userId)) throw new KeyNotFoundException("User not found.");
            if (!await _context.Branches.AnyAsync(b => b.BranchId == branchId)) throw new KeyNotFoundException("Branch not found.");
            if (!await _context.Roles.AnyAsync(r => r.RoleId == roleId)) throw new KeyNotFoundException("Role not found.");

            // Avoid duplicates
            if (await _context.UserBranchRoles.AnyAsync(ubr => ubr.UserId == userId && ubr.BranchId == branchId && ubr.RoleId == roleId))
            {
                return; // Already assigned
            }

            var assignment = new UserBranchRole
            {
                UserBranchRoleId = Guid.NewGuid(),
                UserId = userId,
                BranchId = branchId,
                RoleId = roleId,
                AssignedAt = DateTime.UtcNow
            };

            _context.UserBranchRoles.Add(assignment);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveBranchRoleAsync(Guid userId, Guid branchId, Guid roleId)
        {
            var assignment = await _context.UserBranchRoles
                .FirstOrDefaultAsync(ubr => ubr.UserId == userId && ubr.BranchId == branchId && ubr.RoleId == roleId);

            if (assignment != null)
            {
                _context.UserBranchRoles.Remove(assignment);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<UserAdminDto>> GetAllUsersAsync()
        {
            return await _context.Users
                .Select(u => new UserAdminDto
                {
                    UserId = u.UserId,
                    Email = u.Email,
                    Name = u.Name,
                    IsActive = u.IsActive,
                    BranchRoles = _context.UserBranchRoles
                        .Where(ubr => ubr.UserId == u.UserId)
                        .Select(ubr => new BranchRoleDto
                        {
                            BranchId = ubr.BranchId,
                            BranchName = ubr.Branch.Name,
                            RoleId = ubr.RoleId,
                            RoleName = ubr.Role.Name
                        }).ToList()
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<BranchDto>> GetAllBranchesAsync()
        {
            return await _context.Branches
                .Select(b => new BranchDto { BranchId = b.BranchId, Name = b.Name })
                .ToListAsync();
        }

        public async Task<IEnumerable<RoleDto>> GetAllRolesAsync()
        {
            return await _context.Roles
                .Select(r => new RoleDto { RoleId = r.RoleId, Name = r.Name })
                .ToListAsync();
        }
    }
}
