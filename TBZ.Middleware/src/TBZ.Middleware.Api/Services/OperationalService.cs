using System;
using System.Threading.Tasks;
using TBZ.Middleware.Api.DTOs;

namespace TBZ.Middleware.Api.Services
{
    public class OperationalService
    {
        private readonly OverviewService _overviewService;
        private readonly WorkflowService _workflowService;
        private readonly DeliveryService _deliveryService;
        private readonly HealthService _healthService;

        public OperationalService(
            OverviewService overviewService,
            WorkflowService workflowService,
            DeliveryService deliveryService,
            HealthService healthService)
        {
            _overviewService = overviewService;
            _workflowService = workflowService;
            _deliveryService = deliveryService;
            _healthService = healthService;
        }

        public async Task<OperationalSectionDto> GetAsync(string resolvedLabId, string? branchId, DateTime? date, DateTime? startDate, DateTime? endDate)
        {
            var overviewTask = _overviewService.GetAsync(resolvedLabId, branchId, date);
            var workflowTask = _workflowService.GetAsync(resolvedLabId, branchId, startDate, endDate);
            var deliveryTask = _deliveryService.GetAsync(resolvedLabId, branchId, startDate, endDate);
            var healthTask = _healthService.GetAsync(resolvedLabId);

            await Task.WhenAll(overviewTask, workflowTask, deliveryTask, healthTask);

            return new OperationalSectionDto
            {
                Overview = await overviewTask,
                Workflow = await workflowTask,
                Delivery = await deliveryTask,
                Health = await healthTask
            };
        }
    }
}
