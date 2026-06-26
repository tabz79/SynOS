using System;
using Microsoft.Extensions.Logging;
using TBZ.Middleware.Projections;

namespace TBZ.Middleware.Workers
{
    public class PatientDemographicProjectionWorker : BaseProjectionWorker
    {
        public PatientDemographicProjectionWorker(
            ILogger<PatientDemographicProjectionWorker> logger, 
            IServiceProvider serviceProvider) 
            : base(logger, serviceProvider, new PatientDemographicProjectionHandler())
        {
        }
    }
}
