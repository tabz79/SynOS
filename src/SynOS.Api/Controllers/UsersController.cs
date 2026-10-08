// File: src/SynOS.Api/Controllers/UsersController.cs
// Author: Gemini
// Date: 2025-11-30

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Admin;

namespace SynOS.Api.Controllers
{
    [Route("api/v1/users")]
    [ApiController]
    [Authorize] // Base authentication required
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        private Guid? GetCurrentUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? User.FindFirst("sub")?.Value
                            ?? User.FindFirst("nameid")?.Value
                            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
            if (Guid.TryParse(userIdString, out var userId)) return userId;
            return null;
        }

        /// <summary>
        /// Retrieves the profile of the currently authenticated user.
        /// </summary>
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile([FromServices] SynOSDbContext dbContext)
        {
            var userId = GetCurrentUserId();
            UserDto? user = null;

            if (userId.HasValue)
            {
                user = await _userService.GetUserByIdAsync(userId.Value);
            }

            if (user == null)
            {
                var username = User.FindFirst("username")?.Value 
                            ?? User.FindFirst(ClaimTypes.Name)?.Value 
                            ?? User.FindFirst("unique_name")?.Value;
                if (!string.IsNullOrEmpty(username))
                {
                    var entity = await dbContext.Users
                        .Include(u => u.UserRoles)
                            .ThenInclude(ur => ur.Role)
                        .FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
                    if (entity != null)
                    {
                        user = new UserDto
                        {
                            UserId = entity.UserId,
                            Name = entity.Name,
                            Email = entity.Email,
                            Role = entity.UserRoles?.FirstOrDefault()?.Role?.Name ?? "Pathologist",
                            Designation = entity.Designation,
                            IsActive = entity.IsActive,
                            CanUseOperationalMode = entity.CanUseOperationalMode,
                            CanUseOversightMode = entity.CanUseOversightMode,
                            SignatureImageUrl = entity.SignatureImageUrl,
                            SignatureUpdatedAt = entity.SignatureUpdatedAt
                        };
                    }
                }
            }

            if (user == null)
            {
                // Fallback to synthesizing profile from authenticated claims to prevent UI hard lockout
                user = new UserDto
                {
                    UserId = userId ?? Guid.Empty,
                    Name = User.FindFirst(ClaimTypes.Name)?.Value ?? "Consultant",
                    Email = User.FindFirst(ClaimTypes.Email)?.Value ?? "",
                    Role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Pathologist",
                    Designation = "Consultant",
                    IsActive = true,
                    CanUseOperationalMode = true,
                    CanUseOversightMode = true
                };
            }

            return Ok(user);
        }

        /// <summary>
        /// Uploads or updates a signature image. Users can upload for themselves, or Admins can upload for anyone.
        /// </summary>
        /// <param name="userId">The ID of the user.</param>
        /// <param name="file">The signature image file (JPG or PNG).</param>
        [HttpPost("{userId}/signature")]
        [Consumes("multipart/form-data")] // Forces Swagger to show file upload UI
        public async Task<IActionResult> UploadSignature(Guid userId, IFormFile file)
        {
            // Security: Only allow self-upload or Admin-upload
            var currentUserId = GetCurrentUserId();
            var isAdmin = User.IsInRole("Admin");

            if (!currentUserId.HasValue) return Unauthorized();

            if (!isAdmin && currentUserId.Value != userId)
            {
                return Forbid("You can only upload a signature for your own account.");
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest("File is required.");
            }
            
            try
            {
                var result = await _userService.UpdateUserSignatureAsync(userId, file, currentUserId.Value);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPatch("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            try
            {
                var updatedUser = await _userService.UpdateProfileAsync(userId.Value, dto);
                return Ok(updatedUser);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}
