using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IAuditService
    {
        Task LogAsync(Guid? actorUserId, string action, string resourceType, Guid? resourceId, object payload);
    }
}
