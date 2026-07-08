using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IDiagnosticsService
    {
        Task<Guid> GenerateDiagnosticBundleAsync(string triggerType, string? correlationId = null, string? supportTicketId = null, string? crashId = null);
    }
}
