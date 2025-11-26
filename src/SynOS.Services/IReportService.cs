using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IReportService
    {
        Task<ReportVersionDto> SignReportAsync(Guid orderId, Guid pathologistId, ReportSignRequestDto metadata);
        Task SaveFinalResultsAsync(Guid orderId, SaveFinalResultsRequestDto request);
        Task<FinalReportDto> GetFinalReportAsync(Guid orderId);
        Task MarkReportAsDeliveredAsync(Guid orderId);
    }
}
