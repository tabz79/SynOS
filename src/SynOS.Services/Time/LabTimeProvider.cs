using System;

namespace SynOS.Services.Time
{
    public class LabTimeProvider : ILabTimeProvider
    {
        // Standardized to IST (+5.5) as per BranchTimeProvider and design discussion
        private static readonly TimeZoneInfo _istZone = TimeZoneInfo.CreateCustomTimeZone(
            "India Standard Time",
            new TimeSpan(5, 30, 0),
            "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
            "India Standard Time"
        );

        public DateTime GetLabNow()
        {
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _istZone);
        }

        public DateTime GetLabToday()
        {
            return GetLabNow().Date;
        }

        public TimeZoneInfo GetLabTimeZone()
        {
            return _istZone;
        }
    }
}
