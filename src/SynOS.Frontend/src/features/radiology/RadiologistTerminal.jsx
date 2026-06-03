import React, { useState, useEffect, useRef } from 'react';
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { DicomViewportManager } from './DicomViewportManager';
import { RadiologyApi } from '@/api/radiology';
import { ReportsApi } from '@/api/reports';
import { 
    Activity, 
    Monitor, 
    Layers, 
    Sun, 
    Contrast, 
    Check, 
    Send, 
    FileText, 
    Maximize2, 
    Folder, 
    Grid,
    Trash2,
    BookOpen,
    Loader2,
    Users,
    Key,
    Lock
} from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { RadiologyCallOverlay } from './RadiologyCallOverlay';

export function RadiologistTerminal() {
    const { user } = useAuth();
    const [studies, setStudies] = useState([]);
    const [selectedStudy, setSelectedStudy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Viewport Adjustments
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [activeSliceIndex, setActiveSliceIndex] = useState(0);
    const [activeTool, setActiveTool] = useState('Wwwc');
    
    // Live Cooperative Draft State
    const [draftFindings, setDraftFindings] = useState('');
    const [draftImpression, setDraftImpression] = useState('');
    const [draftNotes, setDraftNotes] = useState('');
    const [reportId, setReportId] = useState(null);

    // Collapsed Queue State
    const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);

    // SignalR Connection
    const [liveTypistConnected, setLiveTypistConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const hubConnection = useRef(null);
    const currentJoinedStudyIdRef = useRef(null);

    // Canvas references
    const canvasRef = useRef(null);
    const viewportManager = useRef(null);

    const fetchWorklist = async () => {
        setLoading(true);
        try {
            // Fetch studies awaiting reporting
            const response = await fetch('/api/v1/radiology/studies/queue?status=AwaitingDictation&status=DictationSessionStarted&status=DraftReady', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStudies(data);
            }
        } catch (error) {
            console.error("Failed to load radiologist worklist:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorklist();
    }, []);

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

    const handleClaimStudy = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
        try {
            const response = await fetch(`/api/v1/radiology/studies/${studyId}/claim`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                // Claim successful! Re-fetch study details to update local UI claimed state
                await handleSelectStudy({ radiologyStudyId: studyId });
                
                // Now Start Session on backend to transition status to DictationSessionStarted
                const startRes = await fetch(`/api/v1/radiology/studies/${studyId}/session/start`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (startRes.ok) {
                    // Fetch details again to make sure session details are mapped
                    await handleSelectStudy({ radiologyStudyId: studyId });
                    fetchWorklist();
                    alert("Study claimed and collaborative dictation session started.");
                } else {
                    const err = await startRes.json();
                    throw new Error(err.message || "Failed to start dictation session");
                }
            } else {
                const err = await response.json();
                throw new Error(err.message || "Failed to claim study");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleForceReleaseStudy = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
        try {
            const response = await fetch(`/api/v1/radiology/studies/${studyId}/release`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                alert("Study successfully released.");
                // Re-fetch study details
                await handleSelectStudy({ radiologyStudyId: studyId });
                fetchWorklist();
            } else {
                const err = await response.json();
                throw new Error(err.message || "Failed to release study");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Connect SignalR on component mount to support presence and floating audio calls
    useEffect(() => {
        connectSignalR();
        return () => {
            if (hubConnection.current) {
                hubConnection.current.stop();
                hubConnection.current = null;
            }
        };
    }, []);

    // Initialize Dicom Viewport and sync collaborative session when active study changes
    useEffect(() => {
        if (selectedStudy) {
            setIsQueueCollapsed(true);
            const isClaimedByMe = selectedStudy.claimedByUserId === user?.id;
            const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
            
            if (isClaimedByMe && studyId) {
                if (canvasRef.current) {
                    viewportManager.current = new DicomViewportManager(canvasRef.current, selectedStudy.modality);
                    
                    // Load raw DICOM slices if study contains any extracted slices
                    if (selectedStudy.images && selectedStudy.images.length > 0) {
                        const urls = selectedStudy.images.map(img => img.fileUrl);
                        viewportManager.current.setImages(urls).then(() => {
                            setActiveSliceIndex(0);
                        });
                    }
                }
                
                // Switch session groups dynamically
                const studyIdStr = studyId.toString();
                if (currentJoinedStudyIdRef.current && currentJoinedStudyIdRef.current !== studyIdStr) {
                    if (hubConnection.current && hubConnection.current.state === 'Connected') {
                        hubConnection.current.invoke('LeaveSession', currentJoinedStudyIdRef.current).catch(err => console.error(err));
                    }
                }
                
                currentJoinedStudyIdRef.current = studyIdStr;
                if (hubConnection.current && hubConnection.current.state === 'Connected') {
                    hubConnection.current.invoke('JoinSession', studyIdStr).catch(err => console.error(err));
                }

                // Fetch current report structure/draft if exists
                fetchReportDraft(studyId);
            }
        }

        return () => {
            if (viewportManager.current) {
                viewportManager.current.destroy();
                viewportManager.current = null;
            }
        };
    }, [selectedStudy?.radiologyStudyId || selectedStudy?.studyId, selectedStudy?.claimedByUserId]);

    // Centering & Resizing layout adapter for CSS transitions
    useEffect(() => {
        if (viewportManager.current) {
            const timer = setTimeout(() => {
                try {
                    viewportManager.current.resize();
                } catch (e) {
                    console.error("Layout transition resize failed:", e);
                }
            }, 350); // wait for CSS transitions (300ms) to settle
            return () => clearTimeout(timer);
        }
    }, [isQueueCollapsed]);

    const fetchReportDraft = async (studyId) => {
        try {
            const response = await fetch(`/api/v1/reports/source/RadiologyStudy/${studyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                const report = await response.json();
                setReportId(report.reportId);
                
                // Fetch radiology specific fields if available
                const detailResponse = await fetch(`/api/v1/reports/${report.reportId}/full`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                });
                if (detailResponse.ok) {
                    const detail = await detailResponse.json();
                    if (detail.radiologyReport) {
                        setDraftFindings(detail.radiologyReport.findings || '');
                        setDraftImpression(detail.radiologyReport.impression || '');
                        setDraftNotes(detail.radiologyReport.additionalNotes || '');
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load report draft:", error);
        }
    };

    const connectSignalR = async () => {
        if (hubConnection.current) return;

        setConnectionStatus('Connecting');

        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/radiologyCollaborationHub', {
                accessTokenFactory: () => localStorage.getItem('synos_jwt')
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000]) // sliding reconnect
            .build();

        hubConnection.current = connection;

        connection.onreconnecting((error) => {
            setConnectionStatus('Reconnecting');
            console.warn("SignalR connection lost, attempting reconnect...", error);
        });

        connection.onreconnected((connectionId) => {
            setConnectionStatus('Connected');
            console.info("SignalR reconnected.", connectionId);
            connection.invoke('RegisterPresence', 'Radiologist').catch(err => console.error(err));
            if (currentJoinedStudyIdRef.current) {
                connection.invoke('JoinSession', currentJoinedStudyIdRef.current).catch(err => console.error(err));
                fetchReportDraft(currentJoinedStudyIdRef.current);
            }
        });

        connection.onclose((error) => {
            setConnectionStatus('Disconnected');
            console.error("SignalR connection closed.", error);
        });

        connection.on('ReceiveDraftUpdate', (draftContent) => {
            try {
                const parsed = JSON.parse(draftContent);
                if (parsed.findings !== undefined) setDraftFindings(parsed.findings);
                if (parsed.impression !== undefined) setDraftImpression(parsed.impression);
                if (parsed.additionalNotes !== undefined) setDraftNotes(parsed.additionalNotes);
            } catch (e) {
                console.error("Failed to parse live draft packet:", e);
            }
        });

        connection.on('UserJoined', (connectionId) => {
            setLiveTypistConnected(true);
        });

        try {
            await connection.start();
            setConnectionStatus('Connected');
            await connection.invoke('RegisterPresence', 'Radiologist');
            if (currentJoinedStudyIdRef.current) {
                await connection.invoke('JoinSession', currentJoinedStudyIdRef.current);
            }
        } catch (e) {
            setConnectionStatus('Disconnected');
            console.error("Failed to connect to SignalR hub:", e);
        }
    };

    // Canvas Events for mouse caliper drawings
    const handleMouseDown = (e) => {
        if (!viewportManager.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        viewportManager.current.startMeasurement(x, y);
    };

    const handleMouseMove = (e) => {
        if (!viewportManager.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        viewportManager.current.updateMeasurement(x, y);
    };

    const handleMouseUp = () => {
        if (!viewportManager.current) return;
        viewportManager.current.endMeasurement();
    };

    const updateFilters = (b, c) => {
        setBrightness(b);
        setContrast(c);
        if (viewportManager.current) {
            viewportManager.current.setFilters(b, c);
        }
    };

    const handleClearCalipers = () => {
        if (viewportManager.current) {
            viewportManager.current.clearMeasurements();
        }
    };

    // Save Draft Content
    const handleSaveDraft = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        try {
            const body = {
                studyId: selectedStudy.radiologyStudyId,
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
                // Broadcast to live typist if connected
                if (hubConnection.current) {
                    await hubConnection.current.invoke('SendDraftUpdate', selectedStudy.radiologyStudyId, JSON.stringify({
                        findings: draftFindings,
                        impression: draftImpression,
                        additionalNotes: draftNotes
                    }));
                }
                alert("Draft Saved Successfully");
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Digitally Sign the Report
    const handleSignReport = async () => {
        if (!selectedStudy || !reportId) return;
        setActionLoading(true);
        try {
            // First submit for verification (Draft -> ReadyForVerification)
            const submitResponse = await fetch(`/api/v1/radiology-reports/${reportId}/submit`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (!submitResponse.ok) throw new Error("Failed to submit report for verification");

            // Then Digitally Sign (ReadyForVerification -> Signed)
            const signResponse = await fetch(`/api/v1/radiology-reports/${reportId}/sign`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (!signResponse.ok) {
                const err = await signResponse.json();
                throw new Error(err.message || "Failed to digitally sign report");
            }

            alert("Clinical Report Digitally Signed and Released successfully");
            setSelectedStudy(null);
            setReportId(null);
            setDraftFindings('');
            setDraftImpression('');
            setDraftNotes('');
            fetchWorklist();
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleTool = (tool) => {
        setActiveTool(tool);
        if (viewportManager.current) {
            viewportManager.current.setToolActive(tool);
        }
    };

    const handleSliceChange = (idx) => {
        setActiveSliceIndex(idx);
        if (viewportManager.current) {
            viewportManager.current.setActiveSlice(idx);
        }
    };

    const isClaimedByMe = selectedStudy && selectedStudy.claimedByUserId === user?.id;
    const isClaimedByOthers = selectedStudy && selectedStudy.claimedByUserId && selectedStudy.claimedByUserId !== user?.id;
    
    // Check timeouts
    const isClaimExpired = selectedStudy && selectedStudy.claimedAt && 
        (new Date() - new Date(selectedStudy.claimedAt)) > 30 * 60 * 1000;
        
    const isInactiveTimeout = selectedStudy && selectedStudy.lastActivityAt && 
        (new Date() - new Date(selectedStudy.lastActivityAt)) > 5 * 60 * 1000;

    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'systemadmin';
    const canForceRelease = isClaimExpired || isInactiveTimeout || isAdmin;

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-zinc-50 dark:text-zinc-100 text-zinc-800 flex flex-col font-sans select-none overflow-hidden">
            {/* System Header */}
            <SystemBar title="Radiologist Diagnostic Workstation" status="Live" />

            {/* Core Workstation Workspace */}
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* 1. Modality Worklist Queue */}
                <div className={`border-r dark:border-synos-border border-zinc-200 flex flex-col h-full dark:bg-synos-background/35 bg-zinc-50/50 transition-all duration-300 ease-synos ${
                    isQueueCollapsed ? "hidden" : "col-span-3 flex"
                }`}>
                    <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider dark:text-zinc-400 text-zinc-500">Interpretations Worklist</span>
                        <span className="text-[10px] dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-400 text-zinc-600 px-2 py-0.5 rounded-full font-bold">
                            {studies.length} active
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="h-full flex items-center justify-center flex-col gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                <span className="text-[11px] text-zinc-500">Retrieving diagnostic queue...</span>
                            </div>
                        ) : studies.length === 0 ? (
                            <div className="h-full flex items-center justify-center flex-col text-center p-6 text-zinc-655">
                                <Activity className="h-8 w-8 mb-2 dark:text-zinc-700 text-zinc-300 animate-pulse" />
                                <span className="text-xs font-semibold uppercase">Queue Empty</span>
                                <span className="text-[10px] dark:text-zinc-600 text-zinc-500 mt-1">No studies awaiting reporting.</span>
                            </div>
                        ) : (
                            studies.map((study) => {
                                const isSelected = selectedStudy?.studyId === study.radiologyStudyId || selectedStudy?.radiologyStudyId === study.radiologyStudyId;
                                const isClaimedByMe = study.claimedByUserId === user?.id;
                                const isClaimedByOthers = study.claimedByUserId && study.claimedByUserId !== user?.id;
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
                                            <span className="text-[9px] font-bold dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 px-2 py-0.5 rounded">
                                                Token #{study.tokenNumber}
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-synos-primary">
                                                {study.modality}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm dark:text-zinc-200 text-zinc-800">{study.patientName}</h4>
                                        <p className="text-[11px] dark:text-zinc-400 text-zinc-550 truncate mt-1">{study.testName}</p>
                                        <div className="mt-2 flex items-center justify-between text-[10px]">
                                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-tight ${
                                                isClaimedByMe 
                                                    ? 'dark:bg-emerald-500/10 bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/20 border-emerald-200' 
                                                    : isClaimedByOthers 
                                                        ? 'dark:bg-amber-500/10 bg-amber-50 text-amber-600 dark:text-amber-400 dark:border-amber-500/20 border-amber-200' 
                                                        : 'dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-400 text-zinc-500 dark:border-zinc-700 border-zinc-200'
                                            }`}>
                                                {isClaimedByMe ? 'Claimed by Me' : isClaimedByOthers ? `Locked (${study.claimedByUserName || 'Other'})` : 'Unclaimed'}
                                            </span>
                                            {study.status && (
                                                <span className="dark:text-zinc-500 text-zinc-400 font-mono text-[9px]">{study.status}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 2. WebGL Resizable Viewport */}
                <div className={`h-full flex flex-col overflow-hidden border-r dark:border-synos-border border-zinc-200 dark:bg-black bg-zinc-950 transition-all duration-300 ease-synos ${
                    isQueueCollapsed ? "col-span-7" : "col-span-5"
                }`}>
                    {selectedStudy ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Viewport Control Strip */}
                            <div className="p-3 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex items-center justify-between text-xs gap-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsQueueCollapsed(prev => !prev)}
                                        className="p-1 hover:bg-zinc-500/10 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-all active:scale-95 shrink-0 font-black border dark:border-synos-border border-zinc-200 text-xs flex items-center justify-center w-6 h-6 animate-in fade-in zoom-in duration-300"
                                        title={isQueueCollapsed ? "Show Patient Queue" : "Collapse Workspace"}
                                    >
                                        {isQueueCollapsed ? "→" : "←"}
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <Sun className="h-3.5 w-3.5 dark:text-zinc-400 text-zinc-550" />
                                        <input 
                                            type="range" 
                                            min="30" 
                                            max="200" 
                                            value={brightness} 
                                            onChange={(e) => updateFilters(Number(e.target.value), contrast)}
                                            className="w-16 accent-synos-primary cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Contrast className="h-3.5 w-3.5 dark:text-zinc-400 text-zinc-550" />
                                        <input 
                                            type="range" 
                                            min="30" 
                                            max="200" 
                                            value={contrast} 
                                            onChange={(e) => updateFilters(brightness, Number(e.target.value))}
                                            className="w-16 accent-synos-primary cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Active Tool Toggles */}
                                <div className="flex dark:bg-zinc-900 bg-zinc-100 p-0.5 rounded border dark:border-zinc-850 border-zinc-200">
                                    <button
                                        onClick={() => handleToggleTool('Wwwc')}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTool === 'Wwwc' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                    >
                                        Windowing
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Length')}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTool === 'Length' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                    >
                                        Caliper
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Pan')}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTool === 'Pan' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                    >
                                        Pan
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Zoom')}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTool === 'Zoom' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                    >
                                        Zoom
                                    </button>
                                </div>

                                {/* Slice Scrolling & Actions */}
                                <div className="flex items-center gap-3">
                                    {selectedStudy?.images && selectedStudy.images.length > 1 && (
                                        <div className="flex items-center gap-2 border-r dark:border-synos-border border-zinc-200 pr-3">
                                            <span className="text-[10px] font-mono dark:text-zinc-400 text-zinc-550">Slice: {activeSliceIndex + 1} / {selectedStudy.images.length}</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max={selectedStudy.images.length - 1}
                                                value={activeSliceIndex}
                                                onChange={(e) => handleSliceChange(Number(e.target.value))}
                                                className="w-20 accent-synos-primary cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleClearCalipers}
                                        className="px-2.5 py-1 dark:bg-zinc-900 bg-zinc-100 border dark:border-zinc-800 border-zinc-200 hover:dark:bg-zinc-800 hover:bg-zinc-200/50 dark:text-zinc-300 text-zinc-700 rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Clear Calipers
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Area */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 dark:bg-synos-background bg-zinc-50">
                                <div 
                                    key={selectedStudy.studyId || selectedStudy.radiologyStudyId}
                                    ref={canvasRef}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="w-full h-full border dark:border-synos-border border-zinc-200 dark:bg-black bg-zinc-900 rounded-lg shadow-2xl relative overflow-hidden"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center dark:text-zinc-500 text-zinc-400">
                            <Monitor className="h-10 w-10 mb-2 dark:text-zinc-700 text-zinc-300" />
                            <h3 className="font-bold text-sm uppercase tracking-wider dark:text-zinc-300 text-zinc-700">Diagnostic Viewport</h3>
                            <p className="text-[11px] dark:text-zinc-500 text-zinc-550 mt-1 max-w-xs leading-relaxed">
                                Select a modality study to initialize the Cornerstone3D WebGL anatomical frameset.
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. Dictation Panel */}
                <div className={`h-full flex flex-col overflow-hidden dark:bg-synos-surface bg-white transition-all duration-300 ease-synos ${
                    isQueueCollapsed ? "col-span-5" : "col-span-4"
                }`}>
                    {selectedStudy ? (
                        !isClaimedByMe ? (
                            /* CLAIM DASHBOARD VIEW */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center dark:bg-synos-background bg-zinc-50 border-l dark:border-synos-border border-zinc-200">
                                <Lock className="h-12 w-12 mb-6 dark:text-zinc-500 text-zinc-400 animate-pulse" />
                                <h3 className="text-lg font-black uppercase tracking-wider dark:text-zinc-200 text-zinc-800">
                                    {isClaimedByOthers ? 'Study Locked' : 'Study Claim Required'}
                                </h3>
                                <p className="text-xs dark:text-zinc-400 text-zinc-600 max-w-xs mt-3 leading-relaxed">
                                    {isClaimedByOthers 
                                        ? `This study is currently claimed by another radiologist (${selectedStudy.claimedByUserName || 'ID: ' + selectedStudy.claimedByUserId}).`
                                        : 'Before you can start drafting reports or using cooperative dictation sync, you must claim this study.'}
                                </p>

                                {isClaimedByOthers && (
                                    <div className="mt-4 p-3 dark:bg-zinc-900/60 bg-zinc-100 rounded-lg border dark:border-synos-border border-zinc-200 text-left w-full space-y-2 font-mono text-[11px] dark:text-zinc-400 text-zinc-650">
                                        <div>Claimed: {new Date(selectedStudy.claimedAt).toLocaleTimeString()}</div>
                                        <div>Last Activity: {selectedStudy.lastActivityAt ? new Date(selectedStudy.lastActivityAt).toLocaleTimeString() : 'None'}</div>
                                        <div>Status: <span className={isInactiveTimeout ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>{isInactiveTimeout ? 'Inactive (Timed Out)' : 'Active'}</span></div>
                                    </div>
                                )}

                                <div className="mt-8 w-full space-y-3">
                                    {!isClaimedByOthers ? (
                                        <button
                                            onClick={handleClaimStudy}
                                            disabled={actionLoading}
                                            className="w-full py-3.5 bg-synos-primary hover:opacity-90 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-260 ease-synos active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            Claim Study & Start Session
                                        </button>
                                    ) : canForceRelease ? (
                                        <button
                                            onClick={handleForceReleaseStudy}
                                            disabled={actionLoading}
                                            className="w-full py-3.5 bg-synos-red hover:opacity-90 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-260 ease-synos active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                            Force Release & Claim Study
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-3.5 dark:bg-zinc-850 bg-zinc-200 dark:text-zinc-500 text-zinc-400 font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                                        >
                                            <Lock className="h-4 w-4" />
                                            Study Locked
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* EDIT MODE PANEL */
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Connection Ribbon */}
                                <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm dark:text-zinc-200 text-zinc-800">Collaborative Transcription</h3>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                                connectionStatus === 'Connected' ? 'dark:bg-emerald-500/10 bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/20 border-emerald-200' :
                                                connectionStatus === 'Reconnecting' ? 'dark:bg-amber-500/10 bg-amber-50 text-amber-600 dark:text-amber-400 dark:border-amber-500/20 border-amber-200 animate-pulse' :
                                                connectionStatus === 'Connecting' ? 'bg-synos-primary/10 text-synos-primary border-synos-primary/20 animate-pulse' :
                                                'dark:bg-red-500/10 bg-red-50 text-red-650 dark:text-red-400 dark:border-red-500/20 border-red-200'
                                            }`}>
                                                {connectionStatus}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`h-1.5 w-1.5 rounded-full ${liveTypistConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                                            <span className="text-[10px] dark:text-zinc-400 text-zinc-550">
                                                {liveTypistConnected ? 'Typist joined session (Live Sync)' : 'Waiting for Typist...'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSaveDraft}
                                            className="px-2.5 py-1.5 dark:bg-zinc-800 bg-zinc-100 hover:dark:bg-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-200 text-zinc-750 rounded font-bold border dark:border-zinc-700 border-zinc-200 text-[10px] uppercase transition-colors"
                                        >
                                            Save Draft
                                        </button>
                                    </div>
                                </div>

                                {/* Report Textareas */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-550 tracking-wider">Findings & Observation</label>
                                        <textarea
                                            value={draftFindings}
                                            onChange={(e) => setDraftFindings(e.target.value)}
                                            className="w-full h-44 dark:bg-synos-background bg-zinc-50 border dark:border-synos-border border-zinc-250 rounded p-3 text-xs dark:text-zinc-200 text-zinc-800 focus:outline-none focus:border-synos-primary transition-all duration-260 ease-synos font-mono resize-none leading-relaxed"
                                            placeholder="Dynamic visual findings here..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-550 tracking-wider">Diagnostic Impression</label>
                                        <textarea
                                            value={draftImpression}
                                            onChange={(e) => setDraftImpression(e.target.value)}
                                            className="w-full h-24 dark:bg-synos-background bg-zinc-50 border dark:border-synos-border border-zinc-250 rounded p-3 text-xs dark:text-zinc-200 text-zinc-800 focus:outline-none focus:border-synos-primary transition-all duration-260 ease-synos font-mono resize-none leading-relaxed font-bold"
                                            placeholder="Clinical impression..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-550 tracking-wider">Additional Recommendations / Notes</label>
                                        <textarea
                                            value={draftNotes}
                                            onChange={(e) => setDraftNotes(e.target.value)}
                                            className="w-full h-20 dark:bg-synos-background bg-zinc-50 border dark:border-synos-border border-zinc-250 rounded p-3 text-xs dark:text-zinc-200 text-zinc-800 focus:outline-none focus:border-synos-primary transition-all duration-260 ease-synos font-mono resize-none leading-relaxed"
                                            placeholder="Recommendations..."
                                        />
                                    </div>
                                </div>

                                {/* Sign-off Dispatcher */}
                                <div className="p-4 border-t dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white">
                                    <button
                                        onClick={handleSignReport}
                                        disabled={actionLoading || !draftFindings || !draftImpression}
                                        className="w-full py-2.5 bg-synos-emerald hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded transition-all duration-260 ease-synos flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                                        Digitally Sign & Release Report
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center dark:text-zinc-500 text-zinc-400">
                            <FileText className="h-10 w-10 mb-2 dark:text-zinc-700 text-zinc-300" />
                            <h3 className="font-bold text-sm uppercase tracking-wider dark:text-zinc-300 text-zinc-700">Clinical Narrative</h3>
                            <p className="text-[11px] dark:text-zinc-500 text-zinc-550 mt-1 max-w-xs leading-relaxed">
                                Once a modality study is active, clinical narrative drafting and digital signature operations will unlock.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <RadiologyCallOverlay 
                hubConnection={hubConnection.current} 
                selectedStudy={selectedStudy} 
                onSelectStudy={(studyId) => handleSelectStudy({ radiologyStudyId: studyId })} 
                role="Radiologist"
            />
        </div>
    );
}
