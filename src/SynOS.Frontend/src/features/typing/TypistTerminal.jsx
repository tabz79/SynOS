import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { ReportsApi } from '@/api/reports';
import { useTheme } from '@/context/ThemeContext';
import { PathologistWorklistCard } from '../pathology/components/PathologistWorklistCard';
import { 
    ClipboardList, 
    Search, 
    FileText, 
    Send,
    Loader2,
    User,
    Clock,
    Printer,
    ShieldCheck,
    ShieldAlert,
    Package
} from 'lucide-react';
import { ReportA4 } from '../documents/templates/ReportA4';
import { useTemplateForReport } from '../documents/templates/hooks/useReportTemplates';
import { StockRequestPanel } from '../inventory/StockRequestPanel';
import { RichMedicalEditor } from '@/components/editor/RichMedicalEditor';
import { MedicalMacrosWorkspace } from '@/components/editor/MedicalMacrosWorkspace';
import { RadiologyTypistTerminal } from '../radiology/RadiologyTypistTerminal';
import * as signalR from '@microsoft/signalr';
import { CollaborationCallOverlay } from '../radiology/CollaborationCallOverlay';

const evaluateFormula = (formula, values) => {
    if (!formula) return null;

    try {
        const tokens = formula.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
        let expression = formula;

        for (const token of [...new Set(tokens)].sort((a, b) => b.length - a.length)) {
            const rawValue = values[token];
            if (rawValue === undefined || rawValue === null || rawValue === '' || rawValue === '-') {
                return null;
            }

            const numericValue = Number(rawValue);
            if (!Number.isFinite(numericValue)) return null;

            expression = expression.replace(new RegExp(`\\b${token}\\b`, 'g'), String(numericValue));
        }

        if (!/^[0-9+\-*/().\s]+$/.test(expression)) return null;

        const result = Function(`"use strict"; return (${expression})`)();
        if (!Number.isFinite(result)) return '-';

        return Number(result).toFixed(2);
    } catch {
        return null;
    }
};

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

const applyCalculatedValues = (structure) => {
    if (!structure?.groups?.length) return structure;

    const valueMap = {};
    structure.groups.forEach(group => {
        group.parameters?.forEach(param => {
            if (param.parameterCode && param.value !== undefined && param.value !== null && param.value !== '') {
                valueMap[param.parameterCode] = param.value;
            }
        });
    });

    const groups = structure.groups.map(group => ({
        ...group,
        parameters: (group.parameters || []).map(param => ({ ...param }))
    }));

    const calculatedRows = groups.flatMap(group =>
        group.parameters.filter(param => param.isCalculated || param.hasFormula || !!param.formula)
    );

    for (let pass = 0; pass < Math.max(1, calculatedRows.length); pass++) {
        let changed = false;

        for (const param of calculatedRows) {
            if (!param.formula) continue;

            const nextValue = evaluateFormula(param.formula, valueMap);
            if (nextValue === null) continue;

            if (param.value !== nextValue) {
                param.value = nextValue;
                valueMap[param.parameterCode] = nextValue;
                changed = true;
            }
        }

        if (!changed) break;
    }

    return { ...structure, groups };
};


