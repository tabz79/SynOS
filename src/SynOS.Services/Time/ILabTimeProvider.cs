using System;

namespace SynOS.Services.Time
{
    public interface ILabTimeProvider
    {
        DateTime GetLabNow();
        DateTime GetLabToday();
        TimeZoneInfo GetLabTimeZone();
    }
}
