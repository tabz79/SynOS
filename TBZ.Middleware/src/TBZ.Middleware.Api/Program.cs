using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Api.Endpoints;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;
using TBZ.Middleware.Application;
using TBZ.Middleware.Application.Interfaces;
using TBZ.Middleware.Application.Events;

var builder = WebApplication.CreateBuilder(args);

// Register MiddlewareDbContext with SQLite
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    // Use CallerFilePath compilation metadata to find the source code directory reliably under any execution context
    string GetSourceDir([System.Runtime.CompilerServices.CallerFilePath] string? path = null) => Path.GetDirectoryName(path) ?? "";
    var sourceDir = GetSourceDir();
    var resolvedDbPath = Path.Combine(sourceDir, "MiddlewareDb.db");
    connectionString = $"Data Source={resolvedDbPath}";
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
builder.Services.AddHostedService<TBZ.Middleware.Api.Services.DiagnosticsReassemblyWorker>();

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

// Subscribe to HeartbeatReceivedEvent on the OperationalEventBus
var eventBusService = app.Services.GetRequiredService<IOperationalEventBus>();
eventBusService.Subscribe<HeartbeatReceivedEvent>(async @event =>
{
    app.Logger.LogDebug("[EVENT BUS HANDLER] Heartbeat Received from Lab: {LabId}, EventId: {EventId}, Time: {OccurredAt}", @event.LabId, @event.EventId, @event.OccurredAt);

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<MiddlewareDbContext>();

        try
        {
            // Update Lab seen time & versions
            var lab = await db.Labs.FirstOrDefaultAsync(l => l.Id == @event.LabId);
            if (lab != null)
            {
                lab.LastSeenAt = DateTime.UtcNow;

                if (!string.IsNullOrEmpty(@event.PayloadJson))
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(@event.PayloadJson);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("OSVersion", out var osProp))
                        lab.OSVersion = osProp.GetString() ?? string.Empty;
                    if (root.TryGetProperty("DotNetVersion", out var dnProp))
                        lab.DotNetVersion = dnProp.GetString() ?? string.Empty;
                }
            }

            double cpu = 12.5;
            double mem = 450.0;
            double disk = 80.0;

            if (!string.IsNullOrEmpty(@event.PayloadJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(@event.PayloadJson);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("CpuUsagePercent", out var cpuProp) && cpuProp.TryGetDouble(out var cpuVal))
                        cpu = cpuVal;
                    if (root.TryGetProperty("MemoryUsageMB", out var memProp) && memProp.TryGetDouble(out var memVal))
                        mem = memVal;
                    if (root.TryGetProperty("DiskFreeSpaceGB", out var diskProp) && diskProp.TryGetDouble(out var diskVal))
                        disk = diskVal;
                }
                catch {}
            }

            // Create HealthSnapshot record
            var snapshot = new HealthSnapshot
            {
                Id = Guid.NewGuid(),
                LabId = @event.LabId,
                Timestamp = DateTime.UtcNow,
                CpuUsagePercent = cpu,
                MemoryUsageMB = mem,
                DiskFreeSpaceGB = disk,
                PendingOutboxCount = 0,
                DeadLetterCount = 0
            };

            // Look up from LabHealthCache
            if (LabHealthCache.Metrics.TryGetValue(@event.LabId, out var metrics))
            {
                snapshot.PendingOutboxCount = metrics.PendingOutboxCount;
                snapshot.DeadLetterCount = metrics.DeadLetterCount;
            }

            db.HealthSnapshots.Add(snapshot);
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Failed to record heartbeat health snapshot");
        }
    }
});

