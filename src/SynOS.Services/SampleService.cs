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
using SynOS.Services.Operational; 
using SynOS.Services.Security; 
using SynOS.Services.Operations; // ADDED

namespace SynOS.Services
{
    public class SampleService : ISampleService
    {
        private readonly SynOSDbContext _context;
        private readonly ISampleNotifier _sampleNotifier;
        private readonly ITubeConsumptionService _tubeConsumptionService;
        private readonly ILogger<SampleService> _logger;
        private readonly IOperationalEventWriter _operationalEventWriter; 
        private readonly IUserContext _userContext; 
        private readonly IOperationsEngine _operationsEngine; // ADDED

        public SampleService(
            SynOSDbContext context, 
            ISampleNotifier sampleNotifier,
            ITubeConsumptionService tubeConsumptionService,
            ILogger<SampleService> logger,
            IOperationalEventWriter operationalEventWriter,
            IUserContext userContext,
            IOperationsEngine operationsEngine) // ADDED
        {
            _context = context;
            _sampleNotifier = sampleNotifier;
            _tubeConsumptionService = tubeConsumptionService;
            _logger = logger;
            _operationalEventWriter = operationalEventWriter ?? throw new ArgumentNullException(nameof(operationalEventWriter));
            _userContext = userContext ?? throw new ArgumentNullException(nameof(userContext));
            _operationsEngine = operationsEngine ?? throw new ArgumentNullException(nameof(operationsEngine)); // ADDED
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
            var branchId = _userContext.CurrentBranchId;
            
            // Facade: Delegate to Operations Engine (Truth Authority)
            await _operationsEngine.RecordSampleCollectedAsync(sampleId, branchId, userId);
            
            // Legacy/Inventory Side Effects
            try
            {
                await _tubeConsumptionService.ConsumeStockOnSampleCollectedAsync(sampleId, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during tube consumption for SampleId {SampleId}.", sampleId);
            }

            var updatedDto = await GetSampleByIdAsync(sampleId);
            await _sampleNotifier.NotifySampleUpdateAsync(updatedDto);

            return updatedDto;
        }

        public async Task<SampleDto> RejectSampleAsync(Guid sampleId, RejectSampleRequestDto rejectionInfo)
        {
            var branchId = _userContext.CurrentBranchId;

            // Facade: Delegate to Operations Engine
            await _operationsEngine.RecordSampleRejectedAsync(sampleId, branchId, rejectionInfo.RejectedByUserId, rejectionInfo.Reason, rejectionInfo.RequiresRecollection);

            // Handle Recollection (Creation of new sample) - Only logic remaining here
            Sample newSample = null;
            if (rejectionInfo.RequiresRecollection)
            {
                // Note: We need to fetch original to get Order details for new sample
                var originalSample = await _context.Samples.AsNoTracking().FirstOrDefaultAsync(s => s.SampleId == sampleId);
                if (originalSample != null)
                {
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
                    await _context.SaveChangesAsync();
                }
            }
            
            var originalSampleDto = await GetSampleByIdAsync(sampleId);
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

            // Cross-Branch Security Guard
            if (sample.Order?.Visit?.BranchId.HasValue == true && sample.Order.Visit.BranchId != _userContext.CurrentBranchId)
            {
                _logger.LogWarning("Cross-branch sample access attempt blocked. SampleId: {SampleId}, Branch: {Branch}, User: {UserBranch}",
                    sampleId, sample.Order.Visit.BranchId, _userContext.CurrentBranchId);
                throw new UnauthorizedAccessException("Access to this sample is restricted.");
            }

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
