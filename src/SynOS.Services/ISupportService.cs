using System;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface ISupportService
    {
        Task<Guid> CreateTicketAsync(string title, string description, string priority, string category);
        Task<Guid> ReportCrashAsync(string exceptionMessage, string stackTrace);
    }
}
