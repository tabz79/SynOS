using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TBZ.Middleware.Api.DTOs;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Api.Services.Context
{
    public class ContextService
    {
        private readonly MiddlewareDbContext _db;
        private readonly DoctorContextService _doctorContextService;
        private readonly ReferralPartnerContextService _referralPartnerContextService;
        private readonly TestContextService _testContextService;
        private readonly BusinessSourceContextService _businessSourceContextService;
        private readonly DemographicsContextService _demographicsContextService;
        private readonly LabContextService _labContextService;
        private readonly TrendService _trendService;
        private readonly ContextMetadataService _contextMetadataService;

        public ContextService(
            MiddlewareDbContext db,
            DoctorContextService doctorContextService,
            ReferralPartnerContextService referralPartnerContextService,
            TestContextService testContextService,
            BusinessSourceContextService businessSourceContextService,
            DemographicsContextService demographicsContextService,
            LabContextService labContextService,
            TrendService trendService,
            ContextMetadataService contextMetadataService)
        {
            _db = db;
            _doctorContextService = doctorContextService;
            _referralPartnerContextService = referralPartnerContextService;
            _testContextService = testContextService;
            _businessSourceContextService = businessSourceContextService;
            _demographicsContextService = demographicsContextService;
            _labContextService = labContextService;
            _trendService = trendService;
            _contextMetadataService = contextMetadataService;
        }

        public async Task<AiContextDto> GetContextAsync(
            string labId,
            string? branchId,
            DateTime? date,
            DateTime? startDate,
            DateTime? endDate,
            int? trendDays,
            int limitDoctors,
            int limitPartners,
            int limitTests,
            int limitSources)
        {
            var targetDate = date ?? DateTime.UtcNow;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            var numDays = trendDays ?? 30;

            // Fetch metadata
            var metadata = await _contextMetadataService.GetMetadataAsync(labId);

            // Call all services in parallel
            var labTask = _labContextService.GetLabContextAsync(labId, branchId, targetDate, start, end, numDays);
            var doctorsTask = _doctorContextService.GetTopDoctorsAsync(labId, start, end, limitDoctors);
            var partnersTask = _referralPartnerContextService.GetTopPartnersAsync(labId, start, end, limitPartners);
            var testsTask = _testContextService.GetTopTestsAsync(labId, start, end, limitTests);
            var sourcesTask = _businessSourceContextService.GetBusinessSourcesAsync(labId, start, end, limitSources);
            var demographicsTask = _demographicsContextService.GetDemographicsAsync(labId, start, end);
            var trendsTask = _trendService.GetAsync(labId, numDays);

            await Task.WhenAll(labTask, doctorsTask, partnersTask, testsTask, sourcesTask, demographicsTask, trendsTask);

            return new AiContextDto
            {
                Knowledge = metadata,
                Lab = await labTask,
                TopDoctors = await doctorsTask,
                TopReferralPartners = await partnersTask,
                TopTests = await testsTask,
                BusinessSources = await sourcesTask,
                Demographics = await demographicsTask,
                Trends = await trendsTask
            };
        }
    }
}
