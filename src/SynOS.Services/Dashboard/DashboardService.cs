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

        public async Task<TodaysSummaryDto> GetTodaysSummaryAsync(Guid? branchId = null, Guid? userId = null)
        {
            var effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            if (effectiveBranchId == Guid.Empty)
            {
                throw new UnauthorizedAccessException("Branch context is missing.");
            }

            var effectiveUserId = userId ?? (_userContext.CurrentRole == "Receptionist" ? _userContext.CurrentUserId : (Guid?)null);

            // Orchestration: Fetch Truth from respective Engines
            var opsStats = await _operationsEngine.GetDailyOperationsStatsAsync(effectiveBranchId, effectiveUserId);
            var revStats = await _invoiceService.GetDailyRevenueStatsAsync(effectiveBranchId, effectiveUserId);

            return new TodaysSummaryDto
            {
                WalkInsToday = revStats.WalkInsToday,
                PaymentsCollected = revStats.PaymentsCollected,
                
                // Mapped from Revenue Service (Projector)
                PaymentsCashTotal = revStats.PaymentsCashTotal,
                PaymentsOnlineTotal = revStats.PaymentsOnlineTotal,
                PaymentsOnlineCount = revStats.PaymentsOnlineCount,
                PrepaidBillsCount = revStats.PrepaidBillsCount,
                PrepaidBillsTotal = revStats.PrepaidBillsTotal,
                
                // Mapped from Operations Engine
                PendingReports = opsStats.PendingReports,
                AvgReportTimeMinutes = opsStats.AvgReportTimeMinutes,
                
                // Phlebotomy Stats (Operations Engine)
                PendingCollections = opsStats.PendingCollections,
                CompletedCollections = opsStats.CompletedCollections,
                TestsRunning = opsStats.TestsRunning
            };
        }
    }
}
