using System;
using System.Threading.Tasks;
using SynOS.Models.Entities;

namespace SynOS.Services
{
    public interface IDictationSessionService
    {
        Task<RadiologyStudy> ClaimStudyAsync(Guid studyId, Guid radiologistId);
        Task<RadiologyStudy> ForceReleaseStudyAsync(Guid studyId, Guid userId, bool isAdminOverride);
        Task<RadiologyDictationSession> StartSessionAsync(Guid studyId, Guid radiologistId);
        Task<RadiologyDictationSession> JoinSessionAsTypistAsync(Guid sessionId, Guid typistId);
        Task UpdateLiveDraftAsync(Guid sessionId, string findings, string impression, string notes, Guid userId);
        Task KeepSessionAliveAsync(Guid sessionId);
        Task<RadiologyDictationSession?> GetActiveSessionAsync(Guid sessionId);
        Task<RadiologyDictationSession?> GetActiveSessionByStudyIdAsync(Guid studyId);
        Task EndSessionAsync(Guid sessionId, Guid userId);
    }
}
