using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Enums;

namespace SynOS.Services.Time
{
    public class TimePeriodLocker : ITimePeriodLocker
    {
        private readonly SynOSDbContext _context;

        public TimePeriodLocker(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task LockPeriodsOlderThanAsync(DateTime cutoffDate)
        {
            var openPeriodsToLock = await _context.TimePeriods
                .Where(p => p.PeriodDate < DateOnly.FromDateTime(cutoffDate) && p.Status == TimePeriodStatus.Open)
                .ToListAsync();

            if (!openPeriodsToLock.Any())
            {
                return;
            }

            foreach (var period in openPeriodsToLock)
            {
                period.Status = TimePeriodStatus.Locked;
                period.LockedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
    }
}
