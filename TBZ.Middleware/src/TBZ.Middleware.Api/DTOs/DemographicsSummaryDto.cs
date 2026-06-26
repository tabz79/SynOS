using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class DemographicsSummaryDto
    {
        public List<DemographicMetricDto> Metrics { get; set; } = new List<DemographicMetricDto>();
    }

    public class DemographicMetricDto
    {
        public string AgeGroup { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public int PatientCount { get; set; }
        public decimal Revenue { get; set; }
        public int TestCount { get; set; }
    }
}
