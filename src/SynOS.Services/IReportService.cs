using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IReportService
    {
        Task<ReportSignatureResponseDto> SignReportAsync(Guid reportId, Guid signedByUserId);
        Task SaveFinalResultsAsync(Guid orderId, SaveFinalResultsRequestDto request);
        Task<FinalReportDto> GetFinalReportAsync(Guid orderId);
        Task MarkReportAsDeliveredAsync(Guid orderId);
        Task<ReportDataModel?> GetReportDataForPdfAsync(Guid visitId);
    }
}
