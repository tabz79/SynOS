using Microsoft.AspNetCore.Http;
using SynOS.Models.DTOs.PACS;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace SynOS.Services
{
    public interface IPacsService
    {
        Task<PacsUploadResultDto> UploadDicomAsync(
            Guid radiologyStudyId,
            IReadOnlyList<IFormFile> files,
            Guid currentUserId
        );

        Task<PacsUploadResultDto> AcquirePacsStudyAsync(
            Guid radiologyStudyId,
            Guid currentUserId
        );

        Task<(Stream Stream, string ContentType)> GetDicomStreamAsync(
            Guid instanceId,
            Guid currentUserId
        );

        Task<PacsReindexResultDto> ReindexStudyAsync(
            Guid radiologyStudyId,
            Guid currentUserId
        );

        Task<PacsSeriesTreeDto> GetSeriesTreeAsync(
            Guid radiologyStudyId,
            Guid currentUserId,
            string apiBaseUrl
        );

        Task<PacsOrphanSummaryDto> GetOrphanSummaryAsync(Guid currentUserId);
        Task<PacsStorageStatsDto> GetStorageStatsAsync(Guid currentUserId);
        Task<PacsOrphanSummaryDto> CleanupOrphansAsync(Guid currentUserId);
    }
}
