using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SynOS.Services.Payroll.Admin
{
    public interface IPayStructureAdminService
    {
        Task<Guid> CreatePayStructureAsync(string name, string? description, IReadOnlyList<Guid> payComponentIds);
        Task<Guid> CreateNewVersionOfPayStructureAsync(Guid basePayStructureId, string name, string? description, IReadOnlyList<Guid> payComponentIds);
    }
}
