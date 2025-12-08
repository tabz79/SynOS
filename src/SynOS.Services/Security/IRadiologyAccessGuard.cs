using System;
using System.Threading.Tasks;

namespace SynOS.Services.Security
{
    public interface IRadiologyAccessGuard
    {
        Task EnsureCanAccessStudyAsync(Guid radiologyStudyId, Guid currentUserId);
        Task EnsureCanAccessPacsInstanceAsync(Guid instanceId, Guid currentUserId);
    }
}
