using System;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class DoctorReferralProjectionWorker : BaseProjectionWorker
    {
        public DoctorReferralProjectionWorker(
            ILogger<DoctorReferralProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new DoctorReferralProjectionHandler())
        {
        }
    }
}
