using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class BusinessSourcesSummaryDto
    {
        public string LabId { get; set; } = string.Empty;
        public List<BusinessSourceItemDto> Sources { get; set; } = new List<BusinessSourceItemDto>();
    }

    public class BusinessSourceItemDto
    {
        public string SourceType { get; set; } = string.Empty;
        public string SourceId { get; set; } = string.Empty;
        public string SourceName { get; set; } = string.Empty;
        public bool IsFirstVisit { get; set; }
        public int PatientCount { get; set; }
        public decimal RevenueGenerated { get; set; }
        public int TestCount { get; set; }
    }
}
