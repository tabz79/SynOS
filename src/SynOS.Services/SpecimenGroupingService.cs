using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SynOS.Models.Entities;
using SynOS.Data;
using Microsoft.EntityFrameworkCore;

namespace SynOS.Services
{
    public class SpecimenGroupingService : ISpecimenGroupingService
    {
        private readonly ILogger<SpecimenGroupingService> _logger;
        private readonly SynOSDbContext _context;

        public SpecimenGroupingService(ILogger<SpecimenGroupingService> logger, SynOSDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public async Task<List<SpecimenWrapper>> CreateSpecimenPlanAsync(IEnumerable<Order> orders)
        {
            var plan = new List<SpecimenWrapper>();

            // 1. Filter out cancelled orders, orders without tests, AND EXCLUDE PROFILE PARENTS
            var validOrders = orders.Where(o => 
                o.Status != Models.Enums.OrderStatus.Cancelled && 
                o.Test != null && 
                (o.ParentOrderId != null || !o.Test.IsProfile)
            ).ToList();

            if (!validOrders.Any()) return plan;

            // 2. Fetch Catalog Definitions for deterministic grouping
            var testCodes = validOrders.Select(o => o.TestCode).Distinct().ToList();
            var catalogTests = await _context.CatalogTests
                .Where(ct => testCodes.Contains(ct.TestCode))
                .ToDictionaryAsync(ct => ct.TestCode);

            // 3. Group by (SpecimenCode, TubeCode) from Catalog
            var orderWithCatalog = validOrders.Select(o => new {
                Order = o,
                Catalog = catalogTests.TryGetValue(o.TestCode, out var ct) ? ct : null
            }).ToList();

            // Validate all have catalog definitions
            foreach (var item in orderWithCatalog)
            {
                if (item.Catalog == null)
                {
                    _logger.LogWarning($"[Grouping] No Catalog definition for test {item.Order.TestCode}. Fallback to runtime Test data.");
                }
            }

            var groups = orderWithCatalog.GroupBy(item => new {
                SpecimenCode = item.Catalog?.SpecimenCode ?? item.Order.Test.SpecimenTypeCode ?? "UNKNOWN_SPECIMEN",
                TubeCode = item.Catalog?.TubeCode ?? "UNKNOWN_TUBE"
            });

            foreach (var group in groups)
            {
                var wrapper = new SpecimenWrapper
                {
                    SpecimenTypeCode = group.Key.SpecimenCode,
                    TubeCode = group.Key.TubeCode,
                    RequiredTubes = 1, // Defaulting to 1 as per user request
                    Orders = group.Select(x => x.Order).ToList()
                };
                plan.Add(wrapper);
            }

            return plan;
        }
    }
}
