using System;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class ReferralConversionProjectionWorker : BaseProjectionWorker
    {
        public ReferralConversionProjectionWorker(
            ILogger<ReferralConversionProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new ReferralConversionProjectionHandler())
        {
        }
    }
}
