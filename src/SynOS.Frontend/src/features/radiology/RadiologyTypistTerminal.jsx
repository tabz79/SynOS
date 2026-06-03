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
        <div className="h-full flex-1 flex flex-col overflow-hidden dark:bg-synos-background bg-zinc-50 dark:text-zinc-100 text-zinc-800">
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* 1. Dictation worklist queue */}
                <div className="col-span-4 border-r dark:border-synos-border border-zinc-200 flex flex-col h-full dark:bg-synos-background/35 bg-zinc-50/50">
                    <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider dark:text-zinc-400 text-zinc-500">Collaborative Queue</span>
                        <button 
                            onClick={fetchQueue}
                            className="p-1.5 dark:hover:bg-zinc-800 hover:bg-zinc-200/60 rounded transition-colors dark:text-zinc-400 text-zinc-600 hover:dark:text-zinc-200 hover:text-zinc-900"
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
                            <div className="h-full flex items-center justify-center flex-col text-center p-6 dark:text-zinc-550 text-zinc-400">
                                <Database className="h-8 w-8 mb-2 dark:text-zinc-750 text-zinc-300" />
                                <span className="text-xs font-semibold uppercase">Queue Cleared</span>
                                <span className="text-[10px] dark:text-zinc-600 text-zinc-500 mt-1">No studies waiting for transcription.</span>
                            </div>
                        ) : (
                            studies.map((study) => {
                                const isSelected = selectedStudy?.radiologyStudyId === study.radiologyStudyId;
                                return (
                                    <div 
                                        key={study.radiologyStudyId}
                                        onClick={() => setSelectedStudy(study)}
                                        className={`p-3 rounded-lg border transition-all duration-260 ease-synos cursor-pointer ${
                                            isSelected 
                                                ? 'bg-synos-primary/10 dark:text-white text-synos-primary dark:border-synos-primary/20 border-synos-primary/30 shadow-sm' 
                                                : 'dark:bg-synos-surface bg-white dark:border-synos-border border-zinc-200 dark:hover:border-zinc-500 hover:border-zinc-400 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-650 px-2 py-0.5 rounded">
                                                Token #{study.tokenNumber}
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-synos-primary">
                                                {study.modality}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm dark:text-zinc-200 text-zinc-800">{study.patientName}</h4>
                                        <p className="text-[11px] dark:text-zinc-400 text-zinc-550 truncate mt-1">{study.testName}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 2. Collaborative Transcription Editor */}
                <div className="col-span-8 h-full flex flex-col overflow-hidden dark:bg-synos-background bg-zinc-50">
                    {selectedStudy ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Toolbar/Presense */}
                            <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-emerald-400 animate-pulse" />
                                        <h3 className="font-bold text-sm dark:text-zinc-200 text-zinc-800">
                                            Session: {selectedStudy.patientName}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                            connectionStatus === 'Connected' ? 'dark:bg-emerald-500/10 bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/20 border-emerald-200' :
                                            connectionStatus === 'Reconnecting' ? 'dark:bg-amber-500/10 bg-amber-50 text-amber-600 dark:text-amber-400 dark:border-amber-500/20 border-amber-200 animate-pulse' :
                                            connectionStatus === 'Connecting' ? 'bg-synos-primary/10 text-synos-primary border-synos-primary/20 animate-pulse' :
                                            'dark:bg-red-500/10 bg-red-50 text-red-650 dark:text-red-400 dark:border-red-500/20 border-red-200'
                                        }`}>
                                            {connectionStatus}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] dark:text-zinc-400 text-zinc-550">
                                        <span className={`h-1.5 w-1.5 rounded-full ${liveRadiologistConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-550'}`} />
                                        <span>
                                            {liveRadiologistConnected ? 'Radiologist Online (SignalR Active)' : 'Waiting for Radiologist...'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-synos-primary hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded transition-all duration-260 ease-synos active:scale-[0.98] shadow-sm"
                                >
                                    Save Live Draft
                                </button>
                            </div>

                            {/* Text Areas */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-550 tracking-wider flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5 animate-pulse" />
                                        Findings & Observation
                                    </label>
                                    <textarea
                                        value={draftFindings}
                                        onChange={(e) => handleFieldChange('findings', e.target.value)}
                                        className="w-full h-44 dark:bg-synos-background bg-zinc-50 border dark:border-synos-border border-zinc-250 focus:border-synos-primary rounded p-3.5 text-xs dark:text-zinc-200 text-zinc-850 focus:outline-none transition-all duration-260 ease-synos font-mono resize-none leading-relaxed"
                                        placeholder="Type findings as the Radiologist dictates..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-550 tracking-wider flex items-center gap-1">
                                        <Cpu className="h-3.5 w-3.5" />
                                        Diagnostic Impression
                                    </label>
                                    <textarea
                                        value={draftImpression}
                                        onChange={(e) => handleFieldChange('impression', e.target.value)}
                                        className="w-full h-24 dark:bg-synos-background bg-zinc-50 border dark:border-synos-border border-zinc-250 focus:border-synos-primary rounded p-3.5 text-xs dark:text-zinc-200 text-zinc-850 focus:outline-none transition-all duration-260 ease-synos font-mono resize-none leading-relaxed font-bold"
                                        placeholder="Clinical impressions..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-550 tracking-wider flex items-center gap-1">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        Additional Notes / Recommendations
                                    </label>
                                    <textarea
                                        value={draftNotes}
                                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                                        className="w-full h-20 dark:bg-synos-background bg-zinc-50 border dark:border-synos-border border-zinc-250 focus:border-synos-primary rounded p-3.5 text-xs dark:text-zinc-200 text-zinc-850 focus:outline-none transition-all duration-260 ease-synos font-mono resize-none leading-relaxed"
                                        placeholder="Add notes..."
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center dark:text-zinc-550 text-zinc-400">
                            <Users className="h-10 w-10 mb-2 dark:text-zinc-750 text-zinc-300" />
                            <h3 className="font-bold text-sm uppercase tracking-wider dark:text-zinc-300 text-zinc-700">Cooperative Workplace</h3>
                            <p className="text-[11px] dark:text-zinc-500 text-zinc-550 mt-1 max-w-xs leading-relaxed">
                                Select a study from the collaborative queue to start real-time character-synchronized dictation with the radiologist.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
