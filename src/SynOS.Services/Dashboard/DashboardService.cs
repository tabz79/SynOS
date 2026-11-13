using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Services.Security;
using SynOS.Services.Operations;
using SynOS.Services.Time;

namespace SynOS.Services.Dashboard
{
    public class DashboardService : IDashboardService
    {
        private readonly IOperationsEngine _operationsEngine; 
        private readonly IInvoiceService _invoiceService; // ADDED: Revenue Read Port
        private readonly IUserContext _userContext;
        private readonly ILabTimeProvider _labTimeProvider;

        public DashboardService(IOperationsEngine operationsEngine, IInvoiceService invoiceService, IUserContext userContext, ILabTimeProvider labTimeProvider)
        {
            _operationsEngine = operationsEngine;
            _invoiceService = invoiceService;
            _userContext = userContext;
            _labTimeProvider = labTimeProvider;
        }

        public async Task<TodaysSummaryDto> GetTodaysSummaryAsync(Guid? branchId = null, Guid? userId = null, DateTime? startDate = null, DateTime? endDate = null, string? preset = null)
        {
            var effectiveBranchId = branchId ?? _userContext.CurrentBranchId;
            if (effectiveBranchId == Guid.Empty)
            {
                throw new UnauthorizedAccessException("Branch context is missing.");
            }

            var effectiveUserId = userId ?? (_userContext.CurrentRole == "Receptionist" ? _userContext.CurrentUserId : (Guid?)null);

            var today = _labTimeProvider.GetLabToday();
            if (!string.IsNullOrEmpty(preset))
            {
                var normPreset = preset.Trim().ToLowerInvariant();
                if (normPreset == "today")
                {
                    startDate = today;
                    endDate = today;
                }
                else if (normPreset == "month")
                {
                    startDate = new DateTime(today.Year, today.Month, 1);
                    endDate = today;
                }
                else if (normPreset == "quarter")
                {
                    int quarterMonth = ((today.Month - 1) / 3) * 3 + 1;
                    startDate = new DateTime(today.Year, quarterMonth, 1);
                    endDate = today;
                }
                else if (normPreset == "year")
                {
                    startDate = new DateTime(today.Year, 1, 1);
                    endDate = today;
                }
                else if (normPreset == "single" || normPreset == "singledate")
                {
                    startDate = (startDate ?? today).Date;
                    endDate = startDate;
                }
            }

            if (startDate.HasValue)
            {
                startDate = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Unspecified);
            }
            if (endDate.HasValue)
            {
                endDate = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Unspecified);
            }

            // Orchestration: Fetch Truth from respective Engines
            var opsStats = await _operationsEngine.GetDailyOperationsStatsAsync(effectiveBranchId, effectiveUserId, startDate, endDate);
            var revStats = await _invoiceService.GetDailyRevenueStatsAsync(effectiveBranchId, effectiveUserId, startDate, endDate);

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
                DailyExpensesCashTotal = revStats.DailyExpensesCashTotal,
                DailyExpensesCashPool = revStats.DailyExpensesCashPool,
                DailyExpensesCashIndividual = revStats.DailyExpensesCashIndividual,
                CashDrawerBalance = revStats.CashDrawerBalance,
                CashDrawerBalancePool = revStats.CashDrawerBalancePool,
                CashDrawerBalanceIndividual = revStats.CashDrawerBalanceIndividual,
                PaymentsCashPool = revStats.PaymentsCashPool,
                
                // Mapped from Operations Engine
                PendingReports = opsStats.PendingReports,
                AvgReportTimeMinutes = opsStats.AvgReportTimeMinutes,
                
                // Phlebotomy Stats (Operations Engine)
                PendingCollections = opsStats.PendingCollections,
                CompletedCollections = opsStats.CompletedCollections,
                TestsRunning = opsStats.TestsRunning,
                BranchId = effectiveBranchId
            };
        }
    }
}
