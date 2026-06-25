using System;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class DailyOperationsProjectionWorker : BaseProjectionWorker
    {
        public DailyOperationsProjectionWorker(
            ILogger<DailyOperationsProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new DailyOperationsProjectionHandler())
        {
        }
    }
}
