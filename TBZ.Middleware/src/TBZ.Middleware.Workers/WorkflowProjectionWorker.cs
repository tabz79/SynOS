using System;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class WorkflowProjectionWorker : BaseProjectionWorker
    {
        public WorkflowProjectionWorker(
            ILogger<WorkflowProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new WorkflowProjectionHandler())
        {
        }
    }
}
