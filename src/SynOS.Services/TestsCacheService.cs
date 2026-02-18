using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SynOS.Data;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public class TestsCacheService : ITestsCacheService
    {
        private readonly SynOSDbContext _context;
        private readonly IMemoryCache _cache;
        private const string TestsCacheKey = "AllTests";

        public TestsCacheService(SynOSDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<IReadOnlyList<Test>> GetCachedTestsAsync()
        {
            return await _cache.GetOrCreateAsync(TestsCacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30); // Cache for 30 minutes
                return await _context.Tests
                    .AsNoTracking()
                    .Include(t => t.Parameters)
                        .ThenInclude(p => p.ReferenceRanges)
                    .Include(t => t.PriceConfigs)
                    .Include(t => t.DepartmentMaster) // Added
                    .Include(t => t.TestPricings) // Added
                    .Where(t => t.IsActive)
                    .ToListAsync();
            }) ?? new List<Test>();
        }

        public void InvalidateTestsCache()
        {
            _cache.Remove(TestsCacheKey);
        }
    }
}
