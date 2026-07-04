using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Api.Endpoints;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;
using TBZ.Middleware.Application;
using TBZ.Middleware.Application.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Register MiddlewareDbContext with SQLite
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    var currentDir = new DirectoryInfo(AppContext.BaseDirectory);
    string? resolvedDbPath = null;
    while (currentDir != null)
    {
        var synosSln = Path.Combine(currentDir.FullName, "SynOS.sln");
        if (File.Exists(synosSln))
        {
            resolvedDbPath = Path.Combine(currentDir.FullName, "TBZ.Middleware", "src", "TBZ.Middleware.Api", "MiddlewareDb.db");
            break;
        }
        var tbzSln = Path.Combine(currentDir.FullName, "TBZ.Middleware.sln");
        if (File.Exists(tbzSln))
        {
            resolvedDbPath = Path.Combine(currentDir.FullName, "src", "TBZ.Middleware.Api", "MiddlewareDb.db");
            break;
        }
        currentDir = currentDir.Parent;
    }
    
    var finalDbPath = resolvedDbPath ?? Path.Combine(AppContext.BaseDirectory, "MiddlewareDb.db");
    connectionString = $"Data Source={finalDbPath}";
}

var sqliteBuilder = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(connectionString);
var absoluteDbPath = Path.GetFullPath(sqliteBuilder.DataSource);
Console.WriteLine($"[DATABASE AUDIT] API SQLite Database absolute path: {absoluteDbPath}");

