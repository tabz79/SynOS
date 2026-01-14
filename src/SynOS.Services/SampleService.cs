using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SynOS.Data;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;
using SynOS.Models.Enums;
using SynOS.Services.Utils;
using SynOS.Services.Operational; // ADDED
using SynOS.Models.Enums; // ADDED

namespace SynOS.Services
{
    public class SampleService : ISampleService
    {
        private readonly SynOSDbContext _context;
        private readonly ISampleNotifier _sampleNotifier;
        private readonly ITubeConsumptionService _tubeConsumptionService;
        private readonly ILogger<SampleService> _logger;
        private readonly IOperationalEventWriter _operationalEventWriter; // ADDED

        public SampleService(
            SynOSDbContext context, 
            ISampleNotifier sampleNotifier,
            ITubeConsumptionService tubeConsumptionService,
            ILogger<SampleService> logger,
            IOperationalEventWriter operationalEventWriter) // ADDED
        {
            _context = context;
            _sampleNotifier = sampleNotifier;
            _tubeConsumptionService = tubeConsumptionService;
            _logger = logger;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter)); // ADDED
        }

        public async Task<IEnumerable<SampleDto>> CreateSamplesForVisitAsync(Guid visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Orders)
                .ThenInclude(o => o.Test)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit == null)
            {
                throw new KeyNotFoundException("Visit not found.");
            }

            var createdSamples = new List<Sample>();

            foreach (var order in visit.Orders.Where(o => o.Test != null))
            {
                var tubeType = order.Test?.DefaultTubeType ?? TubeType.Other;

                var sample = new Sample
                {
                    SampleId = Guid.NewGuid(),
                    OrderId = order.OrderId,
                    TubeType = tubeType,
                    Status = SampleStatus.Pending
                };

                var payload = $"{sample.SampleId}|{visit.VisitId}|{visit.Token}|{sample.TubeType}";
                var checksum = CalculateChecksum(payload);
                sample.Barcode = $"{payload}|{checksum}";

                createdSamples.Add(sample);
            }

            _context.Samples.AddRange(createdSamples);
            await _context.SaveChangesAsync();

            var sampleDtos = new List<SampleDto>();
            foreach (var sample in createdSamples)
            {
                var dto = await GetSampleByIdAsync(sample.SampleId);
                sampleDtos.Add(dto);
                await _sampleNotifier.NotifySampleUpdateAsync(dto);
            }
            
            return sampleDtos;
        }

        public async Task<SampleDto> CollectSampleAsync(Guid sampleId, Guid userId)
        {
            var sample = await _context.Samples
                .Include(s => s.Order).ThenInclude(o => o.Visit) // ADDED: Include Visit
                .FirstOrDefaultAsync(s => s.SampleId == sampleId);

            if (sample == null) throw new KeyNotFoundException("Sample not found.");

            if (sample.Status == SampleStatus.Collected)
            {
                _logger.LogWarning("Sample {SampleId} has already been collected. Skipping collection and consumption logic.", sampleId);
                return await GetSampleByIdAsync(sampleId);
            }

            sample.Status = SampleStatus.Collected;
            sample.CollectedAt = DateTime.UtcNow;
            sample.CollectedByUserId = userId;

            await _context.SaveChangesAsync();
            
            try
            {
                await _tubeConsumptionService.ConsumeStockOnSampleCollectedAsync(sampleId, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during tube consumption for SampleId {SampleId}. The sample collection status was updated, but stock was not deducted.", sampleId);
            }

            // Emit Operational Event: SAMPLE_COLLECTED
            await _operationalEventWriter.WriteEventAsync(
                BranchEventType.SAMPLE_COLLECTED,
                sample.Order?.Visit?.BranchId?.ToString() ?? "Main",
                sample.Order?.Visit?.VisitId.ToString() ?? "Unknown",
                sample.Order?.Visit?.Token ?? "Unknown",
                $"Sample collected ({sample.TubeType})",
                "User",
                userId.ToString()
            );

            var updatedDto = await GetSampleByIdAsync(sampleId);
            await _sampleNotifier.NotifySampleUpdateAsync(updatedDto);

            return updatedDto;
        }

        public async Task<SampleDto> RejectSampleAsync(Guid sampleId, RejectSampleRequestDto rejectionInfo)
        {
            var originalSample = await _context.Samples.FindAsync(sampleId);
            if (originalSample == null) throw new KeyNotFoundException("Sample not found.");

            originalSample.IsRejected = true;

            var rejection = new SampleRejection
            {
                RejectionId = Guid.NewGuid(),
                SampleId = sampleId,
                Reason = rejectionInfo.Reason,
                RequiresRecollection = rejectionInfo.RequiresRecollection,
                RejectedByUserId = rejectionInfo.RejectedByUserId,
                RejectedAt = DateTime.UtcNow
            };

            Sample newSample = null;
            if (rejectionInfo.RequiresRecollection)
            {
                originalSample.Status = SampleStatus.Recollect;

                var visit = await _context.Orders
                    .Where(o => o.OrderId == originalSample.OrderId)
                    .Select(o => o.Visit)
                    .FirstAsync();

                newSample = new Sample
                {
                    SampleId = Guid.NewGuid(),
                    OrderId = originalSample.OrderId,
                    TubeType = originalSample.TubeType,
                    Status = SampleStatus.Pending
                };
                
                var payload = $"{newSample.SampleId}|{visit.VisitId}|{visit.Token}|{newSample.TubeType}";
                var checksum = CalculateChecksum(payload);
                newSample.Barcode = $"{payload}|{checksum}";

                _context.Samples.Add(newSample);
                rejection.NewSampleId = newSample.SampleId;
            }
            else
            {
                originalSample.Status = SampleStatus.Rejected;
            }

            _context.SampleRejections.Add(rejection);
            await _context.SaveChangesAsync();
            
            var originalSampleDto = await GetSampleByIdAsync(originalSample.SampleId);
            await _sampleNotifier.NotifySampleUpdateAsync(originalSampleDto);

            if (newSample != null)
            {
                var newSampleDto = await GetSampleByIdAsync(newSample.SampleId);
                await _sampleNotifier.NotifySampleUpdateAsync(newSampleDto);
            }

            return originalSampleDto;
        }

        public async Task<IEnumerable<SampleDto>> GetSampleWorklistAsync(SampleStatus status)
        {
            // The `s` in the .Select(s => new SampleDto { ... }) context refers to the Sample entity itself.
            // The previous code had `s.Order.Visit.Patient.FirstName` which was correct,
            // but the error message suggested `s` was not in context.
            // This re-writes the projection to correctly access properties.

            return await _context.Samples
                .Include(s => s.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(s => s.Order)
                    .ThenInclude(o => o.Test)
                .Include(s => s.CollectedBy)
                .Where(s => s.Status == status)
                .Select(s => new SampleDto
                {
                    SampleId = s.SampleId,
                    OrderId = s.OrderId,
                    VisitId = s.Order.VisitId,
                    PatientName = $"{s.Order.Visit.Patient.FirstName} {s.Order.Visit.Patient.LastName}",
                    TestName = s.Order.Test.TestName,
                    TokenNumber = s.Order.Visit.Token,
                    TubeType = s.TubeType.ToString(),
                    Barcode = s.Barcode,
                    CollectedAt = s.CollectedAt,
                    CollectedBy = s.CollectedBy.Name,
                    Status = s.Status.ToString(),
                    IsRejected = s.IsRejected
                })
                .ToListAsync();
        }

        public async Task<SampleDto> GetSampleByIdAsync(Guid sampleId)
        {
            var sample = await _context.Samples
                .Include(s => s.Order)
                    .ThenInclude(o => o.Visit)
                        .ThenInclude(v => v.Patient)
                .Include(s => s.Order)
                    .ThenInclude(o => o.Test)
                .Include(s => s.CollectedBy)
                .FirstOrDefaultAsync(s => s.SampleId == sampleId);

            if (sample == null) return null;

            return new SampleDto
            {
                SampleId = sample.SampleId,
                OrderId = sample.OrderId,
                VisitId = sample.Order.VisitId,
                PatientName = $"{sample.Order.Visit.Patient.FirstName} {sample.Order.Visit.Patient.LastName}",
                TestName = sample.Order.Test.TestName,
                TokenNumber = sample.Order.Visit.Token,
                TubeType = sample.TubeType.ToString(),
                Barcode = sample.Barcode,
                CollectedAt = sample.CollectedAt,
                CollectedBy = sample.CollectedBy?.Name,
                Status = sample.Status.ToString(),
                IsRejected = sample.IsRejected
            };
        }

        public async Task<string> GetZplLabelForSampleAsync(Guid sampleId)
        {
            var labelData = await _context.Samples
                .Where(s => s.SampleId == sampleId)
                .Select(s => new ZplLabelDataDto
                {
                    BarcodePayload = s.Barcode,
                    PatientName = $"{s.Order.Visit.Patient.FirstName} {s.Order.Visit.Patient.LastName}",
                    TestName = s.Order.Test.TestName,
                    TokenNumber = s.Order.Visit.Token,
                    TubeType = s.TubeType.ToString()
                })
                .FirstOrDefaultAsync();

            if (labelData == null) throw new KeyNotFoundException("Sample not found.");

            return ZplLabelGenerator.GenerateLabel(labelData);
        }

        public async Task<SampleBarcodePrintDto> GetSampleBarcodeForPrintingAsync(Guid sampleId)
        {
            var zplPayload = await GetZplLabelForSampleAsync(sampleId);
            return new SampleBarcodePrintDto
            {
                SampleId = sampleId,
                PrintPayload = zplPayload
            };
        }
        
        private int CalculateChecksum(string data)
        {
            return data.ToCharArray().Sum(c => c) % 97; 
        }
    }
}