using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;
using SynOS.Models.DTOs.Reporting;

namespace SynOS.Services
{
    public interface IReportService
    {
        Task<ReportSignatureResponseDto> SignReportAsync(Guid reportId, Guid signedByUserId);
        Task SubmitForVerificationAsync(Guid reportId, Guid typistId, bool isManualFlow = false); // UPDATED
        Task ReopenReportAsync(Guid reportId, Guid pathologistId); // NEW
        Task MarkManuallyVerifiedAsync(Guid reportId, Guid pathologistId); // NEW
        Task SaveFinalResultsAsync(Guid orderId, SaveFinalResultsRequestDto request);
        Task<FinalReportDto> GetFinalReportAsync(Guid orderId);
        Task MarkReportAsDeliveredAsync(Guid orderId);
        Task<ReportDataModel?> GetReportDataForPdfAsync(Guid reportId, bool forceLive = false);
        Task<IEnumerable<ReportListItemDto>> GetReportsByStatusAsync(string status, bool excludeManualFlow = false);
        Task ClaimReportAsync(Guid reportId, Guid userId); // NEW: Supports Pool Pattern
    }
}
