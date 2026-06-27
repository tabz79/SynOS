using System;
using System.Threading.Tasks;
using TBZ.Middleware.Api.DTOs;

namespace TBZ.Middleware.Api.Services.Context
{
    public class LabContextService
    {
        private readonly OverviewService _overviewService;
        private readonly RevenueService _revenueService;
        private readonly WorkflowService _workflowService;
        private readonly DeliveryService _deliveryService;
        private readonly TrendService _trendService;

        public LabContextService(
            OverviewService overviewService,
            RevenueService revenueService,
            WorkflowService workflowService,
            DeliveryService deliveryService,
            TrendService trendService)
        {
            _overviewService = overviewService;
            _revenueService = revenueService;
            _workflowService = workflowService;
            _deliveryService = deliveryService;
            _trendService = trendService;
        }

        public async Task<LabContextDto> GetLabContextAsync(string labId, string? branchId, DateTime? date, DateTime? startDate, DateTime? endDate, int? trendDays)
        {
            var targetDate = date ?? DateTime.UtcNow;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            var numDays = trendDays ?? 30;

            var overviewTask = _overviewService.GetAsync(labId, branchId, targetDate);
            var revenueTask = _revenueService.GetAsync(labId, start, end);
            var workflowTask = _workflowService.GetAsync(labId, branchId, start, end);
            var deliveryTask = _deliveryService.GetAsync(labId, branchId, start, end);
            var trendTask = _trendService.GetAsync(labId, numDays);

            await Task.WhenAll(overviewTask, revenueTask, workflowTask, deliveryTask, trendTask);

            var revenueSummary = await revenueTask;

            return new LabContextDto
            {
                RevenueHistory = revenueSummary.DailyData,
                DailyOperations = await overviewTask,
                WorkflowMetrics = await workflowTask,
                DeliveryMetrics = await deliveryTask,
                OperationalTrends = await trendTask
            };
        }
    }
}
