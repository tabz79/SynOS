using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Entities;
using SynOS.Models.Enums;
using SynOS.Services.Operational;

namespace SynOS.Services
{
    public class DictationSessionService : IDictationSessionService
    {
        private readonly SynOSDbContext _context;
        private readonly IOperationalEventWriter _eventWriter;

        public DictationSessionService(SynOSDbContext context, IOperationalEventWriter eventWriter)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _eventWriter = eventWriter ?? throw new ArgumentNullException(nameof(eventWriter));
        }

        public async Task<RadiologyStudy> ClaimStudyAsync(Guid studyId, Guid radiologistId)
        {
            var study = await _context.RadiologyStudies
                .Include(s => s.Visit)
                .FirstOrDefaultAsync(s => s.RadiologyStudyId == studyId);

            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            var now = DateTimeOffset.UtcNow;

            // Check if already claimed and active
            if (study.ClaimedByUserId.HasValue)
            {
                bool isExpired = study.ClaimedAt.HasValue && (now - study.ClaimedAt.Value).TotalMinutes > 30;
                bool isInactive = study.LastActivityAt.HasValue && (now - study.LastActivityAt.Value).TotalMinutes > 30;

                if (study.ClaimedByUserId.Value == radiologistId)
                {
                    // Radiologist already has the claim, renew sliding lease
                    study.ClaimedAt = now;
                    study.LastActivityAt = now;
                    await _context.SaveChangesAsync();
                    return study;
                }

                if (!isExpired && !isInactive)
                {
                    throw new InvalidOperationException($"Study is already claimed by another radiologist until {study.ClaimedAt.Value.AddMinutes(30):HH:mm:ss} UTC.");
                }

                // If it is expired/inactive, terminate the old session and clear it
                if (study.ActiveSessionId.HasValue)
                {
                    var session = await _context.RadiologyDictationSessions.FindAsync(study.ActiveSessionId.Value);
                    if (session != null)
                    {
                        session.SessionStatus = "Ended";
                        session.EndedAt = now;
                    }
                    study.ActiveSessionId = null;
                }

                // Reset status back to AwaitingDictation if it was in session
                if (study.Status == "DictationSessionStarted")
                {
                    study.Status = "AwaitingDictation";
                }
            }

            // Claim the study
            study.ClaimedByUserId = radiologistId;
            study.ClaimedAt = now;
            study.LastActivityAt = now;

            // Log granular clinical event STUDY_CLAIMED
            if (study.Visit != null && study.Visit.BranchId.HasValue)
            {
                await _eventWriter.WriteEventAsync(
                    BranchEventType.VISIT_UPDATED,
                    study.Visit.BranchId.Value.ToString(),
                    study.Visit.VisitId.ToString(),
                    study.RadiologyStudyId.ToString(),
                    $"Study claimed by radiologist ID '{radiologistId}'",
                    "User",
                    radiologistId.ToString(),
                    false,
                    study.RadiologyStudyId,
                    "RadiologyStudy"
                );
            }
            
            await _context.SaveChangesAsync();
            return study;
        }

        public async Task<RadiologyStudy> ForceReleaseStudyAsync(Guid studyId, Guid userId, bool isAdminOverride)
        {
            var study = await _context.RadiologyStudies
                .Include(s => s.Visit)
                .FirstOrDefaultAsync(s => s.RadiologyStudyId == studyId);

            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            var now = DateTimeOffset.UtcNow;

            if (!study.ClaimedByUserId.HasValue)
            {
                return study; // Already released
            }

            bool isExpired = study.ClaimedAt.HasValue && (now - study.ClaimedAt.Value).TotalMinutes > 30;
            bool isInactive = study.LastActivityAt.HasValue && (now - study.LastActivityAt.Value).TotalMinutes > 5; // 5 mins disconnect override

            if (!isAdminOverride && !isExpired && !isInactive)
            {
                throw new InvalidOperationException("Cannot force release study. Claim is still active and radiologist is not timed out.");
            }

            // End active session if exists
            if (study.ActiveSessionId.HasValue)
            {
                var session = await _context.RadiologyDictationSessions.FindAsync(study.ActiveSessionId.Value);
                if (session != null)
                {
                    session.SessionStatus = "Ended";
                    session.EndedAt = now;
                }
                study.ActiveSessionId = null;
            }

            // Clear claims
            study.ClaimedByUserId = null;
            study.ClaimedAt = null;
            study.LastActivityAt = null;

            // Roll status back to AwaitingDictation if it was in session
            if (study.Status == "DictationSessionStarted")
            {
                study.Status = "AwaitingDictation";
            }

            // Log granular clinical event STUDY_RELEASED
            if (study.Visit != null && study.Visit.BranchId.HasValue)
            {
                await _eventWriter.WriteEventAsync(
                    BranchEventType.VISIT_UPDATED,
                    study.Visit.BranchId.Value.ToString(),
                    study.Visit.VisitId.ToString(),
                    study.RadiologyStudyId.ToString(),
                    $"Study claim force released by user ID '{userId}'",
                    "User",
                    userId.ToString(),
                    false,
                    study.RadiologyStudyId,
                    "RadiologyStudy"
                );
            }

            await _context.SaveChangesAsync();
            return study;
        }

