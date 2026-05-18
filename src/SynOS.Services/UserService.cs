// File: src/SynOS.Services/UserService.cs
// Author: Gemini
// Date: 2025-11-30

using AutoMapper;
using Microsoft.AspNetCore.Http;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Admin;
using SynOS.Services.Storage;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Models.Entities;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace SynOS.Services
{
    public class UserService : IUserService
    {
        private readonly SynOSDbContext _context;
        private readonly IFileStorageService _fileStorageService;
        private readonly IMapper _mapper;
        private readonly IAuditService _auditService;

        public UserService(SynOSDbContext context, IFileStorageService fileStorageService, IMapper mapper, IAuditService auditService)
        {
            _context = context;
            _fileStorageService = fileStorageService;
            _mapper = mapper;
            _auditService = auditService;
        }

        public async Task<UserDto?> GetUserByIdAsync(Guid userId)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            return _mapper.Map<UserDto>(user);
        }

        public async Task<UserSignatureDto> UpdateUserSignatureAsync(Guid userId, IFormFile signatureFile, Guid actorUserId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found.");
            }

            var allowedMimeTypes = new List<string> { "image/jpeg", "image/png" };
            var maxFileSize = 512 * 1024; // 512 KB

            // Capture old URL for cleanup and audit
            var oldSignatureUrl = user.SignatureImageUrl;

            // GPT-5: Collision-proof and Cache-busting naming
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var guidFragment = Guid.NewGuid().ToString("N").Substring(0, 4);
            var extension = Path.GetExtension(signatureFile.FileName);
            var newFileName = $"{userId}_{timestamp}_{guidFragment}{extension}";

            // Step 1: Save new file first
            byte[] fileBytes;
            using (var ms = new MemoryStream())
            {
                await signatureFile.OpenReadStream().CopyToAsync(ms);
                fileBytes = ms.ToArray();
            }
            var newSignatureUrl = await _fileStorageService.SaveFileAsync(fileBytes, newFileName, "signatures");

            // Step 2: Update Database
            user.SignatureImageUrl = newSignatureUrl;
            user.SignatureUpdatedAt = DateTimeOffset.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            // Step 3: Cleanup old file (Selective/Elective)
            if (!string.IsNullOrEmpty(oldSignatureUrl) && oldSignatureUrl != newSignatureUrl)
            {
                await _fileStorageService.DeleteFileAsync(oldSignatureUrl);
            }

            // Step 4: Enriched Audit Log
            await _auditService.LogAsync(actorUserId, "SIGNATURE_UPDATED", "UserSignature", userId, new 
            { 
                OldSignatureUrl = oldSignatureUrl,
                NewSignatureUrl = newSignatureUrl,
                UserId = userId,
                Timestamp = DateTimeOffset.UtcNow
            });

            return new UserSignatureDto
            {
                UserId = user.UserId,
                SignatureImageUrl = user.SignatureImageUrl,
                UpdatedAt = user.SignatureUpdatedAt
            };
        }

        public async Task<IReadOnlyList<User>> GetUsersAsync()
        {
            return await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).AsNoTracking().ToListAsync();
        }

        public async Task<IReadOnlyList<User>> GetPathologistsAsync()
        {
            return await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Where(u => u.UserRoles.Any(ur => ur.Role.Name == "Pathologist"))
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<User> CreateUserAsync(CreateUserDto dto, Guid actorUserId)
        {
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = dto.Email,
                Name = dto.Name,
                Designation = dto.Designation,
                PasswordHash = HashPassword(dto.Password),
                IsActive = true,
                CreatedAt = DateTime.UtcNow, // Corrected to DateTime.UtcNow
                UpdatedAt = DateTime.UtcNow // Corrected to DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == dto.Role);
            if (role != null)
            {
                var userRole = new UserRole { UserId = user.UserId, RoleId = role.RoleId };
                _context.UserRoles.RemoveRange(_context.UserRoles.Where(ur => ur.UserId == user.UserId)); // Remove existing roles
                _context.UserRoles.Add(userRole);
                await _context.SaveChangesAsync();
            }

            await _auditService.LogAsync(actorUserId, "CreateUser", "User", user.UserId, user);
            return user;
        }

        public async Task<User> UpdateUserAsync(Guid userId, UpdateUserDto dto, Guid actorUserId)
        {
            var user = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            var oldUser = _mapper.Map<User>(user);

            user.Email = dto.Email;
            user.Name = dto.Name;
            user.Designation = dto.Designation;
            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow; // Corrected to DateTime.UtcNow

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == dto.Role);
            if (role != null && (user.UserRoles.FirstOrDefault()?.RoleId != role.RoleId))
            {
                _context.UserRoles.RemoveRange(_context.UserRoles.Where(ur => ur.UserId == user.UserId));
                _context.UserRoles.Add(new UserRole { UserId = userId, RoleId = role.RoleId });
            }

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(actorUserId, "UpdateUser", "User", userId, new { Old = oldUser, New = user });
            return user;
        }

        public async Task DeleteUserAsync(Guid userId, Guid actorUserId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            user.IsActive = false; // Soft delete
            user.UpdatedAt = DateTime.UtcNow; // Corrected to DateTime.UtcNow
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(actorUserId, "DeleteUser", "User", userId, new { userId, deleted = true });
        }

        public async Task ResetPasswordAsync(Guid userId, ResetPasswordDto dto, Guid actorUserId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            user.PasswordHash = HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow; // Corrected to DateTime.UtcNow
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(actorUserId, "ResetPassword", "User", userId, new { userId });
        }

        public async Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null) throw new KeyNotFoundException("User not found");

            user.Name = dto.Name;
            user.Designation = dto.Designation;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "UPDATE_PROFILE", "User", userId, new { Name = user.Name, Designation = user.Designation });

            return _mapper.Map<UserDto>(user);
        }

        private string HashPassword(string password)
        {
            byte[] salt = new byte[128 / 8];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }

            string hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: 100000,
                numBytesRequested: 256 / 8));

            return $"{Convert.ToBase64String(salt)}.{hashed}";
        }
    }
}