// File: src/SynOS.Services/IUserService.cs
// Author: Gemini
// Date: 2025-11-30

using Microsoft.AspNetCore.Http;
using SynOS.Models.DTOs.Admin;
using SynOS.Models.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IUserService
    {
        Task<UserDto?> GetUserByIdAsync(Guid userId);
        Task<UserSignatureDto> UpdateUserSignatureAsync(Guid userId, IFormFile signatureFile);

        // New User Management methods
        Task<IReadOnlyList<User>> GetUsersAsync();
        Task<User> CreateUserAsync(CreateUserDto dto, Guid actorUserId);
        Task<User> UpdateUserAsync(Guid userId, UpdateUserDto dto, Guid actorUserId);
        Task DeleteUserAsync(Guid userId, Guid actorUserId);
        Task ResetPasswordAsync(Guid userId, ResetPasswordDto dto, Guid actorUserId);
    }
}
