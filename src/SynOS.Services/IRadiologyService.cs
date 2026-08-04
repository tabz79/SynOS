using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SynOS.Models.DTOs;

namespace SynOS.Services
{
    public interface IRadiologyService
    {
        // Technician Flow
        Task<IEnumerable<RadiologyStudyQueueDto>> GetTechnicianQueueAsync(string[] statuses, bool includeHistory = false);
        Task<IEnumerable<RadiologyStudyQueueDto>> GetPacsMasterArchiveAsync();
        Task AssignStudyAsync(Guid studyId, Guid userId);
        Task<ReportAttachmentDto> AddAttachmentToStudyAsync(Guid studyId, Guid userId, string displayName, string fileUrl, string attachmentType);
        Task MarkImagingCompletedAsync(Guid studyId, Guid userId);
        Task SetExternalMappingAsync(RadiologyStudyExternalMappingDto dto, Guid userId);

        // Radiologist Flow
        Task<IEnumerable<RadiologyStudyWorklistDto>> GetRadiologistWorklistAsync();
        Task<RadiologyStudyDetailDto> GetStudyDetailsAsync(Guid studyId, Guid? userId = null);
        Task<RadiologyReportDto> DraftReportAsync(RadiologyReportDraftDto dto, Guid userId);
        Task<RadiologyReportDto> SignReportAsync(Guid studyId, Guid userId);
        Task ResumeDictationAsync(Guid studyId, Guid userId);
        Task RequestSignatureAsync(Guid studyId, Guid userId);
        
        // Auto-creation from Reception
        Task<IEnumerable<RadiologyStudyDto>> CreateRadiologyStudiesForVisitAsync(Guid visitId, Guid userId);
    }
}