        public async Task<RadiologyDictationSession> StartSessionAsync(Guid studyId, Guid radiologistId)
        {
            var study = await _context.RadiologyStudies
                .Include(s => s.Visit)
                .FirstOrDefaultAsync(s => s.RadiologyStudyId == studyId);

            if (study == null)
            {
                throw new KeyNotFoundException($"Radiology study with ID '{studyId}' not found.");
            }

            // Verify claim ownership
            if (study.ClaimedByUserId != radiologistId)
            {
                throw new InvalidOperationException("You must claim the study before starting a collaborative dictation session.");
            }

            var now = DateTimeOffset.UtcNow;

            // If there's already an active session, return it
            if (study.ActiveSessionId.HasValue)
            {
                var existing = await _context.RadiologyDictationSessions.FindAsync(study.ActiveSessionId.Value);
                if (existing != null && existing.SessionStatus == "Active")
                {
                    study.LastActivityAt = now;
                    await _context.SaveChangesAsync();
                    return existing;
                }
            }

            // Create new session
            var session = new RadiologyDictationSession
            {
                SessionId = Guid.NewGuid(),
                StudyId = studyId,
                RadiologistUserId = radiologistId,
                SessionStatus = "Active",
                AudioChannelState = "Disconnected",
                StartedAt = now
            };

            _context.RadiologyDictationSessions.Add(session);
            
            study.ActiveSessionId = session.SessionId;
            study.Status = "DictationSessionStarted";
            study.LastActivityAt = now;

            // Log granular clinical event DICTATION_SESSION_STARTED
            if (study.Visit != null && study.Visit.BranchId.HasValue)
            {
                await _eventWriter.WriteEventAsync(
                    BranchEventType.RESULT_DRAFT_STARTED,
                    study.Visit.BranchId.Value.ToString(),
                    study.Visit.VisitId.ToString(),
                    study.RadiologyStudyId.ToString(),
                    $"Radiology dictation session started by radiologist ID '{radiologistId}'",
                    "User",
                    radiologistId.ToString(),
                    false,
                    session.SessionId,
                    "RadiologyDictationSession"
                );
            }

            await _context.SaveChangesAsync();
            return session;
        }

        public async Task<RadiologyDictationSession> JoinSessionAsTypistAsync(Guid sessionId, Guid typistId)
        {
            var session = await _context.RadiologyDictationSessions
                .Include(s => s.RadiologyStudy)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                throw new KeyNotFoundException($"Dictation session with ID '{sessionId}' not found.");
            }

            if (session.SessionStatus != "Active")
            {
                throw new InvalidOperationException("Cannot join an inactive dictation session.");
            }

            var now = DateTimeOffset.UtcNow;

            session.TypistUserId = typistId;
            if (session.RadiologyStudy != null)
            {
                session.RadiologyStudy.LastActivityAt = now;
            }

