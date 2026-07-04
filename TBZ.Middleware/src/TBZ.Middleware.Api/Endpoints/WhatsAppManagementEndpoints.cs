using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TBZ.Middleware.Application.Configuration;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Endpoints
{
    public static class WhatsAppManagementEndpoints
    {
        public static void MapWhatsAppManagementEndpoints(this IEndpointRouteBuilder app)
        {
            // 1. GET /api/controltower/whatsapp/config
            app.MapGet("/api/controltower/whatsapp/config", (IOptionsSnapshot<WhatsAppOptions> options) =>
            {
                var val = options.Value;
                return Results.Ok(new
                {
                    AccessToken = string.IsNullOrEmpty(val.AccessToken) ? "" : val.AccessToken.Substring(0, Math.Min(6, val.AccessToken.Length)) + "...",
                    PhoneNumberId = val.PhoneNumberId,
                    BusinessAccountId = val.BusinessAccountId,
                    VerifyToken = val.VerifyToken,
                    AppSecret = string.IsNullOrEmpty(val.AppSecret) ? "" : "...",
                    GraphApiVersion = val.GraphApiVersion,
                    BaseUrl = val.BaseUrl,
                    CallbackUrl = "/api/webhooks/whatsapp",
                    PublicTunnelUrl = val.PublicTunnelUrl
                });
            });

            // 2. POST /api/controltower/whatsapp/config
            app.MapPost("/api/controltower/whatsapp/config", async (
                HttpContext context,
                IOptions<WhatsAppOptions> options) =>
            {
                using var doc = await JsonDocument.ParseAsync(context.Request.Body);
                var root = doc.RootElement;
                
                var accessToken = root.TryGetProperty("accessToken", out var tokenProp) ? tokenProp.GetString() : null;
                var phoneNumberId = root.TryGetProperty("phoneNumberId", out var phoneProp) ? phoneProp.GetString() : null;
                var businessAccountId = root.TryGetProperty("businessAccountId", out var bizProp) ? bizProp.GetString() : null;
                var verifyToken = root.TryGetProperty("verifyToken", out var verifyProp) ? verifyProp.GetString() : null;
                var appSecret = root.TryGetProperty("appSecret", out var secretProp) ? secretProp.GetString() : null;
                var graphApiVersion = root.TryGetProperty("graphApiVersion", out var verProp) ? verProp.GetString() : null;
                var publicTunnelUrl = root.TryGetProperty("publicTunnelUrl", out var tunnelProp) ? tunnelProp.GetString() : null;

                var path = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
                if (File.Exists(path))
                {
                    try
                    {
                        var json = await File.ReadAllTextAsync(path);
                        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
                        
                        Dictionary<string, string> whatsAppDict = new();
                        if (dict.TryGetValue("WhatsApp", out var whatsAppObj) && whatsAppObj != null)
                        {
                            whatsAppDict = JsonSerializer.Deserialize<Dictionary<string, string>>(whatsAppObj.ToString() ?? "{}") ?? new();
                        }
                        
                        if (accessToken != null && !accessToken.Contains("...")) whatsAppDict["AccessToken"] = accessToken;
                        if (phoneNumberId != null) whatsAppDict["PhoneNumberId"] = phoneNumberId;
                        if (businessAccountId != null) whatsAppDict["BusinessAccountId"] = businessAccountId;
                        if (verifyToken != null) whatsAppDict["VerifyToken"] = verifyToken;
                        if (appSecret != null && !appSecret.Contains("...")) whatsAppDict["AppSecret"] = appSecret;
                        if (graphApiVersion != null) whatsAppDict["GraphApiVersion"] = graphApiVersion;
                        if (publicTunnelUrl != null) whatsAppDict["PublicTunnelUrl"] = publicTunnelUrl;

                        dict["WhatsApp"] = whatsAppDict;
                        
                        var updatedJson = JsonSerializer.Serialize(dict, new JsonSerializerOptions { WriteIndented = true });
                        await File.WriteAllTextAsync(path, updatedJson);

                        // Also update User Secrets if it exists to avoid secrets overriding appsettings.json
                        try
                        {
                            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                            var secretsPath = Path.Combine(appData, "Microsoft", "UserSecrets", "dotnet-TBZ.Middleware.Api-e3b7c688-4299-4c12-9c3f-c6b71b80c58e", "secrets.json");
                            if (File.Exists(secretsPath))
                            {
                                var secretsJson = await File.ReadAllTextAsync(secretsPath);
                                var secretsDict = JsonSerializer.Deserialize<Dictionary<string, string>>(secretsJson) ?? new();
                                
                                if (accessToken != null && !accessToken.Contains("...")) secretsDict["WhatsApp:AccessToken"] = accessToken;
                                if (phoneNumberId != null) secretsDict["WhatsApp:PhoneNumberId"] = phoneNumberId;
                                if (businessAccountId != null) secretsDict["WhatsApp:BusinessAccountId"] = businessAccountId;
                                if (verifyToken != null) secretsDict["WhatsApp:VerifyToken"] = verifyToken;
                                if (appSecret != null && !appSecret.Contains("...")) secretsDict["WhatsApp:AppSecret"] = appSecret;
                                if (graphApiVersion != null) secretsDict["WhatsApp:GraphApiVersion"] = graphApiVersion;
                                if (publicTunnelUrl != null) secretsDict["WhatsApp:PublicTunnelUrl"] = publicTunnelUrl;

                                var updatedSecretsJson = JsonSerializer.Serialize(secretsDict, new JsonSerializerOptions { WriteIndented = true });
                                await File.WriteAllTextAsync(secretsPath, updatedSecretsJson);
                            }
                        }
                        catch (Exception secretsEx)
                        {
                            Console.WriteLine($"[WARNING] Failed to write back to User Secrets: {secretsEx.Message}");
                        }

                        // Reload options values directly
                        var opt = options.Value;
                        if (accessToken != null && !accessToken.Contains("...")) opt.AccessToken = accessToken;
                        if (phoneNumberId != null) opt.PhoneNumberId = phoneNumberId;
                        if (businessAccountId != null) opt.BusinessAccountId = businessAccountId;
                        if (verifyToken != null) opt.VerifyToken = verifyToken;
                        if (appSecret != null && !appSecret.Contains("...")) opt.AppSecret = appSecret;
                        if (graphApiVersion != null) opt.GraphApiVersion = graphApiVersion;
                        if (publicTunnelUrl != null) opt.PublicTunnelUrl = publicTunnelUrl;
                        
                        return Results.Ok(new { success = true });
                    }
                    catch (Exception ex)
                    {
                        return Results.BadRequest(new { success = false, message = ex.Message });
                    }
                }
                
                return Results.NotFound("appsettings.json not found");
            });

            // 3. POST /api/controltower/whatsapp/templates/sync
            app.MapPost("/api/controltower/whatsapp/templates/sync", async (
                IHttpClientFactory httpClientFactory,
                IOptionsSnapshot<WhatsAppOptions> options,
                MiddlewareDbContext db) =>
            {
                var val = options.Value;
                if (string.IsNullOrEmpty(val.AccessToken) || string.IsNullOrEmpty(val.BusinessAccountId))
                {
                    return Results.BadRequest("WhatsApp settings are not configured.");
                }

                try
                {
                    var client = httpClientFactory.CreateClient("WhatsAppClient");
                    var endpoint = $"{val.BusinessAccountId}/message_templates?limit=100";
                    var response = await client.GetAsync(endpoint);
                    if (!response.IsSuccessStatusCode)
                    {
                        var errorMsg = await response.Content.ReadAsStringAsync();
                        return Results.BadRequest($"Meta Graph API returned error: {response.StatusCode} - {errorMsg}");
                    }

                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;
                    var addedCount = 0;

                    if (root.TryGetProperty("data", out var dataProp) && dataProp.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in dataProp.EnumerateArray())
                        {
                            var name = item.TryGetProperty("name", out var n) ? n.GetString() : string.Empty;
                            var lang = item.TryGetProperty("language", out var l) ? l.GetString() : "en";
                            var status = item.TryGetProperty("status", out var s) ? s.GetString() : string.Empty;
                            var category = item.TryGetProperty("category", out var c) ? c.GetString() : "Utility";
                            
                            if (string.IsNullOrEmpty(name) || status != "APPROVED") continue;

                            var bodyPattern = string.Empty;
                            if (item.TryGetProperty("components", out var componentsProp) && componentsProp.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var comp in componentsProp.EnumerateArray())
                                {
                                    var type = comp.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : string.Empty;
                                    if (type == "BODY" && comp.TryGetProperty("text", out var textProp))
                                    {
                                        bodyPattern = textProp.GetString() ?? string.Empty;
                                    }
                                }
                            }

                            var placeholderCount = System.Text.RegularExpressions.Regex.Matches(bodyPattern, @"\{\{\d+\}\}").Count;
                            var mappings = new System.Collections.Generic.List<string>();
                            for (int i = 1; i <= placeholderCount; i++)
                            {
                                mappings.Add($"Param{i}");
                            }
                            var mappingsJson = JsonSerializer.Serialize(mappings);

                            var existing = await db.NotificationTemplates.FirstOrDefaultAsync(t => t.TemplateName == name && t.Language == lang);
                            if (existing != null)
                            {
                                existing.Category = category;
                                existing.BodyPattern = bodyPattern;
                                existing.LastSyncedFromMeta = DateTime.UtcNow;
                                existing.Approved = true;
                            }
                            else
                            {
                                db.NotificationTemplates.Add(new NotificationTemplate
                                {
                                    Id = Guid.NewGuid(),
                                    TemplateName = name,
                                    Language = lang,
                                    Category = category,
                                    Approved = true,
                                    LastSyncedFromMeta = DateTime.UtcNow,
                                    BodyPattern = bodyPattern,
                                    VariableMappingsJson = mappingsJson,
                                    Version = 1
                                });
                            }
                            addedCount++;
                        }

                        await db.SaveChangesAsync();
                    }

                    return Results.Ok(new { success = true, syncedCount = addedCount });
                }
                catch (Exception ex)
                {
                    return Results.Problem(ex.Message);
                }
            });

            // 4. GET /api/controltower/whatsapp/templates
            app.MapGet("/api/controltower/whatsapp/templates", async (MiddlewareDbContext db) =>
            {
                var templates = await db.NotificationTemplates
                    .Select(t => new
                    {
                        Id = t.Id,
                        TemplateName = t.TemplateName,
                        Name = t.TemplateName,
                        Language = t.Language,
                        Category = t.Category,
                        Approved = t.Approved,
                        BodyPattern = t.BodyPattern,
                        Body = t.BodyPattern,
                        VariableMappingsJson = t.VariableMappingsJson
                    })
                    .ToListAsync();
                return Results.Ok(templates);
            });

            // 5. POST /api/controltower/whatsapp/templates
            app.MapPost("/api/controltower/whatsapp/templates", async (
                HttpContext context,
                MiddlewareDbContext db) =>
            {
                using var doc = await JsonDocument.ParseAsync(context.Request.Body);
                var root = doc.RootElement;
                
                var id = root.TryGetProperty("id", out var idProp) ? idProp.GetGuid() : Guid.Empty;
                var templateName = root.TryGetProperty("templateName", out var nameProp) ? nameProp.GetString() : string.Empty;
                var language = root.TryGetProperty("language", out var langProp) ? langProp.GetString() : "en";
                var bodyPattern = root.TryGetProperty("bodyPattern", out var bodyProp) ? bodyProp.GetString() : string.Empty;
                var variableMappingsJson = root.TryGetProperty("variableMappingsJson", out var mapProp) ? mapProp.GetString() : "[]";

                var template = await db.NotificationTemplates.FindAsync(id);
                if (template == null)
                {
                    template = new NotificationTemplate
                    {
                        Id = Guid.NewGuid(),
                        TemplateName = templateName,
                        Language = language,
                        Version = 1,
                        Approved = true
                    };
                    db.NotificationTemplates.Add(template);
                }

                template.BodyPattern = bodyPattern;
                template.VariableMappingsJson = variableMappingsJson;
                template.LastSyncedFromMeta = DateTime.UtcNow;

                await db.SaveChangesAsync();
                return Results.Ok(template);
            });

            // 6. DELETE /api/controltower/whatsapp/templates/{id}
            app.MapDelete("/api/controltower/whatsapp/templates/{id}", async (Guid id, MiddlewareDbContext db) =>
            {
                var template = await db.NotificationTemplates.FindAsync(id);
                if (template != null)
                {
                    db.NotificationTemplates.Remove(template);
                    await db.SaveChangesAsync();
                    return Results.Ok(new { success = true });
                }
                return Results.NotFound();
            });

            // 6.5. Active Template Management Endpoints
            app.MapPost("/api/controltower/whatsapp/templates/active", async (
                HttpContext context,
                IOptions<WhatsAppOptions> options) =>
            {
                using var doc = await JsonDocument.ParseAsync(context.Request.Body);
                var root = doc.RootElement;
                var templateName = root.TryGetProperty("templateName", out var nameProp) ? nameProp.GetString() : string.Empty;

                if (string.IsNullOrEmpty(templateName))
                {
                    return Results.BadRequest("Template name cannot be empty");
                }

                var path = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
                if (File.Exists(path))
                {
                    try
                    {
                        var json = await File.ReadAllTextAsync(path);
                        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
                        
                        Dictionary<string, string> whatsAppDict = new();
                        if (dict.TryGetValue("WhatsApp", out var whatsAppObj) && whatsAppObj != null)
                        {
                            whatsAppDict = JsonSerializer.Deserialize<Dictionary<string, string>>(whatsAppObj.ToString() ?? "{}") ?? new();
                        }
                        
                        whatsAppDict["ActiveTemplateName"] = templateName;
                        dict["WhatsApp"] = whatsAppDict;
                        
                        var updatedJson = JsonSerializer.Serialize(dict, new JsonSerializerOptions { WriteIndented = true });
                        await File.WriteAllTextAsync(path, updatedJson);

                        // Update User Secrets
                        try
                        {
                            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                            var secretsPath = Path.Combine(appData, "Microsoft", "UserSecrets", "dotnet-TBZ.Middleware.Api-e3b7c688-4299-4c12-9c3f-c6b71b80c58e", "secrets.json");
                            if (File.Exists(secretsPath))
                            {
                                var secretsJson = await File.ReadAllTextAsync(secretsPath);
                                var secretsDict = JsonSerializer.Deserialize<Dictionary<string, string>>(secretsJson) ?? new();
                                secretsDict["WhatsApp:ActiveTemplateName"] = templateName;
                                var updatedSecretsJson = JsonSerializer.Serialize(secretsDict, new JsonSerializerOptions { WriteIndented = true });
                                await File.WriteAllTextAsync(secretsPath, updatedSecretsJson);
                            }
                        }
                        catch (Exception secretsEx)
                        {
                            Console.WriteLine($"[WARNING] Failed to write back to User Secrets: {secretsEx.Message}");
                        }

                        // Reload options value directly in memory
                        options.Value.ActiveTemplateName = templateName;
                        
                        return Results.Ok(new { success = true, activeTemplateName = templateName });
                    }
                    catch (Exception ex)
                    {
                        return Results.BadRequest(new { success = false, message = ex.Message });
                    }
                }
                
                return Results.NotFound("appsettings.json not found");
            });

            app.MapGet("/api/controltower/whatsapp/templates/active", (IOptionsSnapshot<WhatsAppOptions> options) =>
            {
                return Results.Ok(new { activeTemplateName = options.Value.ActiveTemplateName });
            });

            // 7. POST /api/controltower/whatsapp/logs/retry/{id}
            app.MapPost("/api/controltower/whatsapp/logs/retry/{id}", async (Guid id, MiddlewareDbContext db) =>
            {
                var outbox = await db.NotificationOutboxes.FindAsync(id);
                if (outbox != null)
                {
                    outbox.Status = NotificationStatus.Pending;
                    outbox.Attempts = 0;
                    outbox.LockedUntil = null;
                    outbox.NextRetry = DateTime.UtcNow;
                    outbox.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                    return Results.Ok(new { success = true });
                }
                return Results.NotFound();
            });

            // 8. POST /api/controltower/whatsapp/logs/cancel/{id}
            app.MapPost("/api/controltower/whatsapp/logs/cancel/{id}", async (Guid id, MiddlewareDbContext db) =>
            {
                var outbox = await db.NotificationOutboxes.FindAsync(id);
                if (outbox != null)
                {
                    outbox.Status = NotificationStatus.Failed;
                    outbox.Attempts = 5;
                    outbox.LockedUntil = null;
                    outbox.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                    return Results.Ok(new { success = true });
                }
                return Results.NotFound();
            });

            // 9. GET /api/controltower/whatsapp/webhook-events
            app.MapGet("/api/controltower/whatsapp/webhook-events", async (MiddlewareDbContext db) =>
            {
                var events = await db.NotificationWebhookEvents
                    .OrderByDescending(e => e.ReceivedAt)
                    .Take(100)
                    .ToListAsync();
                return Results.Ok(events);
            });

            // 10. GET /api/controltower/whatsapp/inbox
            app.MapGet("/api/controltower/whatsapp/inbox", async (MiddlewareDbContext db) =>
            {
                var inbox = await db.NotificationInboxes
                    .OrderByDescending(i => i.ReceivedAt)
                    .Take(100)
                    .ToListAsync();
                return Results.Ok(inbox);
            });

            // 11. POST /api/controltower/whatsapp/inbox/reply
            app.MapPost("/api/controltower/whatsapp/inbox/reply", async (
                HttpContext context,
                IWhatsAppService whatsAppService,
                MiddlewareDbContext db) =>
            {
                using var doc = await JsonDocument.ParseAsync(context.Request.Body);
                var root = doc.RootElement;
                var phone = root.GetProperty("phone").GetString() ?? string.Empty;
                var replyText = root.GetProperty("replyText").GetString() ?? string.Empty;
                var inboxId = root.TryGetProperty("inboxId", out var ibIdProp) ? ibIdProp.GetGuid() : Guid.Empty;

                if (string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(replyText))
                {
                    return Results.BadRequest("Recipient phone and replyText are required.");
                }

                var result = await whatsAppService.SendTextAsync(phone, replyText);
                if (result.Success)
                {
                    if (inboxId != Guid.Empty)
                    {
                        var inboxItem = await db.NotificationInboxes.FindAsync(inboxId);
                        if (inboxItem != null)
                        {
                            inboxItem.Processed = true;
                            inboxItem.ProcessedAt = DateTime.UtcNow;
                            await db.SaveChangesAsync();
                        }
                    }
                    return Results.Ok(new { success = true });
                }

                return Results.BadRequest(new { success = false, message = result.ErrorMessage });
            });

            // 12. GET /api/controltower/whatsapp/analytics
            app.MapGet("/api/controltower/whatsapp/analytics", async (MiddlewareDbContext db) =>
            {
                var now = DateTime.UtcNow;
                var today = now.Date;

                var sentCount = await db.NotificationMessages.CountAsync(m => m.SentAt != null);
                var deliveredCount = await db.NotificationMessages.CountAsync(m => m.DeliveredAt != null);
                var readCount = await db.NotificationMessages.CountAsync(m => m.ReadAt != null);
                var failedCount = await db.NotificationMessages.CountAsync(m => m.FailedAt != null);
                
                double readRate = 0;
                if (sentCount > 0)
                {
                    readRate = (double)readCount / sentCount;
                }

                double successRate = 0;
                var totalMessages = await db.NotificationMessages.CountAsync();
                if (totalMessages > 0)
                {
                    successRate = (double)sentCount / totalMessages;
                }

                double avgDeliveryTimeSeconds = 0;
                var deliveredMessages = await db.NotificationMessages
                    .Where(m => m.SentAt != null && m.DeliveredAt != null)
                    .Select(m => new { m.SentAt, m.DeliveredAt })
                    .ToListAsync();
                if (deliveredMessages.Any())
                {
                    var totalSeconds = deliveredMessages.Sum(m => (m.DeliveredAt!.Value - m.SentAt!.Value).TotalSeconds);
                    avgDeliveryTimeSeconds = totalSeconds / deliveredMessages.Count;
                }

                var dailyTimeline = new System.Collections.Generic.List<object>();
                for (int i = 6; i >= 0; i--)
                {
                    var date = today.AddDays(-i);
                    var nextDate = date.AddDays(1);
                    var count = await db.NotificationMessages
                        .CountAsync(m => m.CreatedAt >= date && m.CreatedAt < nextDate);
                    dailyTimeline.Add(new { Date = date.ToString("yyyy-MM-dd"), Count = count });
                }

                return Results.Ok(new
                {
                    SuccessRate = successRate,
                    ReadRate = readRate,
                    AverageDeliveryTime = avgDeliveryTimeSeconds,
                    DailyTimeline = dailyTimeline
                });
            });
        }
    }
}
