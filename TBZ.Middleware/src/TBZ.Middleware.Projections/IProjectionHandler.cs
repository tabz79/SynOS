using System.Threading.Tasks;
using TBZ.Middleware.Domain;
using TBZ.Middleware.Infrastructure;

namespace TBZ.Middleware.Projections
{
    public interface IProjectionHandler
    {
        string ProjectionName { get; }
        Task ProjectEventAsync(StoredEvent storedEvent, MiddlewareDbContext db);
    }
}
