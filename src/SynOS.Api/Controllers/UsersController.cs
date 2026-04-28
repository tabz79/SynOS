// File: src/SynOS.Api/Controllers/UsersController.cs
// Author: Gemini
// Date: 2025-11-30

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SynOS.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
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

        /// <summary>
        /// Retrieves the profile of the currently authenticated user.
        /// </summary>
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null) return NotFound();

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
            var currentUserIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var isAdmin = User.IsInRole("Admin");

            if (!Guid.TryParse(currentUserIdString, out var currentUserId)) return Unauthorized();

            if (!isAdmin && currentUserId != userId)
            {
                return Forbid("You can only upload a signature for your own account.");
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest("File is required.");
            }
            
            try
            {
                var result = await _userService.UpdateUserSignatureAsync(userId, file, currentUserId);
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
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            try
            {
                var updatedUser = await _userService.UpdateProfileAsync(userId, dto);
                return Ok(updatedUser);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}
