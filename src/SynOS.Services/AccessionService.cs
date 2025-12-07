using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class AccessionService : IAccessionService
    {
        private readonly SynOSDbContext _context;
        private static readonly TimeZoneInfo _labTimeZone = TimeZoneInfo.Local; // Should be configurable

        public AccessionService(SynOSDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateRadiologyAccessionNumberAsync()
        {
            var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _labTimeZone).Date;
            var prefix = "RAD";

            var counter = await _context.AccessionCounters
                .FirstOrDefaultAsync(c => c.Day == today && c.Prefix == prefix);

            if (counter == null)
            {
                counter = new AccessionCounter
                {
                    Day = today,
                    Prefix = prefix,
                    LastNumber = 0
                };
                _context.AccessionCounters.Add(counter);
            }

            counter.LastNumber++;
            await _context.SaveChangesAsync();

            return $"{prefix}-{today:yyyyMMdd}-{counter.LastNumber:D4}";
        }
    }
}