builder.Services.AddDbContext<MiddlewareDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddScoped<INotificationDbContext>(sp => sp.GetRequiredService<MiddlewareDbContext>());
builder.Services.AddNotificationEngine(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

// Register Leaf Services
builder.Services.AddScoped<TBZ.Middleware.Api.Services.OverviewService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.HealthService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.WorkflowService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.RevenueService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.TestService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.DeliveryService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.DemographicsService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.ReferralService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.BusinessSourceService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.TrendService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.PatientService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.PartnerProfileService>();

// Register Section Services
builder.Services.AddScoped<TBZ.Middleware.Api.Services.OperationalService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.BusinessService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.IntelligenceService>();

// Register Dashboard Aggregator Service
builder.Services.AddScoped<TBZ.Middleware.Api.Services.DashboardService>();

// Register AI Context Services
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.DoctorContextService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.ReferralPartnerContextService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.BusinessSourceContextService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.TestContextService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.DemographicsContextService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.LabContextService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.ContextMetadataService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.EntityContextService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.Context.ContextService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();

// Auto-migrate and seed default tenant
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MiddlewareDbContext>();
    db.Database.Migrate();

    // Seed default tenant LAB001 with API Key "TBZ-LAB-KEY-12345" if not present
    var defaultLabId = "LAB001";
    var defaultApiKey = "TBZ-LAB-KEY-12345";
    var hashedKey = ApiKeyHasher.Hash(defaultApiKey);

    var existingLab = db.Labs.FirstOrDefault(l => l.Id == defaultLabId);
    if (existingLab == null)
    {
        db.Labs.Add(new Lab
        {
            Id = defaultLabId,
            LabCode = defaultLabId,
            LabName = "TBZ Labs Core On-Prem",
            ApiKeyHash = hashedKey,
            Status = "Active",
            CreatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
    }
    else if (existingLab.ApiKeyHash != hashedKey)
    {
        existingLab.ApiKeyHash = hashedKey;
        db.SaveChanges();
    }

    // Seed default WhatsApp templates if not present
    var hasReportReady = db.NotificationTemplates.Any(t => t.TemplateName == "report_ready");
    if (!hasReportReady)
    {
        db.NotificationTemplates.Add(new NotificationTemplate
        {
            Id = Guid.Parse("06bf8a08-3bb8-4c8d-872e-836e4f3a71b1"),
            TemplateName = "report_ready",
            Version = 1,
            Language = "en",
            Category = "Utility",
            Approved = true,
            LastSyncedFromMeta = DateTime.UtcNow,
            BodyPattern = "Dear {PatientName}, your clinical reports for {InvestigationSummary} are ready. Download it here: {DownloadLink}",
            VariableMappingsJson = "[\"PatientName\",\"InvestigationSummary\",\"DownloadLink\"]"
        });
    }

    var hasReportReadyV2 = db.NotificationTemplates.Any(t => t.TemplateName == "report_ready_v2");
    if (!hasReportReadyV2)
    {
        db.NotificationTemplates.Add(new NotificationTemplate
        {
            Id = Guid.Parse("07bf8a08-3bb8-4c8d-872e-836e4f3a71b2"),
            TemplateName = "report_ready_v2",
            Version = 1,
            Language = "en",
            Category = "Utility",
            Approved = true,
            LastSyncedFromMeta = DateTime.UtcNow,
            BodyPattern = "Dear {PatientName}, your clinical reports for {InvestigationSummary} are ready (v2). Download it here: {DownloadLink}",
            VariableMappingsJson = "[\"PatientName\",\"InvestigationSummary\",\"DownloadLink\"]"
        });
    }
    db.SaveChanges();

    // Dynamic one-time migration to backfill ReferralPartnerId and ReferringDoctorId columns from StoredEvents
    try
    {
        var billEvents = db.StoredEvents
            .Where(e => e.EventType == "BillCreated")
            .ToList();

        foreach (var e in billEvents)
        {
            using var doc = System.Text.Json.JsonDocument.Parse(e.PayloadJson);
            var root = doc.RootElement;

            var visitIdStr = root.TryGetProperty("VisitId", out var vProp) ? vProp.GetString() : null;
            var patientIdStr = root.TryGetProperty("PatientId", out var pProp) ? pProp.GetString() : null;

            if (Guid.TryParse(visitIdStr, out var visitId))
            {
                Guid? partnerId = null;
                if (root.TryGetProperty("ReferralPartnerId", out var rpProp) && rpProp.ValueKind != System.Text.Json.JsonValueKind.Null && Guid.TryParse(rpProp.GetString(), out var rpGuid))
                {
                    partnerId = rpGuid;
                }

                Guid? doctorId = null;
                if (root.TryGetProperty("ReferringDoctorId", out var rdProp) && rdProp.ValueKind != System.Text.Json.JsonValueKind.Null && Guid.TryParse(rdProp.GetString(), out var rdGuid))
                {
                    doctorId = rdGuid;
                }

                var visit = db.PatientVisitFacts.FirstOrDefault(vf => vf.VisitId == visitId);
                if (visit != null)
                {
                    visit.ReferralPartnerId = partnerId;
                    visit.ReferringDoctorId = doctorId;
                }

                if (Guid.TryParse(patientIdStr, out var patientId))
                {
                    var patient = db.PatientIntelligenceFacts.FirstOrDefault(pf => pf.PatientId == patientId);
                    if (patient != null)
                    {
                        patient.ReferralPartnerId = partnerId;
                        patient.ReferringDoctorId = doctorId;
                    }
                }
            }
        }
        db.SaveChanges();
    }
    catch
    {
        // Suppress any parse/database error to prevent startup failure
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapPost("/api/events", async (HttpContext context, IngestEventDto dto, MiddlewareDbContext db, INotificationService notificationService, Microsoft.Extensions.Options.IOptions<TBZ.Middleware.Application.Configuration.WhatsAppOptions> options) =>
{
    Console.WriteLine($"[INTEGRATION DEB] /api/events endpoint started. EventId: {dto?.EventId}, Type: {dto?.EventType}");
    
    // Check initial counts
    int countMsgBefore = 0;
    int countOutboxBefore = 0;
    try
    {
        countMsgBefore = await db.NotificationMessages.CountAsync();
        countOutboxBefore = await db.NotificationOutboxes.CountAsync();
    }
    catch {}

    // 1. Extract authentication headers
    if (!context.Request.Headers.TryGetValue("X-Lab-Id", out var labIdValues) ||
        !context.Request.Headers.TryGetValue("X-Api-Key", out var apiKeyValues))
    {
        Console.WriteLine("[INTEGRATION DEB] /api/events returning 401: Missing auth headers");
        return Results.Json(new { error = "Missing auth headers X-Lab-Id or X-Api-Key" }, statusCode: StatusCodes.Status401Unauthorized);
    }

    var labId = labIdValues.ToString();
    var apiKey = apiKeyValues.ToString();

    // 2. Fetch tenant lab details
    var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == labId);
    if (lab == null || lab.Status != "Active" || !ApiKeyHasher.Verify(apiKey, lab.ApiKeyHash))
    {
        return Results.Json(new { error = "Unauthorized tenant credentials" }, statusCode: StatusCodes.Status401Unauthorized);
    }

    // Validate payload tenant against HTTP headers
    if (dto == null || dto.LabId != labId)
    {
        return Results.Json(new { error = "Lab ID in payload does not match authenticated header Lab ID" }, statusCode: StatusCodes.Status400BadRequest);
    }

    // 3. Deduplication Check (Idempotency)
    Console.WriteLine($"[INTEGRATION DEB] Hop 2: /api/events received request. EventId: {dto.EventId}, EventType: {dto.EventType}");
    var alreadyExists = await db.StoredEvents.AnyAsync(e => e.EventId == dto.EventId);
    if (alreadyExists)
    {
        // Return 208 AlreadyReported to satisfy idempotency requirement silently
        Console.WriteLine($"[INTEGRATION DEB] Hop 2: Duplicate event skipped. EventId: {dto.EventId}");
        return Results.Json(new { message = "Duplicate event skipped", eventId = dto.EventId }, statusCode: StatusCodes.Status208AlreadyReported);
    }

    // 4. Save to Event Store
    var storedEvent = new StoredEvent
    {
        Id = Guid.NewGuid(),
        EventId = dto.EventId,
        LabId = dto.LabId,
        BranchId = dto.BranchId,
        EventType = dto.EventType,
        AggregateType = dto.AggregateType,
        AggregateId = dto.AggregateId,
        PayloadJson = dto.PayloadJson,
        OccurredAt = dto.OccurredAt,
        ReceivedAt = DateTime.UtcNow
    };

    db.StoredEvents.Add(storedEvent);
    
    // Check if the event is a WhatsappDeliveryRequestedEvent to queue for delivery
    if (dto.EventType == "ReportDeliveryRequestedEvent")
    {
        Console.WriteLine($"[INTEGRATION DEB] Hop 3: Event type matched: {dto.EventType}");
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(dto.PayloadJson);
            var root = doc.RootElement;
            var phone = (root.TryGetProperty("Phone", out var phoneProp) ? phoneProp.GetString() : string.Empty) ?? string.Empty;

            if (!string.IsNullOrEmpty(phone))
            {
                var reportId = root.TryGetProperty("ReportId", out var repProp) ? repProp.GetString() : string.Empty;
                var visitId = root.TryGetProperty("VisitId", out var visProp) ? visProp.GetString() : string.Empty;
                var patientId = root.TryGetProperty("PatientId", out var patProp) ? patProp.GetString() : string.Empty;
                var secureReportUrl = (root.TryGetProperty("SecureReportUrl", out var urlProp) ? urlProp.GetString() : string.Empty) ?? string.Empty;
                var patientName = (root.TryGetProperty("PatientName", out var nameProp) ? nameProp.GetString() : string.Empty) ?? string.Empty;
                var investigationSummary = (root.TryGetProperty("InvestigationSummary", out var invProp) ? invProp.GetString() : string.Empty) ?? string.Empty;
                var labIdVal = root.TryGetProperty("LabId", out var labIdProp) ? labIdProp.GetString() : dto.LabId;

                // Rewrite domain to configured PublicTunnelUrl if available
                var publicTunnel = options.Value.PublicTunnelUrl;
                if (!string.IsNullOrEmpty(publicTunnel) && !string.IsNullOrEmpty(secureReportUrl))
                {
                    try
                    {
                        var uri = new Uri(secureReportUrl);
                        var uriBuilder = new UriBuilder(publicTunnel.TrimEnd('/'));
                        uriBuilder.Path = uri.AbsolutePath;
                        uriBuilder.Query = uri.Query;
                        secureReportUrl = uriBuilder.ToString();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[WARNING] Failed to rewrite secure report URL: {ex.Message}");
                    }
                }

                var activeTemplate = !string.IsNullOrEmpty(options.Value.ActiveTemplateName) ? options.Value.ActiveTemplateName : "report_ready";
                Console.WriteLine($"[INTEGRATION DEB] Hop 4: EnqueueNotificationAsync() is called for Recipient: {phone}, Template: {activeTemplate}, URL: {secureReportUrl}");
                await notificationService.EnqueueNotificationAsync(new TBZ.Middleware.Application.DTOs.NotificationRequest
                {
                    Recipient = phone,
                    TemplateName = activeTemplate,
                    Variables = new Dictionary<string, string>
                    {
                        { "PatientName", patientName },
                        { "DownloadLink", secureReportUrl },
                        { "InvestigationSummary", investigationSummary }
                    },
                    CorrelationId = reportId,
                    LabId = labIdVal ?? dto.LabId
                });
            }
        }
        catch
        {
            // Fail silently on queue item creation so event ingestion succeeds
        }
    }
    else if (dto.EventType == "WhatsappDeliveryRequestedEvent" || dto.EventType == "WhatsappDeliveryRequested")
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(dto.PayloadJson);
            var root = doc.RootElement;
            var phone = root.TryGetProperty("RecipientPhone", out var phoneProp) ? phoneProp.GetString() : (root.TryGetProperty("Recipient", out var recProp) ? recProp.GetString() : string.Empty);
            var content = root.TryGetProperty("Content", out var contentProp) ? contentProp.GetString() : string.Empty;

            if (!string.IsNullOrEmpty(phone))
            {
                var reportId = root.TryGetProperty("ReportId", out var repProp) && repProp.ValueKind != System.Text.Json.JsonValueKind.Null ? repProp.GetString() : null;
                if (string.IsNullOrEmpty(reportId) && root.TryGetProperty("TargetId", out var targetProp))
                {
                    reportId = targetProp.GetString();
                }

                var downloadLink = string.IsNullOrEmpty(content) ? "https://tbzlabs.com" : content;
                var publicTunnel = options.Value.PublicTunnelUrl;
                if (!string.IsNullOrEmpty(publicTunnel) && downloadLink.Contains("://"))
                {
                    try
                    {
                        var uri = new Uri(downloadLink);
                        var uriBuilder = new UriBuilder(publicTunnel.TrimEnd('/'));
                        uriBuilder.Path = uri.AbsolutePath;
                        uriBuilder.Query = uri.Query;
                        downloadLink = uriBuilder.ToString();
                    }
                    catch {}
                }

                var activeTemplate = !string.IsNullOrEmpty(options.Value.ActiveTemplateName) ? options.Value.ActiveTemplateName : "report_ready";
                await notificationService.EnqueueNotificationAsync(new TBZ.Middleware.Application.DTOs.NotificationRequest
                {
                    Recipient = phone,
                    TemplateName = activeTemplate,
                    Variables = new Dictionary<string, string>
                    {
                        { "PatientName", "Valued Customer" },
                        { "DownloadLink", downloadLink },
                        { "InvestigationSummary", "Reports" }
                    },
                    CorrelationId = reportId,
                    LabId = dto.LabId
                });
            }
        }
        catch
        {
            // Fail silently on queue item creation so ingestion succeeds
        }
    }

    // Capture and cache Lab Health metrics from incoming headers
    context.Request.Headers.TryGetValue("X-Pending-Outbox-Count", out var pendingOutboxStr);
    context.Request.Headers.TryGetValue("X-Dead-Letter-Count", out var deadLetterStr);

    var pendingOutbox = 0;
    var deadLetter = 0;
    if (int.TryParse(pendingOutboxStr, out var poCount))
    {
        pendingOutbox = poCount;
    }
    if (int.TryParse(deadLetterStr, out var dlCount))
    {
        deadLetter = dlCount;
    }

    var liveMetrics = LabHealthCache.Metrics.GetOrAdd(dto.LabId, _ => new LiveLabMetrics());
    liveMetrics.PendingOutboxCount = pendingOutbox;
    liveMetrics.DeadLetterCount = deadLetter;
    liveMetrics.LastEventReceivedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();

    // Check final counts and log
    try
    {
        var countMsgAfter = await db.NotificationMessages.CountAsync();
        var countOutboxAfter = await db.NotificationOutboxes.CountAsync();
        Console.WriteLine($"[INTEGRATION DEB] DB Changes. Messages: {countMsgBefore} -> {countMsgAfter}, Outbox: {countOutboxBefore} -> {countOutboxAfter}");
    }
    catch {}

    Console.WriteLine($"[INTEGRATION DEB] /api/events returning 200 OK: success = true, eventId = {dto.EventId}");
    return Results.Ok(new { success = true, eventId = dto.EventId });
})
.WithName("IngestEvent")
.WithOpenApi();

