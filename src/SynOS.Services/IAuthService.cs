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
        Task<System.Collections.Generic.IEnumerable<BranchSummaryDto>> GetBranchesForUserAsync(System.Guid userId);
        Task<LoginResponse> SwitchBranchAsync(System.Guid userId, System.Guid targetBranchId, string? ipAddress);
    }
}
