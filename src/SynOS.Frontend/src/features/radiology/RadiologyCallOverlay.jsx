import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    Phone, 
    PhoneOff, 
    Mic, 
    MicOff, 
    Volume2, 
    VolumeX, 
    Users, 
    Loader2,
    Check,
    X,
    AlertCircle,
    Minimize2,
    Maximize2
} from 'lucide-react';

export function RadiologyCallOverlay({ hubConnection, selectedStudy, onSelectStudy, role }) {
    const { user } = useAuth();
    
    // Call States: 'idle' | 'calling' | 'ringing' | 'connected'
    const [callState, setCallState] = useState('idle');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [selectedPeerId, setSelectedPeerId] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1.0);
    const [isVolumeMuted, setIsVolumeMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [showCallPanel, setShowCallPanel] = useState(false);
    const [isCallMinimised, setIsCallMinimised] = useState(false);
    
    const callStateRef = useRef(callState);
    const isMutedRef = useRef(isMuted);

    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    // Notification for Call Failed / Busy states
    const [notification, setNotification] = useState(null);

    // Call details for active call
    const [callDetails, setCallDetails] = useState({
        peerUserId: '',
        peerName: '',
        peerRole: '',
        studyId: '',
        patientName: ''
    });

    // WebRTC and Audio Refs
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const audioRef = useRef(null);
    const durationIntervalRef = useRef(null);

    // Procedural Audio Tones Refs
    const audioContextRef = useRef(null);
    const toneOscillatorsRef = useRef([]);

    // 1. Procedural Tone Generator (Constraint 2 & Requirements)
    const playTone = (freq1, freq2, type = 'sine', pulseDuration = 0, silenceDuration = 0) => {
        stopTone();
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const playInstance = () => {
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = type;
                osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
                osc2.type = type;
                osc2.frequency.setValueAtTime(freq2, ctx.currentTime);

                // Very soft volume for dialing tones
                gain.gain.setValueAtTime(0.04, ctx.currentTime);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start();
                osc2.start();

                toneOscillatorsRef.current.push(osc1, osc2, gain);

                if (pulseDuration > 0) {
                    setTimeout(() => {
                        try {
                            osc1.stop();
                            osc2.stop();
                            gain.disconnect();
                        } catch (e) {}
                    }, pulseDuration);
                }
            };

            if (pulseDuration > 0 && silenceDuration > 0) {
                playInstance();
                const intervalId = setInterval(() => {
                    playInstance();
                }, pulseDuration + silenceDuration);
                toneOscillatorsRef.current.push({ intervalId });
            } else {
                playInstance();
            }
        } catch (e) {
            console.error("Failed to generate procedural audio tone:", e);
        }
    };

    const stopTone = () => {
        if (toneOscillatorsRef.current.length > 0) {
            toneOscillatorsRef.current.forEach(item => {
                if (item.intervalId) {
                    clearInterval(item.intervalId);
                } else {
                    try { item.stop(); } catch (e) {}
                    try { item.disconnect(); } catch (e) {}
                }
            });
            toneOscillatorsRef.current = [];
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (e) {}
            audioContextRef.current = null;
        }
    };

    const playDialTone = () => playTone(440, 480, 'sine', 1500, 1500);
    const playRingTone = () => playTone(400, 450, 'sine', 1000, 2000);
    const playBusyTone = () => playTone(480, 620, 'sine', 300, 300);

    // 2. Strict WebRTC Cleanup (Constraint 3)
    const cleanupWebRtcResources = () => {
        // Close peer connection
        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
            } catch (e) {}
            peerConnectionRef.current = null;
        }

        // Stop microphone tracks
        if (localStreamRef.current) {
            try {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            } catch (e) {}
            localStreamRef.current = null;
        }

        // Clear audio element source
        if (audioRef.current) {
            try {
                audioRef.current.srcObject = null;
            } catch (e) {}
        }
        remoteStreamRef.current = null;
        stopTone();
    };

    const cleanupWebRtc = () => {
        // Stop call duration timer
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }
        setCallDuration(0);
        setIsCallMinimised(false);

        cleanupWebRtcResources();
    };

    // 3. WebRTC Stream Handshake (Constraint 3 & 4)
    const setupWebRtc = async (isInitiator, peerId) => {
        cleanupWebRtcResources();
        try {
            // getUserMedia invoked strictly AFTER outgoing call initiated OR incoming call accepted (Constraint 4)
            const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = localStream;

            // Apply mic mute state
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMutedRef.current;
            });

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });
            peerConnectionRef.current = pc;

            // Bind tracks to PeerConnection
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            // Set up remote stream
            const remoteStream = new MediaStream();
            remoteStreamRef.current = remoteStream;
            if (audioRef.current) {
                audioRef.current.srcObject = remoteStream;
            }

            pc.ontrack = (event) => {
                event.streams[0].getAudioTracks().forEach(track => {
                    remoteStream.addTrack(track);
                });
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && hubConnection && hubConnection.state === 'Connected') {
                    hubConnection.invoke('SendDirectWebRtcSignal', peerId, JSON.stringify({
                        type: 'candidate',
                        candidate: event.candidate
                    })).catch(err => console.error("Error sending WebRTC candidate:", err));
                }
            };

            if (isInitiator) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                if (hubConnection && hubConnection.state === 'Connected') {
                    await hubConnection.invoke('SendDirectWebRtcSignal', peerId, JSON.stringify({
                        type: 'offer',
                        sdp: pc.localDescription
                    }));
                }
            }
        } catch (err) {
            console.error("Microphone access or WebRTC setup failed:", err);
            setNotification("Microphone access denied or audio device not found.");
            handleEndCall();
        }
    };

    const handleReceiveSignal = async (senderUserId, signalJson) => {
        // Protect against signals from other users during an active session
        if (callStateRef.current === 'idle') return;
        
        try {
            const signal = JSON.parse(signalJson);
            const pc = peerConnectionRef.current;

            if (signal.type === 'offer') {
                if (!pc) {
                    await setupWebRtc(false, senderUserId);
                }
                const activePc = peerConnectionRef.current;
                if (activePc) {
                    await activePc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await activePc.createAnswer();
                    await activePc.setLocalDescription(answer);
                    if (hubConnection && hubConnection.state === 'Connected') {
                        await hubConnection.invoke('SendDirectWebRtcSignal', senderUserId, JSON.stringify({
                            type: 'answer',
                            sdp: activePc.localDescription
                        }));
                    }
                }
            } else if (signal.type === 'answer') {
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                }
            } else if (signal.type === 'candidate') {
                if (pc) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(err => {
                        console.warn("Failed to add ICE candidate:", err);
                    });
                }
            }
        } catch (e) {
            console.error("Error processing WebRTC signal:", e);
        }
    };

    // 4. SignalR Call Lifecycle Handlers
    useEffect(() => {
        if (!hubConnection) return;

        const onOnlineUsers = (users) => {
            // Exclude self from online list
            const others = users.filter(u => u.userId !== user?.id);
            setOnlineUsers(others);
        };

        const onReceiveCall = (invite) => {
            // Prevent multi-call collisions (Constraint 2)
            if (callStateRef.current !== 'idle') {
                hubConnection.invoke('RejectCall', invite.callerUserId).catch(err => {
                    console.error("Failed to auto-reject incoming call:", err);
                });
                return;
            }

            setCallDetails({
                peerUserId: invite.callerUserId,
                peerName: invite.callerName,
                peerRole: invite.callerRole,
                studyId: invite.studyId,
                patientName: invite.patientName
            });
            setCallState('ringing');
            setShowCallPanel(true);
            playRingTone();
        };

        const onCallAccepted = (receiver) => {
            stopTone();
            setCallState('connected');
            setCallDetails(prev => ({
                ...prev,
                peerUserId: receiver.receiverUserId,
                peerName: receiver.receiverName
            }));
            
            // Start call duration timer
            setCallDuration(0);
            durationIntervalRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);

            // Set up WebRTC connection as initiator
            setupWebRtc(true, receiver.receiverUserId);
        };

        const onCallRejected = (userId) => {
            stopTone();
            cleanupWebRtc();
            setCallState('idle');
            setNotification("Call rejected by recipient.");
        };

        const onCallCancelled = (userId) => {
            stopTone();
            cleanupWebRtc();
            setCallState('idle');
            setNotification("Call cancelled by caller.");
        };

        const onCallEnded = (userId) => {
            cleanupWebRtc();
            setCallState('idle');
            setNotification("Call ended.");
        };

        const onCallFailed = (userId, reason) => {
            stopTone();
            cleanupWebRtc();
            setCallState('idle');
            if (reason === 'Busy') {
                setNotification("User is currently busy on another call.");
                playBusyTone();
                // Reset busy tone after 3 seconds
                setTimeout(() => stopTone(), 3000);
            } else if (reason === 'Offline') {
                setNotification("User is offline.");
            } else {
                setNotification("Call failed.");
            }
        };

        // Wire up listeners
        hubConnection.on('OnlineUsersChanged', onOnlineUsers);
        hubConnection.on('ReceiveCallInvitation', onReceiveCall);
        hubConnection.on('CallAccepted', onCallAccepted);
        hubConnection.on('CallRejected', onCallRejected);
        hubConnection.on('CallCancelled', onCallCancelled);
        hubConnection.on('CallEnded', onCallEnded);
        hubConnection.on('CallFailed', onCallFailed);
        hubConnection.on('ReceiveDirectWebRtcSignal', handleReceiveSignal);

        // Fetch online users list on mount
        if (hubConnection.state === 'Connected') {
            hubConnection.invoke('GetOnlineUsers')
                .then(onOnlineUsers)
                .catch(err => console.error("Error fetching online list:", err));
        }

        return () => {
            hubConnection.off('OnlineUsersChanged', onOnlineUsers);
            hubConnection.off('ReceiveCallInvitation', onReceiveCall);
            hubConnection.off('CallAccepted', onCallAccepted);
            hubConnection.off('CallRejected', onCallRejected);
            hubConnection.off('CallCancelled', onCallCancelled);
            hubConnection.off('CallEnded', onCallEnded);
            hubConnection.off('CallFailed', onCallFailed);
            hubConnection.off('ReceiveDirectWebRtcSignal', handleReceiveSignal);
        };
    }, [hubConnection]);

    // Handle component unmount safety
    useEffect(() => {
        return () => {
            cleanupWebRtc();
        };
    }, []);

    // Dismiss notification automatically
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // 5. Triggering Actions
    const handleInitiateCall = async () => {
        if (!selectedStudy) {
            setNotification("Please select a patient card before placing a call.");
            return;
        }
        if (!selectedPeerId) {
            setNotification("Please select an online operator to call.");
            return;
        }

        const peer = onlineUsers.find(u => u.userId === selectedPeerId);
        if (!peer) return;

        const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
        const patientName = selectedStudy.patientName;

        setCallDetails({
            peerUserId: peer.userId,
            peerName: peer.name,
            peerRole: peer.role,
            studyId: studyId,
            patientName: patientName
        });

        setCallState('calling');
        playDialTone();

        try {
            if (hubConnection && hubConnection.state === 'Connected') {
                await hubConnection.invoke('SendCallInvitation', peer.userId, studyId.toString(), patientName);
            } else {
                setNotification("Operational Network disconnected. Reconnecting...");
                handleEndCall();
            }
        } catch (err) {
            console.error("Failed to place call:", err);
            setNotification("Could not initiate call signal.");
            handleEndCall();
        }
    };

    const handleAcceptCall = async () => {
        stopTone();
        if (hubConnection && hubConnection.state === 'Connected') {
            try {
                // Auto-select study context on accept (Constraint 1 & Requirement 3)
                if (callDetails.studyId && onSelectStudy) {
                    await onSelectStudy(callDetails.studyId);
                }

                await hubConnection.invoke('AcceptCall', callDetails.peerUserId);
                setCallState('connected');
                
                setCallDuration(0);
                durationIntervalRef.current = setInterval(() => {
                    setCallDuration(prev => prev + 1);
                }, 1000);

                await setupWebRtc(false, callDetails.peerUserId);
            } catch (err) {
                console.error("Failed to accept call:", err);
                handleEndCall();
            }
        } else {
            setNotification("Signal connection lost.");
            handleEndCall();
        }
    };

    const handleRejectCall = async () => {
        stopTone();
        if (hubConnection && hubConnection.state === 'Connected') {
            await hubConnection.invoke('RejectCall', callDetails.peerUserId).catch(err => console.error(err));
        }
        cleanupWebRtc();
        setCallState('idle');
    };

    const handleCancelCall = async () => {
        stopTone();
        if (hubConnection && hubConnection.state === 'Connected') {
            await hubConnection.invoke('CancelCall', callDetails.peerUserId).catch(err => console.error(err));
        }
        cleanupWebRtc();
        setCallState('idle');
    };

    const handleEndCall = async () => {
        if (hubConnection && hubConnection.state === 'Connected' && callDetails.peerUserId) {
            await hubConnection.invoke('EndCall', callDetails.peerUserId).catch(err => console.error(err));
        }
        cleanupWebRtc();
        setCallState('idle');
    };

    // Mute Actions
    const handleToggleMute = () => {
        setIsMuted(prev => {
            const next = !prev;
            if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = !next;
                });
            }
            return next;
        });
    };

    const handleToggleVolumeMute = () => {
        setIsVolumeMuted(prev => {
            const next = !prev;
            if (audioRef.current) {
                audioRef.current.muted = next;
            }
            return next;
        });
    };

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsVolumeMuted(false);
        if (audioRef.current) {
            audioRef.current.volume = val;
            audioRef.current.muted = false;
        }
    };

    // Helper: format duration time
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Filter available colleagues of the opposite role
    const targetRole = role === 'Radiologist' ? 'Typist' : 'Radiologist';
    const availableColleagues = onlineUsers.filter(u => u.role === targetRole);

    return (
        <div className="fixed bottom-6 right-6 z-[99] pointer-events-auto flex flex-col items-end gap-3 font-sans select-none">
            {/* 1. Alerts / Notification Panel */}
            {notification && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-2 dark:bg-zinc-900 bg-white border border-red-500/30 text-red-500 text-xs px-4 py-3 rounded-xl shadow-xl max-w-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{notification}</span>
                </div>
            )}

            {/* 2. Hidden Audio Element for WebRTC audio playback */}
            <audio ref={audioRef} autoPlay />

            {/* 3. Call Ringing Modal Overlay (Non-Intrusive) */}
            {callState === 'ringing' && (
                <div className="animate-in zoom-in-95 duration-200 border border-synos-primary/30 dark:bg-zinc-900 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-80 flex flex-col gap-4 border-l-4 border-l-synos-primary">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-synos-primary dark:text-cyan-400">Incoming Audio Call</span>
                            <h4 className="font-bold text-sm dark:text-zinc-100 text-zinc-800 mt-1">{callDetails.peerName}</h4>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">{callDetails.peerRole}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-synos-primary/10 flex items-center justify-center text-synos-primary animate-pulse">
                            <Phone className="w-4 h-4" />
                        </div>
                    </div>
                    
                    <div className="dark:bg-zinc-950/50 bg-zinc-50 rounded-xl p-3 border dark:border-zinc-800 border-zinc-200 flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Contextual Study</span>
                        <span className="text-xs font-semibold dark:text-zinc-300 text-zinc-700 truncate">{callDetails.patientName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                        <button 
                            onClick={handleRejectCall}
                            className="py-2.5 rounded-xl border dark:border-zinc-800 border-zinc-200 dark:hover:bg-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 text-zinc-600 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                        >
                            <X className="w-3.5 h-3.5 text-red-500" />
                            Decline
                        </button>
                        <button 
                            onClick={handleAcceptCall}
                            className="py-2.5 rounded-xl bg-synos-primary hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-synos-primary/20 flex items-center justify-center gap-1.5 active:scale-95"
                        >
                            <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                            Accept
                        </button>
                    </div>
                </div>
            )}

            {/* 4. Active Calling State Display */}
            {callState === 'calling' && (
                <div className="animate-in zoom-in-95 duration-200 border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white shadow-2xl rounded-2xl p-5 w-80 flex flex-col gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-synos-primary/10 flex items-center justify-center text-synos-primary shrink-0 relative">
                            <span className="absolute inset-0 rounded-full bg-synos-primary/20 animate-ping" />
                            <Phone className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[9px] uppercase font-black text-zinc-400 tracking-widest">Dialing colleague...</span>
                            <h4 className="font-bold text-sm dark:text-zinc-100 text-zinc-800">{callDetails.peerName}</h4>
                        </div>
                    </div>

                    <div className="dark:bg-zinc-950/50 bg-zinc-50 rounded-xl p-3 border dark:border-zinc-800 border-zinc-200 text-xs">
                        <div className="text-[9px] uppercase font-bold text-zinc-500">Patient File</div>
                        <div className="font-semibold dark:text-zinc-300 text-zinc-700 truncate mt-0.5">{callDetails.patientName}</div>
                    </div>

                    <button 
                        onClick={handleCancelCall}
                        className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-red-500/10"
                    >
                        <PhoneOff className="w-3.5 h-3.5" />
                        Cancel Call
                    </button>
                </div>
            )}

            {/* 5. In Call Controls Overlay */}
            {callState === 'connected' && (
                isCallMinimised ? (
                    <div className="animate-in zoom-in-95 duration-200 border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white shadow-2xl rounded-full px-4 py-2 flex items-center gap-3 border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold dark:text-zinc-200 text-zinc-800 truncate max-w-[100px]">{callDetails.peerName}</span>
                        </div>
                        <span className="font-mono text-xs dark:bg-zinc-950 bg-zinc-150 px-2 py-0.5 rounded dark:text-zinc-400 text-zinc-600 font-semibold shadow-sm">
                            {formatDuration(callDuration)}
                        </span>
                        <button 
                            onClick={() => setIsCallMinimised(false)}
                            className="p-1 hover:bg-zinc-500/10 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            title="Maximize Call Controls"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={handleEndCall}
                            className="p-1.5 rounded-full bg-red-500 hover:bg-red-650 text-white transition-all active:scale-95 shadow-sm"
                            title="End Call"
                        >
                            <PhoneOff className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="animate-in zoom-in-95 duration-200 border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white shadow-2xl rounded-2xl p-5 w-80 flex flex-col gap-4 border-t-4 border-t-emerald-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] uppercase font-black text-emerald-500 tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    Call Connected
                                </span>
                                <h4 className="font-bold text-sm dark:text-zinc-100 text-zinc-800 mt-1">{callDetails.peerName}</h4>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">{callDetails.peerRole}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsCallMinimised(true)}
                                    className="p-1 hover:bg-zinc-500/10 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors"
                                    title="Minimize Call Controls"
                                >
                                    <Minimize2 className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-mono text-xs dark:bg-zinc-950 bg-zinc-150 px-2 py-1 rounded dark:text-zinc-400 text-zinc-600 font-semibold shadow-sm">
                                    {formatDuration(callDuration)}
                                </span>
                            </div>
                        </div>

                        <div className="dark:bg-zinc-950/50 bg-zinc-50 rounded-xl p-3 border dark:border-zinc-850 border-zinc-200 text-xs">
                            <div className="text-[9px] uppercase font-bold text-zinc-500">Active Discussion</div>
                            <div className="font-semibold dark:text-zinc-300 text-zinc-700 truncate mt-0.5">{callDetails.patientName}</div>
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between border-t dark:border-zinc-800 border-zinc-100 pt-3">
                            {/* Mic Control */}
                            <button 
                                onClick={handleToggleMute}
                                className={`p-2.5 rounded-xl transition-all active:scale-95 border ${
                                    isMuted 
                                        ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/15' 
                                        : 'dark:bg-zinc-800 bg-zinc-100 dark:border-zinc-700 border-zinc-200 hover:dark:bg-zinc-700 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300'
                                }`}
                                title={isMuted ? "Unmute Mic" : "Mute Mic"}
                            >
                                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>

                            {/* Speaker/Volume Controls */}
                            <div className="flex items-center gap-2 flex-1 max-w-[130px] ml-3">
                                <button 
                                    onClick={handleToggleVolumeMute}
                                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    {isVolumeMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.05"
                                    value={isVolumeMuted ? 0 : volume} 
                                    onChange={handleVolumeChange}
                                    className="w-full accent-synos-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* End Call Button */}
                            <button 
                                onClick={handleEndCall}
                                className="p-2.5 rounded-xl bg-red-500 hover:bg-red-655 text-white transition-all active:scale-95 shadow-md shadow-red-500/10"
                                title="End Call"
                            >
                                <PhoneOff className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )
            )}

            {/* 6. Floating Action Button & Dropdown Picker (Idle state) */}
            {callState === 'idle' && (
                <div className="flex flex-col items-end gap-2">
                    {showCallPanel && (
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white shadow-2xl rounded-2xl p-4 w-72 flex flex-col gap-3">
                            <div className="flex items-center gap-1.5 justify-between border-b dark:border-zinc-800 border-zinc-150 pb-2">
                                <span className="text-[10px] font-black uppercase text-zinc-550 dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    Operator Calling
                                </span>
                                <button 
                                    onClick={() => setShowCallPanel(false)}
                                    className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 text-xs p-1"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Dropdown list of online colleagues */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold text-zinc-500 block">Available Online {targetRole}s</label>
                                {availableColleagues.length === 0 ? (
                                    <div className="text-[11px] italic text-zinc-400 py-3 text-center border border-dashed dark:border-zinc-800 border-zinc-200 rounded-xl">
                                        No {targetRole}s online.
                                    </div>
                                ) : (
                                    <select
                                        value={selectedPeerId}
                                        onChange={(e) => setSelectedPeerId(e.target.value)}
                                        className="w-full text-xs dark:bg-zinc-950 bg-zinc-50 border dark:border-zinc-800 border-zinc-200 focus:border-synos-primary rounded-xl p-2.5 dark:text-zinc-200 text-zinc-800 focus:outline-none transition-all"
                                    >
                                        <option value="">Select a Colleague...</option>
                                        {availableColleagues.map(u => (
                                            <option key={u.userId} value={u.userId}>
                                                {u.name} {u.currentCallState !== 'Idle' ? `(${u.currentCallState})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Display active selection context details */}
                            <div className="dark:bg-zinc-950/50 bg-zinc-50 rounded-xl p-3 border dark:border-zinc-850 border-zinc-200 text-[11px] flex flex-col gap-0.5">
                                <span className="text-[9px] uppercase font-bold text-zinc-500">Contextual Patient</span>
                                <span className="font-bold dark:text-zinc-300 text-zinc-700 truncate">
                                    {selectedStudy ? selectedStudy.patientName : "No Study Selected"}
                                </span>
                                {!selectedStudy && (
                                    <span className="text-[9px] text-red-500 font-medium mt-0.5">
                                        Select a patient before placing a call.
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={handleInitiateCall}
                                disabled={!selectedStudy || !selectedPeerId}
                                className="w-full py-2.5 rounded-xl bg-synos-primary hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-synos-primary/10 active:scale-95"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                Initiate Audio Call
                            </button>
                        </div>
                    )}

                    {/* Main Float Icon Button Toggle */}
                    <button
                        onClick={() => setShowCallPanel(prev => !prev)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 border hover:scale-105 ${
                            showCallPanel 
                                ? 'bg-synos-primary border-synos-primary text-white' 
                                : 'dark:bg-zinc-900 bg-white dark:border-zinc-850 border-zinc-200 text-synos-primary hover:text-synos-primary-light'
                        }`}
                        title="Radiology Audio Link"
                    >
                        <Phone className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