app.MapPost("/api/projections/reset", async (MiddlewareDbContext db) =>
{
    using var transaction = await db.Database.BeginTransactionAsync();
    try
    {
        await db.DailyOperationsFacts.ExecuteDeleteAsync();
        await db.TestVolumeFacts.ExecuteDeleteAsync();
        await db.WorkflowFacts.ExecuteDeleteAsync();
        await db.DeliveryFacts.ExecuteDeleteAsync();
        await db.PatientDemographicFacts.ExecuteDeleteAsync();
        await db.DoctorReferralFacts.ExecuteDeleteAsync();
        await db.ReferralPartnerFacts.ExecuteDeleteAsync();
        await db.TrendFacts.ExecuteDeleteAsync();
        await db.ReferralConversionFacts.ExecuteDeleteAsync();
        await db.BusinessSourceFacts.ExecuteDeleteAsync();
        await db.ProjectionCheckpoints.ExecuteDeleteAsync();
        
        await transaction.CommitAsync();
        return Results.Ok(new { success = true, message = "Projections reset successfully. Workers will now replay all events from Sequence 0." });
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        return Results.Problem(ex.Message);
    }
})
.WithName("ResetProjections")
.WithOpenApi();

app.MapControlTowerEndpoints();
app.MapWhatsAppWebhookEndpoints();
app.MapWhatsAppManagementEndpoints();

