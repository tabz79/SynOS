using System;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class TestVolumeProjectionWorker : BaseProjectionWorker
    {
        public TestVolumeProjectionWorker(
            ILogger<TestVolumeProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new TestVolumeProjectionHandler())
        {
        }
    }
}
