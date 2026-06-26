using System.Collections.Generic;

namespace TBZ.Middleware.Api.DTOs
{
    public class TrendsSummaryDto
    {
        public List<TrendItemDto> Tests { get; set; } = new List<TrendItemDto>();
        public List<TrendItemDto> Departments { get; set; } = new List<TrendItemDto>();
        public List<TrendItemDto> Doctors { get; set; } = new List<TrendItemDto>();
        public List<TrendItemDto> Partners { get; set; } = new List<TrendItemDto>();
    }

    public class TrendItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int CurrentPeriodCount { get; set; }
        public int PreviousPeriodCount { get; set; }
        public double CountGrowthRate { get; set; }

        public decimal CurrentPeriodRevenue { get; set; }
        public decimal PreviousPeriodRevenue { get; set; }
        public double RevenueGrowthRate { get; set; }
    }
}
