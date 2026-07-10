using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class SupportService : ISupportService
    {
        private readonly SynOSDbContext _context;
        private readonly IDiagnosticsService _diagnosticsService;
        private readonly ILogger<SupportService> _logger;

        public SupportService(
            SynOSDbContext context,
            IDiagnosticsService diagnosticsService,
            ILogger<SupportService> logger)
        {
            _context = context;
            _diagnosticsService = diagnosticsService;
            _logger = logger;
        }

        public async Task<Guid> CreateTicketAsync(string title, string description, string priority, string category)
        {
            var ticketId = Guid.NewGuid();
            _logger.LogInformation("Creating support ticket {TicketId}: {Title}", ticketId, title);

            // 1. Generate Diagnostic Bundle for ticket attachment
            Guid? bundleId = null;
            try
            {
                bundleId = await _diagnosticsService.GenerateDiagnosticBundleAsync("ManualTicket", supportTicketId: ticketId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to compile diagnostic bundle for support ticket.");
            }

            // 2. Compile ticket payload
            var payload = new
            {
                TicketId = ticketId,
                LabId = "LAB001",
                Title = title,
                Description = description,
                Priority = priority,
                Category = category,
                CreatedAt = DateTime.UtcNow,
                DiagnosticBundleId = bundleId
            };

            // Save locally
            var localTicket = new SupportTicket
            {
                Id = ticketId,
                LabId = "LAB001",
                Title = title,
                Description = description,
                Priority = priority,
                Category = category,
                Status = "Submitted",
                DiagnosticBundleId = bundleId,
                CreatedAt = DateTime.UtcNow
            };
            _context.SupportTickets.Add(localTicket);

            // 3. Queue in OutboxEvents
            var outboxEvent = new OutboxEvent
            {
                Id = Guid.NewGuid(),
                EventVersion = 1,
                EventType = "SupportTicketCreated",
                AggregateType = "Support",
                AggregateId = ticketId.ToString(),
                LabId = "LAB001",
                PayloadJson = JsonSerializer.Serialize(payload),
                CreatedAt = DateTime.UtcNow,
                Status = "Pending"
            };

            _context.OutboxEvents.Add(outboxEvent);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created ticket locally and queued SupportTicketCreated outbox event for ticket {TicketId}", ticketId);
            return ticketId;
        }

        public async Task<Guid> ReportCrashAsync(string exceptionMessage, string stackTrace)
        {
            var ticketId = Guid.NewGuid();
            _logger.LogError("Unhandled crash event intercepted. Registering Crash Ticket {TicketId}", ticketId);

            Guid? bundleId = null;
            try
            {
                bundleId = await _diagnosticsService.GenerateDiagnosticBundleAsync("CrashTrigger", crashId: ticketId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to compile diagnostic bundle for crash ticket.");
            }

            var payload = new
            {
                TicketId = ticketId,
                LabId = "LAB001",
                Title = $"Application Crash: {exceptionMessage.Split('\n')[0]}",
                Description = $"Exception: {exceptionMessage}\nStack Trace: {stackTrace}",
                Priority = "Critical",
                Category = "Crash",
                CreatedAt = DateTime.UtcNow,
                DiagnosticBundleId = bundleId
            };

            // Save locally
            var localTicket = new SupportTicket
            {
                Id = ticketId,
                LabId = "LAB001",
                Title = $"Application Crash: {exceptionMessage.Split('\n')[0]}",
                Description = $"Exception: {exceptionMessage}\nStack Trace: {stackTrace}",
                Priority = "Critical",
                Category = "Crash",
                Status = "Submitted",
                DiagnosticBundleId = bundleId,
                CreatedAt = DateTime.UtcNow
            };
            _context.SupportTickets.Add(localTicket);

            var outboxEvent = new OutboxEvent
            {
                Id = Guid.NewGuid(),
                EventVersion = 1,
                EventType = "SupportTicketCreated",
                AggregateType = "Support",
                AggregateId = ticketId.ToString(),
                LabId = "LAB001",
                PayloadJson = JsonSerializer.Serialize(payload),
                CreatedAt = DateTime.UtcNow,
                Status = "Pending"
            };

            _context.OutboxEvents.Add(outboxEvent);
            await _context.SaveChangesAsync();

            return ticketId;
        }
    }
}
