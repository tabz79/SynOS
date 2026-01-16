using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Services.Security;
using SynOS.Services.Operations; 

namespace SynOS.Services.Dashboard
{
    public class DashboardService : IDashboardService
    {
        private readonly IOperationsEngine _operationsEngine; 
        private readonly IInvoiceService _invoiceService; // ADDED: Revenue Read Port
        private readonly IUserContext _userContext;

        public DashboardService(IOperationsEngine operationsEngine, IInvoiceService invoiceService, IUserContext userContext)
        {
            _operationsEngine = operationsEngine;
            _invoiceService = invoiceService;
            _userContext = userContext;
        }

        public async Task<TodaysSummaryDto> GetTodaysSummaryAsync()
        {
            var branchId = _userContext.CurrentBranchId;
            if (branchId == Guid.Empty)
            {
                throw new UnauthorizedAccessException("Branch context is missing.");
            }

            // Orchestration: Fetch Truth from respective Engines
            var opsStats = await _operationsEngine.GetDailyOperationsStatsAsync(branchId);
            var revStats = await _invoiceService.GetDailyRevenueStatsAsync(branchId);

            return new TodaysSummaryDto
            {
                WalkInsToday = revStats.WalkInsToday,
                PaymentsCollected = revStats.PaymentsCollected,
                PendingReports = opsStats.PendingReports,
                AvgReportTimeMinutes = opsStats.AvgReportTimeMinutes
            };
        }
    }
}
