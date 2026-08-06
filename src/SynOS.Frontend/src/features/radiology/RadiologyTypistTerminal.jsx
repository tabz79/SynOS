import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { WorklistMatrixTabs } from '@/components/common/WorklistMatrixTabs';
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
    const [showHistory, setShowHistory] = useState(false);
    const [activeTab, setActiveTab] = useState('available');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Live Dictation Draft State
    const [draftFindings, setDraftFindings] = useState('');
    const [draftImpression, setDraftImpression] = useState('');
    const [draftNotes, setDraftNotes] = useState('');
    const [reportId, setReportId] = useState(null);
    const [isMacroManagerOpen, setIsMacroManagerOpen] = useState(false);
    const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);

    const [reportData, setReportData] = useState(null);
    const { template, loading: templateLoading } = useTemplateForReport(reportData);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Live Report Preview Auto-Fit, Zoom, and Pan State
    const [previewScale, setPreviewScale] = useState(0.55);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const previewContainerRef = useRef(null);

    // Auto-Calculate Fit Scale based on Right Container Width
    useEffect(() => {
        if (previewContainerRef.current) {
            const containerWidth = previewContainerRef.current.clientWidth || 450;
            const fitScale = Math.min(Math.max((containerWidth - 32) / 794, 0.3), 1.2);
            setPreviewScale(fitScale);
            setPanOffset({ x: 0, y: 0 });
        }
    }, [selectedStudy?.radiologyStudyId || selectedStudy?.studyId]);

    // Ctrl+Scroll listener for Live A4 Report Preview Zoom
    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = -e.deltaY;
                const factor = delta > 0 ? 1.05 : 0.95;
                setPreviewScale(prev => Math.min(Math.max(prev * factor, 0.2), 3.0));
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [reportData]);

    const handlePreviewMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    };

    const handlePreviewMouseMove = (e) => {
        if (!isDragging) return;
        setPanOffset({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        });
    };

    const handlePreviewMouseUp = () => {
        setIsDragging(false);
    };

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
            const statuses = showHistory 
                ? ['Signed', 'ManualVerified', 'Finalized'] 
                : ['AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature', 'Signed', 'ManualVerified', 'Finalized'];
            const params = statuses.map(s => `status=${encodeURIComponent(s)}`).join('&');
            const response = await fetch(`/api/v1/radiology/studies/queue?includeHistory=${showHistory}&${params}`, {
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
    }, [showHistory]);

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
        if (selectedStudy && reportId) {
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
    }, [selectedStudy?.radiologyStudyId || selectedStudy?.studyId, reportId]);

    const memoizedReportData = useMemo(() => {
        if (!reportData) return null;
        return {
            ...reportData,
            interpretation: draftFindings !== undefined && draftFindings !== null ? draftFindings : reportData.interpretation
        };
    }, [reportData, draftFindings]);

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
        if (hubConnection.current && hubConnection.current.state === 'Connected' && selectedStudy) {
            try {
                await hubConnection.current.invoke('SendDraftUpdate', studyId, JSON.stringify(update));
            } catch (err) {
                // Silently handle offline/reconnecting states
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
            // First save the current draft
            await handleSaveDraft();

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
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || "Failed to request digital signature on backend");
            }
        } catch (error) {
            console.error("Signature request error:", error);
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
            <div className="flex-1 flex flex-row overflow-hidden relative">
                {/* Left Queue Panel (Collapsible) */}
                <div className={`flex flex-col min-h-0 relative transition-all duration-300 ease-in-out border-r dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white ${
                    (isQueueCollapsed && selectedStudy) ? "w-0 overflow-hidden opacity-0 pointer-events-none" : "w-[18%] opacity-100"
                }`}>
                    {isMacroManagerOpen ? (
                        <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-4 flex flex-col h-full min-h-0">
                            <MedicalMacrosWorkspace onClose={() => setIsMacroManagerOpen(false)} />
                        </div>
                    ) : (() => {
                        const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';
                        const availableCount = studies.filter(s => !s.claimedByUserId).length;
                        const filteredStudies = studies.filter(s => {
                            const isClaimedByMe = s.claimedByUserId?.toLowerCase() === user?.id?.toLowerCase();
                            const isUnassigned = !s.claimedByUserId;

                            if (activeTab === 'available') {
                                return isUnassigned;
                            } else {
                                return isAdmin ? !isUnassigned : isClaimedByMe;
                            }
                        });

                        return (
                            <>
                                <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex flex-col gap-3 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-xs uppercase tracking-wider dark:text-zinc-400 text-zinc-650">Collaborative Queue</span>
                                        <button 
                                            onClick={fetchQueue}
                                            className="p-1.5 dark:hover:bg-zinc-800 hover:bg-zinc-200/60 rounded transition-colors dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>

                                    <WorklistMatrixTabs
                                        activeAssignmentTab={activeTab}
                                        onAssignmentTabChange={setActiveTab}
                                        showHistory={showHistory}
                                        onTimeTabChange={setShowHistory}
                                        availableCount={availableCount}
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {loading ? (
                                        <div className="h-full flex items-center justify-center flex-col gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                            <span className="text-[11px] text-zinc-550">Loading dictation worklist...</span>
                                        </div>
                                    ) : filteredStudies.length === 0 ? (
                                        <div className="h-full flex items-center justify-center flex-col text-center p-6 dark:text-zinc-555 text-zinc-400">
                                            <Database className="h-8 w-8 mb-2 dark:text-zinc-750 text-zinc-300" />
                                            <span className="text-xs font-semibold uppercase">Queue Cleared</span>
                                            <span className="text-[10px] dark:text-zinc-650 text-zinc-555 mt-1">No studies waiting for transcription.</span>
                                        </div>
                                    ) : (
                                        filteredStudies.map((study) => {
                                            const isSelected = selectedStudy?.radiologyStudyId === study.radiologyStudyId;
                                            return (
                                                <div 
                                                    key={study.radiologyStudyId}
                                                    onClick={() => {
                                                        handleSelectStudy(study);
                                                        if (activeTab === 'available') {
                                                            setActiveTab('assigned');
                                                        }
                                                        setIsQueueCollapsed(true);
                                                    }}
                                                    className={`p-3 rounded-xl transition-all duration-260 ease-synos cursor-pointer ${
                                                        isSelected 
                                                            ? 'synos-card-elevated bg-synos-primary/10 dark:text-white text-synos-primary border-synos-primary/40 shadow-md' 
                                                            : 'synos-dept-card dark:bg-synos-surface bg-white'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black uppercase text-synos-primary">
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
                        );
                    })()}
                </div>

                {/* 2. Collaborative Transcription Viewport (2-Panel Layout: Editor Left, Live A4 Preview Right) */}
                <div className="flex-1 h-full flex flex-col overflow-hidden dark:bg-synos-background bg-zinc-50">
                    {selectedStudy ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header Ribbon / Toolbar */}
                            <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white synos-card-elevated flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsQueueCollapsed(prev => !prev)}
                                        className="p-1 hover:bg-zinc-500/10 rounded-lg text-zinc-500 transition-all active:scale-95 shrink-0 font-bold border dark:border-white/5 border-zinc-200 text-xs flex items-center justify-center w-6 h-6"
                                        title={isQueueCollapsed ? "Show Patient Queue" : "Collapse Queue"}
                                    >
                                        {isQueueCollapsed ? "→" : "←"}
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-emerald-400 animate-pulse" />
                                            <h3 className="font-bold text-sm dark:text-zinc-200 text-zinc-800 uppercase tracking-tight">
                                                {selectedStudy.patientName}
                                            </h3>
                                            <span className="text-zinc-400 text-xs">•</span>
                                            <span className="text-xs text-zinc-500 font-semibold">{selectedStudy.testName} ({selectedStudy.modality})</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] dark:text-zinc-400 text-zinc-550">
                                            <span className={`h-1.5 w-1.5 rounded-full ${liveRadiologistConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-550'}`} />
                                            <span>
                                                {liveRadiologistConnected ? 'Radiologist Online (SignalR Active)' : 'Waiting for Radiologist...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-synos-primary hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded transition-all duration-260 ease-synos active:scale-[0.98] shadow-sm"
                                    >
                                        Save Live Draft
                                    </button>
                                    <button
                                        onClick={handleRequestSignature}
                                        disabled={actionLoading || selectedStudy.studyStatus === 'AwaitingSignature' || selectedStudy.status === 'AwaitingSignature'}
                                        className={`px-4 py-2 text-white font-bold rounded text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${(selectedStudy.studyStatus === 'AwaitingSignature' || selectedStudy.status === 'AwaitingSignature') ? 'bg-zinc-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                    >
                                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                        {(selectedStudy.studyStatus === 'AwaitingSignature' || selectedStudy.status === 'AwaitingSignature') ? 'Sign Requested' : 'Request Digital Sign'}
                                    </button>
                                </div>
                            </div>

                            {/* 2-Panel Side-by-Side View */}
                            <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden min-h-0 h-full">
                                {/* Left Panel (7 cols): Full Height Rich Medical Text Editor */}
                                <div className="col-span-7 flex flex-col min-h-0 h-full overflow-hidden">
                                    <RichMedicalEditor
                                        value={draftFindings}
                                        onChange={(val) => handleFieldChange('findings', val)}
                                        disabled={actionLoading}
                                        patientContext={patientContext}
                                        onSaveDraft={handleSaveDraft}
                                        placeholder="Type radiology findings, observations, and diagnostic impressions as the Radiologist dictates..."
                                        onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                        className="flex-1 h-full min-h-0 flex flex-col synos-card-elevated rounded-2xl bg-white dark:bg-zinc-950"
                                    />
                                </div>

                                {/* Right Panel (5 cols): Live A4 Draft Preview */}
                                <div className="col-span-5 flex flex-col min-h-0 synos-card-elevated rounded-2xl bg-zinc-200/60 dark:bg-zinc-900/60 overflow-hidden">
                                    <div className="p-3 border-b dark:border-zinc-800 border-zinc-200 bg-white/90 dark:bg-zinc-950/90 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-synos-primary" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider dark:text-zinc-200 text-zinc-800">Draft Preview</h4>
                                        </div>
                                        <span className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live Synced
                                        </span>
                                    </div>

                                    <div 
                                        ref={previewContainerRef}
                                        className="flex-1 overflow-hidden bg-zinc-200/60 dark:bg-zinc-900/60 relative select-none custom-scrollbar min-h-0"
                                        onMouseDown={handlePreviewMouseDown}
                                        onMouseMove={handlePreviewMouseMove}
                                        onMouseUp={handlePreviewMouseUp}
                                        onMouseLeave={handlePreviewMouseUp}
                                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                                    >
                                        {/* Zoom & Pan Hint Overlay */}
                                        <div className="absolute top-2 left-3 z-10 pointer-events-none">
                                            <span className="text-[9px] font-mono bg-zinc-900/80 text-zinc-200 px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                                                Ctrl+Scroll to Zoom ({Math.round(previewScale * 100)}%) • Drag to Pan
                                            </span>
                                        </div>

                                        {(previewLoading || templateLoading) ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                                <Loader2 className="w-6 h-6 animate-spin mb-2 text-synos-primary" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Rendering A4 Preview...</span>
                                            </div>
                                        ) : (reportData && template) ? (
                                            <div className="p-4 flex justify-center items-start w-full h-full absolute top-0 left-0">
                                                <div 
                                                    className="bg-white shadow-2xl rounded-sm overflow-hidden origin-top min-w-[210mm] transition-transform duration-75 select-none"
                                                    style={{ 
                                                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${previewScale})`,
                                                        pointerEvents: isDragging ? 'none' : 'auto'
                                                    }}
                                                >
                                                    <ReportA4 reportData={memoizedReportData} template={template} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
                                                <FileText className="w-8 h-8 mb-2 text-zinc-400" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                    Awaiting Draft Data...
                                                </p>
                                            </div>
                                        )}
                                    </div>
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
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}} />
        </div>
    );
}
