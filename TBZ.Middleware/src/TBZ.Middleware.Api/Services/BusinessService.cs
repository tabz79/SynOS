using System;
using System.Threading.Tasks;
using TBZ.Middleware.Api.DTOs;

namespace TBZ.Middleware.Api.Services
{
    public class BusinessService
    {
        private readonly RevenueService _revenueService;
        private readonly BusinessSourceService _businessSourceService;
        private readonly ReferralService _referralService;

        public BusinessService(
            RevenueService revenueService,
            BusinessSourceService businessSourceService,
            ReferralService referralService)
        {
            _revenueService = revenueService;
            _businessSourceService = businessSourceService;
            _referralService = referralService;
        }

        public async Task<BusinessSectionDto> GetAsync(string resolvedLabId, DateTime? startDate, DateTime? endDate)
        {
            var revenueTask = _revenueService.GetAsync(resolvedLabId, startDate, endDate);
            var businessSourceTask = _businessSourceService.GetAsync(resolvedLabId, startDate, endDate, null);
            var referralTask = _referralService.GetAsync(resolvedLabId, startDate, endDate);

            await Task.WhenAll(revenueTask, businessSourceTask, referralTask);

            return new BusinessSectionDto
            {
                Revenue = await revenueTask,
                BusinessSources = await businessSourceTask,
                Referrals = await referralTask
            };
        }
    }
}
