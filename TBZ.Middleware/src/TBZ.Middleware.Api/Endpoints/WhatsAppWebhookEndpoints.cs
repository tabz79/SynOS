using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TBZ.Middleware.Application.Configuration;
using TBZ.Middleware.Application.DTOs;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Domain;

namespace TBZ.Middleware.Api.Endpoints
{
    public static class WhatsAppWebhookEndpoints
    {
        public static void MapWhatsAppWebhookEndpoints(this IEndpointRouteBuilder app)
        {
            // GET /api/webhooks/whatsapp (Verification challenge)
            app.MapGet("/api/webhooks/whatsapp", (
                HttpContext context,
                IOptions<WhatsAppOptions> options,
                ILoggerFactory loggerFactory) =>
            {
                var logger = loggerFactory.CreateLogger("WhatsAppWebhook");
                var query = context.Request.Query;

                var mode = query["hub.mode"].ToString();
                var token = query["hub.verify_token"].ToString();
                var challenge = query["hub.challenge"].ToString();

                logger.LogInformation("Webhook verify challenge request. Mode: {Mode}, Token: {Token}", mode, token);

                if (mode == "subscribe" && token == options.Value.VerifyToken)
                {
                    logger.LogInformation("Webhook verified successfully.");
                    return Results.Content(challenge, "text/plain");
                }

                logger.LogWarning("Webhook verification failed. VerifyToken mismatch.");
                return Results.BadRequest("Verification failed");
            });

            // POST /api/webhooks/whatsapp (Webhook Events)
            app.MapPost("/api/webhooks/whatsapp", async (
                HttpContext context,
                INotificationDbContext db,
                IOptions<WhatsAppOptions> options,
                ILoggerFactory loggerFactory) =>
            {
                var logger = loggerFactory.CreateLogger("WhatsAppWebhook");
                
                // Read raw request body
                context.Request.EnableBuffering();
                using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true);
                var rawBody = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;

                // Validate signature
                if (!context.Request.Headers.TryGetValue("X-Hub-Signature-256", out var signatureHeaderValue))
                {
                    logger.LogWarning("Missing X-Hub-Signature-256 header.");
                    return Results.Unauthorized();
                }

                var signatureHeader = signatureHeaderValue.ToString();
                if (!ValidateSignature(rawBody, signatureHeader, options.Value.AppSecret))
                {
                    logger.LogWarning("Invalid X-Hub-Signature-256 header. Signature mismatch.");
                    return Results.Unauthorized();
                }

                logger.LogInformation("Inbound WhatsApp Webhook payload validated.");

                try
                {
                    using var jsonDoc = JsonDocument.Parse(rawBody);
                    var root = jsonDoc.RootElement;

                    if (root.TryGetProperty("entry", out var entryArray) && entryArray.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var entry in entryArray.EnumerateArray())
                        {
                            if (entry.TryGetProperty("changes", out var changesArray) && changesArray.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var change in changesArray.EnumerateArray())
                                {
                                    if (change.TryGetProperty("value", out var valueObj))
                                    {
                                        // 1. Process statuses
                                        if (valueObj.TryGetProperty("statuses", out var statusesArray) && statusesArray.ValueKind == JsonValueKind.Array)
                                        {
                                            foreach (var status in statusesArray.EnumerateArray())
                                            {
                                                var messageId = status.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                                                var statusString = status.TryGetProperty("status", out var statusProp) ? statusProp.GetString() : null;
                                                var recipientId = status.TryGetProperty("recipient_id", out var recipientProp) ? recipientProp.GetString() : null;
                                                var conversationId = status.TryGetProperty("conversation", out var convProp) && convProp.TryGetProperty("id", out var convIdProp) 
                                                    ? convIdProp.GetString() 
                                                    : null;

                                                logger.LogInformation("Processing status update. MessageId: {MessageId}, Status: {Status}", messageId, statusString);

                                                // Save the webhook event record
                                                var webhookEvent = new NotificationWebhookEvent
                                                {
                                                    Id = Guid.NewGuid(),
                                                    ReceivedAt = DateTime.UtcNow,
                                                    MessageId = messageId,
                                                    Status = statusString,
                                                    Phone = recipientId,
                                                    ConversationId = conversationId,
                                                    RawJson = rawBody
                                                };
                                                db.NotificationWebhookEvents.Add(webhookEvent);

                                                if (!string.IsNullOrEmpty(messageId))
                                                {
                                                    // Find the corresponding message and update
                                                    var message = await db.NotificationMessages.FirstOrDefaultAsync(m => m.MessageId == messageId);
                                                    if (message != null)
                                                    {
                                                        if (statusString == "delivered")
                                                        {
                                                            message.DeliveredAt = DateTime.UtcNow;
                                                        }
                                                        else if (statusString == "read")
                                                        {
                                                            message.ReadAt = DateTime.UtcNow;
                                                        }
                                                        else if (statusString == "failed")
                                                        {
                                                            message.FailedAt = DateTime.UtcNow;
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // 2. Process inbound messages (inbox)
                                        if (valueObj.TryGetProperty("messages", out var messagesArray) && messagesArray.ValueKind == JsonValueKind.Array)
                                        {
                                            foreach (var message in messagesArray.EnumerateArray())
                                            {
                                                var from = (message.TryGetProperty("from", out var fromProp) ? fromProp.GetString() : string.Empty) ?? string.Empty;
                                                var msgId = message.TryGetProperty("id", out var msgIdProp) ? msgIdProp.GetString() : null;
                                                var type = (message.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : string.Empty) ?? string.Empty;
                                                var body = string.Empty;

                                                if (type == "text" && message.TryGetProperty("text", out var textObj))
                                                {
                                                    body = textObj.TryGetProperty("body", out var bodyProp) ? bodyProp.GetString() : string.Empty;
                                                }
                                                else
                                                {
                                                    body = $"[Media Message: {type}]";
                                                }

                                                logger.LogInformation("Processing inbound WhatsApp message. From: {From}, Body: {Body}", from, body);

                                                var inboxItem = new NotificationInbox
                                                {
                                                    Id = Guid.NewGuid(),
                                                    Sender = from,
                                                    MessageId = msgId,
                                                    Channel = "WhatsApp",
                                                    Body = body ?? string.Empty,
                                                    ReceivedAt = DateTime.UtcNow,
                                                    RawPayload = rawBody,
                                                    Processed = false
                                                };
                                                db.NotificationInboxes.Add(inboxItem);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    await db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to parse inbound WhatsApp webhook body.");
                }

                return Results.Ok();
            });

            // POST /api/notifications/send (Direct immediate send)
            app.MapPost("/api/notifications/send", async (
                NotificationRequest request,
                INotificationService notificationService) =>
            {
                var result = await notificationService.SendAsync(request);
                return result.Success ? Results.Ok(result) : Results.BadRequest(result);
            })
            .WithName("SendNotificationDirect")
            .WithOpenApi();

            // POST /api/notifications/enqueue (Outbox queue enqueue)
            app.MapPost("/api/notifications/enqueue", async (
                NotificationRequest request,
                INotificationService notificationService) =>
            {
                await notificationService.EnqueueNotificationAsync(request);
                return Results.Accepted();
            })
            .WithName("EnqueueNotification")
            .WithOpenApi();
        }

        private static bool ValidateSignature(string rawBody, string signatureHeader, string appSecret)
        {
            if (string.IsNullOrEmpty(signatureHeader) || !signatureHeader.StartsWith("sha256="))
            {
                return false;
            }

            var expectedSignature = signatureHeader.Substring("sha256=".Length);
            var keyBytes = Encoding.UTF8.GetBytes(appSecret);
            var bodyBytes = Encoding.UTF8.GetBytes(rawBody);

            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(bodyBytes);
            var calculatedSignature = Convert.ToHexString(hashBytes).ToLower();

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedSignature.ToLower()),
                Encoding.UTF8.GetBytes(calculatedSignature));
        }
    }
}
