using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class DeliverySummaryDto
    {
        public string LabId { get; set; } = string.Empty;
        public string? BranchId { get; set; }
        public int TotalRequested { get; set; }
        public int TotalDelivered { get; set; }
        public int TotalPending { get; set; }
        public double AvgDeliverySpeedMinutes { get; set; }
        public List<DeliveryMethodBreakdownDto> MethodsBreakdown { get; set; } = new();
    }

    public class DeliveryMethodBreakdownDto
    {
        public string DeliveryMethod { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}
