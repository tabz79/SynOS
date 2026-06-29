using System;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class PatientIntelligenceProjectionWorker : BaseProjectionWorker
    {
        public PatientIntelligenceProjectionWorker(
            ILogger<PatientIntelligenceProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new PatientIntelligenceProjectionHandler())
        {
        }
    }
}
