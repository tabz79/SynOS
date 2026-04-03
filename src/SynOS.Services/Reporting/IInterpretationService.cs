using System;
using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services.Reporting
{
    public interface IInterpretationService
    {
        Task SaveOrUpdateInterpretationAsync(Guid reportId, string summary, string? notes, Guid userId);
        Task<ReportInterpretation?> GetInterpretationAsync(Guid reportId);
    }
}
