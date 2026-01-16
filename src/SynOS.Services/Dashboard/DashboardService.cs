using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Dashboard;
using SynOS.Services.Security;
using SynOS.Services.Operations; // ADDED

namespace SynOS.Services.Dashboard
{
    public class DashboardService : IDashboardService
    {
        private readonly IOperationsEngine _operationsEngine; // ADDED
        private readonly IUserContext _userContext;

        public DashboardService(IOperationsEngine operationsEngine, IUserContext userContext)
        {
            _operationsEngine = operationsEngine;
            _userContext = userContext;
        }

        public async Task<TodaysSummaryDto> GetTodaysSummaryAsync()
        {
            var branchId = _userContext.CurrentBranchId;
            if (branchId == Guid.Empty)
            {
                throw new UnauthorizedAccessException("Branch context is missing.");
            }

            // Delegate truth calculation to the Engine
            return await _operationsEngine.GetDailyFulfillmentStatsAsync(branchId);
        }
    }
}
