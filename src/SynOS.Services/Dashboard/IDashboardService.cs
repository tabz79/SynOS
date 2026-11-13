using System.Threading.Tasks;
using SynOS.Models.DTOs.Dashboard;

namespace SynOS.Services.Dashboard
{
    public interface IDashboardService
    {
        Task<TodaysSummaryDto> GetTodaysSummaryAsync(System.Guid? branchId = null, System.Guid? userId = null, System.DateTime? startDate = null, System.DateTime? endDate = null, string? preset = null);
    }
}