export function TypistTerminal() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // State
    const [activeTerminalMode, setActiveTerminalMode] = useState('pathology'); // 'pathology' or 'radiology'
    const [reports, setReports] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [resultsState, setResultsState] = useState({});
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [interpretation, setInterpretation] = useState({ interpretation: "", comments: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
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

    const calculatedReportStructure = useMemo(
        () => {
            if (!reportStructure) return null;
            const mergedStructure = {
                ...reportStructure,
                groups: reportStructure.groups?.map(group => ({
                    ...group,
                    parameters: group.parameters?.map(param => ({
                        ...param,
                        value: resultsState[param.parameterCode] !== undefined ? resultsState[param.parameterCode] : param.value
                    }))
                }))
            };
            return applyCalculatedValues(mergedStructure);
        },
        [reportStructure, resultsState]
    );

    const patientName = calculatedReportStructure?.patientName || calculatedReportStructure?.patient?.name;
    const patientAgeGender = calculatedReportStructure?.patientAgeGender || (calculatedReportStructure?.patient?.age ? `${calculatedReportStructure.patient.age} / ${calculatedReportStructure.patient.gender}` : '');
    const token = calculatedReportStructure?.token || calculatedReportStructure?.patient?.mrn || '---';

    const [selectedRadiologyStudy, setSelectedRadiologyStudy] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [livePathologistConnected, setLivePathologistConnected] = useState(false);
    const hubConnectionRef = useRef(null);
    const currentJoinedReportIdRef = useRef(null);

    // Connect SignalR on mount and maintain connection for both Pathology and Radiology modes
    useEffect(() => {
        let isUnmounted = false;
        let connection = null;

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
            setLivePathologistConnected(true);
        };

        const onUserLeft = (connectionId) => {
            setLivePathologistConnected(false);
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

        const connectSignalR = async () => {
            setConnectionStatus('Connecting');

            connection = new signalR.HubConnectionBuilder()
                .withUrl('/radiologyCollaborationHub', {
                    accessTokenFactory: () => localStorage.getItem('synos_jwt'),
                    skipNegotiation: true,
                    transport: signalR.HttpTransportType.WebSockets
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000])
                .build();

            hubConnectionRef.current = connection;

            connection.onreconnecting((error) => {
                if (isUnmounted) return;
                setConnectionStatus('Reconnecting');
                console.warn("SignalR connection lost, attempting reconnect...", error);
            });

            connection.onreconnected((connectionId) => {
                if (isUnmounted) return;
                setConnectionStatus('Connected');
                console.info("SignalR reconnected.", connectionId);
                connection.invoke('RegisterPresence', 'Typist').catch(err => console.error(err));
            });

            connection.onclose((error) => {
                if (isUnmounted) return;
                setConnectionStatus('Disconnected');
                console.error("SignalR connection closed.", error);
            });

            connection.on('ReceiveReportDraftUpdate', onReceiveReportDraftUpdate);
            connection.on('UserJoined', onUserJoined);
            connection.on('UserLeft', onUserLeft);
            connection.on('ReceiveReportDraftSaved', onReceiveReportDraftSaved);
            connection.on('ReceiveReportDraftResumed', onReceiveReportDraftResumed);
            connection.on('ReceiveReportSignRequest', onReceiveReportSignRequest);

            try {
                await connection.start();
                if (isUnmounted) {
                    connection.stop().catch(() => {});
                    return;
                }
                setConnectionStatus('Connected');
                await connection.invoke('RegisterPresence', 'Typist');
            } catch (e) {
                if (isUnmounted) return;
                setConnectionStatus('Disconnected');
                console.error("Failed to connect to SignalR hub:", e);
            }
        };

        const startPromise = connectSignalR();

        return () => {
            isUnmounted = true;
            if (connection) {
                connection.off('ReceiveReportDraftUpdate', onReceiveReportDraftUpdate);
                connection.off('UserJoined', onUserJoined);
                connection.off('UserLeft', onUserLeft);
                connection.off('ReceiveReportDraftSaved', onReceiveReportDraftSaved);
                connection.off('ReceiveReportDraftResumed', onReceiveReportDraftResumed);
                connection.off('ReceiveReportSignRequest', onReceiveReportSignRequest);
            }
            startPromise.finally(() => {
                if (connection && connection.state === signalR.HubConnectionState.Connected) {
                    connection.stop().catch(() => {});
                }
            });
        };
    }, []);

    // Call Context resolution based on active tab and selection
    const callOverlayStudyContext = useMemo(() => {
        if (activeTerminalMode === 'radiology') {
            return selectedRadiologyStudy;
        } else {
            if (selectedReportId) {
                return {
                    reportId: selectedReportId,
                    patientName: patientName || "Unknown Patient"
                };
            }
            return null;
        }
    }, [activeTerminalMode, selectedRadiologyStudy, selectedReportId, patientName]);

    const { template, loading: templateLoading } = useTemplateForReport(reportData);

    const requestCounter = useRef(0);

    useEffect(() => {
        const connection = hubConnectionRef?.current;
        if (!connection || connection.state !== 'Connected') return;

        if (selectedReportId && activeTerminalMode === 'pathology') {
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
    }, [selectedReportId, activeTerminalMode, connectionStatus]);

    const handleFieldChange = async (field, val) => {
        let update = {};
        if (field === 'interpretation') {
            setInterpretation(prev => ({ ...prev, interpretation: val }));
            update = { interpretation: val, comments: interpretation.comments };
        } else if (field === 'comments') {
            setInterpretation(prev => ({ ...prev, comments: val }));
            update = { interpretation: interpretation.interpretation, comments: val };
        }

        const connection = hubConnectionRef?.current;
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
            
            const connection = hubConnectionRef?.current;
            if (connection && connection.state === 'Connected' && selectedReportId) {
                const update = { resultsState: next };
                connection.invoke('SendReportDraftUpdate', selectedReportId.toString(), JSON.stringify(update))
                    .catch(err => console.error("SignalR report broadcast failed:", err));
            }
            
            return next;
        });
    };

    // Initial Fetch
    useEffect(() => {
        fetchWorklist();
    }, [showHistory]);

    // Selection Fetch
    useEffect(() => {
        if (selectedReportId) {
            fetchReportDetail(selectedReportId);
            setIsQueueCollapsed(true);
            setPreviewScale(0.6); // Reset zoom on report change
            setPanOffset({ x: 0, y: 0 }); // Reset pan position
        } else {
            setReportStructure(null);
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
            const statusStr = showHistory 
                ? 'Signed,ManualVerified,Finalized,Delivered' 
                : 'Draft,ReadyForVerification,Signed,ManualVerified,Delivered';
            const data = await ReportsApi.getReportsByStatus(statusStr, 'Pathology', showHistory);
            setReports(data);
        } catch (err) {
            console.error("Failed to fetch worklist:", err);
        } finally {
            setIsLoadingList(false);
        }
    };

    const fetchReportDetail = async (reportId) => {
        setIsLoadingDetail(true);
        try {
            // Fetch both structures in parallel for seamless mapping
            const [structureRes, dataRes] = await Promise.all([
                ReportsApi.getFullReport(reportId),
                ReportsApi.getReportData(reportId, true) // forceLive=true for Typist Preview
            ]);

            setReportStructure(structureRes.report);
            setReportData(dataRes);
            
            setInterpretation({
                interpretation: structureRes.interpretation?.summary || "",
                comments: structureRes.interpretation?.notes || ""
            });

            // Initialize results state for editing
            const initialResults = {};
            if (structureRes.report?.groups) {
                structureRes.report.groups.forEach(g => {
                    if (g.parameters) {
                        g.parameters.forEach(p => {
                            initialResults[p.parameterCode] = p.value;
                        });
                    }
                });
            }
            setResultsState(initialResults);

            setLastSavedAt(null);
        } catch (err) {
            console.error("Failed to fetch report detail:", err);
        } finally {
            setIsLoadingDetail(false);
        }
    };


    const handleSaveInterpretation = async () => {
        if (!selectedReportId || isSaving) return;
        
        setIsSaving(true);
        const currentRequestId = ++requestCounter.current;

        try {
            // 1. Save Results (Parameters) if editing is allowed
            if (reportStructure?.canEditValues && Object.keys(resultsState).length > 0) {
                const resultsPayload = Object.entries(resultsState).map(([code, val]) => ({
                    ParameterCode: code,
                    Value: val
                }));
                await ReportsApi.saveResults(reportStructure.sourceId, resultsPayload);
            }

            // 2. Save Interpretation to Backend
            await ReportsApi.updateInterpretation(
                selectedReportId, 
                interpretation.interpretation, 
                interpretation.comments
            );

            // 3. Hard Re-fetch (Rule 1: Backend is Truth, bypass snapshot in Draft)
            const freshData = await ReportsApi.getReportData(selectedReportId, true);

            // 4. Race Condition Guard (GPT-5 Safeguard)
            if (currentRequestId === requestCounter.current) {
                setReportData(freshData);
                // Also trigger re-fetch of full report structure to get updated values & flags in display
                const fullRes = await ReportsApi.getFullReport(selectedReportId);
                if (currentRequestId === requestCounter.current) {
                    setReportStructure(fullRes.report);
                }
                setLastSavedAt(new Date());
                // Auto-clear success message after 3s
                setTimeout(() => setLastSavedAt(null), 3000);
            }
        } catch (err) {
            console.error("Save failed:", err);
            alert("Clinical Sync Failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (isManual = false) => {
        if (!selectedReportId) return;
        
        const message = isManual 
            ? "Submit for PHYSICAL verification? You should have printed the report for manual signature. This will bypass the Pathologist digital queue."
            : "Submit for DIGITAL Pathologist verification? This will lock the report for editing.";

        if (!window.confirm(message)) return;

        setIsSubmitting(true);
        try {
            // 1. Save current work first
            await handleSaveInterpretation();
            // 2. Submit with intent
            await ReportsApi.submitReport(selectedReportId, isManual);
            // 3. Refresh
            const otherDrafts = siblingReports.filter(r => r.status === 'Draft' && r.reportId !== selectedReportId);
            await fetchWorklist();
            if (otherDrafts.length > 0) {
                alert(`Reminder: This patient has ${otherDrafts.length} other report(s) remaining (e.g. ${otherDrafts.map(d => d.testName).join(', ')}). Please ensure all are completed.`);
                setSelectedReportId(otherDrafts[0].reportId);
            } else {
                setSelectedReportId(null);
            }
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Failed to submit report: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        if (!selectedReportId) return;
        // GPT-5 Rule: Draft phase MUST use forceLive to prevent stale snapshot 'Legacy' leak
        window.open(`/print/report/${selectedReportId}?forceLive=true`, '_blank');
    };

    const isLocked = reportStructure?.status === 'ReadyForVerification' || reportStructure?.status === 'Signed' || reportStructure?.status === 'ManualVerified';

    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';
    const [activeTab, setActiveTab] = useState("available"); // available | assigned

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             r.testName.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        if (showHistory) {
            if (activeTab === "available") {
                return r.typedByUserId !== user?.id;
            } else {
                return r.typedByUserId === user?.id;
            }
        } else {
            if (activeTab === "available") {
                return !r.typedByUserId;
            } else {
                // ADMIN RULE: Admins see EVERYTHING in the assigned tab
                if (isAdmin) {
                    return !!r.typedByUserId;
                }
                // Standard User: See only what I am typing
                return r.typedByUserId === user?.id;
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
    const siblingReports = currentReportItem ? reports.filter(r => r.visitId === currentReportItem.visitId) : [];
    const currentReportIndex = currentReportItem ? siblingReports.findIndex(r => r.reportId === selectedReportId) : -1;
    const remainingReportsCount = siblingReports.filter(r => r.status === 'Draft').length;

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
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden no-print">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
            </div>

            <div className="no-print">
                <SystemBar serverTime={null} syncStatus="Synced" />
            </div>

            {!selectedReportId && (
                <div className="px-4 py-2 border-b dark:border-white/5 border-zinc-200 bg-zinc-900/10 flex items-center gap-2 select-none no-print">
                    <button
                        onClick={() => setActiveTerminalMode('pathology')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                            activeTerminalMode === 'pathology' 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850/40"
                        )}
                    >
                        Pathology Reports
                    </button>
                    <button
                        onClick={() => setActiveTerminalMode('radiology')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                            activeTerminalMode === 'radiology'
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850/40"
                        )}
                    >
                        Radiology Live Dictation
                    </button>
                </div>
            )}

            {activeTerminalMode === 'radiology' ? (
                <RadiologyTypistTerminal 
                    selectedStudy={selectedRadiologyStudy}
                    setSelectedStudy={setSelectedRadiologyStudy}
                    hubConnectionRef={hubConnectionRef}
                    connectionStatus={connectionStatus}
                />
            ) : (
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
                                        <ClipboardList className="w-5 h-5 text-synos-primary" />
                                        Typing Queue
                                    </h2>
                                    <span className="bg-synos-primary/10 text-synos-primary dark:text-synos-primary/80 text-xs font-bold px-2 py-0.5 rounded-full">
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
                                                    ? "bg-synos-primary text-white shadow-lg shadow-synos-primary/20" 
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
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-synos-primary/20 focus:border-synos-primary dark:text-zinc-200 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-24 custom-scrollbar">
                                {isLoadingList ? (
                                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <span className="text-sm font-medium text-zinc-500 font-mono tracking-tighter">Initializing Queue...</span>
                                    </div>
                                ) : filteredReports.length === 0 ? (
                                    <div className="text-center py-12 dark:bg-zinc-900/50 bg-white/50 rounded-xl border border-dashed dark:border-white/10 border-zinc-300">
                                        <p className="dark:text-zinc-500 text-zinc-400 text-sm italic font-mono tracking-tighter">Queue is empty</p>
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

                            {/* Floating Request Stock Button (Bottom Left of Queue) */}
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

                <div className="flex-1 flex flex-col min-h-0 no-print" style={{ gap: 'var(--ws-gap)' }}>
                    <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl flex-1 flex flex-col min-h-0" style={{ padding: 'var(--ws-padding)' }}>
                        {isLoadingDetail ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-synos-primary" />
                                <h3 className="text-lg font-bold dark:text-zinc-200 font-mono tracking-tighter uppercase">Assembling Clinical Data...</h3>
                                <p className="dark:text-zinc-500 text-zinc-500 text-sm">Mapping parameters from laboratory engine</p>
                            </div>
                        ) : !selectedReportId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <FileText className="w-20 h-20 mb-6 dark:text-zinc-700 text-zinc-300" />
                                <h3 className="text-2xl font-bold dark:text-zinc-500 text-zinc-400 font-mono tracking-widest uppercase">Select Report</h3>
                                <p className="dark:text-zinc-600 text-zinc-400 max-w-xs text-sm mt-2">
                                    Capture interpretations and submit to Pathologist for final verification.
                                </p>
                            </div>
                        ) : (activeTab === 'available' && !isAdmin) ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                                <ShieldAlert className="w-20 h-20 mb-6 text-synos-primary opacity-20" />
                                <h3 className="text-xl font-bold dark:text-zinc-200 uppercase tracking-widest">Unclaimed Record</h3>
                                <p className="dark:text-zinc-500 text-zinc-500 max-w-xs text-sm mt-2 mb-8">
                                    You must claim this patient to start the typing process. This avoids duplicate effort and ensures clear ownership.
                                </p>
                                <button 
                                    onClick={() => handleClaim(selectedReportId)}
                                    className="bg-synos-primary text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-synos-primary/20 active:scale-95 transition-all"
                                >
                                    Claim this Patient
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full min-h-0">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b dark:border-white/5 border-zinc-100 shrink-0 select-none">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setIsQueueCollapsed(prev => !prev)}
                                            className="p-1 hover:bg-zinc-500/10 rounded-lg text-zinc-500 transition-all active:scale-95 shrink-0 font-bold border dark:border-white/5 border-zinc-200 text-xs flex items-center justify-center w-6 h-6"
                                            title={isQueueCollapsed ? "Show Patient Queue" : "Collapse Workspace"}
                                        >
                                            {isQueueCollapsed ? "→" : "←"}
                                        </button>
                                        <div className="w-7 h-7 dark:bg-zinc-800 bg-synos-primary/5 rounded-lg flex items-center justify-center text-synos-primary shrink-0">
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
                                        {livePathologistConnected && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                                Live Pathologist
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                                            <span className="text-[9px] uppercase font-bold dark:text-zinc-500 text-zinc-400 tracking-wider">Stage:</span>
                                            <div className={cn(
                                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                                calculatedReportStructure?.status === 'ReadyForVerification' 
                                                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                                    : "bg-synos-primary/10 text-synos-primary border border-synos-primary/20"
                                            )}>
                                                {calculatedReportStructure?.status === 'ReadyForVerification' ? 'SUBMITTED' : (calculatedReportStructure?.status?.replace(/([A-Z])/g, ' $1').trim() || 'Draft')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                                {calculatedReportStructure?.groups?.map((group, gIdx) => (
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
                                                                    "group transition-all duration-300",
                                                                    isAbnormal ? "dark:bg-amber-50/5 bg-amber-50" : "hover:dark:bg-white/[0.02] hover:bg-zinc-50"
                                                                )}>
                                                                    <td className="px-3 py-1.5 text-[13px] font-medium dark:text-zinc-300 text-zinc-700 first:rounded-l-xl border-y border-transparent">
                                                                        {param.parameterName}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-[13px] font-mono font-semibold text-right dark:text-zinc-100 text-zinc-900 border-y border-transparent">
                                                                        {reportStructure?.canEditValues && !isLocked ? (
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

                                    {/* Bottom Half: Clinical Interpretation & Comments (Scrollable) */}
                                    <div className="flex-[1_1_65%] min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-4 pt-1 flex flex-col justify-between">
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <label className="text-[10px] uppercase font-semibold dark:text-zinc-500 text-zinc-400 block mb-1 tracking-wider">
                                                    Clinical Report Narrative
                                                </label>
                                                <RichMedicalEditor 
                                                    value={interpretation.interpretation}
                                                    onChange={(val) => handleFieldChange('interpretation', val)}
                                                    disabled={isLocked || isSaving}
                                                    patientContext={calculatedReportStructure}
                                                    onSaveDraft={handleSaveInterpretation}
                                                    onOpenMacroManager={() => setIsMacroManagerOpen(true)}
                                                    className="flex-1 min-h-0"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between" style={{ marginTop: 'var(--ws-footer-pt)' }}>
                                            {!isLocked ? (
                                                <div className="flex flex-col w-full" style={{ gap: 'var(--ws-gap)' }}>
                                                    {lastSavedAt && (
                                                        <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest animate-pulse flex items-center gap-1.5 self-end">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                            Preview Updated via Backend
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 w-full" style={{ gap: 'var(--ws-gap)' }}>
                                                        <button 
                                                            onClick={handleSaveInterpretation}
                                                            disabled={isSaving}
                                                            className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 hover:dark:bg-zinc-700 hover:bg-zinc-200 font-bold text-[10px] px-2 rounded-xl transition-all active:scale-95 disabled:opacity-40 uppercase tracking-tight"
                                                            style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                        >
                                                            {isSaving ? "Saving..." : "Save Draft"}
                                                        </button>
                                                        <button 
                                                            onClick={() => window.print()}
                                                            disabled={!selectedReportId}
                                                            className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 hover:dark:bg-zinc-700 hover:bg-zinc-200 font-bold text-[10px] px-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tight"
                                                            style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                        >
                                                            <Printer className="w-3 h-3" />
                                                            Quick Print
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => handleSubmit(false)}
                                                            disabled={isSubmitting || isSaving || !interpretation.interpretation}
                                                            className="col-span-2 bg-synos-primary text-white hover:opacity-90 px-4 rounded-xl font-black text-[10px] shadow-xl shadow-synos-primary/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:shadow-none uppercase tracking-tight"
                                                            style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                        >
                                                            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                                            Submit for Digital Sign
                                                        </button>
 
                                                        <button 
                                                            onClick={() => {
                                                                window.print();
                                                                handleSubmit(true);
                                                            }}
                                                            disabled={isSubmitting || isSaving || !interpretation.interpretation}
                                                            className="col-span-2 border-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/5 px-4 rounded-xl font-black text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40 uppercase tracking-tight"
                                                            style={{ paddingTop: 'var(--ws-btn-py)', paddingBottom: 'var(--ws-btn-py)' }}
                                                        >
                                                            <Printer className="w-3 h-3" />
                                                            Print & Submit for Manual Sign
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center p-3 dark:bg-amber-500/10 bg-amber-50 rounded-2xl border border-amber-500/20 gap-3">
                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">
                                                        Pending Pathologist
                                                    </span>
                                                </div>
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
                        <div className="dark:bg-zinc-950 bg-[linear-gradient(to_bottom,rgba(248,253,255,0.98)_0%,rgba(238,245,248,0.98)_50%,rgba(228,235,238,0.98)_100%)] px-6 py-3 border-b dark:border-white/5 border-black/5 flex items-center justify-between z-10 no-print">
                             <div className="flex items-center gap-2 select-none">
                                <FileText className="w-4 h-4 text-synos-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest dark:text-zinc-400 text-zinc-600">Draft Preview</span>
                                <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 text-zinc-500 px-1.5 py-0.5 rounded ml-2">
                                    Ctrl+Scroll to Zoom ({Math.round(previewScale * 100)}%) • Drag to Pan
                                </span>
                             </div>
                             {reportData && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter text-green-600">Synced</span>
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
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Synchronizing Context...</span>
                                </div>
                            ) : (!reportData || !template) ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8 no-print">
                                    <Printer className="w-12 h-12 mb-4" />
                                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                                        Select a record to initialize high-fidelity render
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
            )}

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

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}} />

            <CollaborationCallOverlay 
                hubConnection={hubConnectionRef.current} 
                selectedStudy={callOverlayStudyContext} 
                onSelectStudy={async (studyId, peerRole) => {
                    if (peerRole === 'Radiologist') {
                        setActiveTerminalMode('radiology');
                        setSelectedRadiologyStudy({ radiologyStudyId: studyId });
                    } else if (peerRole === 'Pathologist') {
                        setActiveTerminalMode('pathology');
                        setSelectedReportId(studyId);
                    } else {
                        if (activeTerminalMode === 'radiology') {
                            setSelectedRadiologyStudy({ radiologyStudyId: studyId });
                        } else {
                            setSelectedReportId(studyId);
                        }
                    }
                }} 
                role="Typist"
                targetRole={activeTerminalMode === 'pathology' ? 'Pathologist' : 'Radiologist'}
            />
        </div>
    );
}
