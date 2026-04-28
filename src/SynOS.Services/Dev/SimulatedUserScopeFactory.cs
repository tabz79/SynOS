using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SynOS.Models.Entities;

namespace SynOS.Services.Dev
{
    public interface ISimulatedUserScopeFactory
    {
        IDisposable Create(User user, string roleName);
    }

    public class SimulatedUserScopeFactory : ISimulatedUserScopeFactory
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SimulatedUserScopeFactory(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public IDisposable Create(User user, string roleName)
        {
            return new SimulatedUserScope(_httpContextAccessor, user, roleName);
        }

        private class SimulatedUserScope : IDisposable
        {
            private readonly IHttpContextAccessor _httpContextAccessor;
            private readonly ClaimsPrincipal _originalUser;

            public SimulatedUserScope(IHttpContextAccessor httpContextAccessor, User user, string roleName)
            {
                _httpContextAccessor = httpContextAccessor;
                _originalUser = _httpContextAccessor.HttpContext?.User;

                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Name, user.Name),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, roleName),
                    new Claim("branch_id", (user.DefaultBranchId ?? Guid.Parse("A0000000-0000-0000-0000-000000000001")).ToString()),
                    new Claim("session_mode", "operational"),
                    new Claim("session_id", Guid.NewGuid().ToString()),
                    new Claim("department_code", "Pathology") // Defaulting for Pathology flow
                };

                var identity = new ClaimsIdentity(claims, "Simulated");
                var principal = new ClaimsPrincipal(identity);

                if (_httpContextAccessor.HttpContext != null)
                {
                    _httpContextAccessor.HttpContext.User = principal;
                }
            }

            public void Dispose()
            {
                if (_httpContextAccessor.HttpContext != null)
                {
                    _httpContextAccessor.HttpContext.User = _originalUser;
                }
            }
        }
    }
}
