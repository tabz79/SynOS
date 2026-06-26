using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class RevenueService
    {
        private readonly MiddlewareDbContext _db;

        public RevenueService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<RevenueSummaryDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate)
        {
            var start = (startDate ?? DateTime.UtcNow.AddDays(-30)).Date;
            var end = (endDate ?? DateTime.UtcNow).Date;

            var opsFacts = await _db.DailyOperationsFacts
                .Where(f => f.LabId == resolvedLabId && f.Date >= start && f.Date <= end)
                .OrderBy(f => f.Date)
                .ToListAsync();

            return new RevenueSummaryDto
            {
                LabId = resolvedLabId,
                DailyData = opsFacts.Select(f => new DailyRevenueDto
                {
                    Date = f.Date,
                    RevenueCollected = f.RevenueCollected,
                    PaymentsCount = f.PaymentsCount,
                    BillsCreated = f.BillsCreated,
                    AvgBillValue = f.BillsCreated > 0 ? Math.Round(f.RevenueCollected / f.BillsCreated, 2) : 0
                }).ToList()
            };
        }
    }
}
