using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Api.Endpoints;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Register MiddlewareDbContext with SQLite
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=MiddlewareDb.db";
builder.Services.AddDbContext<MiddlewareDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

// Register Section Services
builder.Services.AddScoped<TBZ.Middleware.Api.Services.OperationalService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.BusinessService>();
builder.Services.AddScoped<TBZ.Middleware.Api.Services.IntelligenceService>();

// Register Dashboard Aggregator Service
builder.Services.AddScoped<TBZ.Middleware.Api.Services.DashboardService>();


var app = builder.Build();

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
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapPost("/api/events", async (HttpContext context, IngestEventDto dto, MiddlewareDbContext db) =>
{
    // 1. Extract authentication headers
    if (!context.Request.Headers.TryGetValue("X-Lab-Id", out var labIdValues) ||
        !context.Request.Headers.TryGetValue("X-Api-Key", out var apiKeyValues))
    {
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
    if (dto.LabId != labId)
    {
        return Results.Json(new { error = "Lab ID in payload does not match authenticated header Lab ID" }, statusCode: StatusCodes.Status400BadRequest);
    }

    // 3. Deduplication Check (Idempotency)
    var alreadyExists = await db.StoredEvents.AnyAsync(e => e.EventId == dto.EventId);
    if (alreadyExists)
    {
        // Return 208 AlreadyReported to satisfy idempotency requirement silently
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
    if (dto.EventType == "WhatsappDeliveryRequestedEvent")
    {
        try
        {
            // Simple parse of payload to extract phone, template/message
            using var doc = System.Text.Json.JsonDocument.Parse(dto.PayloadJson);
            var root = doc.RootElement;
            var phone = root.TryGetProperty("RecipientPhone", out var phoneProp) ? phoneProp.GetString() : string.Empty;
            var msgType = root.TryGetProperty("MessageType", out var typeProp) ? typeProp.GetString() : "Unknown";
            
            if (!string.IsNullOrEmpty(phone))
            {
                var queueItem = new DeliveryQueueItem
                {
                    Id = Guid.NewGuid(),
                    LabId = dto.LabId,
                    Phone = phone,
                    MessageType = msgType ?? "Whatsapp",
                    PayloadJson = dto.PayloadJson,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };
                db.DeliveryQueueItems.Add(queueItem);
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

app.Run();
