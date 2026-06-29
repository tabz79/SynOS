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

                    // Process pending or retrying WhatsApp notifications
                    var pendingItems = await db.DeliveryQueueItems
                        .Where(i => i.Status == "Pending" || (i.Status == "Failed" && i.RetryCount < 3))
                        .OrderBy(i => i.CreatedAt)
                        .Take(10)
                        .ToListAsync(stoppingToken);

                    if (pendingItems.Any())
                    {
                        _logger.LogInformation("Processing {Count} WhatsApp messages...", pendingItems.Count);

                        // 1. Move to Sending state
                        foreach (var item in pendingItems)
                        {
                            item.Status = "Sending";
                        }
                        await db.SaveChangesAsync(stoppingToken);

                        // 2. Perform provider call mock
                        foreach (var item in pendingItems)
                        {
                            try
                            {
                                _logger.LogInformation("[WHATSAPP MOCK SEND] To: {Phone}, MessageType: {Type}, Payload: {Payload}", 
                                    item.Phone, item.MessageType, item.PayloadJson);

                                // Simulate transient failures for testing: numbers ending in 999 fail
                                if (item.Phone.EndsWith("999"))
                                {
                                    throw new InvalidOperationException("WhatsApp API provider returned Gateway Timeout (504).");
                                }

                                // Mark as sent
                                item.Status = "Sent";
                                item.SentAt = DateTime.UtcNow;
                                item.FailureReason = null;
                            }
                            catch (Exception ex)
                            {
                                item.RetryCount++;
                                item.FailureReason = ex.Message;
                                _logger.LogWarning("WhatsApp dispatch failed for {Phone} (Retry {Count}): {Error}", item.Phone, item.RetryCount, ex.Message);

                                item.Status = "Failed";
                            }
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
