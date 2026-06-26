using System;
using System.Threading.Tasks;
using TBZ.Middleware.Api.DTOs;

namespace TBZ.Middleware.Api.Services
{
    public class IntelligenceService
    {
        private readonly TrendService _trendService;
        private readonly TestService _testService;
        private readonly DemographicsService _demographicsService;

        public IntelligenceService(
            TrendService trendService,
            TestService testService,
            DemographicsService demographicsService)
        {
            _trendService = trendService;
            _testService = testService;
            _demographicsService = demographicsService;
        }

        public async Task<IntelligenceSectionDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate, int? trendDays)
        {
            var trendTask = _trendService.GetAsync(resolvedLabId, trendDays);
            var testTask = _testService.GetAsync(resolvedLabId, startDate, endDate);
            var demographicsTask = _demographicsService.GetAsync(resolvedLabId, startDate, endDate);

            await Task.WhenAll(trendTask, testTask, demographicsTask);

            return new IntelligenceSectionDto
            {
                Trends = await trendTask,
                Tests = await testTask,
                Demographics = await demographicsTask
            };
        }
    }
}
