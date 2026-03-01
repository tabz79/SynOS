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
                var mode = CurrentMode;
                if (mode == "oversight")
                {
                    var queryBranchId = _httpContextAccessor.HttpContext?.Request.Query["branchId"].ToString();
                    if (string.IsNullOrEmpty(queryBranchId) || !Guid.TryParse(queryBranchId, out var branchId) || branchId == Guid.Empty)
                    {
                        // MANDATORY HARDENING (Requirement 2): Oversight REQUIRES valid non-empty BranchId
                        throw new System.ArgumentException("BranchId required for oversight mode");
                    }
                    return branchId;
                }

                // Operational Mode: Strictly bound to JWT branch_id claim
                var branchIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("branch_id")?.Value;
                return Guid.TryParse(branchIdClaim, out var bId) ? bId : Guid.Empty;
            }
        }

        public string CurrentMode
        {
            get
            {
                // Custom claim 'session_mode' added during login. Defaults to 'operational' for safety.
                return _httpContextAccessor.HttpContext?.User?.FindFirst("session_mode")?.Value ?? "operational";
            }
        }

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

        public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
    }
}
