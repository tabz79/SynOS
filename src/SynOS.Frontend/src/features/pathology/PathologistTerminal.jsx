import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { ReportsApi } from '@/api/reports';
import { UsersApi } from '@/api/users';
import { useTheme } from '@/context/ThemeContext';
import { PathologistWorklistCard } from './components/PathologistWorklistCard';
import { 
    ClipboardList, 
    Search, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    ChevronRight,
    Loader2,
    Calendar,
    User,
    Signature,
    Printer,
    Send,
    X,
    Upload,
    Check,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    Package
} from 'lucide-react';
import { ReportA4 } from '../documents/templates/ReportA4';
import { useTemplateForReport } from '../documents/templates/hooks/useReportTemplates';
import { StockRequestPanel } from '../inventory/StockRequestPanel';
import { RichMedicalEditor } from '@/components/editor/RichMedicalEditor';
import { MedicalMacrosWorkspace } from '@/components/editor/MedicalMacrosWorkspace';
import * as signalR from '@microsoft/signalr';
import { CollaborationCallOverlay } from '../radiology/CollaborationCallOverlay';

let sharedConnection = null;
let stopTimer = null;
let subscriberCount = 0;

const getFlagForValue = (value, referenceRange) => {
    if (value === undefined || value === null || value === "") return "Normal";
    const val = parseFloat(value);
    if (isNaN(val)) return "Normal";

    if (!referenceRange) return "Normal";
    const rangeStr = referenceRange.trim();

    try {
        if (rangeStr.includes('-')) {
            const parts = rangeStr.split('-');
            if (parts.length === 2) {
                const rLow = parseFloat(parts[0].trim());
                const rHigh = parseFloat(parts[1].trim());
                if (!isNaN(rLow) && !isNaN(rHigh)) {
                    if (val < rLow) return "Low";
                    if (val > rHigh) return "High";
                }
            }
        }
        else if (rangeStr.startsWith('<')) {
            const rHigh = parseFloat(rangeStr.substring(1).trim());
            if (!isNaN(rHigh) && val >= rHigh) {
                return "High";
            }
        }
        else if (rangeStr.startsWith('>')) {
            const rLow = parseFloat(rangeStr.substring(1).trim());
            if (!isNaN(rLow) && val <= rLow) {
                return "Low";
            }
        }
    } catch (e) {
        console.error("Failed to parse range string:", referenceRange, e);
    }
    return "Normal";
};

