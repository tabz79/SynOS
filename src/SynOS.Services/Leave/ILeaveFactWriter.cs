using System;
using System.Threading.Tasks;
using SynOS.Models.Entities.Leave;

namespace SynOS.Services.Leave
{
    public interface ILeaveFactWriter
    {
        Task CreateLeaveFactAsync(LeaveFact newLeaveFact);
        Task CancelLeaveFactAsync(Guid originalLeaveFactId, Guid authorId);
    }
}