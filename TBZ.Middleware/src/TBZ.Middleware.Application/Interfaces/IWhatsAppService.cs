using System.Threading.Tasks;
using TBZ.Middleware.Application.DTOs;

namespace TBZ.Middleware.Application.Interfaces
{
    public interface IWhatsAppService
    {
        Task<WhatsAppSendResult> SendTemplateAsync(string recipient, string templateName, string language, object[] parameters);
        Task<WhatsAppSendResult> SendTextAsync(string recipient, string text);
        Task<bool> MarkMessageAsReadAsync(string messageId);
        Task<string> UploadMediaAsync(byte[] mediaBytes, string fileName, string mimeType);
        Task<WhatsAppSendResult> SendDocumentAsync(string recipient, string mediaId, string fileName, string? caption = null);
        Task<WhatsAppSendResult> SendImageAsync(string recipient, string mediaId, string? caption = null);
    }
}
