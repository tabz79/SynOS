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

    // SignalR Connection
    const [liveTypistConnected, setLiveTypistConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const hubConnection = useRef(null);

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

    // Initialize Dicom Viewport when active study changes
    useEffect(() => {
        if (selectedStudy) {
            const isClaimedByMe = selectedStudy.claimedByUserId === user?.id;
            const studyId = selectedStudy.studyId || selectedStudy.radiologyStudyId;
            
            if (isClaimedByMe && studyId && canvasRef.current) {
                viewportManager.current = new DicomViewportManager(canvasRef.current, selectedStudy.modality);
                
                // Load raw DICOM slices if study contains any extracted slices
                if (selectedStudy.images && selectedStudy.images.length > 0) {
                    const urls = selectedStudy.images.map(img => img.fileUrl);
                    viewportManager.current.setImages(urls).then(() => {
                        setActiveSliceIndex(0);
                    });
                }
                
                // Connect SignalR for live character typing sync
                connectSignalR(studyId);

                // Fetch current report structure/draft if exists
                fetchReportDraft(studyId);
            }
        }

        return () => {
            if (viewportManager.current) {
                viewportManager.current.destroy();
                viewportManager.current = null;
            }
            if (hubConnection.current) {
                hubConnection.current.stop();
            }
        };
    }, [selectedStudy?.studyId, selectedStudy?.claimedByUserId]);

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
                if (parsed.findings !== undefined) setDraftFindings(parsed.findings);
                if (parsed.impression !== undefined) setDraftImpression(parsed.impression);
                if (parsed.additionalNotes !== undefined) setDraftNotes(parsed.additionalNotes);
            } catch (e) {
                console.error("Failed to parse live draft packet:", e);
            }
        });

        hubConnection.current.on('UserJoined', (connectionId) => {
            setLiveTypistConnected(true);
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
        <div className="h-screen w-screen bg-zinc-950 text-zinc-150 flex flex-col font-sans select-none overflow-hidden">
            {/* System Header */}
            <SystemBar title="Radiologist Diagnostic Workstation" status="Live" />

            {/* Core Workstation Workspace */}
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* 1. Modality Worklist Queue */}
                <div className="col-span-3 border-r border-zinc-850 flex flex-col h-full bg-zinc-900/35">
                    <div className="p-4 border-b border-zinc-850 bg-zinc-900/50 flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider text-zinc-400">Interpretations Worklist</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">
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
                            <div className="h-full flex items-center justify-center flex-col text-center p-6 text-zinc-600">
                                <Activity className="h-8 w-8 mb-2 text-zinc-700 animate-pulse" />
                                <span className="text-xs font-semibold uppercase">Queue Empty</span>
                                <span className="text-[10px] text-zinc-600 mt-1">No studies awaiting reporting.</span>
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
                                        <div className="mt-2 flex items-center justify-between text-[10px]">
                                            <span className={`px-1.5 py-0.5 rounded font-medium ${
                                                isClaimedByMe 
                                                    ? 'bg-emerald-500/15 text-emerald-400' 
                                                    : isClaimedByOthers 
                                                        ? 'bg-amber-500/15 text-amber-400' 
                                                        : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                                {isClaimedByMe ? 'Claimed by Me' : isClaimedByOthers ? `Locked (${study.claimedByUserName || 'Other'})` : 'Unclaimed'}
                                            </span>
                                            {study.status && (
                                                <span className="text-zinc-500 font-mono text-[9px]">{study.status}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 2. WebGL Resizable Viewport */}
                <div className="col-span-5 h-full flex flex-col overflow-hidden border-r border-zinc-850 bg-black">
                    {selectedStudy ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Viewport Control Strip */}
                            <div className="p-3 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between text-xs gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Sun className="h-3.5 w-3.5 text-zinc-500" />
                                        <input 
                                            type="range" 
                                            min="30" 
                                            max="200" 
                                            value={brightness} 
                                            onChange={(e) => updateFilters(Number(e.target.value), contrast)}
                                            className="w-16 accent-indigo-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Contrast className="h-3.5 w-3.5 text-zinc-500" />
                                        <input 
                                            type="range" 
                                            min="30" 
                                            max="200" 
                                            value={contrast} 
                                            onChange={(e) => updateFilters(brightness, Number(e.target.value))}
                                            className="w-16 accent-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Active Tool Toggles */}
                                <div className="flex bg-zinc-900 p-0.5 rounded border border-zinc-800">
                                    <button
                                        onClick={() => handleToggleTool('Wwwc')}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTool === 'Wwwc' ? 'bg-indigo-650 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        Windowing
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Length')}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTool === 'Length' ? 'bg-indigo-650 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        Caliper Tool
                                    </button>
                                </div>

                                {/* Slice Scrolling & Actions */}
                                <div className="flex items-center gap-3">
                                    {selectedStudy?.images && selectedStudy.images.length > 1 && (
                                        <div className="flex items-center gap-2 border-r border-zinc-850 pr-3">
                                            <span className="text-[10px] font-mono text-zinc-400">Slice: {activeSliceIndex + 1} / {selectedStudy.images.length}</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max={selectedStudy.images.length - 1}
                                                value={activeSliceIndex}
                                                onChange={(e) => handleSliceChange(Number(e.target.value))}
                                                className="w-20 accent-indigo-500"
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleClearCalipers}
                                        className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-350 rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Clear Calipers
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Area */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 bg-zinc-950">
                                <div 
                                    ref={canvasRef}
                                    className="w-full h-full border border-zinc-900 bg-zinc-950/60 rounded-lg shadow-2xl relative overflow-hidden"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                            <Monitor className="h-10 w-10 mb-2 text-zinc-750" />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-400">Diagnostic Viewport</h3>
                            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                                Select a modality study to initialize the Cornerstone3D WebGL anatomical frameset.
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. Dictation Panel */}
                <div className="col-span-4 h-full flex flex-col overflow-hidden bg-zinc-900/25">
                    {selectedStudy ? (
                        !isClaimedByMe ? (
                            /* CLAIM DASHBOARD VIEW */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/80 border-l border-zinc-850">
                                <Lock className="h-12 w-12 mb-6 text-zinc-500 animate-pulse" />
                                <h3 className="text-lg font-black uppercase tracking-wider text-zinc-200">
                                    {isClaimedByOthers ? 'Study Locked' : 'Study Claim Required'}
                                </h3>
                                <p className="text-xs text-zinc-400 max-w-xs mt-3 leading-relaxed">
                                    {isClaimedByOthers 
                                        ? `This study is currently claimed by another radiologist (${selectedStudy.claimedByUserName || 'ID: ' + selectedStudy.claimedByUserId}).`
                                        : 'Before you can start drafting reports or using cooperative dictation sync, you must claim this study.'}
                                </p>

                                {isClaimedByOthers && (
                                    <div className="mt-4 p-3 bg-zinc-900/60 rounded-lg border border-zinc-850 text-left w-full space-y-2 font-mono text-[11px] text-zinc-400">
                                        <div>Claimed: {new Date(selectedStudy.claimedAt).toLocaleTimeString()}</div>
                                        <div>Last Activity: {selectedStudy.lastActivityAt ? new Date(selectedStudy.lastActivityAt).toLocaleTimeString() : 'None'}</div>
                                        <div>Status: <span className={isInactiveTimeout ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{isInactiveTimeout ? 'Inactive (Timed Out)' : 'Active'}</span></div>
                                    </div>
                                )}

                                <div className="mt-8 w-full space-y-3">
                                    {!isClaimedByOthers ? (
                                        <button
                                            onClick={handleClaimStudy}
                                            disabled={actionLoading}
                                            className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-650 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-950/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            Claim Study & Start Session
                                        </button>
                                    ) : canForceRelease ? (
                                        <button
                                            onClick={handleForceReleaseStudy}
                                            disabled={actionLoading}
                                            className="w-full py-3.5 bg-red-650 hover:bg-red-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-950/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                            Force Release & Claim Study
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-3.5 bg-zinc-850 text-zinc-500 font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
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
                                <div className="p-4 border-b border-zinc-850 bg-zinc-900/50 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-zinc-200">Collaborative Transcription</h3>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                connectionStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                connectionStatus === 'Reconnecting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                                                connectionStatus === 'Connecting' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse' :
                                                'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                                {connectionStatus}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`h-1.5 w-1.5 rounded-full ${liveTypistConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                                            <span className="text-[10px] text-zinc-400">
                                                {liveTypistConnected ? 'Typist joined session (Live Sync)' : 'Waiting for Typist...'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSaveDraft}
                                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-bold text-[10px] uppercase transition-colors"
                                        >
                                            Save Draft
                                        </button>
                                    </div>
                                </div>

                                {/* Report Textareas */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Findings & Observation</label>
                                        <textarea
                                            value={draftFindings}
                                            onChange={(e) => setDraftFindings(e.target.value)}
                                            className="w-full h-44 bg-zinc-950 border border-zinc-850 rounded p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono resize-none leading-relaxed"
                                            placeholder="Dynamic visual findings here..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Diagnostic Impression</label>
                                        <textarea
                                            value={draftImpression}
                                            onChange={(e) => setDraftImpression(e.target.value)}
                                            className="w-full h-24 bg-zinc-950 border border-zinc-850 rounded p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono resize-none leading-relaxed font-bold"
                                            placeholder="Clinical impression..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Additional Recommendations / Notes</label>
                                        <textarea
                                            value={draftNotes}
                                            onChange={(e) => setDraftNotes(e.target.value)}
                                            className="w-full h-20 bg-zinc-950 border border-zinc-850 rounded p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono resize-none leading-relaxed"
                                            placeholder="Recommendations..."
                                        />
                                    </div>
                                </div>

                                {/* Sign-off Dispatcher */}
                                <div className="p-4 border-t border-zinc-850 bg-zinc-900/50">
                                    <button
                                        onClick={handleSignReport}
                                        disabled={actionLoading || !draftFindings || !draftImpression}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20 animate-pulse"
                                    >
                                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                                        Digitally Sign & Release Report
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                            <FileText className="h-10 w-10 mb-2 text-zinc-750" />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-400">Clinical Narrative</h3>
                            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                                Once a modality study is active, clinical narrative drafting and digital signature operations will unlock.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
