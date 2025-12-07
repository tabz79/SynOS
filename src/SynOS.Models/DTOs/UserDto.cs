// File: src/SynOS.Models/DTOs/UserDto.cs
// Author: Gemini
// Date: 2025-11-13

using System;

namespace SynOS.Models.DTOs
{
    public class UserDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string? Department { get; set; }
        public bool IsActive { get; set; }
    }
}