// Proxy /r/ requests to SynOS.Api on port 59999 so that patient download links work seamlessly through the same Cloudflare tunnel
app.MapGet("/r/{token}", async (string token, HttpContext context, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient();
    var response = await client.GetAsync($"http://127.0.0.1:59999/r/{token}{context.Request.QueryString}");
    context.Response.StatusCode = (int)response.StatusCode;
    foreach (var header in response.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }
    foreach (var header in response.Content.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }
    await response.Content.CopyToAsync(context.Response.Body);
});

app.MapGet("/api/v1/public/reports/download/{token}", async (string token, HttpContext context, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient();
    var response = await client.GetAsync($"http://127.0.0.1:59999/api/v1/public/reports/download/{token}{context.Request.QueryString}");
    context.Response.StatusCode = (int)response.StatusCode;
    foreach (var header in response.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }
    foreach (var header in response.Content.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }
    await response.Content.CopyToAsync(context.Response.Body);
});

app.MapGet("/api/v1/public/reports/download-package/{token}", async (string token, HttpContext context, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient();
    var response = await client.GetAsync($"http://127.0.0.1:59999/api/v1/public/reports/download-package/{token}{context.Request.QueryString}");
    context.Response.StatusCode = (int)response.StatusCode;
    foreach (var header in response.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }
    foreach (var header in response.Content.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }
    await response.Content.CopyToAsync(context.Response.Body);
});

app.Run();
