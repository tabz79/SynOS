using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class DeliveryService
    {
        private readonly MiddlewareDbContext _db;

        public DeliveryService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<DeliverySummaryDto> GetAsync(string resolvedLabId, string? branchId, DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            // Join with WorkflowFacts to filter by LabId / BranchId
            var query = from d in _db.DeliveryFacts
                        join w in _db.WorkflowFacts on d.PatientId equals w.PatientId
                        where w.LabId == resolvedLabId && d.CreatedAt >= start && d.CreatedAt <= end
                        select new { d, w };

            if (!string.IsNullOrEmpty(branchId))
            {
                query = query.Where(x => x.w.BranchId == branchId);
            }

            var deliveryData = await query.Select(x => x.d).ToListAsync();

            var totalRequested = deliveryData.Count(d => d.RequestedAt.HasValue);
            var totalDelivered = deliveryData.Count(d => d.Status == "Delivered");
            var totalPending = deliveryData.Count(d => d.Status == "Pending");

            var speeds = deliveryData
                .Where(d => d.RequestedAt.HasValue && d.DeliveredAt.HasValue)
                .Select(d => (d.DeliveredAt.Value - d.RequestedAt.Value).TotalMinutes)
                .ToList();

            var avgSpeed = speeds.Count > 0 ? Math.Round(speeds.Average(), 2) : 0;

            var breakdown = deliveryData
                .GroupBy(d => d.DeliveryMethod ?? "Unknown")
                .Select(g => new DeliveryMethodBreakdownDto
                {
                    DeliveryMethod = g.Key,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ToList();

            return new DeliverySummaryDto
            {
                LabId = resolvedLabId,
                BranchId = branchId,
                TotalRequested = totalRequested,
                TotalDelivered = totalDelivered,
                TotalPending = totalPending,
                AvgDeliverySpeedMinutes = avgSpeed,
                MethodsBreakdown = breakdown
            };
        }
    }
}
