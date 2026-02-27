using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Enums; // For LabAnalyzerResultStatus

namespace SynOS.Services
{
    public class AnalyzerResultMatcherService : IAnalyzerResultMatcherService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<AnalyzerResultMatcherService> _logger;

        public AnalyzerResultMatcherService(SynOSDbContext context, ILogger<AnalyzerResultMatcherService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<LabAnalyzerResultInbox?> AutoMatchAsync(Guid inboxId, Guid currentUserId)
        {
            var inboxItem = await _context.LabAnalyzerResultInbox
                                          .Include(i => i.Analyzer)
                                          .FirstOrDefaultAsync(i => i.InboxId == inboxId && i.Status == LabAnalyzerResultStatus.Pending);

            if (inboxItem == null)
            {
                _logger.LogWarning("Inbox item {InboxId} not found or not in Pending status for auto-match.", inboxId);
                return null;
            }

            // 1. Lookup mapping
            var mapping = await _context.LabAnalyzerTestMappings
                                        .FirstOrDefaultAsync(m => m.AnalyzerId == inboxItem.AnalyzerId &&
                                                                  m.AnalyzerTestCode == inboxItem.AnalyzerTestCode &&
                                                                  m.IsEnabled);

            if (mapping == null)
            {
                _logger.LogInformation("No enabled mapping found for Analyzer {AnalyzerId} and AnalyzerTestCode {TestCode} for inbox item {InboxId}.",
                                       inboxItem.AnalyzerId, inboxItem.AnalyzerTestCode, inboxItem.InboxId);
                return null; // Stay Pending
            }

            // 2. Find Patient and recent Paid Visit
            // Assuming PatientIdentifier is MRN for simplicity for now.
            var patient = await _context.Patients
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync(p => p.MRN == inboxItem.PatientIdentifier);

            if (patient == null)
            {
                _logger.LogInformation("Patient with MRN {MRN} not found for inbox item {InboxId}.", inboxItem.PatientIdentifier, inboxItem.InboxId);
                return null; // Stay Pending
            }

            // Find a recent PAID visit for the patient. Prioritize today's visit.
            var visit = await _context.Visits
                                      .Where(v => v.PatientId == patient.PatientId && v.Status == VisitStatus.FullPaid)
                                      .OrderByDescending(v => v.CreatedAt)
                                      .FirstOrDefaultAsync();

            if (visit == null)
            {
                _logger.LogInformation("No recent Paid visit found for Patient {PatientId} (MRN: {MRN}) for inbox item {InboxId}.",
                                       patient.PatientId, inboxItem.PatientIdentifier, inboxItem.InboxId);
                return null; // Stay Pending
            }

            // 3. From Visit, find matching Order with same SynosTestCode
            var order = await _context.Orders
                                      .Where(o => o.VisitId == visit.VisitId && o.TestCode == mapping.SynosTestCode)
                                      .OrderByDescending(o => o.CreatedAt) // Get the most recent if multiple
                                      .FirstOrDefaultAsync();

            if (order == null)
            {
                _logger.LogInformation("No matching Order found for Visit {VisitId} and SynosTestCode {SynosTestCode} for inbox item {InboxId}.",
                                       visit.VisitId, mapping.SynosTestCode, inboxItem.InboxId);
                return null; // Stay Pending
            }
            
            // 4. Update inbox item
            inboxItem.ParameterCode = mapping.SynosTestCode; // Renamed to ParameterCode
            inboxItem.VisitId = visit.VisitId;
            inboxItem.OrderId = order.OrderId;
            inboxItem.Status = LabAnalyzerResultStatus.Matched;
            inboxItem.ReviewedBy = null; // Reset for actual review
            inboxItem.ReviewedAt = null; // Reset for actual review
            inboxItem.UpdatedAt = DateTimeOffset.UtcNow;
            inboxItem.UpdatedBy = currentUserId;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Inbox item {InboxId} successfully matched to Visit {VisitId} and Order {OrderId}.", inboxId, visit.VisitId, order.OrderId);

            return inboxItem;
        }

        public async Task<int> AutoMatchAllPendingAsync(Guid analyzerId, Guid currentUserId)
        {
            var pendingItems = await _context.LabAnalyzerResultInbox
                                             .Where(i => i.AnalyzerId == analyzerId && i.Status == LabAnalyzerResultStatus.Pending)
                                             .ToListAsync();

            _logger.LogInformation("Attempting to auto-match {Count} pending inbox items for Analyzer {AnalyzerId}.", pendingItems.Count, analyzerId);

            int matchedCount = 0;
            foreach (var item in pendingItems)
            {
                var matchedItem = await AutoMatchAsync(item.InboxId, currentUserId);
                if (matchedItem != null)
                {
                    matchedCount++;
                }
            }
            return matchedCount;
        }
    }
}
