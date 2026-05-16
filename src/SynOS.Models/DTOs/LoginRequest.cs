// File: src/SynOS.Models/DTOs/LoginRequest.cs
// Author: Gemini
// Date: 2025-11-13

using System.ComponentModel.DataAnnotations;

namespace SynOS.Models.DTOs
{
    public class LoginRequest
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        public Guid? BranchId { get; set; } // ADDED for Phase 1A: Explicit Branch Selection
    }
}
