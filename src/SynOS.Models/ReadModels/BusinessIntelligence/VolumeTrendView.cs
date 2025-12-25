using System;
using System.Collections.Generic;

namespace SynOS.Models.ReadModels.BusinessIntelligence
{
    public class VolumeTrendView
    {
        public DateTimeOffset PeriodStart { get; set; }
        public DateTimeOffset PeriodEnd { get; set; }
        public string MetricName { get; set; } = string.Empty;
        public List<TimeSeriesPoint> TimeSeriesPoints { get; set; } = new List<TimeSeriesPoint>();
    }

    public class TimeSeriesPoint
    {
        public DateTimeOffset Timestamp { get; set; }
        public decimal Value { get; set; }
    }
}