eventBusService.Subscribe<TBZ.Middleware.Application.Events.SupportTicketCreatedEvent>(async @event =>
{
    app.Logger.LogDebug("[EVENT BUS HANDLER] Support Ticket Event Received: LabId: {LabId}", @event.LabId);
    
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<MiddlewareDbContext>();

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(@event.PayloadJson);
            var root = doc.RootElement;

            var ticketId = root.GetProperty("TicketId").GetGuid();
            var title = root.GetProperty("Title").GetString() ?? string.Empty;
            var description = root.GetProperty("Description").GetString() ?? string.Empty;
            var priority = root.GetProperty("Priority").GetString() ?? "Medium";
            var category = root.GetProperty("Category").GetString() ?? "General";
            var bundleIdStr = root.TryGetProperty("DiagnosticBundleId", out var bundleProp) && bundleProp.ValueKind != System.Text.Json.JsonValueKind.Null ? bundleProp.GetString() : null;
            Guid? bundleId = string.IsNullOrEmpty(bundleIdStr) ? null : Guid.Parse(bundleIdStr);

            // Check if ticket already registered in database
            var ticketExists = await db.SupportTickets.AnyAsync(t => t.Id == ticketId);
            if (ticketExists) return;

            // 1. Intake & Fingerprint Assessment (Lookup in KnownIssues)
            var knownIssues = await db.KnownIssues.ToListAsync();
            KnownIssue? matchedIssue = null;

            foreach (var issue in knownIssues)
            {
                if (!string.IsNullOrEmpty(issue.DiagnosticFingerprint) &&
                    (description.Contains(issue.DiagnosticFingerprint, StringComparison.OrdinalIgnoreCase) ||
                     title.Contains(issue.DiagnosticFingerprint, StringComparison.OrdinalIgnoreCase)))
                {
                    matchedIssue = issue;
                    break;
                }
            }

            Guid supportCaseId;
            if (matchedIssue != null)
            {
                app.Logger.LogDebug("[TRIAGE] Diagnostic fingerprint match found for ticket {TicketId}: {Title}", ticketId, matchedIssue.Title);
                
                // Check if there is an open Case for this known issue
                var existingCase = await db.SupportCases
                    .FirstOrDefaultAsync(c => c.Title == matchedIssue.Title && c.Status != "Closed");

                if (existingCase != null)
                {
                    supportCaseId = existingCase.Id;
                }
                else
                {
                    // Create new Case from KnownIssue
                    var newCase = new SupportCase
                    {
                        Id = Guid.NewGuid(),
                        CaseNumber = $"CASE-{new Random().Next(1000, 9999)}",
                        Title = matchedIssue.Title,
                        Description = matchedIssue.Description,
                        Priority = priority,
                        Category = category,
                        Status = "Open",
                        CreatedAt = DateTime.UtcNow
                    };
                    db.SupportCases.Add(newCase);
                    supportCaseId = newCase.Id;
                }
            }
            else
            {
                app.Logger.LogDebug("[TRIAGE] No known issue match for ticket {TicketId}. Escalating to new Case.", ticketId);
                
                // Create new Support Case
                var newCase = new SupportCase
                {
                    Id = Guid.NewGuid(),
                    CaseNumber = $"CASE-{new Random().Next(1000, 9999)}",
                    Title = $"Unresolved Bug: {title}",
                    Description = description,
                    Priority = priority,
                    Category = category,
                    Status = "Open",
                    CreatedAt = DateTime.UtcNow
                };
                db.SupportCases.Add(newCase);
                supportCaseId = newCase.Id;
            }

            // Create and save SupportTicket record
            var ticket = new SupportTicket
            {
                Id = ticketId,
                LabId = @event.LabId,
                Title = title,
                Description = description,
                Priority = priority,
                Category = category,
                CreatedAt = DateTime.UtcNow,
                DiagnosticBundleId = bundleId,
                Status = matchedIssue != null ? "WaitingForUpdate" : "InAnalysis",
                SupportCaseId = supportCaseId
            };

            db.SupportTickets.Add(ticket);
            await db.SaveChangesAsync();
            app.Logger.LogDebug("[TRIAGE] Ticket {TicketId} saved. Linked to Case {CaseId}. Status: {Status}", ticketId, supportCaseId, ticket.Status);
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Failed to process incoming support ticket");
        }
    }
});

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

