using System;
using System.Threading.Tasks;
using SynOS.Models.DTOs.Reporting;

namespace SynOS.Services.Reporting
{
    public interface IReportingService
    {
        /// <summary>
        /// Generates a fully assembled report structure for rendering or debugging.
        /// Honors snapshots if the report is signed.
        /// </summary>
        Task<ReportStructureDto> GetReportStructureAsync(Guid reportId, bool forceFresh = false);
        
        /// <summary>
        /// Forces a fresh generation from current catalog (ignoring snapshots).
        /// Useful for "Preview" before signing.
        /// </summary>
        Task<ReportStructureDto> PreviewReportStructureAsync(Guid reportId);
        
        /// <summary>
        /// Captures the current state of a report and stores it as an immutable snapshot.
        /// Usually called during the "Sign" process.
        /// </summary>
        Task CreateSnapshotAsync(Guid reportVersionId, bool overwrite = false);
    }
}
