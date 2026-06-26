using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services
{
    public class TestService
    {
        private readonly MiddlewareDbContext _db;

        public TestService(MiddlewareDbContext db)
        {
            _db = db;
        }

        public async Task<TestVolumeSummaryDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate)
        {
            var start = (startDate ?? DateTime.UtcNow.AddDays(-30)).Date;
            var end = (endDate ?? DateTime.UtcNow).Date;

            var testFacts = await _db.TestVolumeFacts
                .Where(f => f.LabId == resolvedLabId && f.Date >= start && f.Date <= end)
                .ToListAsync();

            var topTests = testFacts
                .GroupBy(f => f.TestCode)
                .Select(g => new TestVolumeItemDto
                {
                    TestCode = g.Key,
                    VolumeCount = g.Sum(x => x.VolumeCount)
                })
                .OrderByDescending(x => x.VolumeCount)
                .Take(20)
                .ToList();

            var deptVolumes = testFacts
                .GroupBy(f => f.Department)
                .Select(g => new DepartmentVolumeDto
                {
                    Department = g.Key,
                    VolumeCount = g.Sum(x => x.VolumeCount)
                })
                .OrderByDescending(x => x.VolumeCount)
                .ToList();

            return new TestVolumeSummaryDto
            {
                LabId = resolvedLabId,
                TopTests = topTests,
                DepartmentVolumes = deptVolumes
            };
        }
    }
}
