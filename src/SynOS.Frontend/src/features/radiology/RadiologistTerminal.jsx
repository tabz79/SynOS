import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Edit3,
    Eye,
    Maximize2, 
    Folder, 
    FolderArchive,
    Grid,
    Trash2,
    BookOpen,
    Loader2,
    Users,
    Key,
    Lock,
    X
} from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { CollaborationCallOverlay } from './CollaborationCallOverlay';
import { RichMedicalEditor } from '@/components/editor/RichMedicalEditor';
import { MedicalMacrosWorkspace } from '@/components/editor/MedicalMacrosWorkspace';
import { PacsArchiveScreen } from './PacsArchiveScreen';
import { ReportA4 } from '../documents/templates/ReportA4';
import { useTemplateForReport } from '../documents/templates/hooks/useReportTemplates';



let sharedConnection = null;
let stopTimer = null;
let subscriberCount = 0;

export function RadiologistTerminal() {
    const { user } = useAuth();
    const [studies, setStudies] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedStudy, setSelectedStudy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [leftWidth, setLeftWidth] = useState(300);
    const [rightWidth, setRightWidth] = useState(450);
    const containerRef = useRef(null);
    const isResizingLeft = useRef(false);
    const isResizingRight = useRef(false);

    // Collapsed Queue & Macro State
    const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);
    const [isMacroManagerOpen, setIsMacroManagerOpen] = useState(false);
    const [showPacsModal, setShowPacsModal] = useState(false);

    // SignalR Connection
    const [liveTypistConnected, setLiveTypistConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [isHubReady, setIsHubReady] = useState(false);
    const hubConnection = useRef(null);
    const currentJoinedStudyIdRef = useRef(null);

    // Canvas references
    const canvasRef = useRef(null);
    const viewportManager = useRef(null);

    // Viewport Adjustments
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [activeSliceIndex, setActiveSliceIndex] = useState(0);
    const [activeTool, setActiveTool] = useState('Wwwc');
    const [layout, setLayout] = useState('1x1');
    const [activeViewportId, setActiveViewportId] = useState('viewport-0');
    const [viewportSlices, setViewportSlices] = useState({});
    
    // Live Cooperative Draft State
    const [draftFindings, setDraftFindings] = useState('');
    const [draftImpression, setDraftImpression] = useState('');
    const [draftNotes, setDraftNotes] = useState('');
    const [reportId, setReportId] = useState(null);
    const [reportData, setReportData] = useState(null);
    const { template, loading: templateLoading } = useTemplateForReport(reportData);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState('preview'); // 'preview' | 'editor'

    // Live Report Preview Auto-Fit, Zoom, and Pan State
    const [previewScale, setPreviewScale] = useState(0.55);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const previewContainerRef = useRef(null);

    const memoizedReportData = useMemo(() => {
        if (!reportData) return null;
        return {
            ...reportData,
            interpretation: draftFindings !== undefined && draftFindings !== null ? draftFindings : reportData.interpretation
        };
    }, [reportData, draftFindings]);

    // Auto-Calculate Fit Scale based on Right Panel Container Width
    useEffect(() => {
        if (previewContainerRef.current) {
            const containerWidth = previewContainerRef.current.clientWidth || rightWidth || 450;
            const fitScale = Math.min(Math.max((containerWidth - 32) / 794, 0.3), 1.2);
            setPreviewScale(fitScale);
            setPanOffset({ x: 0, y: 0 });
        }
    }, [selectedStudy?.studyId || selectedStudy?.radiologyStudyId, rightWidth, rightPanelTab]);

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
    }, [reportData, rightPanelTab]);

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

    const handleLeftResizeStart = (e) => {
        e.preventDefault();
        isResizingLeft.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const handleRightResizeStart = (e) => {
        e.preventDefault();
        isResizingRight.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            
            if (isResizingLeft.current) {
                const newWidth = Math.max(220, Math.min(500, e.clientX - containerRect.left));
                setLeftWidth(newWidth);
                if (viewportManager.current) {
                    viewportManager.current.resize();
                }
            } else if (isResizingRight.current) {
                const newWidth = Math.max(320, Math.min(650, containerRect.right - e.clientX));
                setRightWidth(newWidth);
                if (viewportManager.current) {
                    viewportManager.current.resize();
                }
            }
        };

        const handlePointerUp = () => {
            if (isResizingLeft.current || isResizingRight.current) {
                isResizingLeft.current = false;
                isResizingRight.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (viewportManager.current) {
                    viewportManager.current.resize();
                }
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    const fetchWorklist = async () => {
        setLoading(true);
        try {
            const statuses = showHistory 
                ? ['Signed', 'ManualVerified', 'Finalized'] 
                : ['PendingImaging', 'Assigned', 'ImagingCompleted', 'AwaitingDictation', 'DictationSessionStarted', 'DraftReady', 'AwaitingSignature'];
            const params = statuses.map(s => `status=${encodeURIComponent(s)}`).join('&');
            const response = await fetch(`/api/v1/radiology/studies/queue?includeHistory=${showHistory}&${params}`, {
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
    }, [showHistory]);

    const handleSelectStudy = async (study) => {
        const newStudyId = study.studyId || study.radiologyStudyId;
        const currentStudyId = selectedStudy?.studyId || selectedStudy?.radiologyStudyId;
        
        // Only destroy viewport if selecting a DIFFERENT study
        if (currentStudyId && currentStudyId !== newStudyId && viewportManager.current) {
            viewportManager.current.destroy();
            viewportManager.current = null;
        }
        
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/radiology/reports/${newStudyId}`, {
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
                // Now Start Session on backend to transition status to DictationSessionStarted
                const startRes = await fetch(`/api/v1/radiology/studies/${studyId}/session/start`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                // Fetch fresh details and re-apply claim state
                const detailsRes = await fetch(`/api/v1/radiology/reports/${studyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
                });
                if (detailsRes.ok) {
                    const details = await detailsRes.json();
                    setSelectedStudy(details);
                    
                    // If viewport manager exists, re-feed images to ensure rendering
                    if (viewportManager.current && details.images && details.images.length > 0) {
                        const urls = details.images.map(img => img.fileUrl);
                        viewportManager.current.setImages(urls).then(() => {
                            setActiveSliceIndex(0);
                        });
                    }
                }
                fetchWorklist();
            } else {
                const err = await response.json();
                throw new Error(err.message || "Failed to claim study");
            }
        } catch (error) {
            console.error("Claim study error:", error);
            alert(error.message || "Failed to claim study");
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
        isUnmountedRef.current = false;
        subscriberCount++;

        const onReceiveDraftUpdate = (draftContent) => {
            try {
                const parsed = JSON.parse(draftContent);
                const activeStudyId = currentJoinedStudyIdRef.current;
                if (!activeStudyId) return;

                if (parsed.findings !== undefined) setDraftFindings(parsed.findings);
                if (parsed.impression !== undefined) setDraftImpression(parsed.impression);
                if (parsed.additionalNotes !== undefined) setDraftNotes(parsed.additionalNotes);
            } catch (e) {
                console.error("Failed to parse live draft packet:", e);
            }
        };

        const onUserJoined = (connectionId) => {
            setLiveTypistConnected(true);
        };

        const onUserLeft = (connectionId) => {
            setLiveTypistConnected(false);
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

        const registerHandlers = (conn) => {
            conn.on('ReceiveDraftUpdate', onReceiveDraftUpdate);
            conn.on('UserJoined', onUserJoined);
            conn.on('UserLeft', onUserLeft);
            conn.on('ReceiveDraftSaved', onReceiveDraftSaved);
            conn.on('ReceiveDraftResumed', onReceiveDraftResumed);
            conn.on('ReceiveSignRequest', onReceiveSignRequest);
        };

        const unregisterHandlers = (conn) => {
            conn.off('ReceiveDraftUpdate', onReceiveDraftUpdate);
            conn.off('UserJoined', onUserJoined);
            conn.off('UserLeft', onUserLeft);
            conn.off('ReceiveDraftSaved', onReceiveDraftSaved);
            conn.off('ReceiveDraftResumed', onReceiveDraftResumed);
            conn.off('ReceiveSignRequest', onReceiveSignRequest);
        };

        if (stopTimer) {
            clearTimeout(stopTimer);
            stopTimer = null;
            if (sharedConnection) {
                hubConnection.current = sharedConnection;
                registerHandlers(sharedConnection);
                if (sharedConnection.state === signalR.HubConnectionState.Connected) {
                    setConnectionStatus('Connected');
                    setIsHubReady(true);
                } else if (sharedConnection.state === signalR.HubConnectionState.Connecting) {
                    setConnectionStatus('Connecting');
                    setIsHubReady(false);
                } else if (sharedConnection.state === signalR.HubConnectionState.Reconnecting) {
                    setConnectionStatus('Reconnecting');
                    setIsHubReady(false);
                } else {
                    setConnectionStatus('Disconnected');
                    setIsHubReady(false);
                }
            }
        } else {
            connectSignalR(registerHandlers);
        }

        return () => {
            isUnmountedRef.current = true;
            const connection = hubConnection.current;
            if (connection) {
                unregisterHandlers(connection);
            }
            subscriberCount--;
            if (subscriberCount <= 0) {
                subscriberCount = 0;
                if (stopTimer) clearTimeout(stopTimer);
                stopTimer = setTimeout(() => {
                    if (sharedConnection) {
                        sharedConnection.stop().catch(err => console.error("Error stopping connection on cleanup:", err));
                        sharedConnection = null;
                    }
                    stopTimer = null;
                }, 2000);
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
                    viewportManager.current.layout = layout;
                    viewportManager.current.onSliceChange = (idx) => {
                        setActiveSliceIndex(idx);
                    };
                    viewportManager.current.onViewportSliceChange = (viewportId, current, max) => {
                        setViewportSlices(prev => ({
                            ...prev,
                            [viewportId]: { current, max }
                        }));
                    };
                    
                    // Load raw DICOM slices if study contains any PACS instances or extracted slices
                    const loadDicomImages = async () => {
                        let urls = [];
                        if (selectedStudy.images && selectedStudy.images.length > 0) {
                            urls = selectedStudy.images.map(img => img.fileUrl);
                        } else {
                            try {
                                const tree = await RadiologyApi.getSeriesTree(studyId);
                                if (tree && tree.series) {
                                    tree.series.forEach(s => {
                                        if (s.instances) {
                                            s.instances.forEach(inst => {
                                                urls.push(`/api/v1/radiology/pacs/instances/${inst.instanceId}/file`);
                                            });
                                        }
                                    });
                                }
                            } catch (e) {
                                console.warn("No PACS series tree found for study:", e);
                            }
                        }

                        if (urls.length > 0 && viewportManager.current) {
                            viewportManager.current.setImages(urls).then(() => {
                                setActiveSliceIndex(0);
                            }).catch(e => console.error("Error setting DICOM viewport images:", e));
                        }
                    };

                    loadDicomImages();
                }
                
                // Switch session groups dynamically
                const studyIdStr = studyId.toString();
                if (currentJoinedStudyIdRef.current && currentJoinedStudyIdRef.current !== studyIdStr) {
                    if (hubConnection.current && hubConnection.current.state === 'Connected' && isHubReady) {
                        hubConnection.current.invoke('LeaveSession', currentJoinedStudyIdRef.current).catch(err => console.error(err));
                    }
                }
                
                currentJoinedStudyIdRef.current = studyIdStr;
                if (hubConnection.current && hubConnection.current.state === 'Connected' && isHubReady) {
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
    }, [selectedStudy?.radiologyStudyId || selectedStudy?.studyId, selectedStudy?.claimedByUserId, layout, isHubReady]);

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
            const detailResponse = await fetch(`/api/v1/radiology/reports/${studyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (detailResponse.ok) {
                const details = await detailResponse.json();
                if (details.report) {
                    setDraftFindings(details.report.findings || '');
                    setDraftImpression(details.report.impression || '');
                    setDraftNotes(details.report.additionalNotes || '');
                }
            }

            const response = await fetch(`/api/v1/reports/source/RadiologyStudy/${studyId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                const report = await response.json();
                setReportId(report.reportId);
            }
        } catch (error) {
            console.error("Failed to load report draft:", error);
        }
    };

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
    }, [selectedStudy?.studyId || selectedStudy?.radiologyStudyId, reportId]);

    const isUnmountedRef = useRef(false);

    const connectSignalR = async (registerHandlers) => {
        if (sharedConnection && sharedConnection.state === signalR.HubConnectionState.Connected) {
            hubConnection.current = sharedConnection;
            registerHandlers(sharedConnection);
            setConnectionStatus('Connected');
            setIsHubReady(true);
            return;
        }
        if (sharedConnection && sharedConnection.state === signalR.HubConnectionState.Connecting) {
            hubConnection.current = sharedConnection;
            registerHandlers(sharedConnection);
            setConnectionStatus('Connecting');
            setIsHubReady(false);
            return;
        }

        setConnectionStatus('Connecting');
        setIsHubReady(false);

        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/radiologyCollaborationHub', {
                accessTokenFactory: () => localStorage.getItem('synos_jwt'),
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000]) // sliding reconnect
            .build();

        sharedConnection = connection;
        hubConnection.current = connection;

        connection.onreconnecting((error) => {
            if (hubConnection.current !== connection) return;
            setConnectionStatus('Reconnecting');
            setIsHubReady(false);
        });

        connection.onreconnected((connectionId) => {
            if (hubConnection.current !== connection) return;
            setConnectionStatus('Connected');
            setIsHubReady(true);
            connection.invoke('RegisterPresence', 'Radiologist').catch(err => console.error(err));
            if (currentJoinedStudyIdRef.current) {
                connection.invoke('JoinSession', currentJoinedStudyIdRef.current).catch(err => console.error(err));
                fetchReportDraft(currentJoinedStudyIdRef.current);
            }
        });

        connection.onclose((error) => {
            if (hubConnection.current !== connection) return;
            setConnectionStatus('Disconnected');
            setIsHubReady(false);
        });

        registerHandlers(connection);

        connection.start()
            .then(async () => {
                if (hubConnection.current !== connection) return;
                if (isUnmountedRef.current) {
                    connection.stop().catch(err => console.error("Error stopping connection on cleanup:", err));
                    if (sharedConnection === connection) sharedConnection = null;
                    hubConnection.current = null;
                    return;
                }
                setConnectionStatus('Connected');
                setIsHubReady(true);
                await connection.invoke('RegisterPresence', 'Radiologist');
                if (currentJoinedStudyIdRef.current) {
                    await connection.invoke('JoinSession', currentJoinedStudyIdRef.current);
                }
            })
            .catch(e => {
                if (hubConnection.current !== connection) return;
                if (isUnmountedRef.current) {
                    if (sharedConnection === connection) sharedConnection = null;
                    hubConnection.current = null;
                    return;
                }
                if (e && e.name === 'AbortError') {
                    return;
                }
                setConnectionStatus('Disconnected');
                setIsHubReady(false);
                console.error("Failed to connect to SignalR hub:", e);
            });
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

    // Live keystroke sync & LocalStorage buffering for Radiologist
    const handleFieldChange = async (field, val) => {
        let update = {};
        const studyId = selectedStudy.radiologyStudyId || selectedStudy.studyId;

        if (field === 'findings') {
            setDraftFindings(val);
            update = { findings: val, impression: draftImpression, additionalNotes: draftNotes };
        } else if (field === 'impression') {
            setDraftImpression(val);
            update = { findings: draftFindings, impression: val, additionalNotes: draftNotes };
        } else if (field === 'notes') {
            setDraftNotes(val);
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

    // Save Draft Content
    const handleSaveDraft = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.radiologyStudyId || selectedStudy.studyId;
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
                await handleSelectStudy({ radiologyStudyId: studyId });
                
                // Broadcast to live typist if connected
                if (hubConnection.current) {
                    await hubConnection.current.invoke('SendDraftSaved', studyId.toString());
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
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.radiologyStudyId || selectedStudy.studyId;
        if (!draftFindings || !draftFindings.trim()) {
            alert("Cannot sign report: Findings content is empty. Please enter your findings before signing.");
            setActionLoading(false);
            return;
        }

        try {
            // First save findings/impression draft content
            const draftBody = {
                studyId: studyId,
                findings: draftFindings,
                impression: draftImpression,
                additionalNotes: draftNotes
            };
            await fetch('/api/v1/radiology/reports/draft', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(draftBody)
            });

            // Then Digitally Sign (Direct sign for Radiology)
            const signResponse = await fetch('/api/v1/radiology/reports/sign', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ studyId: studyId })
            });
            if (!signResponse.ok) {
                const err = await signResponse.json();
                throw new Error(err.message || "Failed to digitally sign report");
            }

            alert("Clinical Report Digitally Signed and Released successfully");
            await handleSelectStudy({ radiologyStudyId: studyId });
            fetchWorklist();
        } catch (error) {
            alert(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleResumeDictation = async () => {
        if (!selectedStudy) return;
        setActionLoading(true);
        const studyId = selectedStudy.radiologyStudyId || selectedStudy.studyId;
        try {
            const response = await fetch(`/api/v1/radiology/reports/${studyId}/resume`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (response.ok) {
                await handleSelectStudy({ radiologyStudyId: studyId });
                
                // Broadcast to live typist if connected
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

    const handleToggleTool = (tool) => {
        setActiveTool(tool);
        if (viewportManager.current) {
            viewportManager.current.setToolActive(tool);
        }
    };

    const handleLayoutChange = (lay) => {
        if (viewportManager.current) {
            viewportManager.current.destroy();
            viewportManager.current = null;
        }
        setLayout(lay);
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

    const patientContext = selectedStudy ? {
        patientName: selectedStudy.patientName || selectedStudy.patient?.name || '',
        age: selectedStudy.patientAge || selectedStudy.age || selectedStudy.patient?.age || '',
        gender: selectedStudy.patientGender || selectedStudy.gender || selectedStudy.sex || selectedStudy.patient?.gender || '',
        token: selectedStudy.tokenNumber || selectedStudy.token || selectedStudy.patient?.mrn || ''
    } : null;

    const renderViewportScrollbar = (viewportId) => {
        const sliceInfo = viewportSlices[viewportId];
        if (!sliceInfo) return null;

        const { current, max } = sliceInfo;
        if (!max || max <= 1) return null;

        return (
            <div className="absolute right-1 top-6 bottom-1 w-6 flex flex-col items-center justify-between z-20 pointer-events-auto bg-black/45 backdrop-blur-xs py-2 rounded-l border border-r-0 dark:border-zinc-850 border-zinc-200">
                <input
                    type="range"
                    min="0"
                    max={max - 1}
                    value={current}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        setViewportSlices(prev => ({
                            ...prev,
                            [viewportId]: { ...prev[viewportId], current: val }
                        }));
                        if (viewportManager.current) {
                            viewportManager.current.setViewportSlice(viewportId, val);
                        }
                    }}
                    style={{
                        writingMode: 'vertical-lr',
                        height: '75%',
                        cursor: 'ns-resize'
                    }}
                    className="w-1 accent-synos-primary bg-zinc-800 rounded outline-none"
                />
                <span className="text-[8px] font-mono text-zinc-400 mt-1 select-none">
                    {current + 1}/{max}
                </span>
            </div>
        );
    };

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-zinc-50 dark:text-zinc-100 text-zinc-800 flex flex-col font-sans select-none overflow-hidden">
            {/* System Header */}
            <SystemBar syncStatus={connectionStatus === 'Connected' ? 'Synced' : 'Not Synced'} />

            {/* Core Workstation Workspace */}
            <div ref={containerRef} className="flex-1 flex overflow-hidden relative w-full">
                {/* 1. Modality Worklist Queue */}
                <div 
                    style={{ width: isQueueCollapsed && !isMacroManagerOpen ? 0 : leftWidth }}
                    className={`border-r dark:border-synos-border border-zinc-200 flex flex-col h-full dark:bg-synos-background/35 bg-zinc-50/50 transition-all duration-300 ease-synos shrink-0 overflow-hidden ${
                        isQueueCollapsed && !isMacroManagerOpen ? "w-0" : "flex"
                    }`}
                >
                    {isMacroManagerOpen ? (
                        <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-4 flex flex-col h-full min-h-0">
                            <MedicalMacrosWorkspace onClose={() => setIsMacroManagerOpen(false)} />
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-xs uppercase tracking-wider dark:text-zinc-400 text-zinc-550">Interpretations Worklist</span>
                                    <span className="text-[10px] dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-400 text-zinc-650 px-2 py-0.5 rounded-full font-bold">
                                        {studies.length} {showHistory ? "history" : "active"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 dark:bg-zinc-950/50 bg-zinc-50 rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm w-fit">
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all ${
                                            !showHistory ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                                        }`}
                                    >
                                        Live
                                    </button>
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all ${
                                            showHistory ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                                        }`}
                                    >
                                        History (7d)
                                    </button>
                                </div>
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
                                                    <span className="text-[9px] font-bold dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-650 px-2 py-0.5 rounded">
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
                                                                ? 'dark:bg-amber-500/10 bg-amber-50 text-amber-600 dark:text-amber-400 dark:border-amber-500/20 border-emerald-200' 
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

                            {/* PACS Master Archive Trigger Footer */}
                            <div className="p-3 border-t dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white">
                                <button
                                    onClick={() => setShowPacsModal(true)}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition shadow-sm"
                                >
                                    <FolderArchive className="w-4 h-4 text-emerald-100" />
                                    <span>PACS Archive Explorer</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Left resizer divider */}
                {!isQueueCollapsed && (
                    <div 
                        onPointerDown={handleLeftResizeStart}
                        className="w-[3px] hover:w-[6px] hover:bg-synos-primary bg-zinc-200 dark:bg-zinc-800/80 cursor-col-resize h-full select-none z-30 transition-all flex items-center justify-center shrink-0 group"
                        title="Drag to resize worklist panel"
                    >
                        <div className="w-[1px] h-8 bg-zinc-400 dark:bg-zinc-650 rounded group-hover:bg-white" />
                    </div>
                )}

                {/* 2. WebGL Resizable Viewport */}
                <div className="h-full flex-1 flex flex-col overflow-hidden dark:bg-black bg-zinc-950 min-w-[300px]">
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
                                <div className="flex dark:bg-zinc-900 bg-zinc-100 p-0.5 rounded border dark:border-zinc-850 border-zinc-200 flex-wrap gap-0.5">
                                    <button
                                        onClick={() => handleToggleTool('Wwwc')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'Wwwc' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                        title="Window Width / Window Center"
                                    >
                                        Windowing
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Length')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'Length' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                        title="Length Caliper"
                                    >
                                        Caliper
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Angle')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'Angle' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                        title="Cobb Angle"
                                    >
                                        Angle
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('RectangleROI')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'RectangleROI' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                        title="Rectangle ROI"
                                    >
                                        Rect ROI
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('EllipticalROI')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'EllipticalROI' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                        title="Elliptical ROI"
                                    >
                                        Ellipse ROI
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Crosshairs')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'Crosshairs' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                        title="Crosshair Synchronization (MPR)"
                                    >
                                        Crosshair
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Pan')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'Pan' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                    >
                                        Pan
                                    </button>
                                    <button
                                        onClick={() => handleToggleTool('Zoom')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${activeTool === 'Zoom' ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-650 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                    >
                                        Zoom
                                    </button>
                                </div>

                                {/* Layout Grid Selector */}
                                <div className="flex dark:bg-zinc-900 bg-zinc-100 p-0.5 rounded border dark:border-zinc-850 border-zinc-200 gap-0.5 shrink-0">
                                    {['1x1', '1x2', '2x2', 'MPR'].map((lay) => (
                                        <button
                                            key={lay}
                                            onClick={() => handleLayoutChange(lay)}
                                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${layout === lay ? 'bg-synos-primary text-white shadow-sm' : 'dark:text-zinc-400 text-zinc-655 hover:dark:text-zinc-200 hover:text-zinc-900'}`}
                                        >
                                            {lay}
                                        </button>
                                    ))}
                                </div>

                                {/* Slice Scrolling & Actions */}
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const activeSliceInfo = viewportSlices[activeViewportId] || { current: activeSliceIndex, max: selectedStudy?.images?.length || 1 };
                                        const { current, max } = activeSliceInfo;
                                        if (max <= 1) return null;
                                        return (
                                            <div className="flex items-center gap-2 border-r dark:border-synos-border border-zinc-200 pr-3">
                                                <span className="text-[10px] font-mono dark:text-zinc-400 text-zinc-550">
                                                    Slice: {current + 1} / {max}
                                                </span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={max - 1}
                                                    value={current}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setViewportSlices(prev => ({
                                                            ...prev,
                                                            [activeViewportId]: { ...prev[activeViewportId], current: val }
                                                        }));
                                                        if (viewportManager.current) {
                                                            viewportManager.current.setViewportSlice(activeViewportId, val);
                                                        }
                                                    }}
                                                    className="w-20 accent-synos-primary cursor-pointer h-1 rounded-lg bg-zinc-200 dark:bg-zinc-850"
                                                />
                                            </div>
                                        );
                                    })()}

                                    <button
                                        onClick={handleClearCalipers}
                                        className="px-2.5 py-1 dark:bg-zinc-900 bg-zinc-100 border dark:border-zinc-800 border-zinc-200 hover:dark:bg-zinc-800 hover:bg-zinc-200/50 dark:text-zinc-300 text-zinc-700 rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Clear Annotations
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Area */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 dark:bg-synos-background bg-zinc-50">
                                <div 
                                    key={`${selectedStudy.studyId || selectedStudy.radiologyStudyId}_${layout}`}
                                    ref={canvasRef}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="absolute inset-2 border dark:border-synos-border border-zinc-200 dark:bg-black bg-zinc-900 rounded-lg shadow-2xl overflow-hidden p-1"
                                >
                                   {layout === '1x1' && (
                                       <div 
                                           onMouseDown={() => setActiveViewportId('viewport-0')}
                                           className="w-full h-full relative bg-black rounded overflow-hidden"
                                       >
                                           <div id="synos-viewport-0" className="w-full h-full viewport-element" />
                                           {renderViewportScrollbar('viewport-0')}
                                       </div>
                                   )}
                                   {layout === '1x2' && (
                                       <div className="grid grid-cols-2 gap-2 w-full h-full">
                                           <div 
                                               onMouseDown={() => setActiveViewportId('viewport-0')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-0" className="w-full h-full viewport-element" />
                                               {renderViewportScrollbar('viewport-0')}
                                           </div>
                                           <div 
                                               onMouseDown={() => setActiveViewportId('viewport-1')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-1" className="w-full h-full viewport-element" />
                                               {renderViewportScrollbar('viewport-1')}
                                           </div>
                                       </div>
                                   )}
                                   {layout === '2x2' && (
                                       <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full">
                                           <div 
                                               onMouseDown={() => setActiveViewportId('viewport-0')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-0" className="w-full h-full viewport-element" />
                                               {renderViewportScrollbar('viewport-0')}
                                           </div>
                                           <div 
                                               onMouseDown={() => setActiveViewportId('viewport-1')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-1" className="w-full h-full viewport-element" />
                                               {renderViewportScrollbar('viewport-1')}
                                           </div>
                                           <div 
                                               onMouseDown={() => setActiveViewportId('viewport-2')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-2" className="w-full h-full viewport-element" />
                                               {renderViewportScrollbar('viewport-2')}
                                           </div>
                                           <div 
                                               onMouseDown={() => setActiveViewportId('viewport-3')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-3" className="w-full h-full viewport-element" />
                                               {renderViewportScrollbar('viewport-3')}
                                           </div>
                                       </div>
                                   )}
                                   {layout === 'MPR' && (
                                       <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full">
                                           <div 
                                               onMouseDown={() => setActiveViewportId('axial')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-axial" className="w-full h-full viewport-element" />
                                               <span className="absolute top-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono z-10 select-none">AXIAL</span>
                                               {renderViewportScrollbar('axial')}
                                           </div>
                                           <div 
                                               onMouseDown={() => setActiveViewportId('sagittal')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-sagittal" className="w-full h-full viewport-element" />
                                               <span className="absolute top-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono z-10 select-none">SAGITTAL</span>
                                               {renderViewportScrollbar('sagittal')}
                                           </div>
                                           <div 
                                               onMouseDown={() => setActiveViewportId('coronal')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-coronal" className="w-full h-full viewport-element" />
                                               <span className="absolute top-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono z-10 select-none">CORONAL</span>
                                               {renderViewportScrollbar('coronal')}
                                           </div>
                                           <div 
                                               onMouseDown={() => setActiveViewportId('3d')}
                                               className="w-full h-full relative bg-black rounded overflow-hidden"
                                           >
                                               <div id="synos-viewport-3d" className="w-full h-full viewport-element" />
                                               <span className="absolute top-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono z-10 select-none">3D VOLUME</span>
                                           </div>
                                       </div>
                                   )}
                                </div>
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

                {/* Right resizer divider */}
                {selectedStudy && (
                    <div 
                        onPointerDown={handleRightResizeStart}
                        className="w-[3px] hover:w-[6px] hover:bg-synos-primary bg-zinc-200 dark:bg-zinc-800/80 cursor-col-resize h-full select-none z-30 transition-all flex items-center justify-center shrink-0 group"
                        title="Drag to resize report dictation panel"
                    >
                        <div className="w-[1px] h-8 bg-zinc-400 dark:bg-zinc-650 rounded group-hover:bg-white" />
                    </div>
                )}

                {/* 3. Dictation Panel */}
                <div 
                    style={{ width: selectedStudy ? rightWidth : 0 }}
                    className={`h-full flex flex-col overflow-hidden dark:bg-synos-surface bg-white border-l dark:border-synos-border border-zinc-200 shrink-0 ${
                        !selectedStudy ? "w-0" : ""
                    }`}
                >
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
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* UNIFIED COLLABORATIVE PANEL WITH SWITCH TOGGLE */}
                                {isClaimExpired && selectedStudy?.studyStatus !== 'Signed' && (
                                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between gap-2 shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                            <span>Your claim lease has expired. Please reclaim the study to ensure your updates are saved.</span>
                                        </div>
                                        <button
                                            onClick={handleClaimStudy}
                                            disabled={actionLoading}
                                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded font-bold uppercase text-[9px] tracking-wider transition-all shrink-0 active:scale-[0.98]"
                                        >
                                            Reclaim Study
                                        </button>
                                    </div>
                                )}

                                {/* Header with Connection Ribbon & Segmented Switch Button */}
                                <div className="p-3 border-b dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex justify-between items-center shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-xs uppercase tracking-wider dark:text-zinc-200 text-zinc-800">Collaborative Transcription</h3>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                                connectionStatus === 'Connected' ? 'dark:bg-emerald-500/10 bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/20 border-emerald-200' :
                                                connectionStatus === 'Reconnecting' ? 'dark:bg-amber-500/10 bg-amber-50 text-amber-600 dark:text-amber-400 dark:border-amber-500/20 border-amber-200 animate-pulse' :
                                                'dark:bg-red-500/10 bg-red-50 text-red-600 dark:text-red-400 dark:border-red-500/20 border-red-200'
                                            }`}>
                                                {connectionStatus}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`h-1.5 w-1.5 rounded-full ${liveTypistConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                                            <span className="text-[9px] dark:text-zinc-400 text-zinc-550 font-semibold">
                                                {liveTypistConnected ? 'Typist joined session (Live Sync)' : 'Waiting for Typist...'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Segmented Switch Toggle Button */}
                                    <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800/80 p-0.5 rounded-lg border dark:border-white/10 border-zinc-300">
                                        <button
                                            onClick={() => setRightPanelTab('preview')}
                                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${
                                                rightPanelTab === 'preview'
                                                    ? 'bg-synos-primary text-white shadow-sm'
                                                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                            }`}
                                        >
                                            <FileText className="w-3 h-3" />
                                            Live Preview
                                        </button>
                                        <button
                                            onClick={() => setRightPanelTab('editor')}
                                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${
                                                rightPanelTab === 'editor'
                                                    ? 'bg-synos-primary text-white shadow-sm'
                                                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                            }`}
                                        >
                                            <Edit3 className="w-3 h-3" />
                                            Rich Editor
                                        </button>
                                    </div>
                                </div>

                                {selectedStudy.studyStatus === 'AwaitingSignature' && (
                                    <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 shrink-0">
                                        <Users className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
                                        Typist has requested digital signature review
                                    </div>
                                )}

                                {/* Panel Content: Live A4 Preview OR Rich Text Editor */}
                                {rightPanelTab === 'preview' ? (
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
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Rendering Live A4 Preview...</span>
                                            </div>
                                        ) : (memoizedReportData && template) ? (
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
                                                    Awaiting Live Draft Data...
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
                                        <div className="space-y-2 synos-card-elevated rounded-2xl p-4 bg-white dark:bg-zinc-950 flex-1 flex flex-col min-h-0">
                                            <label className="text-[10px] font-black uppercase dark:text-zinc-400 text-zinc-600 tracking-wider flex items-center gap-1.5 shrink-0">
                                                <FileText className="h-4 w-4 text-synos-primary animate-pulse" />
                                                Radiology Findings & Impression
                                            </label>
                                            <RichMedicalEditor
                                                value={draftFindings}
                                                onChange={(val) => handleFieldChange('findings', val)}
                                                disabled={actionLoading || !isClaimedByMe}
                                                patientContext={patientContext}
                                                onSaveDraft={handleSaveDraft}
                                                placeholder="Type radiology findings, observations, and diagnostic impressions as you dictate..."
                                                onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                                className="flex-1 h-full min-h-0 flex flex-col"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Footer Actions */}
                                <div className="p-3 border-t dark:border-synos-border border-zinc-200 dark:bg-synos-surface bg-white flex items-center justify-between gap-3 shrink-0">
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={actionLoading}
                                        className="px-3.5 py-1.5 dark:bg-zinc-800 bg-zinc-100 hover:dark:bg-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-200 text-zinc-750 rounded-lg font-bold border dark:border-zinc-700 border-zinc-200 text-xs uppercase transition-all shrink-0 active:scale-[0.98]"
                                    >
                                        Save Draft
                                    </button>
                                    <button
                                        onClick={handleSignReport}
                                        disabled={actionLoading || (!draftFindings && selectedStudy.studyStatus !== 'Signed')}
                                        className="flex-1 py-1.5 bg-synos-emerald hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all duration-260 ease-synos flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
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
            <CollaborationCallOverlay 
                hubConnection={hubConnection.current} 
                selectedStudy={selectedStudy} 
                onSelectStudy={(studyId) => handleSelectStudy({ radiologyStudyId: studyId })} 
                role="Radiologist"
            />

            {/* PACS Archive Modal Overlay for Radiologist */}
            {showPacsModal && (
                <div className="fixed inset-0 z-50 bg-zinc-950/98 flex flex-col">
                    <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-zinc-200">
                            <FolderArchive className="w-4 h-4 text-emerald-400" />
                            <span className="font-bold">Master PACS Archive Explorer</span>
                        </div>
                        <button
                            onClick={() => setShowPacsModal(false)}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <PacsArchiveScreen />
                    </div>
                </div>
            )}
        </div>
    );
}
