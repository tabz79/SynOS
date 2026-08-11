using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Notifications;
using SynOS.Models.Entities;
using SynOS.Models.Enums;

namespace SynOS.Services;

public interface IDeliveryService
{
    Task<List<DeliveryQueueItemDto>> GetDeliveryQueueAsync(string? department, string? status);
    Task<DeliveryResultDto> DeliverViaPrintAsync(Guid reportId, Guid userId);
    Task<DeliveryResultWithLinkDto> DeliverViaWhatsAppAsync(Guid reportId, string phone, Guid userId, bool includeDicomZip = false);
    Task<DeliveryResultWithLinkDto> DeliverViaSmsAsync(Guid reportId, string phone, Guid userId);
    Task<DeliveryResultDto> DeliverViaEmailAsync(Guid reportId, string email, Guid userId);
    Task<SecureLinkDto> GenerateSecureLinkAsync(Guid reportId, Guid userId);
    Task<Stream> VerifyAndDownloadAsync(string token, string phone);
    Task<bool> VerifyPhoneOnlyAsync(string token, string phone);
    Task<Stream> DownloadReportPackageAsync(string token, string phoneNumber);
    Task<DeliveryResultDto> MarkHandedOverAsync(Guid reportId, Guid userId);
    Task<List<DeliveryAttemptDto>> GetAttemptsAsync(Guid reportId);
    Task<DeliveryResultDto> ResendAsync(Guid reportId, DeliveryMethod method, Guid userId);
    Task<SecureLinkVerificationDto> GetSecureLinkVerificationDetailsAsync(string token);
}
