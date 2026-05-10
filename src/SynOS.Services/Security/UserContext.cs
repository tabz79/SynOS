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

        public string UserName
        {
            get
            {
                return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty;
            }
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
                // If a branchId is explicitly provided in the query string, allow it for high-privilege users (Admins).
                // This allows Admins to view reports/dashboards for different branches without re-logging.
                var queryBranchId = _httpContextAccessor.HttpContext?.Request.Query["branchId"].ToString();
                if (!string.IsNullOrEmpty(queryBranchId) && Guid.TryParse(queryBranchId, out var qbId) && qbId != Guid.Empty)
                {
                    if (CurrentRole == "Admin" || CurrentRole == "SystemAdmin") return qbId;
                }

                // Default: Strictly bound to JWT branch_id claim
                var branchIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("branch_id")?.Value;
                return Guid.TryParse(branchIdClaim, out var bId) ? bId : Guid.Empty;
            }
        }

        public string CurrentMode => "operational"; // Modes are deprecated

        public Guid CurrentSessionId
        {
            get
            {
                // Custom claim 'session_id' added during login for Single Operational Session
                var sessionIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("session_id")?.Value;
                return Guid.TryParse(sessionIdClaim, out var sessionId) ? sessionId : Guid.Empty;
            }
        }

        public string CurrentRole
        {
            get
            {
                return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
            }
        }

        public string DepartmentCode
        {
            get
            {
                // Retrieve department_code claim added during login
                return _httpContextAccessor.HttpContext?.User?.FindFirst("department_code")?.Value ?? string.Empty;
            }
        }

        public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
    }
}
