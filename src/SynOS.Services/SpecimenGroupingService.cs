using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class SpecimenGroupingService : ISpecimenGroupingService
    {
        private readonly ILogger<SpecimenGroupingService> _logger;

        public SpecimenGroupingService(ILogger<SpecimenGroupingService> logger)
        {
            _logger = logger;
        }

        public Task<List<SpecimenWrapper>> CreateSpecimenPlanAsync(IEnumerable<Order> orders)
        {
            var plan = new List<SpecimenWrapper>();

            // TEMPORARY DEBUG LOG
            foreach (var o in orders)
            {
                _logger.LogInformation($"[DebugGrouping] Order: {o.OrderId}, TestCode: {o.TestCode}, TestNavigationPresent: {o.Test != null}");
            }

            // 1. Filter out cancelled orders, orders without tests, AND EXCLUDE PROFILE PARENTS
            // Profile parents: ParentOrderId == null AND Test.IsProfile == true
            // Included: Standalone tests OR Child tests
            var validOrders = orders.Where(o => 
                o.Status != Models.Enums.OrderStatus.Cancelled && 
                o.Test != null && 
                (o.ParentOrderId != null || !o.Test.IsProfile)
            ).ToList();

            if (!validOrders.Any()) return Task.FromResult(plan);

            // 2. Strict Validation: Every billable order MUST have a SpecimenTypeCode
            foreach (var order in validOrders)
            {
                if (string.IsNullOrEmpty(order.Test.SpecimenTypeCode))
                {
                    throw new InvalidOperationException($"Specimen type not configured for test {order.TestCode}. Specimen planning cannot proceed.");
                }
            }

            // 3. Group by SpecimenTypeCode
            var groups = validOrders.GroupBy(o => o.Test.SpecimenTypeCode);

            foreach (var group in groups)
            {
                var typeCode = group.Key!;
                var wrapper = new SpecimenWrapper
                {
                    SpecimenTypeCode = typeCode,
                    Orders = group.ToList()
                };
                plan.Add(wrapper);
            }

            return Task.FromResult(plan);
        }
    }
}