export function PathologistTerminal() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // State
    const [reports, setReports] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [interpretation, setInterpretation] = useState({ interpretation: "", comments: "" });
    const [reportData, setReportData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [resultsState, setResultsState] = useState({}); // { paramCode: value }
    const [userProfile, setUserProfile] = useState(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [tempProfile, setTempProfile] = useState({ name: "", designation: "" });
    const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);
    const [isMacroManagerOpen, setIsMacroManagerOpen] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.6);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const previewContainerRef = useRef(null);
    const [rightPanelWidth, setRightPanelWidth] = useState(550);
    const isResizingRight = useRef(false);
    const mainContainerRef = useRef(null);

    const { template, loading: templateLoading } = useTemplateForReport(reportData);

    const requestCounter = useRef(0);

    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [liveTypistConnected, setLiveTypistConnected] = useState(false);
    const [isHubReady, setIsHubReady] = useState(false);
    const hubConnection = useRef(null);
    const currentJoinedReportIdRef = useRef(null);
    const isUnmountedRef = useRef(false);

    // Call Context resolution
    const callOverlayStudyContext = useMemo(() => {
        if (selectedReportId) {
            const r = reports.find(x => x.reportId === selectedReportId);
            return {
                reportId: selectedReportId,
                patientName: reportStructure?.patientName || r?.patientName || "Unknown Patient"
            };
        }
        return null;
    }, [selectedReportId, reportStructure, reports]);

    // Connect SignalR on mount
    useEffect(() => {
        isUnmountedRef.current = false;
        subscriberCount++;

        const onReceiveReportDraftUpdate = (draftContent) => {
            try {
                const parsed = JSON.parse(draftContent);
                if (parsed.interpretation !== undefined || parsed.comments !== undefined) {
                    setInterpretation(prev => {
                        const next = { ...prev };
                        if (parsed.interpretation !== undefined) next.interpretation = parsed.interpretation;
                        if (parsed.comments !== undefined) next.comments = parsed.comments;
                        return next;
                    });
                }
                if (parsed.resultsState !== undefined) {
                    setResultsState(prev => ({
                        ...prev,
                        ...parsed.resultsState
                    }));
                }
            } catch (e) {
                console.error("Failed to parse live report draft packet:", e);
            }
        };

        const onUserJoined = (connectionId) => {
            setLiveTypistConnected(true);
        };

        const onUserLeft = (connectionId) => {
            setLiveTypistConnected(false);
        };

        const onReceiveReportDraftSaved = () => {
            const currentReportId = currentJoinedReportIdRef.current;
            if (currentReportId) {
                fetchReportDetail(currentReportId);
            }
        };

        const onReceiveReportDraftResumed = () => {
            const currentReportId = currentJoinedReportIdRef.current;
            if (currentReportId) {
                fetchReportDetail(currentReportId);
            }
        };

        const onReceiveReportSignRequest = () => {
            const currentReportId = currentJoinedReportIdRef.current;
            if (currentReportId) {
                fetchReportDetail(currentReportId);
            }
        };

        const registerHandlers = (conn) => {
            conn.on('ReceiveReportDraftUpdate', onReceiveReportDraftUpdate);
            conn.on('UserJoined', onUserJoined);
            conn.on('UserLeft', onUserLeft);
            conn.on('ReceiveReportDraftSaved', onReceiveReportDraftSaved);
            conn.on('ReceiveReportDraftResumed', onReceiveReportDraftResumed);
            conn.on('ReceiveReportSignRequest', onReceiveReportSignRequest);
        };

        const unregisterHandlers = (conn) => {
            conn.off('ReceiveReportDraftUpdate', onReceiveReportDraftUpdate);
            conn.off('UserJoined', onUserJoined);
            conn.off('UserLeft', onUserLeft);
            conn.off('ReceiveReportDraftSaved', onReceiveReportDraftSaved);
            conn.off('ReceiveReportDraftResumed', onReceiveReportDraftResumed);
            conn.off('ReceiveReportSignRequest', onReceiveReportSignRequest);
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


    useEffect(() => {
        const connection = hubConnection.current;
        if (!connection || connection.state !== 'Connected' || !isHubReady) return;

        if (selectedReportId) {
            const reportIdStr = selectedReportId.toString();
            if (currentJoinedReportIdRef.current && currentJoinedReportIdRef.current !== reportIdStr) {
                connection.invoke('LeaveReportSession', currentJoinedReportIdRef.current).catch(err => console.error(err));
            }
            currentJoinedReportIdRef.current = reportIdStr;
            connection.invoke('JoinReportSession', reportIdStr).catch(err => console.error(err));
        } else {
            if (currentJoinedReportIdRef.current) {
                connection.invoke('LeaveReportSession', currentJoinedReportIdRef.current).catch(err => console.error(err));
                currentJoinedReportIdRef.current = null;
            }
        }
    }, [selectedReportId, connectionStatus, isHubReady]);

    const handleFieldChange = async (field, val) => {
        let update = {};
        if (field === 'interpretation') {
            setInterpretation(prev => ({ ...prev, interpretation: val }));
            update = { interpretation: val, comments: interpretation.comments };
        } else if (field === 'comments') {
            setInterpretation(prev => ({ ...prev, comments: val }));
            update = { interpretation: interpretation.interpretation, comments: val };
        }

        const connection = hubConnection.current;
        if (connection && connection.state === 'Connected' && selectedReportId) {
            try {
                await connection.invoke('SendReportDraftUpdate', selectedReportId.toString(), JSON.stringify(update));
            } catch (err) {
                console.error("SignalR report broadcast failed:", err);
            }
        }
    };

    const handleResultsChange = async (paramCode, val) => {
        setResultsState(prev => {
            const next = { ...prev, [paramCode]: val };
            
            const connection = hubConnection.current;
            if (connection && connection.state === 'Connected' && selectedReportId) {
                const update = { resultsState: next };
                connection.invoke('SendReportDraftUpdate', selectedReportId.toString(), JSON.stringify(update))
                    .catch(err => console.error("SignalR report broadcast failed:", err));
            }
            
            return next;
        });
    };

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
            .withAutomaticReconnect([0, 2000, 5000, 10000])
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
            connection.invoke('RegisterPresence', 'Pathologist').catch(err => console.error(err));
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
                    connection.stop().catch(() => {});
                    if (sharedConnection === connection) sharedConnection = null;
                    hubConnection.current = null;
                    return;
                }
                setConnectionStatus('Connected');
                setIsHubReady(true);
                await connection.invoke('RegisterPresence', 'Pathologist');
            })
            .catch(e => {
                if (hubConnection.current !== connection) return;
                if (isUnmountedRef.current) {
                    if (sharedConnection === connection) sharedConnection = null;
                    hubConnection.current = null;
                    return;
                }
                setConnectionStatus('Disconnected');
                setIsHubReady(false);
                console.error("Failed to connect to SignalR hub:", e);
            });
    };

    // Initial Fetch
    useEffect(() => {
        fetchWorklist();
    }, [showHistory]);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const profile = await UsersApi.getProfile();
            setUserProfile(profile);
            setTempProfile({ name: profile.name, designation: profile.designation || "" });
        } catch (err) {
            handleApiError(err, "Failed to fetch profile");
        }
    };

    const handleApiError = (err, context) => {
        console.error(`${context}:`, err);
        // Catch both Axios (err.response) and Fetch (err.message) 401s
        if (err.response?.status === 401 || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
            setIsSessionExpired(true);
        }
    };

    // Selection Fetch
    useEffect(() => {
        if (selectedReportId) {
            fetchReportDetail(selectedReportId);
            setIsQueueCollapsed(true);
            setPreviewScale(0.6); // Reset zoom on report change
            setPanOffset({ x: 0, y: 0 }); // Reset pan position
        } else {
            setReportStructure(null);
            setReportData(null);
            setInterpretation({ interpretation: "", comments: "" });
            setLastSavedAt(null);
            setIsQueueCollapsed(false);
        }
    }, [selectedReportId]);

    // Ctrl+Scroll listener for Report Preview Zoom
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

    const handleRightResizeStart = (e) => {
        e.preventDefault();
        isResizingRight.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!mainContainerRef.current || !isResizingRight.current) return;
            const containerRect = mainContainerRef.current.getBoundingClientRect();
            const newWidth = Math.max(320, Math.min(850, containerRect.right - e.clientX));
            setRightPanelWidth(newWidth);
        };

        const handlePointerUp = () => {
            if (isResizingRight.current) {
                isResizingRight.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
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
        setIsLoadingList(true);
        try {
            const statusStr = showHistory ? 'Signed,ManualVerified,Finalized' : 'Draft,ReadyForVerification,Signed,ManualVerified';
            const data = await ReportsApi.getReportsByStatus(statusStr, 'Pathology', showHistory);
            setReports(data);
        } catch (err) {
            handleApiError(err, "Failed to fetch worklist");
        } finally {
            setIsLoadingList(false);
        }
    };

    const fetchReportDetail = async (reportId) => {
        setIsLoadingDetail(true);
        try {
            const [fullRes, dataRes] = await Promise.all([
                ReportsApi.getFullReport(reportId),
                ReportsApi.getReportData(reportId, true) // Force live for verification phase
            ]);

            setReportStructure(fullRes.report);
            setReportData(dataRes);
            setInterpretation({
                interpretation: fullRes.interpretation?.summary || "",
                comments: fullRes.interpretation?.notes || ""
            });
            
            // Initialize results state for editing
            const initialResults = {};
            fullRes.report.groups.forEach(g => {
                g.parameters.forEach(p => {
                    initialResults[p.parameterCode] = p.value;
                });
            });
            setResultsState(initialResults);
            
            setLastSavedAt(null);
        } catch (err) {
            handleApiError(err, "Failed to fetch report detail");
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleSaveInterpretation = async () => {
        if (!selectedReportId || isSaving) return;
        
        setIsSaving(true);
        const currentRequestId = ++requestCounter.current;

        try {
            // 1. Save Interpretation
            await ReportsApi.updateInterpretation(
                selectedReportId, 
                interpretation.interpretation, 
                interpretation.comments
            );

            // 2. Save Numerical Results (Pathologist Privileged)
            if (reportStructure?.canEditValues && Object.keys(resultsState).length > 0) {
                const resultsPayload = Object.entries(resultsState).map(([code, val]) => ({
                    ParameterCode: code,
                    Value: val
                }));
                await ReportsApi.saveResults(reportStructure.sourceId, resultsPayload);
            }

            // 3. Hard Re-fetch (Force Live to bypass snapshot during verification)
            // We fetch both the full structure (to refresh flags) and the PDF data
            const [fullRes, freshData] = await Promise.all([
                ReportsApi.getFullReport(selectedReportId),
                ReportsApi.getReportData(selectedReportId, true)
            ]);

            // 3. Guard
            if (currentRequestId === requestCounter.current) {
                setReportStructure(fullRes.report);
                setReportData(freshData);
                setLastSavedAt(new Date());
                setTimeout(() => setLastSavedAt(null), 3000);
            }
        } catch (err) {
            console.error("Save failed:", err);
            alert("Verification Context Sync Failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReopen = async () => {
        if (!selectedReportId) return;
        if (!window.confirm("Reject this draft back to the Typist?")) return;

        try {
            await ReportsApi.reopenReport(selectedReportId);
            await fetchWorklist();
            setSelectedReportId(null);
        } catch (err) {
            alert("Failed to reopen: " + err.message);
        }
    };

    const handleSign = async () => {
        if (!selectedReportId || isSigning) return;

        // Proactive Guard: Check if signature exists
        const bypassIdentityCheck = isAdmin && hasDefaultPathologistSign;
        if (!userProfile?.signatureImageUrl && !bypassIdentityCheck) {
            setShowSignatureModal(true);
            return;
        }

        if (!window.confirm("Are you sure you want to sign this report? This action is irreversible.")) return;

        setIsSigning(true);
        const reportId = selectedReportId; // Lock ID before async

        try {
            await ReportsApi.signReport(reportId);
            const otherPending = siblingReports.filter(r => r.status !== 'Signed' && r.status !== 'ManualVerified' && r.reportId !== reportId);
            await fetchWorklist();
            if (otherPending.length > 0) {
                alert(`Reminder: This patient has ${otherPending.length} other report(s) remaining (e.g. ${otherPending.map(d => d.testName).join(', ')}). Please ensure all are completed.`);
                setSelectedReportId(otherPending[0].reportId);
            } else {
                await fetchReportDetail(reportId);
            }
        } catch (err) {
            console.error("Signing failed:", err);
            alert("Digital Signature Protocol Failed: " + (err.response?.data?.message || err.message));
        } finally {
            setIsSigning(false);
        }
    };

    const handleSignatureUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // First update name/designation if they were changed
            await UsersApi.updateProfile({
                name: tempProfile.name,
                designation: tempProfile.designation
            });
            
            // Then upload signature
            await UsersApi.uploadSignature(user.id, file);
            await fetchProfile(); // Authoritative server-side sync
            setShowSignatureModal(false);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Identity Setup Failed: " + (err.response?.data?.message || err.response?.data || err.message));
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfileOnly = async () => {
        setIsUploading(true);
        try {
            await UsersApi.updateProfile({
                name: tempProfile.name,
                designation: tempProfile.designation
            });
            await fetchProfile();
            if (isIdentityComplete) setShowSignatureModal(false);
        } catch (err) {
            handleApiError(err, "Failed to update profile");
        } finally {
            setIsUploading(false);
        }
    };

    const handlePrint = () => {
        if (!selectedReportId) return;
        // GPT-5 Rule: Review phase MUST use forceLive to prevent stale snapshot 'Legacy' leak
        window.open(`/print/report/${selectedReportId}?forceLive=true`, '_blank');
    };

    const isReadOnly = reportStructure?.status === 'Signed' || reportStructure?.status === 'ManualVerified' || reportStructure?.status === 'Finalized';

    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';

    const hasDefaultPathologistSign = useMemo(() => {
        return reportData?.signatures?.some(s => 
            s.role === "Chief Pathologist / Director" || 
            s.hash === "BASELINE_IDENTITY" || 
            s.signatureImageBase64
        ) || false;
    }, [reportData]);

    // GPT-5: Data-driven investigative identity guard
    const isValid = (v) => v && v.trim().length > 0;
    const missingIdentityFields = [];
    
    const bypassIdentityCheck = isAdmin && hasDefaultPathologistSign;
    if (!bypassIdentityCheck) {
        if (!isValid(userProfile?.name)) missingIdentityFields.push("Full Name");
        if (!isValid(userProfile?.designation)) missingIdentityFields.push("Professional Designation");
        if (!userProfile?.signatureImageUrl) missingIdentityFields.push("Digital Signature Image");
    }

    const isIdentityComplete = missingIdentityFields.length === 0;
    const [activeTab, setActiveTab] = useState("available"); // available | assigned

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             r.testName.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        if (showHistory) {
            if (activeTab === "available") {
                return r.verifiedByUserId !== user?.id;
            } else {
                return r.verifiedByUserId === user?.id;
            }
        } else {
            if (activeTab === "available") {
                return !r.verifiedByUserId;
            } else {
                // ADMIN RULE: Admins see EVERYTHING in the assigned tab
                if (isAdmin) {
                    return !!r.verifiedByUserId;
                }
                // Standard User: See only what I am verifying
                return r.verifiedByUserId === user?.id;
            }
        }
    });

    const handleClaim = async (reportId) => {
        try {
            await ReportsApi.claimReport(reportId);
            await fetchWorklist();
            setSelectedReportId(reportId);
        } catch (err) {
            alert("Failed to claim report: " + err.message);
        }
    };

    const currentReportItem = reports.find(r => r.reportId === selectedReportId);
    const siblingReports = currentReportItem ? reports.filter(r => r.token === currentReportItem.token) : [];
    const currentReportIndex = currentReportItem ? siblingReports.findIndex(r => r.reportId === selectedReportId) : -1;
    const remainingReportsCount = siblingReports.filter(r => r.status !== 'Signed' && r.status !== 'ManualVerified').length;

    const patientName = reportStructure?.patientName || reportStructure?.patient?.name;
    const patientAgeGender = reportStructure?.patientAgeGender || (reportStructure?.patient?.age ? `${reportStructure.patient.age} / ${reportStructure.patient.gender}` : '');
    const token = reportStructure?.token || reportStructure?.patient?.mrn || '---';

    const memoizedReportPreview = useMemo(() => {
        if (!reportData || !template) return null;
        const mergedReportData = {
            ...reportData,
            results: reportData.results?.map(group => ({
                ...group,
                parameters: group.parameters?.map(param => {
                    const typedVal = resultsState[param.code];
                    const val = typedVal !== undefined ? typedVal : param.value;
                    const flag = getFlagForValue(val, param.referenceRangeText || param.referenceRange);
                    return {
                        ...param,
                        value: val,
                        displayValue: val,
                        flag: flag,
                        isAbnormal: flag !== "Normal" && flag !== ""
                    };
                })
            })),
            interpretation: interpretation.interpretation,
            comments: interpretation.comments
        };
        return <ReportA4 reportData={mergedReportData} template={template} />;
    }, [reportData, template, interpretation, resultsState]);

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30 relative">
            {/* Atmospheric Background Layers (Common SynOS Canon) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
                <div className="absolute top-[5%] left-[35%] w-[25%] h-[25%]" style={{ background: 'radial-gradient(circle at center, rgba(39, 39, 42, 0.04) 0%, rgba(39, 39, 42, 0) 75%)' }} />
                <div className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]" style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.06) 0%, rgba(52, 211, 153, 0.01) 40%, rgba(52, 211, 153, 0) 80%)' }} />
                <div className="absolute top-[10%] left-[15%] w-[30%] h-[30%]" style={{ background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.03) 0%, rgba(251, 191, 36, 0) 70%)' }} />
            </div>

            <SystemBar serverTime={null} syncStatus={connectionStatus === 'Connected' ? 'Synced' : 'Not Synced'} />

            <div className="flex-1 flex flex-row overflow-hidden relative" style={{ padding: 'var(--ws-padding)', gap: 'var(--ws-gap)' }}>
                {/* Main Content Container for Scaling Effect */}
                <div 
                    ref={mainContainerRef}
                    className={cn(
                        "flex-1 flex flex-row transition-all duration-500 ease-out h-full",
                        isInventoryModalOpen ? "opacity-40 pointer-events-none scale-[0.99]" : "opacity-100"
                    )} 
                    style={{ gap: 'var(--ws-gap)' }}
                >
                
                {/* LEFT PANEL: Worklist (15%) */}
                <div className={cn(
                    "flex flex-col min-h-0 no-print relative transition-all duration-300 ease-in-out",
                    (isQueueCollapsed && !isMacroManagerOpen) ? "w-0 overflow-hidden opacity-0 pointer-events-none" : "w-[15%] opacity-100"
                )} style={{ gap: 'var(--ws-gap)' }}>
                    {isMacroManagerOpen ? (
                        <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-4 flex flex-col h-full min-h-0">
                            <MedicalMacrosWorkspace onClose={() => setIsMacroManagerOpen(false)} />
                        </div>
                    ) : (
                        <>
                            <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-4 flex flex-col gap-3 shrink-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold flex items-center gap-2 dark:text-zinc-200">
                                        <ClipboardList className="w-5 h-5 text-indigo-500" />
                                        Worklist
                                    </h2>
                                    <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {filteredReports.length}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 dark:bg-zinc-950/50 bg-zinc-50 rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm w-fit self-start">
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className={cn(
                                            "text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                            !showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                        )}
                                    >
                                        Live
                                    </button>
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className={cn(
                                            "text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                            showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                        )}
                                    >
                                        History (7d)
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 dark:bg-zinc-950 bg-zinc-50 p-1 rounded-xl border dark:border-white/5 border-zinc-200">
                                    {['available', 'assigned'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "flex-1 text-[10px] uppercase font-black tracking-widest py-1.5 rounded-lg transition-all",
                                                activeTab === tab 
                                                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                                                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                            )}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                                    <input 
                                        type="text"
                                        placeholder="Search reports..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-200 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-24 custom-scrollbar">
                                {isLoadingList ? (
                                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <span className="text-sm font-medium">Loading reports...</span>
                                    </div>
                                ) : filteredReports.length === 0 ? (
                                    <div className="text-center py-12 dark:bg-zinc-900/50 bg-white/50 rounded-xl border border-dashed dark:border-white/10 border-zinc-300">
                                        <p className="dark:text-zinc-500 text-zinc-400 text-sm italic">No reports to sign</p>
                                    </div>
                                ) : filteredReports.map(report => (
                                    <PathologistWorklistCard
                                        key={report.reportId}
                                        report={report}
                                        isSelected={selectedReportId === report.reportId}
                                        onClick={() => setSelectedReportId(report.reportId)}
                                    />
                                ))}
                            </div>

                            {/* Floating Request Stock Button (Bottom Left of Worklist) */}
                            <div className="absolute bottom-6 left-6 z-20">
                                <button
                                    onClick={() => setIsInventoryModalOpen(true)}
                                    className={cn(
                                        "group p-3 rounded-2xl shadow-2xl transition-all duration-300 flex items-center gap-2 border hover:scale-105 active:scale-95",
                                        theme === 'dark' 
                                            ? "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white" 
                                            : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900"
                                    )}
                                    title="Request Stock"
                                >
                                    <Package className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-500">
                                        Request Stock
                                    </span>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* CENTER PANEL: Report Editor */}
                <div className="flex-1 flex flex-col min-h-0" style={{ gap: 'var(--ws-gap)' }}>
                    <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl flex-1 flex flex-col min-h-0" style={{ padding: 'var(--ws-padding)' }}>
                        {isLoadingDetail ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                                <h3 className="text-lg font-bold dark:text-zinc-200">Fetching report structure...</h3>
                                <p className="dark:text-zinc-500 text-zinc-500">Assembling parameters and calculations</p>
                            </div>
                        ) : !selectedReportId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <FileText className="w-20 h-20 mb-6 dark:text-zinc-700 text-zinc-300" />
                                <h3 className="text-2xl font-bold dark:text-zinc-500 text-zinc-400">Select a Report</h3>
                                <p className="dark:text-zinc-600 text-zinc-400 max-w-xs">
                                    Choose a record from the worklist to start interpretation and signing.
                                </p>
                            </div>
                        ) : (activeTab === 'available' && !isAdmin) ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                                <ShieldAlert className="w-20 h-20 mb-6 text-indigo-500 opacity-20" />
                                <h3 className="text-xl font-bold dark:text-zinc-200 uppercase tracking-widest">Unclaimed for Verification</h3>
                                <p className="dark:text-zinc-500 text-zinc-500 max-w-xs text-sm mt-2 mb-8">
                                    This report is ready for final verification. Please claim it to begin the clinical signing process.
                                </p>
                                <button 
                                    onClick={() => handleClaim(selectedReportId)}
                                    className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                                >
                                    Claim for Verification
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full min-h-0">
                                {(!isIdentityComplete) && (
                                    <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shrink-0">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-red-600 uppercase tracking-tight">Identity Guard Blocked</h4>
                                                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                                                    Missing: {missingIdentityFields.join(" • ")}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowSignatureModal(true)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                        >
                                            Complete Profile
                                        </button>
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex items-center justify-between mb-2 pb-2 border-b dark:border-white/5 border-zinc-100 shrink-0 select-none">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setIsQueueCollapsed(prev => !prev)}
                                            className="p-1 hover:bg-zinc-500/10 rounded-lg text-zinc-500 transition-all active:scale-95 shrink-0 font-bold border dark:border-white/5 border-zinc-200 text-xs flex items-center justify-center w-6 h-6"
                                            title={isQueueCollapsed ? "Show Patient Queue" : "Collapse Workspace"}
                                        >
                                            {isQueueCollapsed ? "→" : "←"}
                                        </button>
                                        <div className="w-7 h-7 dark:bg-zinc-800 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-sm font-bold tracking-tight dark:text-zinc-200 text-zinc-800 uppercase">{patientName}</h2>
                                            <span className="text-zinc-400 text-xs">•</span>
                                            <div className="flex items-center gap-1.5 dark:text-zinc-400 text-zinc-500 text-xs font-semibold">
                                                <span>{patientAgeGender}</span>
                                                <span className="text-zinc-400 font-normal">|</span>
                                                <span className="font-mono text-[11px] tracking-tight">{token}</span>
                                            </div>
                                            {siblingReports.length > 1 && (
                                                <>
                                                    <span className="text-zinc-400 text-xs">•</span>
                                                    <div className="flex items-center gap-2 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-lg text-[10px] font-bold">
                                                        <span>Report {currentReportIndex + 1} of {siblingReports.length}</span>
                                                        <span className="opacity-45">|</span>
                                                        <button 
                                                            onClick={() => setSelectedReportId(siblingReports[currentReportIndex - 1].reportId)} 
                                                            disabled={currentReportIndex === 0}
                                                            className="hover:underline disabled:opacity-30 disabled:no-underline font-bold"
                                                        >
                                                            ← Prev
                                                        </button>
                                                        <span className="opacity-40">|</span>
                                                        <button 
                                                            onClick={() => setSelectedReportId(siblingReports[currentReportIndex + 1].reportId)} 
                                                            disabled={currentReportIndex === siblingReports.length - 1}
                                                            className="hover:underline disabled:opacity-30 disabled:no-underline font-bold"
                                                        >
                                                            Next →
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                            {siblingReports.length > 1 && remainingReportsCount > 0 && (
                                                <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    {remainingReportsCount} {remainingReportsCount === 1 ? 'Report' : 'Reports'} Remaining
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {liveTypistConnected && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                                Live Typist
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                                            <span className="text-[9px] uppercase font-bold dark:text-zinc-500 text-zinc-400 tracking-wider">Status:</span>
                                            <div className={cn(
                                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                                reportStructure?.status === 'Signed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                reportStructure?.status === 'ManualVerified' ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                                                reportStructure?.status === 'ReadyForVerification' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {reportStructure?.status?.replace(/([A-Z])/g, ' $1').trim() || 'Draft'}
                                            </div>
                                            <span className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-750 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border dark:border-white/5 border-zinc-200">
                                                {reportStructure?.modality}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="flex-1 flex flex-col min-h-0 gap-4">
                                    {/* Top Half: Test Parameters (Scrollable) */}
                                    <div className="flex-[0_1_35%] max-h-[35%] min-h-[120px] overflow-y-auto pr-2 custom-scrollbar -mx-2 px-2">
                                        <table className="w-full border-separate border-spacing-y-1">
                                            <thead>
                                                <tr className="text-[10px] uppercase font-semibold tracking-widest dark:text-zinc-500 text-zinc-400">
                                                    <th className="text-left px-3 pb-1">Parameter</th>
                                                    <th className="text-right px-3 pb-1">Value</th>
                                                    <th className="text-left px-3 pb-1">Unit</th>
                                                    <th className="text-left px-3 pb-1">Reference Range</th>
                                                    <th className="text-left px-3 pb-1">Flag</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportStructure?.groups?.map((group, gIdx) => (
                                                    <React.Fragment key={gIdx}>
                                                        {group.groupName && (
                                                            <tr className="contents">
                                                                <td colSpan={5} className="pt-2 pb-1">
                                                                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                                        {group.groupName}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {group.parameters.map((param, pIdx) => {
                                                            const currentValue = resultsState[param.parameterCode] !== undefined ? resultsState[param.parameterCode] : (param.value || "");
                                                            const currentFlag = getFlagForValue(currentValue, param.referenceRange);
                                                            const isAbnormal = currentFlag !== "Normal" && currentFlag !== "";
                                                            return (
                                                                <tr key={pIdx} className={cn(
                                                                    "group transition-colors",
                                                                    isAbnormal ? "bg-amber-50 hover:bg-amber-100/70" : "hover:bg-slate-50"
                                                                )}>
                                                                    <td className="px-3 py-1.5 text-[13px] font-medium dark:text-zinc-300 text-zinc-700 first:rounded-l-xl border-y border-transparent">
                                                                        {param.parameterName}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-[13px] font-mono font-semibold text-right dark:text-zinc-100 text-zinc-900 border-y border-transparent">
                                                                        {reportStructure?.canEditValues && !isReadOnly ? (
                                                                            <input 
                                                                                type="text"
                                                                                value={currentValue}
                                                                                onChange={(e) => handleResultsChange(param.parameterCode, e.target.value)}
                                                                                className={cn(
                                                                                    "w-24 text-right bg-indigo-50/50 border-b border-indigo-200 focus:outline-none focus:border-indigo-500 px-1 font-mono font-semibold",
                                                                                    isAbnormal && "font-black text-red-600 border-red-300 focus:border-red-550"
                                                                                )}
                                                                            />
                                                                        ) : (
                                                                            <span className={cn(isAbnormal && "font-black text-red-600 underline decoration-red-200 underline-offset-4")}>
                                                                                {currentValue || "-"}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-xs font-medium text-slate-500 border-y border-transparent">
                                                                        {param.unit}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-xs font-medium text-slate-500 border-y border-transparent">
                                                                        {param.referenceRange}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 last:rounded-r-xl border-y border-transparent">
                                                                        {isAbnormal && (
                                                                            <span className={cn(
                                                                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                                                                currentFlag?.includes("Critical") 
                                                                                    ? "bg-red-100 text-red-700" 
                                                                                    : (currentFlag === "Low" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")
                                                                            )}>
                                                                                {currentFlag}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-zinc-200 dark:bg-white/5 shrink-0" />

                                    {/* Bottom Half: Editors & Actions (Scrollable) */}
                                    <div className="flex-[1_1_65%] min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-4 pt-1">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] uppercase font-semibold dark:text-zinc-500 text-zinc-400 block mb-1 tracking-wider">
                                                    Clinical Summary (Ready for Verification)
                                                </label>
                                                <RichMedicalEditor 
                                                    value={interpretation.interpretation}
                                                    onChange={(val) => handleFieldChange('interpretation', val)}
                                                    disabled={isReadOnly || isSaving}
                                                    patientContext={reportStructure}
                                                    onSaveDraft={handleSaveInterpretation}
                                                    placeholder="Verify core clinical findings..."
                                                    onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] uppercase font-semibold dark:text-zinc-500 text-zinc-400 block mb-1 tracking-wider">
                                                    Pathologist Remarks / Additional Insights
                                                </label>
                                                <RichMedicalEditor 
                                                    value={interpretation.comments}
                                                    onChange={(val) => handleFieldChange('comments', val)}
                                                    disabled={isReadOnly || isSaving}
                                                    patientContext={reportStructure}
                                                    onSaveDraft={handleSaveInterpretation}
                                                    placeholder="Append final pathologist notes..."
                                                    onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between" style={{ marginTop: 'var(--ws-footer-pt)' }}>
                                            <div className="flex items-center gap-2">
                                                {!isReadOnly ? (
                                                    <div className="flex flex-col gap-2">
                                                        {lastSavedAt && (
                                                            <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1.5 self-start">
                                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                                Live Preview Synced
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                onClick={handleSaveInterpretation}
                                                                disabled={isSaving}
                                                                className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-bold text-xs px-6 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                                                                style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                            >
                                                                {isSaving ? "Syncing..." : "Update Report"}
                                                            </button>
                                                            {reportStructure?.status === 'ReadyForVerification' && (
                                                                <button 
                                                                    onClick={handleReopen}
                                                                    className="text-red-500 hover:bg-red-50 font-bold text-xs px-6 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                                    style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                                >
                                                                    Reject to Typist
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 text-emerald-600 bg-emerald-500/10 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        {reportStructure?.status === 'ManualVerified' ? "Report Manually Verified (Audit Locked)" : "Digital Signature Active (Immutable Trace)"}
                                                    </div>
                                                )}
                                            </div>
                                            {reportStructure?.status === 'ReadyForVerification' && !isReadOnly && (
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={handlePrint}
                                                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-6 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
                                                        style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                        Print Review
                                                    </button>
                                                    <button 
                                                        onClick={handleSign}
                                                        disabled={isSigning || !selectedReportId || !isIdentityComplete}
                                                        className="bg-slate-900 text-white hover:bg-black px-8 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all active:scale-95 flex items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                                        style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                    >
                                                        {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Signature className="w-4 h-4" />}
                                                        Verify & Sign Digitally
                                                    </button>
                                                </div>
                                            )}
                                            {isReadOnly && (
                                                <button 
                                                    onClick={handlePrint}
                                                    className="bg-synos-primary text-white hover:opacity-90 px-8 rounded-2xl font-bold text-sm shadow-xl shadow-synos-primary/20 transition-all active:scale-95 flex items-center gap-2"
                                                    style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                >
                                                    <Printer className="w-4 h-4" />
                                                    Print Final Report
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resizer divider */}
                <div 
                    onPointerDown={handleRightResizeStart}
                    className="w-[3px] hover:w-[6px] hover:bg-synos-primary bg-zinc-200 dark:bg-zinc-800/80 cursor-col-resize h-full select-none z-30 transition-all flex items-center justify-center shrink-0 group rounded-lg no-print"
                    title="Drag to resize draft preview panel"
                >
                    <div className="w-[1px] h-8 bg-zinc-400 dark:bg-zinc-650 rounded group-hover:bg-white" />
                </div>

                {/* RIGHT PANEL: Pure Live Render */}
                <div 
                    style={{ width: rightPanelWidth }}
                    className="flex flex-col min-h-0 shrink-0 preview-right-panel"
                >
                    <div className="dark:bg-zinc-900 bg-zinc-200 shadow-inner rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden border dark:border-white/5 border-black/5">
                        <div className="dark:bg-zinc-950 bg-[linear-gradient(to_bottom,rgba(248,253,255,0.98)_0%,rgba(238,245,248,0.98)_50%,rgba(228,235,238,0.98)_100%)] px-6 py-3 border-b dark:border-white/5 border-black/5 flex items-center justify-between z-10 shrink-0 select-none no-print">
                             <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-synos-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest dark:text-zinc-400 text-zinc-600">
                                    {isReadOnly ? "Audit Evidence" : "Live Preview"}
                                </span>
                                <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 text-zinc-500 px-1.5 py-0.5 rounded ml-2">
                                    Ctrl+Scroll to Zoom ({Math.round(previewScale * 100)}%) • Drag to Pan
                                </span>
                             </div>
                             {reportData && (
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "w-1.2 h-1.2 rounded-full",
                                        isReadOnly ? "bg-amber-500" : "bg-green-500 animate-pulse"
                                    )} />
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-tighter",
                                        isReadOnly ? "text-amber-600" : "text-green-600"
                                    )}>
                                        {isReadOnly ? "LOCKED" : "SYNCED"}
                                    </span>
                                </div>
                             )}
                        </div>
                        
                        <div 
                            ref={previewContainerRef} 
                            className="flex-1 overflow-hidden bg-zinc-300/50 dark:bg-zinc-900/50 relative select-none print:overflow-visible print:bg-white print:p-0"
                            onMouseDown={handlePreviewMouseDown}
                            onMouseMove={handlePreviewMouseMove}
                            onMouseUp={handlePreviewMouseUp}
                            onMouseLeave={handlePreviewMouseUp}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                        >
                            {(isLoadingDetail || templateLoading) ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 no-print">
                                    <Loader2 className="w-6 h-6 animate-spin mb-4" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Assembling Preview...</span>
                                </div>
                            ) : (!reportData || !template) ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8 no-print">
                                    <Printer className="w-12 h-12 mb-4" />
                                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                                        Select record for high-fidelity render
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 flex justify-center items-start print:p-0 print:block w-full h-full absolute top-0 left-0">
                                    <div 
                                        className="preview-report-wrapper bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden print:shadow-none print:rounded-none origin-top min-w-[210mm] transition-transform duration-75 select-none"
                                        style={{ 
                                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${previewScale})`,
                                            pointerEvents: isDragging ? 'none' : 'auto'
                                        }}
                                    >
                                        {memoizedReportPreview}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {/* Inventory Drawer Overlay */}
            <div className={cn(
                "fixed top-12 right-0 bottom-0 z-[100] transition-transform duration-500 ease-out",
                isInventoryModalOpen ? "translate-x-0 w-[40%]" : "translate-x-full w-0"
            )}>
                <StockRequestPanel
                    isOpen={isInventoryModalOpen}
                    onClose={() => setIsInventoryModalOpen(false)}
                />
            </div>
            {/* Signature Onboarding Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border dark:border-white/5 border-zinc-200 animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-6 border-b dark:border-white/5 border-zinc-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                                    <Signature className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black dark:text-zinc-200 uppercase tracking-tight">Identity Setup</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Digital Signature Verification</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSignatureModal(false)}
                                className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-zinc-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Full Professional Name</label>
                                    <input 
                                        type="text"
                                        value={tempProfile.name}
                                        onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Dr. John Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Professional Designation</label>
                                    <input 
                                        type="text"
                                        value={tempProfile.designation}
                                        onChange={(e) => setTempProfile({...tempProfile, designation: e.target.value})}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Consultant Pathologist"
                                    />
                                </div>
                            </div>

                            <div className="relative pt-2">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/5 to-transparent"></div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-4 block pt-4 text-center">Digital Signature</label>
                                
                                <label className="block w-full cursor-pointer group">
                                    <div className={cn(
                                        "border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all min-h-[160px]",
                                        isUploading ? "border-indigo-500 bg-indigo-500/5" : "border-zinc-200 hover:border-indigo-500 hover:bg-indigo-50 dark:border-zinc-800 dark:hover:bg-indigo-500/5 group-hover:border-indigo-500"
                                    )}>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/png, image/jpeg"
                                        onChange={handleSignatureUpload}
                                        disabled={isUploading}
                                    />
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                                            <span className="text-sm font-black text-indigo-500 uppercase tracking-widest">Uploading Identity...</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-zinc-400 group-hover:text-indigo-500" />
                                            </div>
                                            <span className="text-sm font-black dark:text-zinc-300 text-zinc-600 uppercase tracking-widest mb-1">Click to Upload</span>
                                            <span className="text-[10px] text-zinc-400 font-medium">Clear PNG or JPG (Cursive Ink preferred)</span>
                                        </>
                                    )}
                                </div>
                            </label>
                            
                            {!userProfile?.signatureImageUrl && (
                                <p className="text-center text-[10px] text-amber-600 font-black uppercase tracking-tighter mt-4 animate-pulse">
                                    Please select a signature image to complete activation
                                </p>
                            )}

                            {userProfile?.signatureImageUrl && (
                                <button 
                                    onClick={handleSaveProfileOnly}
                                    disabled={isUploading}
                                    className="w-full mt-6 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
                                >
                                    Update Identity Details
                                </button>
                            )}
                            </div>

                            <div className="mt-8 space-y-3">
                                <div className="flex gap-3 items-start opacity-70">
                                    <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">Your signature will be baked into the final clinical reports as a legal evidence of verification.</p>
                                </div>
                                <div className="flex gap-3 items-start opacity-70">
                                    <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">This setup is required once to enable the digital signing protocol.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}} />
            {/* Session Expired Overlay */}
            {isSessionExpired && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className={cn(
                        "max-w-md w-full rounded-2xl p-8 border shadow-2xl flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-300",
                        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    )}>
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                                Session Expired
                            </h2>
                            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                                Your secure operational session has expired or was terminated due to a server restart. Please log in again to continue.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('synos_jwt');
                                window.location.href = '/login';
                            }}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                        >
                            Return to Login
                        </button>
                    </div>
                </div>
            )}
            <CollaborationCallOverlay 
                hubConnection={hubConnection.current} 
                selectedStudy={callOverlayStudyContext} 
                onSelectStudy={async (studyId) => setSelectedReportId(studyId)} 
                role="Pathologist"
                targetRole="Typist"
            />
        </div>
    );
}
