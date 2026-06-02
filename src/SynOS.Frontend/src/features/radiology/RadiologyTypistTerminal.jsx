import React, { useState, useEffect, useRef } from 'react';
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { RadiologyApi } from '@/api/radiology';
import { 
    Activity, 
    Users, 
    RefreshCw, 
    Loader2, 
    FileText, 
    Database, 
    Lock,
    Send,
    MessageSquare,
    Cpu,
    UserCheck
} from 'lucide-react';
import * as signalR from '@microsoft/signalr';

export function RadiologyTypistTerminal() {
    const { user } = useAuth();
    const [studies, setStudies] = useState([]);
    const [selectedStudy, setSelectedStudy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Live Dictation Draft State
    const [draftFindings, setDraftFindings] = useState('');
    const [draftImpression, setDraftImpression] = useState('');
    const [draftNotes, setDraftNotes] = useState('');
    const [reportId, setReportId] = useState(null);

    // SignalR Connection
    const [liveRadiologistConnected, setLiveRadiologistConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const hubConnection = useRef(null);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/radiology/studies/queue?status=AwaitingDictation&status=DictationSessionStarted&status=DraftReady', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStudies(data);
            }
        } catch (error) {
            console.error("Failed to load dictation worklist:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    useEffect(() => {
        if (selectedStudy) {
            connectSignalR(selectedStudy.radiologyStudyId);
            fetchReportDraft(selectedStudy.radiologyStudyId);
        }

        return () => {
            if (hubConnection.current) {
                hubConnection.current.stop();
            }
        };
    }, [selectedStudy]);

    const fetchReportDraft = async (studyId) => {
        // Retrieve local storage cached draft buffers first
        const cachedFindings = localStorage.getItem(`draft_findings_${studyId}`);
        const cachedImpression = localStorage.getItem(`draft_impression_${studyId}`);
        const cachedNotes = localStorage.getItem(`draft_notes_${studyId}`);

        try {
            const response = await fetch(`/api/v1/reports/source/RadiologyStudy/${studyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                const report = await response.json();
                setReportId(report.reportId);
                
                const detailResponse = await fetch(`/api/v1/reports/${report.reportId}/full`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                });
                if (detailResponse.ok) {
                    const detail = await detailResponse.json();
                    if (detail.radiologyReport) {
                        // Rehydrate state preferring localStorage (unsaved local edits) over backend state
                        setDraftFindings(cachedFindings !== null ? cachedFindings : (detail.radiologyReport.findings || ''));
                        setDraftImpression(cachedImpression !== null ? cachedImpression : (detail.radiologyReport.impression || ''));
                        setDraftNotes(cachedNotes !== null ? cachedNotes : (detail.radiologyReport.additionalNotes || ''));
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load report draft:", error);
            // Fallback entirely to cached values if fetch fails (connection dropout resilience)
            if (cachedFindings !== null) setDraftFindings(cachedFindings);
            if (cachedImpression !== null) setDraftImpression(cachedImpression);
            if (cachedNotes !== null) setDraftNotes(cachedNotes);
        }
    };

    const connectSignalR = async (studyId) => {
        if (hubConnection.current) {
            await hubConnection.current.stop();
        }

        setConnectionStatus('Connecting');

        hubConnection.current = new signalR.HubConnectionBuilder()
            .withUrl('/radiologyCollaborationHub', {
                accessTokenFactory: () => localStorage.getItem('synos_jwt')
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000]) // sliding reconnect
            .build();

        hubConnection.current.onreconnecting((error) => {
            setConnectionStatus('Reconnecting');
            console.warn("SignalR connection lost, attempting reconnect...", error);
        });

        hubConnection.current.onreconnected((connectionId) => {
            setConnectionStatus('Connected');
            console.info("SignalR reconnected. Hydrating state...", connectionId);
            fetchReportDraft(studyId);
        });

        hubConnection.current.onclose((error) => {
            setConnectionStatus('Disconnected');
            console.error("SignalR connection closed.", error);
        });

        hubConnection.current.on('ReceiveDraftUpdate', (draftContent) => {
            try {
                const parsed = JSON.parse(draftContent);
                if (parsed.findings !== undefined) {
                    setDraftFindings(parsed.findings);
                    localStorage.setItem(`draft_findings_${studyId}`, parsed.findings);
                }
                if (parsed.impression !== undefined) {
                    setDraftImpression(parsed.impression);
                    localStorage.setItem(`draft_impression_${studyId}`, parsed.impression);
                }
                if (parsed.additionalNotes !== undefined) {
                    setDraftNotes(parsed.additionalNotes);
                    localStorage.setItem(`draft_notes_${studyId}`, parsed.additionalNotes);
                }
            } catch (e) {
                console.error("Failed to parse live draft packet:", e);
            }
        });

        hubConnection.current.on('UserJoined', (connectionId) => {
            setLiveRadiologistConnected(true);
        });

        try {
            await hubConnection.current.start();
            setConnectionStatus('Connected');
            await hubConnection.current.invoke('JoinSession', studyId);
        } catch (e) {
            setConnectionStatus('Disconnected');
            console.error("Failed to connect to SignalR hub:", e);
        }
    };

    // Live keystroke sync & LocalStorage buffering
    const handleFieldChange = async (field, val) => {
        let update = {};
        const studyId = selectedStudy.radiologyStudyId;

        if (field === 'findings') {
            setDraftFindings(val);
            localStorage.setItem(`draft_findings_${studyId}`, val);
            update = { findings: val, impression: draftImpression, additionalNotes: draftNotes };
        } else if (field === 'impression') {
            setDraftImpression(val);
            localStorage.setItem(`draft_impression_${studyId}`, val);
            update = { findings: draftFindings, impression: val, additionalNotes: draftNotes };
        } else if (field === 'notes') {
            setDraftNotes(val);
            localStorage.setItem(`draft_notes_${studyId}`, val);
            update = { findings: draftFindings, impression: draftImpression, additionalNotes: val };
        }

        // Live broadcast over hub connection
        if (hubConnection.current && selectedStudy) {
            try {
                await hubConnection.current.invoke('SendDraftUpdate', studyId, JSON.stringify(update));
            } catch (err) {
                console.error("SignalR broadcast failed:", err);
            }
        }
    };

    const handleSaveDraft = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.radiologyStudyId;
        try {
            const body = {
                studyId: studyId,
                findings: draftFindings,
                impression: draftImpression,
                additionalNotes: draftNotes
            };
            const response = await fetch('/api/v1/radiology-reports/draft', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (response.ok) {
                // Clear local cache upon database save confirmation
                localStorage.removeItem(`draft_findings_${studyId}`);
                localStorage.removeItem(`draft_impression_${studyId}`);
                localStorage.removeItem(`draft_notes_${studyId}`);
                alert("Cooperative draft saved successfully on backend");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="h-full flex-1 flex flex-col overflow-hidden bg-zinc-950">
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* 1. Dictation worklist queue */}
                <div className="col-span-4 border-r border-zinc-850 flex flex-col h-full bg-zinc-900/35">
                    <div className="p-4 border-b border-zinc-850 bg-zinc-900/50 flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider text-zinc-400">Collaborative Queue</span>
                        <button 
                            onClick={fetchQueue}
                            className="p-1.5 hover:bg-zinc-850 rounded transition-colors text-zinc-400"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="h-full flex items-center justify-center flex-col gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                <span className="text-[11px] text-zinc-500">Loading dictation worklist...</span>
                            </div>
                        ) : studies.length === 0 ? (
                            <div className="h-full flex items-center justify-center flex-col text-center p-6 text-zinc-650">
                                <Database className="h-8 w-8 mb-2 text-zinc-800" />
                                <span className="text-xs font-semibold uppercase">Queue Cleared</span>
                                <span className="text-[10px] text-zinc-600 mt-1">No studies waiting for transcription.</span>
                            </div>
                        ) : (
                            studies.map((study) => {
                                const isSelected = selectedStudy?.radiologyStudyId === study.radiologyStudyId;
                                return (
                                    <div 
                                        key={study.radiologyStudyId}
                                        onClick={() => setSelectedStudy(study)}
                                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-indigo-950/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                                                : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                                                Token #{study.tokenNumber}
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-indigo-400">
                                                {study.modality}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm text-zinc-200">{study.patientName}</h4>
                                        <p className="text-[11px] text-zinc-400 truncate mt-1">{study.testName}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 2. Collaborative Transcription Editor */}
                <div className="col-span-8 h-full flex flex-col overflow-hidden bg-zinc-950">
                    {selectedStudy ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Toolbar/Presense */}
                            <div className="p-4 border-b border-zinc-850 bg-zinc-900/40 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-emerald-400 animate-pulse" />
                                        <h3 className="font-bold text-sm text-zinc-200">
                                            Session: {selectedStudy.patientName}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                            connectionStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            connectionStatus === 'Reconnecting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                                            connectionStatus === 'Connecting' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse' :
                                            'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                            {connectionStatus}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                                        <span className={`h-1.5 w-1.5 rounded-full ${liveRadiologistConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span>
                                            {liveRadiologistConnected ? 'Radiologist Online (SignalR Active)' : 'Waiting for Radiologist...'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors"
                                >
                                    Save Live Draft
                                </button>
                            </div>

                            {/* Text Areas */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        Findings & Observation
                                    </label>
                                    <textarea
                                        value={draftFindings}
                                        onChange={(e) => handleFieldChange('findings', e.target.value)}
                                        className="w-full h-44 bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 rounded p-3.5 text-xs text-zinc-200 focus:outline-none transition-all font-mono resize-none leading-relaxed"
                                        placeholder="Type findings as the Radiologist dictates..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                                        <Cpu className="h-3.5 w-3.5" />
                                        Diagnostic Impression
                                    </label>
                                    <textarea
                                        value={draftImpression}
                                        onChange={(e) => handleFieldChange('impression', e.target.value)}
                                        className="w-full h-24 bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 rounded p-3.5 text-xs text-zinc-200 focus:outline-none transition-all font-mono resize-none leading-relaxed font-bold"
                                        placeholder="Clinical impressions..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        Additional Notes / Recommendations
                                    </label>
                                    <textarea
                                        value={draftNotes}
                                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                                        className="w-full h-20 bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 rounded p-3.5 text-xs text-zinc-200 focus:outline-none transition-all font-mono resize-none leading-relaxed"
                                        placeholder="Add notes..."
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-600">
                            <Users className="h-10 w-10 mb-2 text-zinc-850" />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-400">Cooperative Workplace</h3>
                            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                                Select a study from the collaborative queue to start real-time character-synchronized dictation with the radiologist.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