app.MapPost("/api/events", async (HttpContext context, IngestEventDto dto, MiddlewareDbContext db, INotificationService notificationService, Microsoft.Extensions.Options.IOptions<TBZ.Middleware.Application.Configuration.WhatsAppOptions> options, IOperationalEventBus eventBus) =>
{
    app.Logger.LogDebug("[INTEGRATION DEB] /api/events endpoint started. EventId: {EventId}, Type: {EventType}", dto?.EventId, dto?.EventType);
    
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
        app.Logger.LogDebug("[INTEGRATION DEB] /api/events returning 401: Missing auth headers");
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
    app.Logger.LogDebug("[INTEGRATION DEB] Hop 2: /api/events received request. EventId: {EventId}, EventType: {EventType}", dto.EventId, dto.EventType);
    var alreadyExists = await db.StoredEvents.AnyAsync(e => e.EventId == dto.EventId);
    if (alreadyExists)
    {
        // Return 208 AlreadyReported to satisfy idempotency requirement silently
        app.Logger.LogDebug("[INTEGRATION DEB] Hop 2: Duplicate event skipped. EventId: {EventId}", dto.EventId);
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

    if (dto.EventType == "HeartbeatEvent" || dto.EventType == "Heartbeat")
    {
        app.Logger.LogDebug("[INTEGRATION DEB] IngestEvent publishing HeartbeatReceivedEvent to Event Bus. LabId: {LabId}", dto.LabId);
        try
        {
            await eventBus.PublishAsync(new HeartbeatReceivedEvent
            {
                EventId = dto.EventId,
                LabId = dto.LabId,
                BranchId = dto.BranchId,
                OccurredAt = dto.OccurredAt,
                PayloadJson = dto.PayloadJson
            });
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Failed to publish HeartbeatReceivedEvent to Event Bus");
        }
    }
    else if (dto.EventType == "SupportTicketCreated")
    {
        app.Logger.LogDebug("[INTEGRATION DEB] IngestEvent publishing SupportTicketCreatedEvent to Event Bus. LabId: {LabId}", dto.LabId);
        try
        {
            await eventBus.PublishAsync(new TBZ.Middleware.Application.Events.SupportTicketCreatedEvent
            {
                EventId = dto.EventId,
                LabId = dto.LabId,
                PayloadJson = dto.PayloadJson,
                OccurredAt = dto.OccurredAt
            });
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Failed to publish SupportTicketCreatedEvent to Event Bus");
        }
    }
    else if (dto.EventType == "DiagnosticsBundleChunk")
    {
        app.Logger.LogDebug("[INTEGRATION DEB] IngestEvent handling DiagnosticsBundleChunk. LabId: {LabId}", dto.LabId);
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(dto.PayloadJson);
            var root = doc.RootElement;
            var bundleId = root.GetProperty("BundleId").GetGuid();
            var totalChunks = root.GetProperty("TotalChunks").GetInt32();

            var bundle = await db.DiagnosticsBundles.FindAsync(bundleId);
            if (bundle == null)
            {
                bundle = new TBZ.Middleware.Domain.DiagnosticsBundle
                {
                    Id = bundleId,
                    LabId = dto.LabId,
                    Status = "Processing",
                    ReceivedChunks = 1,
                    TotalChunks = totalChunks,
                    CreatedAt = DateTime.UtcNow
                };
                db.DiagnosticsBundles.Add(bundle);
            }
            else
            {
                bundle.ReceivedChunks += 1;
            }
            await db.SaveChangesAsync();
            app.Logger.LogDebug("[INTEGRATION DEB] DiagnosticsBundle {BundleId} progress updated: {Received}/{Total}", bundleId, bundle.ReceivedChunks, bundle.TotalChunks);
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Failed to handle DiagnosticsBundleChunk event");
        }
    }

    // Check final counts and log
    try
    {
        var countMsgAfter = await db.NotificationMessages.CountAsync();
        var countOutboxAfter = await db.NotificationOutboxes.CountAsync();
        app.Logger.LogDebug("[INTEGRATION DEB] DB Changes. Messages: {BeforeMsg} -> {AfterMsg}, Outbox: {BeforeOut} -> {AfterOut}", countMsgBefore, countMsgAfter, countOutboxBefore, countOutboxAfter);
    }
    catch {}

    app.Logger.LogDebug("[INTEGRATION DEB] /api/events returning 200 OK: success = true, eventId = {EventId}", dto.EventId);
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
