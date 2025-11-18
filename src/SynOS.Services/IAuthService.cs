// File: src/SynOS.Services/IAuthService.cs
// Author: Gemini
// Date: 2025-11-13

using SynOS.Models.DTOs;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IAuthService
    {
        Task<LoginResponse> Authenticate(LoginRequest request, string? ipAddress);
        Task<LoginResponse> RefreshToken(string token, string? ipAddress);
        Task<bool> Logout(string token, string? ipAddress);
    }
}
