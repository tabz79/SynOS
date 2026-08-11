using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynOS.Models.DTOs;
using SynOS.Models.Enums;
using SynOS.Services;
using System.Security.Claims; // For accessing UserId from claims

namespace SynOS.Api.Controllers;

[ApiController]
[Route("api/v1/delivery")]
[Authorize(Policy = "DeliveryPolicy")]

public class DeliveryController : ControllerBase
{
    private readonly IDeliveryService _deliveryService;
    private readonly ILogger<DeliveryController> _logger;

    public DeliveryController(IDeliveryService deliveryService, ILogger<DeliveryController> logger)
    {
        _deliveryService = deliveryService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var parsedUserId))
        {
            _logger.LogWarning("Current user ID not found or invalid in claims.");
            throw new UnauthorizedAccessException("User ID not found in claims.");
        }
        return parsedUserId;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetGatewayStatus([FromServices] SynOS.Data.SynOSDbContext dbContext)
    {
        var pendingCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(dbContext.OutboxEvents, e => e.Status == "Pending" || e.Status == "Failed");
        var deadLetterCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(dbContext.OutboxEvents, e => e.Status == "DeadLetter");
        var profile = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(dbContext.LabProfiles.AsNoTracking());

        return Ok(new
        {
            isHealthy = SynOS.Services.Security.MiddlewareSyncHealth.IsHealthy,
            statusMessage = SynOS.Services.Security.MiddlewareSyncHealth.StatusMessage,
            lastSyncTime = SynOS.Services.Security.MiddlewareSyncHealth.LastSyncTime,
            lastError = SynOS.Services.Security.MiddlewareSyncHealth.LastError,
            pendingOutboxCount = pendingCount,
            deadLetterCount = deadLetterCount,
            labId = profile?.LabId ?? "LAB002",
            middlewareUrl = profile?.MiddlewareApiUrl ?? "https://cloud.tbzlabs.in/api/events"
        });
    }

    [HttpGet("queue")]
    [ProducesResponseType(typeof(List<DeliveryQueueItemDto>), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> GetDeliveryQueue([FromQuery] string? dept, [FromQuery] string? status)
    {
        var queue = await _deliveryService.GetDeliveryQueueAsync(dept, status);
        return Ok(queue);
    }

    [HttpPost("print")]
    [ProducesResponseType(typeof(DeliveryResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> DeliverViaPrint([FromBody] DeliveryRequestDto request)
    {
        var userId = GetCurrentUserId();
        var result = await _deliveryService.DeliverViaPrintAsync(request.ReportId, userId);
        return Ok(result);
    }

    [HttpPost("whatsapp")]
    [ProducesResponseType(typeof(DeliveryResultWithLinkDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> DeliverViaWhatsApp([FromBody] DeliveryWithPhoneRequestDto request)
    {
        var userId = GetCurrentUserId();
        var result = await _deliveryService.DeliverViaWhatsAppAsync(request.ReportId, request.Phone, userId, request.IncludeDicom);
        return Ok(result);
    }

    [HttpPost("sms")]
    [ProducesResponseType(typeof(DeliveryResultWithLinkDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> DeliverViaSms([FromBody] DeliveryWithPhoneRequestDto request)
    {
        var userId = GetCurrentUserId();
        var result = await _deliveryService.DeliverViaSmsAsync(request.ReportId, request.Phone, userId);
        return Ok(result);
    }

    [HttpPost("email")]
    [ProducesResponseType(typeof(DeliveryResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> DeliverViaEmail([FromBody] DeliveryWithEmailRequestDto request)
    {
        var userId = GetCurrentUserId();
        var result = await _deliveryService.DeliverViaEmailAsync(request.ReportId, request.Email, userId);
        return Ok(result);
    }

    [HttpPost("handed-over")]
    [ProducesResponseType(typeof(DeliveryResultDto), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> MarkHandedOver([FromBody] DeliveryRequestDto request)
    {
        var userId = GetCurrentUserId();
        var result = await _deliveryService.MarkHandedOverAsync(request.ReportId, userId);
        return Ok(result);
    }

    [HttpGet("reports/{reportId}/attempts")]
    [ProducesResponseType(typeof(List<DeliveryAttemptDto>), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> GetAttempts(Guid reportId)
    {
        var attempts = await _deliveryService.GetAttemptsAsync(reportId);
        return Ok(attempts);
    }

    [HttpPost("reports/{reportId}/resend")]
    [ProducesResponseType(typeof(DeliveryResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Resend(Guid reportId, [FromQuery] DeliveryMethod method)
    {
        var userId = GetCurrentUserId();
        var result = await _deliveryService.ResendAsync(reportId, method, userId);
        return Ok(result);
    }
}

// DTOs for requests (can be nested or in a separate file)
public record DeliveryRequestDto(Guid ReportId);
public record DeliveryWithPhoneRequestDto(Guid ReportId, string Phone, bool IncludeDicom = false);
public record DeliveryWithEmailRequestDto(Guid ReportId, string Email);
