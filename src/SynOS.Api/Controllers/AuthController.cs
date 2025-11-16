using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Services;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace SynOS.Api.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var response = await _authService.Authenticate(request, IpAddress());
                SetTokenCookie(response.RefreshToken);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { code = "INVALID_CREDENTIALS", message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
            {
                return Unauthorized(new { code = "MISSING_REFRESH_TOKEN", message = "Refresh token is required." });
            }

            try
            {
                var response = await _authService.RefreshToken(refreshToken, IpAddress());
                SetTokenCookie(response.RefreshToken);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { code = "INVALID_REFRESH_TOKEN", message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
            {
                return BadRequest(new { code = "MISSING_REFRESH_TOKEN", message = "Refresh token is required." });
            }

            try
            {
                var result = await _authService.Logout(refreshToken, IpAddress());
                if (result)
                {
                    return Ok();
                }
                return BadRequest(new { code = "INVALID_REFRESH_TOKEN", message = "Invalid refresh token." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = "INTERNAL_SERVER_ERROR", message = ex.Message });
            }
        }

        private void SetTokenCookie(string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Expires = DateTime.UtcNow.AddDays(7),
                SameSite = SameSiteMode.Strict,
                Secure = true
            };
            Response.Cookies.Append("refreshToken", token, cookieOptions);
        }

        private string IpAddress()
        {
            if (Request.Headers.ContainsKey("X-Forwarded-For"))
                return Request.Headers["X-Forwarded-For"];
            else
                return HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString();
        }
    }
}
