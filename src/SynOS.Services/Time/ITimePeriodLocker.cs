using System;
using System.Threading.Tasks;

namespace SynOS.Services.Time
{
    public interface ITimePeriodLocker
    {
        Task LockPeriodsOlderThanAsync(DateTime cutoffDate);
    }
}
