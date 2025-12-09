using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Models.Entities;
using SynOS.Models.Enums; // For LabAnalyzerConnectionTypes

namespace SynOS.Services
{
    public class LabAnalyzerService : ILabAnalyzerService
    {
        private readonly SynOSDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<LabAnalyzerService> _logger;

        public LabAnalyzerService(SynOSDbContext context, IMapper mapper, ILogger<LabAnalyzerService> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<LabAnalyzer> CreateAnalyzerAsync(CreateLabAnalyzerDto dto, Guid currentUserId)
        {
            if (!IsValidConnectionType(dto.ConnectionType))
            {
                throw new ArgumentException($"Invalid connection type: {dto.ConnectionType}");
            }

            var analyzer = _mapper.Map<LabAnalyzer>(dto);
            analyzer.AnalyzerId = Guid.NewGuid();
            analyzer.CreatedAt = DateTimeOffset.UtcNow;
            analyzer.CreatedBy = currentUserId;
            analyzer.IsEnabled = true; // Default to enabled on creation

            _context.LabAnalyzers.Add(analyzer);
            await _context.SaveChangesAsync();

            _logger.LogInformation("LabAnalyzer created: {AnalyzerId} by {UserId}", analyzer.AnalyzerId, currentUserId);
            return analyzer;
        }

        public async Task<LabAnalyzer> UpdateAnalyzerAsync(Guid analyzerId, UpdateLabAnalyzerDto dto, Guid currentUserId)
        {
            var analyzer = await _context.LabAnalyzers.FindAsync(analyzerId);
            if (analyzer == null)
            {
                throw new KeyNotFoundException($"LabAnalyzer with ID {analyzerId} not found.");
            }

            if (!IsValidConnectionType(dto.ConnectionType))
            {
                throw new ArgumentException($"Invalid connection type: {dto.ConnectionType}");
            }

            _mapper.Map(dto, analyzer);
            analyzer.UpdatedAt = DateTimeOffset.UtcNow;
            analyzer.UpdatedBy = currentUserId;

            await _context.SaveChangesAsync();

            _logger.LogInformation("LabAnalyzer updated: {AnalyzerId} by {UserId}", analyzerId, currentUserId);
            return analyzer;
        }

        public async Task<LabAnalyzer?> GetAnalyzerAsync(Guid analyzerId)
        {
            return await _context.LabAnalyzers.FindAsync(analyzerId);
        }

        public async Task<IReadOnlyList<LabAnalyzer>> GetAnalyzersAsync()
        {
            return await _context.LabAnalyzers.AsNoTracking().ToListAsync();
        }

        public async Task<LabAnalyzerResultInbox> EnqueueManualResultAsync(Guid analyzerId, ManualAnalyzerResultDto dto, Guid currentUserId, string? statusOverride = null, string? errorMessage = null)
        {
            var analyzer = await _context.LabAnalyzers.FindAsync(analyzerId);
            if (analyzer == null)
            {
                throw new KeyNotFoundException($"LabAnalyzer with ID {analyzerId} not found.");
            }

            if (!analyzer.IsEnabled)
            {
                throw new InvalidOperationException($"LabAnalyzer with ID {analyzerId} is disabled.");
            }

            var inboxItem = new LabAnalyzerResultInbox
            {
                InboxId = Guid.NewGuid(),
                AnalyzerId = analyzerId,
                RawMessage = dto.RawMessage ?? BuildRawMessageFromDto(dto), // Build from DTO if RawMessage is null
                PatientIdentifier = dto.PatientIdentifier,
                AnalyzerTestCode = dto.AnalyzerTestCode,
                ResultValue = dto.ResultValue,
                Units = dto.Units,
                Flags = dto.Flags,
                MeasuredAt = dto.MeasuredAt,
                Status = statusOverride ?? LabAnalyzerResultStatus.Pending, // Use override or default to Pending
                ErrorMessage = errorMessage, // Set error message if provided
                ReceivedAt = DateTimeOffset.UtcNow,
                ReceivedBy = currentUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = currentUserId
            };

            _context.LabAnalyzerResultInbox.Add(inboxItem);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Manual result enqueued for Analyzer {AnalyzerId} with status {Status}. Patient: {PatientIdentifier}, Test: {TestCode}",
                                   analyzerId, inboxItem.Status, dto.PatientIdentifier, dto.AnalyzerTestCode);
            return inboxItem;
        }

        public async Task<IReadOnlyList<LabAnalyzerResultInbox>> GetInboxItemsAsync(Guid analyzerId, int limit = 50)
        {
            return await _context.LabAnalyzerResultInbox
                .Where(x => x.AnalyzerId == analyzerId)
                .OrderByDescending(x => x.ReceivedAt)
                .Take(limit)
                .AsNoTracking()
                .ToListAsync();
        }

        private bool IsValidConnectionType(string connectionType)
        {
            return connectionType == LabAnalyzerConnectionTypes.Manual ||
                   connectionType == LabAnalyzerConnectionTypes.Astm ||
                   connectionType == LabAnalyzerConnectionTypes.Hl7 ||
                   connectionType == LabAnalyzerConnectionTypes.FileDrop;
        }

        private string BuildRawMessageFromDto(ManualAnalyzerResultDto dto)
        {
            // Simple JSON or string concatenation for raw message if not provided
            return System.Text.Json.JsonSerializer.Serialize(dto);
        }
    }
}
