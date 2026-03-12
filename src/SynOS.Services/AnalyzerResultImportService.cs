using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Models.Entities;
using SynOS.Models.Enums;

namespace SynOS.Services
{
    public class AnalyzerResultImportService : IAnalyzerResultImportService
    {
        private readonly SynOSDbContext _context;
        private readonly IResultService _resultService;
        private readonly ILogger<AnalyzerResultImportService> _logger;

        public AnalyzerResultImportService(
            SynOSDbContext context,
            IResultService resultService,
            ILogger<AnalyzerResultImportService> logger)
        {
            _context = context;
            _resultService = resultService;
            _logger = logger;
        }

        public async Task<AnalyzerImportResultDto> ImportSingleAsync(Guid inboxId, Guid currentUserId, bool submitForVerification = true)
        {
            var inbox = await _context.LabAnalyzerResultInbox
                .Include(x => x.Analyzer)
                .FirstOrDefaultAsync(x => x.InboxId == inboxId);

            if (inbox == null)
            {
                _logger.LogWarning("Inbox item {InboxId} not found for import.", inboxId);
                throw new KeyNotFoundException($"Inbox item with ID {inboxId} not found.");
            }

            if (inbox.Status == LabAnalyzerResultStatus.Imported)
            {
                _logger.LogInformation("Inbox item {InboxId} already imported. Skipping.", inboxId);
                return new AnalyzerImportResultDto
                {
                    InboxId = inbox.InboxId,
                    AnalyzerId = inbox.AnalyzerId,
                    OrderId = inbox.OrderId,
                    ParameterCode = inbox.ParameterCode,
                    ResultId = inbox.ResultId,
                    Status = "AlreadyImported",
                    Message = "Result already imported."
                };
            }

            if (inbox.Status != LabAnalyzerResultStatus.Matched)
            {
                _logger.LogWarning("Inbox item {InboxId} is not in 'Matched' status. Current status: {Status}", inboxId, inbox.Status);
                throw new InvalidOperationException($"Inbox item must be in 'Matched' status before import. Current status: {inbox.Status}");
            }

            if (!inbox.OrderId.HasValue || string.IsNullOrEmpty(inbox.ParameterCode))
            {
                _logger.LogError("Inbox item {InboxId} is missing OrderId or ParameterCode. Auto-match likely failed.", inboxId);
                throw new InvalidOperationException("Auto-match did not set OrderId/ParameterCode for this inbox row.");
            }

            // Build ResultEntryRequestDto
            var request = new ResultEntryRequestDto
            {
                OrderId = inbox.OrderId.Value,
                Results = new List<ParameterResultDto>
                {
                    new ParameterResultDto
                    {
                        OrderId = inbox.OrderId.Value,
                        ParameterCode = inbox.ParameterCode!,
                        Value = inbox.ResultValue ?? string.Empty,
                        TechComments = $"Imported from analyzer {inbox.Analyzer?.Name} (InboxId={inbox.InboxId})"
                    }
                }
            };

            // Call IResultService.EnterResultsAsync
            var response = await _resultService.EnterResultsAsync(currentUserId, request);
            var resultId = response.Results.FirstOrDefault(r => r.ParameterCode == inbox.ParameterCode)?.ResultId;

            if (!resultId.HasValue)
            {
                _logger.LogError("Failed to get ResultId after calling EnterResultsAsync for Inbox {InboxId}, Order {OrderId}, Parameter {ParameterCode}.",
                    inbox.InboxId, inbox.OrderId.Value, inbox.ParameterCode);
                throw new InvalidOperationException("Failed to create/update result in core system.");
            }

            // Update inbox row
            inbox.ResultId = resultId.Value;
            inbox.Status = LabAnalyzerResultStatus.Imported;
            inbox.ReviewedBy = currentUserId;
            inbox.ReviewedAt = DateTimeOffset.UtcNow;
            inbox.UpdatedAt = DateTimeOffset.UtcNow;
            inbox.UpdatedBy = currentUserId;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Inbox item {InboxId} successfully imported to Result {ResultId} for Order {OrderId}. Status: {Status}",
                inbox.InboxId, inbox.ResultId, inbox.OrderId, inbox.Status);

            // Optionally submit for verification
            if (submitForVerification)
            {
                await _resultService.SubmitForVerificationAsync(inbox.OrderId.Value);
                _logger.LogInformation("Order {OrderId} submitted for verification after import of Inbox {InboxId}.", inbox.OrderId.Value, inbox.InboxId);
            }

            return new AnalyzerImportResultDto
            {
                InboxId = inbox.InboxId,
                AnalyzerId = inbox.AnalyzerId,
                OrderId = inbox.OrderId,
                ParameterCode = inbox.ParameterCode,
                ResultId = inbox.ResultId,
                Status = LabAnalyzerResultStatus.Imported,
                Message = "Result successfully imported and submitted for verification."
            };
        }

        public async Task<int> ImportAllMatchedForAnalyzerAsync(Guid analyzerId, Guid currentUserId, bool submitForVerification = true)
        {
            var inboxRows = await _context.LabAnalyzerResultInbox
                .Where(x => x.AnalyzerId == analyzerId && x.Status == LabAnalyzerResultStatus.Matched)
                .ToListAsync();

            _logger.LogInformation("Attempting to import {Count} matched inbox items for Analyzer {AnalyzerId}.", inboxRows.Count, analyzerId);

            int importedCount = 0;
            foreach (var item in inboxRows)
            {
                try
                {
                    var result = await ImportSingleAsync(item.InboxId, currentUserId, submitForVerification);
                    if (result.Status == LabAnalyzerResultStatus.Imported)
                    {
                        importedCount++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to import inbox item {InboxId} for Analyzer {AnalyzerId}.", item.InboxId, analyzerId);
                    // Optionally, update inbox item status to an error state or add a note here
                    item.ReviewNote = $"Import failed: {ex.Message}";
                    item.UpdatedAt = DateTimeOffset.UtcNow;
                    item.UpdatedBy = currentUserId;
                    // Don't save here, save all at once or handle individually.
                    // For now, let's just log and continue. The item status won't change if import failed.
                }
            }
            await _context.SaveChangesAsync(); // Save changes made to ReviewNote
            return importedCount;
        }
    }
}
