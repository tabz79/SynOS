// ResultService.cs - cleaned up to match the current DTOs and still trigger critical alerts

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class ResultService : IResultService
    {
        private readonly SynOSDbContext _context;
        private readonly ILogger<ResultService> _logger;
        private readonly ICriticalValueService _criticalValueService;

        public ResultService(
            SynOSDbContext context,
            ILogger<ResultService> logger,
            ICriticalValueService criticalValueService)
        {
            _context = context;
            _logger = logger;
            _criticalValueService = criticalValueService;
        }

        public async Task<IEnumerable<ResultDto>> GetResultsForOrderAsync(Guid orderId)
        {
            return await _context.Results
                .Where(r => r.OrderId == orderId)
                .Select(r => new ResultDto
                {
                    ResultId = r.ResultId,
                    ParameterCode = r.ParameterCode,
                    Value = r.Value,
                    Flag = r.Flag,
                    Status = r.Status
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<ResultDto>> EnterResultsAsync(Guid userId, ResultEntryRequestDto request)
        {
            var resultsToUpsert = new List<Result>();

            foreach (var resultDto in request.Results)
            {
                // DTO only has Value + TechComments, so we stick to that
                var existingResult = await _context.Results
                    .FirstOrDefaultAsync(r =>
                        r.OrderId == request.OrderId &&
                        r.ParameterCode == resultDto.ParameterCode);

                if (existingResult != null)
                {
                    existingResult.Value = resultDto.Value;
                    existingResult.TechComments = resultDto.TechComments;
                    existingResult.EnteredAt = DateTime.UtcNow;

                    resultsToUpsert.Add(existingResult);
                }
                else
                {
                    var newResult = new Result
                    {
                        ResultId = Guid.NewGuid(),
                        OrderId = request.OrderId,
                        ParameterCode = resultDto.ParameterCode,
                        Value = resultDto.Value,
                        TechComments = resultDto.TechComments,
                        EnteredByUserId = userId,
                        EnteredAt = DateTime.UtcNow,
                        Status = "Draft"
                    };

                    _context.Results.Add(newResult);
                    resultsToUpsert.Add(newResult);
                }
            }

            await _context.SaveChangesAsync();

            // After saving, check each new/updated result for critical values
            foreach (var result in resultsToUpsert)
            {
                try
                {
                    await _criticalValueService.CheckAndCreateCriticalAlertAsync(result.ResultId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Error while checking critical value for ResultId {ResultId}",
                        result.ResultId);
                    // We deliberately do NOT fail the whole operation because of critical check
                }
            }

            return resultsToUpsert.Select(r => new ResultDto
            {
                ResultId = r.ResultId,
                ParameterCode = r.ParameterCode,
                Value = r.Value,
                Status = r.Status,
                Flag = r.Flag
            });
        }

        public async Task AutosaveResultsAsync(Guid userId, AutosaveRequestDto request)
        {
            var buffer = await _context.AutosaveBuffers
                .FirstOrDefaultAsync(b =>
                    b.UserId == userId &&
                    b.EntityType == "OrderResults" &&
                    b.EntityId == request.OrderId);

            if (buffer == null)
            {
                buffer = new AutosaveBuffer
                {
                    UserId = userId,
                    EntityType = "OrderResults",
                    EntityId = request.OrderId
                };
                _context.AutosaveBuffers.Add(buffer);
            }

            buffer.DraftJson = request.DraftJson;
            buffer.SavedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<string?> RecoverAutosaveAsync(Guid userId, Guid orderId)
        {
            var buffer = await _context.AutosaveBuffers
                .AsNoTracking()
                .FirstOrDefaultAsync(b =>
                    b.UserId == userId &&
                    b.EntityType == "OrderResults" &&
                    b.EntityId == orderId);

            return buffer?.DraftJson;
        }

        public async Task SubmitForVerificationAsync(Guid orderId)
        {
            var results = await _context.Results
                .Where(r => r.OrderId == orderId)
                .ToListAsync();

            if (!results.Any())
            {
                _logger.LogWarning("SubmitForVerification called for OrderId {OrderId} with no results", orderId);
                return;
            }

            foreach (var r in results)
            {
                if (string.Equals(r.Status, "Draft", StringComparison.OrdinalIgnoreCase))
                {
                    r.Status = "PendingVerification";
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<ResultDto>> GetPatientHistoryForParameterAsync(
            Guid patientId,
            string parameterCode,
            int limit = 3)
        {
            // Join Results -> Orders -> Visits to filter by patient
            var query =
                from r in _context.Results
                join o in _context.Orders on r.OrderId equals o.OrderId
                join v in _context.Visits on o.VisitId equals v.VisitId
                where v.PatientId == patientId && r.ParameterCode == parameterCode
                orderby r.EnteredAt descending
                select new ResultDto
                {
                    ResultId = r.ResultId,
                    ParameterCode = r.ParameterCode,
                    Value = r.Value,
                    Flag = r.Flag,
                    Status = r.Status
                };

            return await query.Take(limit).ToListAsync();
        }

        public async Task<ResultDto> SupersedeResultAsync(Guid oldResultId, Guid userId, string newValue)
        {
            var oldResult = await _context.Results
                .FirstOrDefaultAsync(r => r.ResultId == oldResultId);

            if (oldResult == null)
            {
                throw new InvalidOperationException($"Result {oldResultId} not found.");
            }

            var newResult = new Result
            {
                ResultId = Guid.NewGuid(),
                OrderId = oldResult.OrderId,
                ParameterCode = oldResult.ParameterCode,
                Value = newValue,
                TechComments = oldResult.TechComments,
                EnteredByUserId = userId,
                EnteredAt = DateTime.UtcNow,
                Status = "Draft"
            };

            oldResult.Status = "Superseded";
            oldResult.SupersededByResultId = newResult.ResultId;

            _context.Results.Add(newResult);
            await _context.SaveChangesAsync();

            // Re-run critical alert on the new value
            try
            {
                await _criticalValueService.CheckAndCreateCriticalAlertAsync(newResult.ResultId);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error while checking critical value for superseded ResultId {ResultId}",
                    newResult.ResultId);
            }

            return new ResultDto
            {
                ResultId = newResult.ResultId,
                ParameterCode = newResult.ParameterCode,
                Value = newResult.Value,
                Status = newResult.Status,
                Flag = newResult.Flag
            };
        }
    }
}
