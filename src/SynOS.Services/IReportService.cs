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
        Task<IEnumerable<ReportListItemDto>> GetReportsByStatusAsync(string status, bool excludeManualFlow = false, string? department = null);
        Task ClaimReportAsync(Guid reportId, Guid userId); // NEW: Supports Pool Pattern

        Task<SynOS.Models.DTOs.PaginatedResult<ReportListItemDto>> SearchReportsAsync(
            int pageNumber,
            int pageSize,
            string? searchTerm = null,
            Guid? branchId = null,
            string? department = null,
            System.Collections.Generic.List<string>? statuses = null,
            DateTimeOffset? startDate = null,
            DateTimeOffset? endDate = null);
    }
}
