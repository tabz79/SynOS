using System;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class ReferralPartnerProjectionWorker : BaseProjectionWorker
    {
        public ReferralPartnerProjectionWorker(
            ILogger<ReferralPartnerProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new ReferralPartnerProjectionHandler())
        {
        }
    }
}
