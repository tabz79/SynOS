using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface INotificationService
    {
        Task SendSmsAsync(string phoneNumber, string message);
        Task SendWhatsAppAsync(string phoneNumber, string message);
        Task SendEmailAsync(string emailAddress, string subject, string htmlBody);
    }
}
