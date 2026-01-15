using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace SynOS.Services.Security
{
    public class UserContext : IUserContext
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserContext(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid CurrentUserId
        {
            get
            {
                var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
            }
        }

        public Guid CurrentBranchId
        {
            get
            {
                // Custom claim 'branch_id' added during login
                var branchIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("branch_id")?.Value;
                return Guid.TryParse(branchIdClaim, out var branchId) ? branchId : Guid.Empty;
            }
        }

        public string CurrentRole
        {
            get
            {
                return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
            }
        }

        public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
    }
}
