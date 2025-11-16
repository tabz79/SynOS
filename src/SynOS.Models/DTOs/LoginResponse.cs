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
    }
}
