import React, { useState, useEffect, useRef } from 'react';
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { CollaborationCallOverlay } from './CollaborationCallOverlay';
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
import { RichMedicalEditor } from '@/components/editor/RichMedicalEditor';
import { MedicalMacrosWorkspace } from '@/components/editor/MedicalMacrosWorkspace';
import { ReportA4 } from '../documents/templates/ReportA4';
import { useTemplateForReport } from '../documents/templates/hooks/useReportTemplates';



let sharedConnection = null;
let stopTimer = null;
let subscriberCount = 0;

export function RadiologyTypistTerminal({ selectedStudy, setSelectedStudy, hubConnectionRef, connectionStatus }) {
    const { user } = useAuth();
    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Live Dictation Draft State
    const [draftFindings, setDraftFindings] = useState('');
    const [draftImpression, setDraftImpression] = useState('');
    const [draftNotes, setDraftNotes] = useState('');
    const [reportId, setReportId] = useState(null);
    const [isMacroManagerOpen, setIsMacroManagerOpen] = useState(false);

    const [reportData, setReportData] = useState(null);
    const { template, loading: templateLoading } = useTemplateForReport(reportData);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [signRequestSent, setSignRequestSent] = useState(false);

    const isPreviewMode = selectedStudy && (
        selectedStudy.studyStatus === 'DraftReady' || 
        selectedStudy.status === 'DraftReady' ||
        selectedStudy.studyStatus === 'AwaitingSignature' || 
        selectedStudy.status === 'AwaitingSignature' ||
        selectedStudy.studyStatus === 'Signed' ||
        selectedStudy.status === 'Signed'
    );

    // SignalR Connection
    const [liveRadiologistConnected, setLiveRadiologistConnected] = useState(false);
    const hubConnection = hubConnectionRef;
    const currentJoinedStudyIdRef = useRef(null);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/radiology/studies/queue?status=AwaitingDictation&status=DictationSessionStarted&status=DraftReady&status=AwaitingSignature', {
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

    const handleSelectStudy = async (study) => {
        setLoading(true);
        const studyId = study.studyId || study.radiologyStudyId;
        try {
            const response = await fetch(`/api/v1/radiology/reports/${studyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                const details = await response.json();
                setSelectedStudy(details);
            } else {
                setSelectedStudy(study);
            }
        } catch (error) {
            console.error("Failed to load study details:", error);
            setSelectedStudy(study);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    // Connect SignalR event listeners when mounted
    useEffect(() => {
        const connection = hubConnectionRef?.current;
        if (!connection) return;

        const onReceiveDraftUpdate = (draftContent) => {
            try {
                const parsed = JSON.parse(draftContent);
                const activeStudyId = currentJoinedStudyIdRef.current;
                if (!activeStudyId) return;

                if (parsed.findings !== undefined) {
                    setDraftFindings(parsed.findings);
                    localStorage.setItem(`draft_findings_${activeStudyId}`, parsed.findings);
                }
                if (parsed.impression !== undefined) {
                    setDraftImpression(parsed.impression);
                    localStorage.setItem(`draft_impression_${activeStudyId}`, parsed.impression);
                }
                if (parsed.additionalNotes !== undefined) {
                    setDraftNotes(parsed.additionalNotes);
                    localStorage.setItem(`draft_notes_${activeStudyId}`, parsed.additionalNotes);
                }
            } catch (e) {
                console.error("Failed to parse live draft packet:", e);
            }
        };

        const onUserJoined = (connectionId) => {
            setLiveRadiologistConnected(true);
        };

        const onUserLeft = (connectionId) => {
            setLiveRadiologistConnected(false);
        };

        const onReceiveDraftSaved = () => {
            if (currentJoinedStudyIdRef.current) {
                handleSelectStudy({ radiologyStudyId: currentJoinedStudyIdRef.current });
            }
        };

        const onReceiveDraftResumed = () => {
            if (currentJoinedStudyIdRef.current) {
                handleSelectStudy({ radiologyStudyId: currentJoinedStudyIdRef.current });
            }
        };

        const onReceiveSignRequest = () => {
            if (currentJoinedStudyIdRef.current) {
                handleSelectStudy({ radiologyStudyId: currentJoinedStudyIdRef.current });
            }
        };

        connection.on('ReceiveDraftUpdate', onReceiveDraftUpdate);
        connection.on('UserJoined', onUserJoined);
        connection.on('UserLeft', onUserLeft);
        connection.on('ReceiveDraftSaved', onReceiveDraftSaved);
        connection.on('ReceiveDraftResumed', onReceiveDraftResumed);
        connection.on('ReceiveSignRequest', onReceiveSignRequest);

        if (connection.state === 'Connected') {
            connection.invoke('RegisterPresence', 'Typist').catch(err => console.error(err));
            if (currentJoinedStudyIdRef.current) {
                connection.invoke('JoinSession', currentJoinedStudyIdRef.current).catch(err => console.error(err));
            }
        }

        return () => {
            connection.off('ReceiveDraftUpdate', onReceiveDraftUpdate);
            connection.off('UserJoined', onUserJoined);
            connection.off('UserLeft', onUserLeft);
            connection.off('ReceiveDraftSaved', onReceiveDraftSaved);
            connection.off('ReceiveDraftResumed', onReceiveDraftResumed);
            connection.off('ReceiveSignRequest', onReceiveSignRequest);

            if (currentJoinedStudyIdRef.current && connection.state === 'Connected') {
                connection.invoke('LeaveSession', currentJoinedStudyIdRef.current).catch(err => console.error(err));
            }
        };
    }, [hubConnectionRef?.current]);

    // Sync collaborative session when active study changes
    useEffect(() => {
        if (selectedStudy) {
            const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
            const studyIdStr = studyId.toString();
            
            // Switch session groups dynamically
            if (currentJoinedStudyIdRef.current && currentJoinedStudyIdRef.current !== studyIdStr) {
                if (hubConnection.current && hubConnection.current.state === 'Connected') {
                    hubConnection.current.invoke('LeaveSession', currentJoinedStudyIdRef.current).catch(err => console.error(err));
                }
            }
            
            currentJoinedStudyIdRef.current = studyIdStr;

            const joinAndConnect = async () => {
                if (selectedStudy.activeSessionId) {
                    try {
                        const joinResponse = await fetch(`/api/v1/radiology/session/${selectedStudy.activeSessionId}/join`, {
                            method: 'POST',
                            headers: { 
                                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        if (!joinResponse.ok) {
                            console.error("Failed to join collaborative session on backend:", await joinResponse.text());
                        }
                    } catch (e) {
                        console.error("Error joining collaborative session on backend:", e);
                    }
                }
                
                if (hubConnection.current && hubConnection.current.state === 'Connected') {
                    hubConnection.current.invoke('JoinSession', studyIdStr).catch(err => console.error(err));
                }
            };

            joinAndConnect();
            fetchReportDraft(studyId);
        }
    }, [selectedStudy?.radiologyStudyId || selectedStudy?.studyId]);

    useEffect(() => {
        if (selectedStudy && isPreviewMode && reportId) {
            const fetchPreview = async () => {
                setPreviewLoading(true);
                try {
                    const response = await fetch(`/api/v1/reports/${reportId}/data?forceLive=true`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setReportData(data);
                    }
                } catch (error) {
                    console.error("Failed to load report data for preview:", error);
                } finally {
                    setPreviewLoading(false);
                }
            };
            fetchPreview();
        } else {
            setReportData(null);
        }
    }, [selectedStudy?.studyStatus, selectedStudy?.status, reportId, isPreviewMode]);

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

    // Live keystroke sync & LocalStorage buffering
    const handleFieldChange = async (field, val) => {
        let update = {};
        const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;

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
        const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
        try {
            const body = {
                studyId: studyId,
                findings: draftFindings,
                impression: draftImpression,
                additionalNotes: draftNotes
            };
            const response = await fetch('/api/v1/radiology/reports/draft', {
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
                
                await handleSelectStudy({ radiologyStudyId: studyId });
                
                // Broadcast to live radiologist if connected
                if (hubConnection.current) {
                    await hubConnection.current.invoke('SendDraftSaved', studyId.toString());
                }
                alert("Cooperative draft saved successfully on backend");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleResumeDictation = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
        try {
            const response = await fetch(`/api/v1/radiology/reports/${studyId}/resume`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                await handleSelectStudy({ radiologyStudyId: studyId });
                
                // Broadcast to live radiologist if connected
                if (hubConnection.current) {
                    await hubConnection.current.invoke('SendDraftResumed', studyId.toString());
                }
            } else {
                throw new Error("Failed to resume dictation session on backend");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestSignature = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
        try {
            const response = await fetch(`/api/v1/radiology/reports/${studyId}/request-signature`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                await handleSelectStudy({ radiologyStudyId: studyId });
                setSignRequestSent(true);
                
                // Broadcast to live radiologist if connected
                if (hubConnection.current) {
                    await hubConnection.current.invoke('SendSignRequest', studyId.toString());
                }
                alert("Digital signature request sent to radiologist.");
            } else {
                throw new Error("Failed to request digital signature on backend");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePrintOut = () => {
        if (!reportId) return;
        window.open(`/print/report/${reportId}?forceLive=true`, '_blank');
    };

    const patientContext = selectedStudy ? {
        patientName: selectedStudy.patientName || selectedStudy.patient?.name || '',
        age: selectedStudy.patientAge || selectedStudy.age || selectedStudy.patient?.age || '',
        gender: selectedStudy.patientGender || selectedStudy.gender || selectedStudy.sex || selectedStudy.patient?.gender || '',
        token: selectedStudy.tokenNumber || selectedStudy.token || selectedStudy.patient?.mrn || ''
    } : null;

    return (
        <div className="h-full flex-1 flex flex-col overflow-hidden dark:bg-synos-background bg-zinc-50 dark:text-zinc-100 text-zinc-800">
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* 1. Dictation worklist queue */}
                <div className="col-span-4 border-r dark:border-synos-border border-zinc-200 flex flex-col h-full dark:bg-synos-background/35 bg-zinc-50/50">
                    {isMacroManagerOpen ? (
                        <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-4 flex flex-col h-full min-h-0">
                            <MedicalMacrosWorkspace onClose={() => setIsMacroManagerOpen(false)} />
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center">
                                <span className="font-black text-xs uppercase tracking-wider dark:text-zinc-400 text-zinc-550">Collaborative Queue</span>
                                <button 
                                    onClick={fetchQueue}
                                    className="p-1.5 dark:hover:bg-zinc-800 hover:bg-zinc-200/60 rounded transition-colors dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center flex-col gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                        <span className="text-[11px] text-zinc-550">Loading dictation worklist...</span>
                                    </div>
                                ) : studies.length === 0 ? (
                                    <div className="h-full flex items-center justify-center flex-col text-center p-6 dark:text-zinc-555 text-zinc-400">
                                        <Database className="h-8 w-8 mb-2 dark:text-zinc-750 text-zinc-300" />
                                        <span className="text-xs font-semibold uppercase">Queue Cleared</span>
                                        <span className="text-[10px] dark:text-zinc-650 text-zinc-550 mt-1">No studies waiting for transcription.</span>
                                    </div>
                                ) : (
                                    studies.map((study) => {
                                        const isSelected = selectedStudy?.studyId === study.radiologyStudyId || selectedStudy?.radiologyStudyId === study.radiologyStudyId;
                                        return (
                                            <div 
                                                key={study.radiologyStudyId}
                                                onClick={() => handleSelectStudy(study)}
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
                        </>
                    )}
                </div>

                {/* 2. Collaborative Transcription Editor */}
                <div className="col-span-8 h-full flex flex-col overflow-hidden dark:bg-synos-background bg-zinc-50">
                    {selectedStudy ? (
                        isPreviewMode ? (
                            /* PREVIEW MODE PANEL */
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center shrink-0">
                                    <div>
                                        <h3 className="font-bold text-sm dark:text-zinc-200 text-zinc-800">
                                            Report Preview
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`h-1.5 w-1.5 rounded-full ${(selectedStudy.studyStatus === 'Signed' || selectedStudy.status === 'Signed') ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                            <span className="text-[10px] dark:text-zinc-400 text-zinc-550">
                                                {(selectedStudy.studyStatus === 'Signed' || selectedStudy.status === 'Signed') ? 'Finalized & Signed' : 
                                                 (selectedStudy.studyStatus === 'AwaitingSignature' || selectedStudy.status === 'AwaitingSignature') ? 'Awaiting Signature' : 'Draft Ready'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePrintOut}
                                            className="px-3 py-1.5 dark:bg-zinc-800 bg-zinc-100 hover:dark:bg-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-200 text-zinc-750 rounded font-bold border dark:border-zinc-700 border-zinc-200 text-[10px] uppercase transition-colors"
                                        >
                                            Print Out
                                        </button>
                                        {(selectedStudy.studyStatus !== 'Signed' && selectedStudy.status !== 'Signed') ? (
                                            <>
                                                <button
                                                    onClick={handleResumeDictation}
                                                    disabled={actionLoading}
                                                    className="px-3 py-1.5 dark:bg-zinc-800 bg-zinc-100 hover:dark:bg-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-200 text-zinc-750 rounded font-bold border dark:border-zinc-700 border-zinc-200 text-[10px] uppercase transition-colors"
                                                >
                                                    Edit Draft
                                                </button>
                                                <button
                                                    onClick={handleRequestSignature}
                                                    disabled={actionLoading || selectedStudy.studyStatus === 'AwaitingSignature' || selectedStudy.status === 'AwaitingSignature'}
                                                    className={`px-4 py-1.5 text-white font-bold rounded text-[10px] uppercase transition-all flex items-center gap-1.5 ${(selectedStudy.studyStatus === 'AwaitingSignature' || selectedStudy.status === 'AwaitingSignature') ? 'bg-zinc-500 cursor-not-allowed' : 'bg-synos-emerald hover:opacity-90'}`}
                                                >
                                                    {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                                    {(selectedStudy.studyStatus === 'AwaitingSignature' || selectedStudy.status === 'AwaitingSignature') ? 'Sign Requested' : 'Request Digital Sign'}
                                                </button>
                                            </>
                                        ) : (
                                            <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded font-bold text-[10px] uppercase">
                                                Report Signed & Finalized
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto bg-zinc-300/50 dark:bg-zinc-900/50 p-4 custom-scrollbar">
                                    {(previewLoading || templateLoading) ? (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                                            <Loader2 className="w-6 h-6 animate-spin mb-4" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Generating A4 Render...</span>
                                        </div>
                                    ) : (reportData && template) ? (
                                        <div className="p-4 origin-top min-w-max flex justify-center">
                                            <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden">
                                                <ReportA4 reportData={reportData} template={template} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8">
                                            <Loader2 className="w-6 h-6 animate-spin mb-4" />
                                            <p className="text-[9px] font-black uppercase tracking-widest">
                                                Loading Draft Structure...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* EDIT MODE PANEL */
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
                                        <RichMedicalEditor
                                            value={draftFindings}
                                            onChange={(val) => handleFieldChange('findings', val)}
                                            disabled={actionLoading}
                                            patientContext={patientContext}
                                            onSaveDraft={handleSaveDraft}
                                            placeholder="Type findings as the Radiologist dictates..."
                                            onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-550 tracking-wider flex items-center gap-1">
                                            <Cpu className="h-3.5 w-3.5" />
                                            Diagnostic Impression
                                        </label>
                                        <RichMedicalEditor
                                            value={draftImpression}
                                            onChange={(val) => handleFieldChange('impression', val)}
                                            disabled={actionLoading}
                                            patientContext={patientContext}
                                            onSaveDraft={handleSaveDraft}
                                            placeholder="Clinical impressions..."
                                            onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase dark:text-zinc-450 text-zinc-550 tracking-wider flex items-center gap-1">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            Additional Notes / Recommendations
                                        </label>
                                        <RichMedicalEditor
                                            value={draftNotes}
                                            onChange={(val) => handleFieldChange('notes', val)}
                                            disabled={actionLoading}
                                            patientContext={patientContext}
                                            onSaveDraft={handleSaveDraft}
                                            placeholder="Add notes..."
                                            onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
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
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}} />
        </div>
    );
}
