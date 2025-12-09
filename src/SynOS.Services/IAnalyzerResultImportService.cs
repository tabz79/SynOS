using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.LabAnalyzers;
using SynOS.Models.DTOs; // For ResultEntryRequestDto

namespace SynOS.Services
{
    public interface IAnalyzerResultImportService
    {
        Task<AnalyzerImportResultDto> ImportSingleAsync(
            Guid inboxId,
            Guid currentUserId,
            bool submitForVerification = true);

        Task<int> ImportAllMatchedForAnalyzerAsync(
            Guid analyzerId,
            Guid currentUserId,
            bool submitForVerification = true);
    }
}
