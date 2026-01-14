# Implementation Report - Branch Operational Event Stream

## 1. BranchOperationalEvent Read Model
```csharp
namespace SynOS.Models.ReadModels
{
    public class BranchOperationalEvent
    {
        [Key]
        public Guid EventId { get; set; }
        public string EventType { get; set; } = string.Empty;
        public DateTime OccurredAt { get; set; } // UTC
        public string ActorType { get; set; } = string.Empty;
        public string? ActorName { get; set; }
        public string BranchId { get; set; } = string.Empty;
        public string VisitId { get; set; } = string.Empty;
        public string TokenId { get; set; } = string.Empty;
        public string SummaryText { get; set; } = string.Empty;
    }
}
```

## 2. BranchEventType Enum
```csharp
public enum BranchEventType
{
    VISIT_STARTED,
    BILL_GENERATED,
    PAYMENT_RECEIVED,
    VISIT_FINALIZED,
    MOVED_TO_SAMPLE_COLLECTION,
    SAMPLE_COLLECTED,
    REPORT_VERIFIED,
    REPORT_READY
}
```

## 3. OperationalEventWriter Implementation
```csharp
public class OperationalEventWriter : IOperationalEventWriter
{
    // ... Dependencies ...

    public async Task WriteEventAsync(...)
    {
        try
        {
            var evt = new BranchOperationalEvent
            {
                EventId = Guid.NewGuid(),
                EventType = eventType.ToString(),
                OccurredAt = DateTime.UtcNow, // Strict UTC
                // ... fields ...
            };
            _context.BranchOperationalEvents.Add(evt);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Non-blocking failure logging
            _logger.LogError(ex, "Failed to write operational event...");
        }
    }
}
```

## 4. Controller Code
```csharp
[ApiController]
[Route("api/v1/branch/activity")]
public class BranchActivityController : ControllerBase
{
    // ...
    [HttpGet]
    public async Task<IActionResult> GetBranchActivity([FromQuery] string branchId)
    {
        var utcToday = DateTime.UtcNow.Date;
        var utcTomorrow = utcToday.AddDays(1);

        var events = await _context.BranchOperationalEvents
            .AsNoTracking()
            .Where(e => e.BranchId == branchId && e.OccurredAt >= utcToday && e.OccurredAt < utcTomorrow)
            .OrderByDescending(e => e.OccurredAt)
            .Take(50)
            .ToListAsync();

        return Ok(events);
    }
}
```

## 5. Event Emissions (Examples)
*   **VISIT_STARTED:** `ReceptionFlowService.StartVisitAsync`
*   **BILL_GENERATED:** `VisitService.CreateVisitAsync`
*   **PAYMENT_RECEIVED:** `InvoiceService.RecordPaymentAsync`
*   **SAMPLE_COLLECTED:** `SampleService.CollectSampleAsync`
*   **REPORT_READY:** `ReportService.SignReportAsync`

## 6. Migration Summary
*   **Migration:** `AddBranchOperationalEvent`
*   **Table:** `BranchOperationalEvents`
*   **Constraints:** Append-only logic enforced by service design. UTC enforced by Writer.

**Status:** Complete and Verified.