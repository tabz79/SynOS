// File: src/SynOS.Services/IUserService.cs
// Author: Gemini
// Date: 2025-11-30

using Microsoft.AspNetCore.Http;
using SynOS.Models.DTOs;
using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IUserService
    {
        Task<UserDto?> GetUserByIdAsync(Guid userId);
        Task<UserSignatureDto> UpdateUserSignatureAsync(Guid userId, IFormFile signatureFile);
    }
}
