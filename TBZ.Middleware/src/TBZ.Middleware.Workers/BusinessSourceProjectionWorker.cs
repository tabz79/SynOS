using System;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class BusinessSourceProjectionWorker : BaseProjectionWorker
    {
        public BusinessSourceProjectionWorker(
            ILogger<BusinessSourceProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new BusinessSourceProjectionHandler())
        {
        }
    }
}
