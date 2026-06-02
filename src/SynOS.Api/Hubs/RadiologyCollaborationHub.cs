using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using SynOS.Services;

namespace SynOS.Api.Hubs
{
    public class RadiologyCollaborationHub : Hub
    {
        private readonly IDictationSessionService _sessionService;

        public RadiologyCollaborationHub(IDictationSessionService sessionService)
        {
            _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        }

        public async Task JoinSession(string studyId)
        {
            if (Guid.TryParse(studyId, out var parsedStudyId))
            {
                var userIdString = Context.UserIdentifier;
                if (!Guid.TryParse(userIdString, out var userId))
                {
                    throw new HubException("Unauthorized connection.");
                }

                var session = await _sessionService.GetActiveSessionByStudyIdAsync(parsedStudyId);
                if (session == null)
                {
                    throw new HubException("Active session not found.");
                }

                if (session.RadiologistUserId != userId && session.TypistUserId != userId)
                {
                    throw new HubException("You are not authorized in this session.");
                }

                await Groups.AddToGroupAsync(Context.ConnectionId, $"Session-{studyId}");
                
                // Track presence / connection join
                await Clients.Group($"Session-{studyId}").SendAsync("UserPresenceChanged", Context.ConnectionId, "Connected");
            }
        }

        public async Task SendDraftUpdate(string studyId, string findings, string impression, string notes)
        {
            if (Guid.TryParse(studyId, out var parsedStudyId))
            {
                var userIdString = Context.UserIdentifier;
                if (!Guid.TryParse(userIdString, out var userId))
                {
                    throw new HubException("Unauthorized connection.");
                }

                var session = await _sessionService.GetActiveSessionByStudyIdAsync(parsedStudyId);
                if (session == null)
                {
                    throw new HubException("Active session not found.");
                }

                if (session.RadiologistUserId != userId && session.TypistUserId != userId)
                {
                    throw new HubException("You are not authorized to update this live draft.");
                }

                // Atomically broadcast live drafts to all active listeners in the session group
                await Clients.Group($"Session-{studyId}").SendAsync("ReceiveDraftUpdate", new { findings, impression, notes });

                // Periodic sliding activity persist
                await _sessionService.UpdateLiveDraftAsync(session.SessionId, findings, impression, notes, userId);
            }
        }

        public async Task SendWebRtcSignal(string studyId, string targetConnectionId, string signalData)
        {
            if (Guid.TryParse(studyId, out var parsedStudyId))
            {
                var userIdString = Context.UserIdentifier;
                if (!Guid.TryParse(userIdString, out var userId))
                {
                    throw new HubException("Unauthorized connection.");
                }

                var session = await _sessionService.GetActiveSessionByStudyIdAsync(parsedStudyId);
                if (session == null)
                {
                    throw new HubException("Active session not found.");
                }

                if (session.RadiologistUserId != userId && session.TypistUserId != userId)
                {
                    throw new HubException("You are not authorized in this session.");
                }

                // WebRTC SDP Offer / Answer / ICE Candidate negotiation signals
                await Clients.Client(targetConnectionId).SendAsync("ReceiveWebRtcSignal", Context.ConnectionId, signalData);
            }
        }

        public async Task SendHeartbeat(string studyId)
        {
            if (Guid.TryParse(studyId, out var parsedStudyId))
            {
                var userIdString = Context.UserIdentifier;
                if (!Guid.TryParse(userIdString, out var userId))
                {
                    throw new HubException("Unauthorized connection.");
                }

                var session = await _sessionService.GetActiveSessionByStudyIdAsync(parsedStudyId);
                if (session == null)
                {
                    throw new HubException("Active session not found.");
                }

                if (session.RadiologistUserId != userId && session.TypistUserId != userId)
                {
                    throw new HubException("You are not authorized in this session.");
                }

                await _sessionService.KeepSessionAliveAsync(session.SessionId);
                await Clients.Group($"Session-{studyId}").SendAsync("HeartbeatAcknowledged", Context.ConnectionId);
            }
        }

        public async Task LeaveSession(string studyId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Session-{studyId}");
            await Clients.Group($"Session-{studyId}").SendAsync("UserPresenceChanged", Context.ConnectionId, "Disconnected");
        }
    }
}
