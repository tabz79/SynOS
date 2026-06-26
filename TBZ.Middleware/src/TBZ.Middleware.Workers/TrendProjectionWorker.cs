using System;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class TrendProjectionWorker : BaseProjectionWorker
    {
        public TrendProjectionWorker(
            ILogger<TrendProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new TrendProjectionHandler())
        {
        }
    }
}
