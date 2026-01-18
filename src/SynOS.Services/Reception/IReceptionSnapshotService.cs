using System.Threading.Tasks;
using SynOS.Models.DTOs.Reception;

namespace SynOS.Services.Reception
{
    public interface IReceptionSnapshotService
    {
        Task<ReceptionIntakeSnapshotDto> GetSnapshotAsync(ReceptionSnapshotQuery query);
    }
}