// File: src/SynOS.Models/DTOs/LoginResponse.cs
// Author: Gemini
// Date: 2025-11-13

using System;

namespace SynOS.Models.DTOs
{
    public class LoginResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public int ExpiresIn { get; set; } // in seconds
        public UserDto User { get; set; } = new UserDto();
        public bool RequiresBranchSelection { get; set; } // ADDED for Phase 1A
        public System.Collections.Generic.List<BranchSummaryDto>? AvailableBranches { get; set; } // ADDED for Phase 1A
        public bool RequiresModeSelection { get; set; } // ADDED for Phase 1B
        public System.Collections.Generic.List<string>? AvailableModes { get; set; } // ADDED for Phase 1B
    }

    public class BranchSummaryDto
    {
        public Guid BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}
