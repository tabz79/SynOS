// File: src/SynOS.Api/Controllers/UsersController.cs
// Author: Gemini
// Date: 2025-11-30

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SynOS.Api.Authorization;
using SynOS.Services;
using System;
using System.Threading.Tasks;

namespace SynOS.Api.Controllers
{
    [Route("api/v1/users")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Uploads or updates a signature image for a specific user.
        /// </summary>
        /// <param name="userId">The ID of the user.</param>
        /// <param name="file">The signature image file (JPG or PNG).</param>
        /// <returns>An object containing the user ID and the new signature URL.</returns>
        [HttpPost("{userId}/signature")]
        [AuthorizeRoles("Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> UploadSignature(Guid userId, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("File is required.");
            }
            
            try
            {
                var result = await _userService.UpdateUserSignatureAsync(userId, file);
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
    }
}
