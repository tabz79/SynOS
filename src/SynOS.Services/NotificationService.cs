using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace SynOS.Services
{
    public class NotificationService : INotificationService
    {
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(ILogger<NotificationService> logger)
        {
            _logger = logger;
        }

        public Task SendSmsAsync(string phoneNumber, string message)
        {
            // In a real implementation, this would use an SMS gateway like Twilio.
            _logger.LogInformation("--- SIMULATING SMS ---");
            _logger.LogInformation("To: {PhoneNumber}", phoneNumber);
            _logger.LogInformation("Message: {Message}", message);
            _logger.LogInformation("--- END SMS SIMULATION ---");
            return Task.CompletedTask;
        }

        public Task SendWhatsAppAsync(string phoneNumber, string message)
        {
            // In a real implementation, this would use a WhatsApp provider like Twilio.
            _logger.LogInformation("--- SIMULATING WHATSAPP ---");
            _logger.LogInformation("To: {PhoneNumber}", phoneNumber);
            _logger.LogInformation("Message: {Message}", message);
            _logger.LogInformation("--- END WHATSAPP SIMULATION ---");
            return Task.CompletedTask;
        }

        public Task SendEmailAsync(string emailAddress, string subject, string htmlBody)
        {
            // In a real implementation, this would use an email service like SendGrid or SMTP.
            _logger.LogInformation("--- SIMULATING EMAIL ---");
            _logger.LogInformation("To: {EmailAddress}", emailAddress);
            _logger.LogInformation("Subject: {Subject}", subject);
            _logger.LogInformation("Body: {Body}", htmlBody);
            _logger.LogInformation("--- END EMAIL SIMULATION ---");
            return Task.CompletedTask;
        }
    }
}
