// The previous attempt to write this file had incomplete content.
// I will now write the full, more complete implementation of ResultService.
// This is a large file, so it is being provided in one block.
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

        public ResultService(SynOSDbContext context, ILogger<ResultService> logger)
        {
            _context = context;
            _logger = logger;
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
                }).ToListAsync();
        }

        public async Task<IEnumerable<ResultDto>> EnterResultsAsync(Guid userId, ResultEntryRequestDto request)
        {
            var resultsToUpsert = new List<Result>();

            foreach (var resultDto in request.Results)
            {
                var existingResult = await _context.Results
                    .FirstOrDefaultAsync(r => r.OrderId == request.OrderId && r.ParameterCode == resultDto.ParameterCode);

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

            return resultsToUpsert.Select(r => new ResultDto
            {
                ResultId = r.ResultId,
                ParameterCode = r.ParameterCode,
                Value = r.Value,
                Status = r.Status
            });
        }

        public async Task AutosaveResultsAsync(Guid userId, AutosaveRequestDto request)
        {
            var buffer = await _context.AutosaveBuffers
                .FirstOrDefaultAsync(b => b.UserId == userId && b.EntityType == "OrderResults" && b.EntityId == request.OrderId);

            if (buffer == null)
            {
                buffer = new AutosaveBuffer { UserId = userId, EntityType = "OrderResults", EntityId = request.OrderId };
                _context.AutosaveBuffers.Add(buffer);
            }

            buffer.DraftJson = request.DraftJson;
            buffer.SavedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<string?> RecoverAutosaveAsync(Guid userId, Guid orderId)
        {
            var buffer = await _context.AutosaveBuffers
                .Where(b => b.UserId == userId && b.EntityType == "OrderResults" && b.EntityId == orderId)
                .OrderByDescending(b => b.SavedAt)
                .FirstOrDefaultAsync();
            return buffer?.DraftJson;
        }

        public async Task SubmitForVerificationAsync(Guid orderId)
        {
            var resultsToSubmit = await _context.Results.Where(r => r.OrderId == orderId && r.Status == "Draft").ToListAsync();
            if (!resultsToSubmit.Any()) throw new InvalidOperationException("No draft results to submit for this order.");

            foreach (var result in resultsToSubmit)
            {
                result.Status = "AwaitingVerification";
            }

            var order = await _context.Orders.FindAsync(orderId);
            if(order != null) order.Status = "ResultsEntered";

            var buffer = await _context.AutosaveBuffers.FirstOrDefaultAsync(b => b.EntityId == orderId);
            if (buffer != null) _context.AutosaveBuffers.Remove(buffer);

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<ResultDto>> GetPatientHistoryForParameterAsync(Guid patientId, string parameterCode, int limit = 3)
        {
            return await _context.Results
                .Include(r => r.Order.Visit)
                .Where(r => r.Order.Visit.PatientId == patientId && r.ParameterCode == parameterCode && r.Status == "Signed")
                .OrderByDescending(r => r.EnteredAt)
                .Take(limit)
                .Select(r => new ResultDto { Value = r.Value, Status = r.EnteredAt.ToShortDateString() })
                .ToListAsync();
        }

        public async Task<ResultDto> SupersedeResultAsync(Guid oldResultId, Guid userId, string newValue)
        {
            var oldResult = await _context.Results.FindAsync(oldResultId);
            if (oldResult == null) throw new KeyNotFoundException("Result to supersede not found.");

            var newResult = new Result
            {
                ResultId = Guid.NewGuid(),
                OrderId = oldResult.OrderId,
                ParameterCode = oldResult.ParameterCode,
                Value = newValue,
                EnteredByUserId = userId,
                EnteredAt = DateTime.UtcNow,
                Status = "Draft",
            };

            oldResult.Status = "Superseded";
            oldResult.SupersededByResultId = newResult.ResultId;

            var link = new ResultLink
            {
                LinkId = Guid.NewGuid(),
                FromResultId = oldResult.ResultId,
                ToResultId = newResult.ResultId,
                Relation = "SupersededBy"
            };

            _context.Results.Add(newResult);
            _context.ResultLinks.Add(link);
            
            await _context.SaveChangesAsync();
            return new ResultDto { ResultId = newResult.ResultId, Status = newResult.Status, Value = newResult.Value, ParameterCode = newResult.ParameterCode };
        }
    }
}
