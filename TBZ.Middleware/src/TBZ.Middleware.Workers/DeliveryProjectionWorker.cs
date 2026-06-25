using System;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class DeliveryProjectionWorker : BaseProjectionWorker
    {
        public DeliveryProjectionWorker(
            ILogger<DeliveryProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new DeliveryProjectionHandler())
        {
        }
    }
}
