using System;

namespace SynOS.Services.Phlebotomy
{
    public class BranchTimeProvider : IBranchTimeProvider
    {
        public DateOnly GetLocalDate(Guid branchId)
        {
            // TODO: In a full implementation, this would look up the Branch entity 
            // from cache/DB and apply its configured TimeZone offset.
            // For now, defaulting to IST (+5.5) as requested.
            return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
        }
    }
}
