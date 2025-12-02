using Microsoft.AspNetCore.Mvc;
using SynOS.Models.DTOs;
using SynOS.Services;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http; // Needed for FileStreamResult
using Microsoft.AspNetCore.Authorization; // Added for AllowAnonymous


namespace SynOS.Api.Controllers;

[ApiController]
[Route("api/v1/public/reports")]
[AllowAnonymous] // Allow public access to this controller
public class SecureDownloadController : ControllerBase
{
    private readonly IDeliveryService _deliveryService;
    private readonly ILogger<SecureDownloadController> _logger;

    public SecureDownloadController(IDeliveryService deliveryService, ILogger<SecureDownloadController> logger)
    {
        _deliveryService = deliveryService;
        _logger = logger;
    }

    [HttpGet("verify/{token}")]
    [ProducesResponseType(typeof(SecureLinkVerificationDto), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> VerifyLink(string token)
    {
        var secureLinkDetails = await _deliveryService.GetSecureLinkVerificationDetailsAsync(token);
        
        if (!secureLinkDetails.Valid) // Check the Valid property of the DTO
        {
            _logger.LogWarning("Secure link verification failed for token: {Token} (Invalid or Expired)", token);
            // Return 401 if invalid/expired, otherwise 404 if not found (though service handles not found by returning Valid = false)
            return Unauthorized(new { error = "InvalidLinkOrExpired" });
        }

        return Ok(secureLinkDetails);
    }

    [HttpGet("download/{token}")]
    [ProducesResponseType(typeof(FileStreamResult), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DownloadReport(string token, [FromQuery] string phone)
    {
        if (string.IsNullOrEmpty(phone))
        {
            _logger.LogWarning("Download attempt for token {Token} failed: phone query parameter is missing.", token);
            return BadRequest(new { error = "Phone number is required." });
        }

        try
        {
            var fileStream = await _deliveryService.VerifyAndDownloadAsync(token, phone);
            // Assuming the filename can be derived or is stored with the report.
            // For now, a generic filename. The service should ideally return filename too.
            var fileName = $"Report_{token}.pdf"; 
            Response.Headers.Add("X-Content-Type-Options", "nosniff");
            Response.Headers.Add("X-Frame-Options", "DENY");
            Response.Headers.Add("Content-Security-Policy", "default-src 'none'");
            return File(fileStream, "application/pdf", fileName);
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 401)
        {
            _logger.LogWarning("Secure download failed for token {Token} (phone mismatch/invalid): {Message}", token, ex.Message);
            return Unauthorized(new { error = ex.Message });
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode == 400 || ex.StatusCode == 404)
        {
            _logger.LogWarning("Secure download failed for token {Token} (bad request/not found): {Message}", token, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }
}
