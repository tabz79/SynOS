using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Workers
{
    public class WhatsappDeliveryWorker : BackgroundService
    {
        private readonly ILogger<WhatsappDeliveryWorker> _logger;
        private readonly IServiceProvider _serviceProvider;

        public WhatsappDeliveryWorker(ILogger<WhatsappDeliveryWorker> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WhatsApp Delivery Worker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<MiddlewareDbContext>();

                    // Process pending WhatsApp notifications
                    var pendingItems = await db.DeliveryQueueItems
                        .Where(i => i.Status == "Pending")
                        .OrderBy(i => i.CreatedAt)
                        .Take(10)
                        .ToListAsync(stoppingToken);

                    if (pendingItems.Any())
                    {
                        _logger.LogInformation("Processing {Count} WhatsApp messages...", pendingItems.Count);

                        foreach (var item in pendingItems)
                        {
                            // Mocking external WhatsApp provider invocation
                            _logger.LogInformation("[WHATSAPP MOCK SEND] To: {Phone}, MessageType: {Type}, Payload: {Payload}", 
                                item.Phone, item.MessageType, item.PayloadJson);

                            // Mark as sent
                            item.Status = "Sent";
                            item.SentAt = DateTime.UtcNow;
                        }

                        await db.SaveChangesAsync(stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing WhatsApp queue items.");
                }

                // Poll every 5 seconds
                await Task.Delay(5000, stoppingToken);
            }
        }
    }
}
