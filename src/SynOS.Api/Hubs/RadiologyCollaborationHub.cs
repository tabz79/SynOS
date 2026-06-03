using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SynOS.Services;

namespace SynOS.Api.Hubs
{
    public class RadiologyCollaborationHub : Hub
    {
        private readonly IDictationSessionService _sessionService;

        // Thread-safe static store tracking presence by UserId
        private static readonly ConcurrentDictionary<string, UserPresence> OnlineUsers = 
            new ConcurrentDictionary<string, UserPresence>();

        public class UserPresence
        {
            public string UserId { get; set; }
            public string ConnectionId { get; set; }
            public string Name { get; set; }
            public string Role { get; set; }
            public string CurrentCallState { get; set; } = "Idle"; // Idle, Calling, Ringing, Connected, Busy
            public string ActiveCallPeerUserId { get; set; } // Whom they are connected with / calling
            public string? CurrentStudyId { get; set; } // Track active study session!
        }

        public RadiologyCollaborationHub(IDictationSessionService sessionService)
        {
            _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userId))
            {
                var name = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value 
                           ?? Context.User?.Identity?.Name 
                           ?? "Unknown User";
                var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

                // Overwrite / register with reconnect safety
                var presence = new UserPresence
                {
                    UserId = userId,
                    ConnectionId = Context.ConnectionId,
                    Name = name,
                    Role = role,
                    CurrentCallState = "Idle",
                    ActiveCallPeerUserId = null
                };

                OnlineUsers[userId] = presence;

                // Push updated list to all terminals
                await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);
            }

            await base.OnConnectedAsync();
        }

        public async Task RegisterPresence(string role)
        {
            var userId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userId))
            {
                var name = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value 
                           ?? Context.User?.Identity?.Name 
                           ?? "Unknown User";

                var presence = new UserPresence
                {
                    UserId = userId,
                    ConnectionId = Context.ConnectionId,
                    Name = name,
                    Role = !string.IsNullOrEmpty(role) ? role : (Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? ""),
                    CurrentCallState = "Idle",
                    ActiveCallPeerUserId = null,
                    CurrentStudyId = null
                };

                // Retain call state across reconnects/re-registrations
                if (OnlineUsers.TryGetValue(userId, out var existing))
                {
                    presence.CurrentCallState = existing.CurrentCallState;
                    presence.ActiveCallPeerUserId = existing.ActiveCallPeerUserId;
                    presence.CurrentStudyId = existing.CurrentStudyId;
                }

                OnlineUsers[userId] = presence;
                await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userId))
            {
                if (OnlineUsers.TryGetValue(userId, out var presence) && presence.ConnectionId == Context.ConnectionId)
                {
                    OnlineUsers.TryRemove(userId, out _);

                    // Tear down any active calls they were in
                    if (!string.IsNullOrEmpty(presence.ActiveCallPeerUserId))
                    {
                        var peerId = presence.ActiveCallPeerUserId;
                        if (OnlineUsers.TryGetValue(peerId, out var peerPresence))
                        {
                            peerPresence.CurrentCallState = "Idle";
                            peerPresence.ActiveCallPeerUserId = null;
                            await Clients.Client(peerPresence.ConnectionId).SendAsync("CallEnded", userId);
                        }
                    }

                    // Leave active study session group
                    if (!string.IsNullOrEmpty(presence.CurrentStudyId))
                    {
                        await Clients.Group($"Session-{presence.CurrentStudyId}").SendAsync("UserLeft", userId);
                    }

                    await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public Task<IEnumerable<UserPresence>> GetOnlineUsers()
        {
            return Task.FromResult<IEnumerable<UserPresence>>(OnlineUsers.Values);
        }

        // Call Negotiation and Signaling Handshakes
        public async Task SendCallInvitation(string targetUserId, string studyId, string patientName)
        {
            var callerUserId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(callerUserId) || !OnlineUsers.TryGetValue(callerUserId, out var callerPresence))
            {
                throw new HubException("Caller presence not registered.");
            }

            if (callerUserId == targetUserId)
            {
                throw new HubException("Self-calls are prohibited.");
            }

            if (string.IsNullOrEmpty(targetUserId) || !OnlineUsers.TryGetValue(targetUserId, out var targetPresence))
            {
                await Clients.Caller.SendAsync("CallFailed", targetUserId, "Offline");
                return;
            }

            // Prevent collisions or parallel calling
            if (targetPresence.CurrentCallState != "Idle")
            {
                await Clients.Caller.SendAsync("CallFailed", targetUserId, "Busy");
                return;
            }

            if (callerPresence.CurrentCallState != "Idle")
            {
                throw new HubException("You are already in an active call state.");
            }

            // Advance state
            callerPresence.CurrentCallState = "Calling";
            callerPresence.ActiveCallPeerUserId = targetUserId;

            targetPresence.CurrentCallState = "Ringing";
            targetPresence.ActiveCallPeerUserId = callerUserId;

            // Broadcast states
            await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);

            // Notify recipient
            await Clients.Client(targetPresence.ConnectionId).SendAsync("ReceiveCallInvitation", new {
                callerUserId = callerUserId,
                callerName = callerPresence.Name,
                callerRole = callerPresence.Role,
                studyId = studyId,
                patientName = patientName
            });
        }

        public async Task AcceptCall(string callerUserId)
        {
            var receiverUserId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(receiverUserId) || !OnlineUsers.TryGetValue(receiverUserId, out var receiverPresence))
            {
                throw new HubException("Receiver presence not registered.");
            }

            if (string.IsNullOrEmpty(callerUserId) || !OnlineUsers.TryGetValue(callerUserId, out var callerPresence))
            {
                await Clients.Caller.SendAsync("CallFailed", callerUserId, "Offline");
                return;
            }

            if (callerPresence.ActiveCallPeerUserId != receiverUserId || receiverPresence.ActiveCallPeerUserId != callerUserId)
            {
                // Mismatched peer states
                return;
            }

            callerPresence.CurrentCallState = "Connected";
            receiverPresence.CurrentCallState = "Connected";

            await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);

            await Clients.Client(callerPresence.ConnectionId).SendAsync("CallAccepted", new {
                receiverUserId = receiverUserId,
                receiverName = receiverPresence.Name
            });
        }

        public async Task RejectCall(string callerUserId)
        {
            var receiverUserId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(receiverUserId) || !OnlineUsers.TryGetValue(receiverUserId, out var receiverPresence)) return;

            if (!string.IsNullOrEmpty(callerUserId) && OnlineUsers.TryGetValue(callerUserId, out var callerPresence))
            {
                if (callerPresence.ActiveCallPeerUserId == receiverUserId)
                {
                    callerPresence.CurrentCallState = "Idle";
                    callerPresence.ActiveCallPeerUserId = null;
                    await Clients.Client(callerPresence.ConnectionId).SendAsync("CallRejected", receiverUserId);
                }
            }

            receiverPresence.CurrentCallState = "Idle";
            receiverPresence.ActiveCallPeerUserId = null;

            await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);
        }

        public async Task CancelCall(string targetUserId)
        {
            var callerUserId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(callerUserId) || !OnlineUsers.TryGetValue(callerUserId, out var callerPresence)) return;

            if (!string.IsNullOrEmpty(targetUserId) && OnlineUsers.TryGetValue(targetUserId, out var targetPresence))
            {
                if (targetPresence.ActiveCallPeerUserId == callerUserId)
                {
                    targetPresence.CurrentCallState = "Idle";
                    targetPresence.ActiveCallPeerUserId = null;
                    await Clients.Client(targetPresence.ConnectionId).SendAsync("CallCancelled", callerUserId);
                }
            }

            callerPresence.CurrentCallState = "Idle";
            callerPresence.ActiveCallPeerUserId = null;

            await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);
        }

        public async Task EndCall(string peerUserId)
        {
            var myUserId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(myUserId) && OnlineUsers.TryGetValue(myUserId, out var myPresence))
            {
                myPresence.CurrentCallState = "Idle";
                myPresence.ActiveCallPeerUserId = null;
            }

            if (!string.IsNullOrEmpty(peerUserId) && OnlineUsers.TryGetValue(peerUserId, out var peerPresence))
            {
                peerPresence.CurrentCallState = "Idle";
                peerPresence.ActiveCallPeerUserId = null;
                await Clients.Client(peerPresence.ConnectionId).SendAsync("CallEnded", myUserId);
            }

            await Clients.All.SendAsync("OnlineUsersChanged", OnlineUsers.Values);
        }

        public async Task SendDirectWebRtcSignal(string targetUserId, string signalData)
        {
            var myUserId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(targetUserId) && OnlineUsers.TryGetValue(targetUserId, out var targetPresence))
            {
                await Clients.Client(targetPresence.ConnectionId).SendAsync("ReceiveDirectWebRtcSignal", myUserId, signalData);
            }
        }

        // --- Backward Compatible Session Methods ---

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
                
                // Track study presence in memory dictionary
                if (OnlineUsers.TryGetValue(userIdString, out var presence))
                {
                    presence.CurrentStudyId = studyId;
                }

                // Notify existing group members that we joined
                await Clients.Group($"Session-{studyId}").SendAsync("UserJoined", userIdString);

                // Notify caller immediately if the other user is already in the same study session
                var otherUser = OnlineUsers.Values.FirstOrDefault(u => u.CurrentStudyId == studyId && u.UserId != userIdString);
                if (otherUser != null)
                {
                    await Clients.Caller.SendAsync("UserJoined", otherUser.UserId);
                }
            }
        }

        public class DraftUpdateModel
        {
            public string? findings { get; set; }
            public string? impression { get; set; }
            public string? additionalNotes { get; set; }
        }

        public async Task SendDraftUpdate(string studyId, string draftJson)
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

                // Broadcast character-by-character updates as a JSON string to other peer
                await Clients.Group($"Session-{studyId}").SendAsync("ReceiveDraftUpdate", draftJson);

                // Parse and persist periodically
                try
                {
                    var update = System.Text.Json.JsonSerializer.Deserialize<DraftUpdateModel>(draftJson);
                    if (update != null)
                    {
                        await _sessionService.UpdateLiveDraftAsync(
                            session.SessionId, 
                            update.findings ?? "", 
                            update.impression ?? "", 
                            update.additionalNotes ?? "", 
                            userId
                        );
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to deserialize live draft update: {ex.Message}");
                }
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
            var userIdString = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userIdString) && OnlineUsers.TryGetValue(userIdString, out var presence))
            {
                presence.CurrentStudyId = null;
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Session-{studyId}");
            await Clients.Group($"Session-{studyId}").SendAsync("UserLeft", userIdString);
        }
    }
}

