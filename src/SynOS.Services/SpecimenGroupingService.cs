using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class SpecimenGroupingService : ISpecimenGroupingService
    {
        public Task<List<SpecimenWrapper>> CreateSpecimenPlanAsync(IEnumerable<Order> orders)
        {
            var plan = new List<SpecimenWrapper>();

            // 1. Filter out cancelled orders or orders without tests
            var validOrders = orders.Where(o => o.Status != Models.Enums.OrderStatus.Cancelled && o.Test != null).ToList();

            if (!validOrders.Any()) return Task.FromResult(plan);

            // 2. Group by SpecimenTypeCode
            // If Test has no SpecimenTypeCode, we default to "UNK" or handle error?
            // V1: Default to "MISC" or throw?
            // Let's group by whatever is there.

            var groups = validOrders.GroupBy(o => o.Test.SpecimenTypeCode);

            foreach (var group in groups)
            {
                var typeCode = group.Key;
                if (string.IsNullOrEmpty(typeCode))
                {
                    // Fallback for migration safety?
                    typeCode = "NULL"; 
                }

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
