using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface ISampleService
    {
        Task<IEnumerable<SampleDto>> CreateSamplesForVisitAsync(Guid visitId);
        Task<SampleDto> CollectSampleAsync(Guid sampleId, Guid userId);
        Task<SampleDto> RejectSampleAsync(Guid sampleId, RejectSampleRequestDto rejectionInfo);
        Task<IEnumerable<SampleDto>> GetSampleWorklistAsync(SampleStatus status);
        Task<SampleDto> GetSampleByIdAsync(Guid sampleId);
        Task<string> GetZplLabelForSampleAsync(Guid sampleId);
        Task<SampleBarcodePrintDto> GetSampleBarcodeForPrintingAsync(Guid sampleId);
    }
}