            await _context.SaveChangesAsync();
            return session;
        }

        public async Task UpdateLiveDraftAsync(Guid sessionId, string findings, string impression, string notes, Guid userId)
        {
            var session = await _context.RadiologyDictationSessions
                .Include(s => s.RadiologyStudy)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                throw new KeyNotFoundException($"Dictation session with ID '{sessionId}' not found.");
            }

            if (session.SessionStatus != "Active")
            {
                throw new InvalidOperationException("Cannot update draft on an inactive dictation session.");
            }

            // Secure Update: Check if the user is authorized (Radiologist or Typist)
            if (session.RadiologistUserId != userId && session.TypistUserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to update this live draft.");
            }

            var now = DateTimeOffset.UtcNow;

            session.LiveDraftFindings = findings;
            session.LiveDraftImpression = impression;
            session.LiveDraftNotes = notes;

            if (session.RadiologyStudy != null)
            {
                session.RadiologyStudy.LastActivityAt = now;
            }

            await _context.SaveChangesAsync();
        }

        public async Task<RadiologyDictationSession?> GetActiveSessionAsync(Guid sessionId)
        {
            return await _context.RadiologyDictationSessions
                .Include(s => s.RadiologyStudy)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.SessionStatus == "Active");
        }

        public async Task<RadiologyDictationSession?> GetActiveSessionByStudyIdAsync(Guid studyId)
        {
            return await _context.RadiologyDictationSessions
                .Include(s => s.RadiologyStudy)
                .FirstOrDefaultAsync(s => s.StudyId == studyId && s.SessionStatus == "Active");
        }

        public async Task EndSessionAsync(Guid sessionId, Guid userId)
        {
            var session = await _context.RadiologyDictationSessions
                .Include(s => s.RadiologyStudy)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                throw new KeyNotFoundException($"Dictation session with ID '{sessionId}' not found.");
            }

            // Secure Update: Check if the user is authorized (Radiologist or Typist)
            if (session.RadiologistUserId != userId && session.TypistUserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to end this dictation session.");
            }

            var now = DateTimeOffset.UtcNow;

            session.SessionStatus = "Ended";
            session.EndedAt = now;

            if (session.RadiologyStudy != null)
            {
                session.RadiologyStudy.ActiveSessionId = null;
                session.RadiologyStudy.Status = "DraftReady"; // Locked to DraftReady state
                session.RadiologyStudy.LastActivityAt = now;
                session.RadiologyStudy.ClaimedByUserId = null; // Release claim upon successful dictation end
                session.RadiologyStudy.ClaimedAt = null;
            }

            // Create or update parent report with live draft contents
            var report = await _context.Reports
                .Include(r => r.RadiologyReport)
                .FirstOrDefaultAsync(r => r.SourceType == "RadiologyStudy" && r.SourceId == session.StudyId);

            if (report == null)
            {
                report = new Report
                {
                    ReportId = Guid.NewGuid(),
                    VisitId = session.RadiologyStudy.VisitId,
                    PatientId = session.RadiologyStudy.PatientId,
                    Department = "Radiology",
                    SourceType = "RadiologyStudy",
                    SourceId = session.StudyId,
                    Status = "Draft",
                    CreatedAt = now
                };
                _context.Reports.Add(report);
            }

            if (report.RadiologyReport == null)
            {
                report.RadiologyReport = new RadiologyReport
                {
                    ReportId = report.ReportId,
                    RadiologyStudyId = session.StudyId,
                    Findings = session.LiveDraftFindings,
                    Impression = session.LiveDraftImpression,
                    AdditionalNotes = session.LiveDraftNotes
                };
                _context.RadiologyReports.Add(report.RadiologyReport);
            }
            else
            {
                report.RadiologyReport.Findings = session.LiveDraftFindings;
                report.RadiologyReport.Impression = session.LiveDraftImpression;
                report.RadiologyReport.AdditionalNotes = session.LiveDraftNotes;
            }

            await _context.SaveChangesAsync();
        }

        public async Task KeepSessionAliveAsync(Guid sessionId)
        {
            var session = await _context.RadiologyDictationSessions
                .Include(s => s.RadiologyStudy)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.SessionStatus == "Active");

            if (session != null)
            {
                var now = DateTimeOffset.UtcNow;
                if (session.RadiologyStudy != null)
                {
                    session.RadiologyStudy.LastActivityAt = now;
                    session.RadiologyStudy.ClaimedAt = now;
                }
                await _context.SaveChangesAsync();
            }
        }
    }
}
