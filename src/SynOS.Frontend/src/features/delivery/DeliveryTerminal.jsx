import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { ReportsApi } from '@/api/reports';
import { useTheme } from '@/context/ThemeContext';
import { DeliveryWorklistCard } from './components/DeliveryWorklistCard';
import { 
    Search, 
    Truck,
    Loader2,
    Printer,
    MessageSquare,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Smartphone,
    FileText,
    Package
} from 'lucide-react';
import { ReportA4 } from '../documents/templates/ReportA4';
import { useTemplateForReport } from '../documents/templates/hooks/useReportTemplates';
import { StockRequestPanel } from '../inventory/StockRequestPanel';

export function DeliveryTerminal() {
    const { user } = useAuth();
    const { theme } = useTheme();

    // Auto-fit preview scale to prevent horizontal clipping when window is not maximized
    const previewContainerRef = useRef(null);
    const [previewScale, setPreviewScale] = useState(0.92);
    const [departmentTab, setDepartmentTab] = useState(() => {
        return localStorage.getItem('synos_delivery_department') || 'Pathology';
    });
    const [reports, setReports] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isDelivering, setIsDelivering] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
    const [deliveryPhone, setDeliveryPhone] = useState("");
    const [includeDicom, setIncludeDicom] = useState(true);
    const [gatewayStatus, setGatewayStatus] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const { template, loading: templateLoading } = useTemplateForReport(reportData);

    const fetchGatewayStatus = async () => {
        try {
            const res = await fetch('/api/v1/delivery/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGatewayStatus(data);
            }
        } catch (err) {
            console.error("Failed to fetch gateway status:", err);
        }
    };

    useEffect(() => {
        fetchGatewayStatus();
        const interval = setInterval(fetchGatewayStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchWorklist();
    }, [showHistory, departmentTab]);

    useEffect(() => {
        if (selectedReportId) {
            fetchReportDetail(selectedReportId);
        } else {
            setReportStructure(null);
            setReportData(null);
        }
    }, [selectedReportId]);

    const handleDepartmentChange = (newDept) => {
        setDepartmentTab(newDept);
        localStorage.setItem('synos_delivery_department', newDept);
        setSelectedReportId(null);
    };

    const fetchWorklist = async () => {
        setIsLoadingList(true);
        try {
            // Live: ReadyForVerification, Signed, ManualVerified, Delivered
            // History (7d): Signed, ManualVerified, Finalized, Delivered
            const statusStr = showHistory ? 'Signed,ManualVerified,Finalized,Delivered' : 'ReadyForVerification,Signed,ManualVerified,Delivered';
            const data = await ReportsApi.getReportsByStatus(statusStr, departmentTab, showHistory);
            setReports(data);
            
            // Auto-select first if none selected or if current selected is not in new list
            if (data.length > 0 && (!selectedReportId || !data.some(r => r.reportId === selectedReportId))) {
                setSelectedReportId(data[0].reportId);
            } else if (data.length === 0) {
                setSelectedReportId(null);
            }
        } catch (err) {
            console.error("Failed to fetch delivery worklist:", err);
            showToast("Failed to load worklist", "error");
        } finally {
            setIsLoadingList(false);
        }
    };

    const fetchReportDetail = async (reportId) => {
        setIsLoadingDetail(true);
        setReportStructure(null);
        setReportData(null);
        try {
            const context = await ReportsApi.getFullReportContext(reportId, false);
            setReportStructure(context.report);
            setReportData(context.reportData);
            setDeliveryPhone(context.report?.patient?.phone || context.reportData?.patient?.contactInfo || "");
        } catch (err) {
            console.error("Failed to fetch report detail:", err);
            setReportStructure(null);
            setReportData(null);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const autoAdvance = () => {
        const currentIndex = filteredReports.findIndex(r => r.reportId === selectedReportId);
        if (currentIndex !== -1 && currentIndex < filteredReports.length - 1) {
            setSelectedReportId(filteredReports[currentIndex + 1].reportId);
        } else {
            // Re-fetch list to clear finished items
            fetchWorklist();
        }
    };

    // Observer to auto-fit A4 preview scale to available container width
    useEffect(() => {
        if (!previewContainerRef.current) return;

        const updateScale = () => {
            if (!previewContainerRef.current) return;
            const width = previewContainerRef.current.clientWidth;
            if (width > 0) {
                const availableWidth = width - 16; // 8px padding on each side
                const fittedScale = availableWidth / 793.7;
                setPreviewScale(Math.min(0.95, Math.max(0.35, fittedScale)));
            }
        };

        updateScale();

        const observer = new ResizeObserver(() => {
            updateScale();
        });

        observer.observe(previewContainerRef.current);
        return () => observer.disconnect();
    }, [reportStructure, template]);

    const handleMarkVerified = async () => {
        if (!selectedReportId) return;
        setIsVerifying(true);
        try {
            // GPT-5: Record the desk operator's ID as the verifier for the manual flow audit trail
            await ReportsApi.verifyManual(selectedReportId, user?.id || "00000000-0000-0000-0000-000000000000");
            showToast("Physical verification registered successfully!", "success");
        } catch (err) {
            // If it's already verified or has another non-critical issue, we still want to refresh the UI
            console.warn("Verification API note:", err.message);
            showToast("Physical verification note: " + err.message, "info");
        } finally {
            // ALWAYS refresh state to ensure UI is in sync with DB truth
            await fetchReportDetail(selectedReportId);
            await fetchWorklist();
            setIsVerifying(false);
        }
    };

    const [isPreprinted, setIsPreprinted] = useState(() => localStorage.getItem('synos_preprinted_mode') === 'true');

    const handlePrint = async () => {
        if (!selectedReportId) return;
        try {
            await ReportsApi.deliverViaPrint(selectedReportId);
            showToast("Report queued for local printing!", "success");
            const preprintedQuery = isPreprinted ? '&preprinted=true' : '';
            window.open(`/print/report/${selectedReportId}?forceLive=true${preprintedQuery}`, '_blank');
            autoAdvance();
        } catch (err) {
            console.error("Print delivery failed:", err);
            showToast("Print dispatch failed: " + err.message, "error");
        }
    };

    const handleWhatsApp = async () => {
        if (!selectedReportId || !deliveryPhone) return;
        setIsDelivering(true);
        try {
            await ReportsApi.deliverViaWhatsApp(selectedReportId, deliveryPhone, includeDicom);
            setShowWhatsAppPrompt(false);
            showToast("Report queued for WhatsApp dispatch successfully!", "success");
            autoAdvance();
        } catch (err) {
            showToast("WhatsApp dispatch failed: " + err.message, "error");
        } finally {
            setIsDelivering(false);
        }
    };

    const filteredReports = reports.filter(r => 
        r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.token?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isDigital = (reportData?.signatures?.length || 0) > 0;
    // GPT-5: For manual flow reports, digital signatures do NOT satisfy the verification gate.
    // The operator must physically verify the paper signature.
    const isVerified = reportStructure?.isManualFlow 
        ? reportStructure?.isPhysicallyVerified 
        : (reportStructure?.isPhysicallyVerified || isDigital);

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-zinc-50 text-foreground flex flex-col overflow-hidden font-sans selection:bg-synos-primary/20 relative">
            <SystemBar serverTime={null} syncStatus="Synced" />

            <div className="flex-1 flex flex-row overflow-hidden relative">
                {/* Main Content Container for Scaling Effect */}
                <div className={cn(
                    "flex-1 flex flex-row transition-all duration-500 ease-out h-full",
                    isInventoryModalOpen ? "opacity-40 pointer-events-none scale-[0.99]" : "opacity-100"
                )}>
                {/* LEFT: Worklist (30%) */}
                <div className="w-[30%] border-r dark:border-white/5 border-zinc-200 flex flex-col bg-white dark:bg-zinc-950 relative">
                    <div className="p-6 space-y-4 shrink-0">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-synos-primary/10 flex items-center justify-center text-synos-primary">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight dark:text-white text-zinc-900">Delivery Desk</h2>
                                    <p className="text-[10px] uppercase font-medium tracking-widest text-zinc-400">Queue Management</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 dark:bg-zinc-950/50 bg-zinc-50 rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm w-fit shrink-0 font-sans">
                                <button
                                    onClick={() => { setShowHistory(false); setSelectedReportId(null); }}
                                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all ${
                                        !showHistory ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                                    }`}
                                >
                                    Live
                                </button>
                                <button
                                    onClick={() => { setShowHistory(true); setSelectedReportId(null); }}
                                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded transition-all ${
                                        showHistory ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300"
                                    }`}
                                >
                                    History (7d)
                                </button>
                            </div>
                        </div>

                        {/* Primary Department Segmented Selector */}
                        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-white/5">
                            <button
                                onClick={() => handleDepartmentChange('Pathology')}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    departmentTab === 'Pathology'
                                        ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-black/5 dark:border-white/5"
                                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${departmentTab === 'Pathology' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                Pathology
                            </button>
                            <button
                                onClick={() => handleDepartmentChange('Radiology')}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    departmentTab === 'Radiology'
                                        ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-black/5 dark:border-white/5"
                                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${departmentTab === 'Radiology' ? 'bg-indigo-500' : 'bg-zinc-400'}`} />
                                Radiology
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                            <input 
                                type="text"
                                placeholder="Token or Name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border dark:border-white/5 border-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-synos-primary/20 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 pt-0 pb-24 space-y-2 custom-scrollbar">
                        {isLoadingList ? (
                            <div className="flex items-center justify-center py-12 opacity-30"><Loader2 className="w-8 h-8 animate-spin" /></div>
                        ) : filteredReports.length === 0 ? (
                            <div className="text-center py-12 opacity-25 font-semibold uppercase text-xs tracking-widest">No pending reports</div>
                        ) : filteredReports.map(report => (
                            <DeliveryWorklistCard
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
                            <span className="text-[10px] font-semibold uppercase tracking-widest overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-500">
                                Request Stock
                            </span>
                        </button>
                    </div>
                </div>

                {/* RIGHT: Preview & Actions (70%) */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-synos-background">
                    <div className="flex-1 overflow-hidden relative">
                        {isLoadingDetail || templateLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-synos-background/90 z-10">
                                <Loader2 className="w-12 h-12 animate-spin text-synos-primary" />
                            </div>
                        ) : (reportStructure && template) ? (
                            <div className="h-full flex flex-col p-3 overflow-hidden relative">
                                {/* Standardized Report Preview (Standard SynOS Template) */}
                                <div className="flex-1 synos-elevated-card rounded-3xl overflow-hidden flex flex-col relative">
                                    {/* Minimal Floating Glass Window Label */}
                                    <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-md flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-synos-primary" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider dark:text-zinc-300 text-zinc-700">
                                            High-Fidelity Preview
                                        </span>
                                    </div>
                                    
                                    {/* Preview container scroll area (goes 100% down to the bottom, zero cropping) */}
                                    <div ref={previewContainerRef} className="flex-1 overflow-auto p-1 sm:p-2 pt-14 pb-20 custom-scrollbar flex justify-center items-start">
                                        <div 
                                            style={{ 
                                                width: `${793.7 * previewScale}px`,
                                                height: 'max-content',
                                                overflow: 'hidden'
                                            }}
                                            className="flex justify-center shrink-0"
                                        >
                                            <div 
                                                style={{ 
                                                    transform: `scale(${previewScale})`,
                                                    transformOrigin: 'top left',
                                                    width: '793.7px',
                                                    marginRight: `-${793.7 * (1 - previewScale)}px`,
                                                    marginBottom: `-${1122 * (1 - previewScale)}px`
                                                }}
                                                className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm shrink-0"
                                            >
                                                <ReportA4 reportData={reportData} template={template} forcePreprinted={isPreprinted} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3 MINIMAL FLOATING AESTHETIC GLASS CARDS AT THE BOTTOM */}
                                    <div className="absolute bottom-4 inset-x-4 z-25 flex items-stretch gap-3">
                                        {/* Card 1: Verification Status Card */}
                                        <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border dark:border-white/10 border-zinc-200/80 px-4 py-3 rounded-2xl flex items-center gap-3.5 shadow-xl shadow-black/5">
                                            <div className={cn(
                                                "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-inner",
                                                isVerified ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                                            )}>
                                                {isVerified ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold tracking-tight dark:text-white text-zinc-900 truncate">
                                                    {isVerified ? "Verification Complete" : 
                                                     reportStructure?.isManualFlow ? "Awaiting Manual Signature" : "Physical Verification Needed"}
                                                </h4>
                                                <p className="text-[10px] text-zinc-500 font-medium truncate">
                                                    {isVerified ? "Manually verified by desk operator." : 
                                                     isDigital && !reportStructure?.isManualFlow ? "Digital signature detected. System trust verified." : 
                                                     reportStructure?.isManualFlow ? "Typist requested manual sign-off on paper report." :
                                                     "Requires manual signature on hardcopy before release."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Card 2 & 3 / Verification Actions */}
                                        {!isVerified ? (
                                            <button 
                                                onClick={handleMarkVerified}
                                                disabled={isVerifying}
                                                className="bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2 border dark:border-white/10 border-zinc-800/20 disabled:opacity-50"
                                            >
                                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                Mark Verified
                                            </button>
                                        ) : (
                                            <div className="flex items-stretch gap-3 shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
                                                {/* Preprinted Sheet Toggle */}
                                                <label className="flex items-center gap-2 px-4 rounded-2xl bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isPreprinted}
                                                        onChange={(e) => {
                                                            setIsPreprinted(e.target.checked);
                                                            localStorage.setItem('synos_preprinted_mode', e.target.checked ? 'true' : 'false');
                                                        }}
                                                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                                                    />
                                                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                        Preprinted
                                                    </span>
                                                </label>

                                                {/* Card 2: Send WhatsApp */}
                                                <button 
                                                    onClick={() => setShowWhatsAppPrompt(true)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 border border-emerald-500/30"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Send WhatsApp
                                                </button>
                                                {/* Card 3: Print & Mark Delivered */}
                                                <button 
                                                    onClick={handlePrint}
                                                    className="bg-synos-primary hover:bg-synos-primary/95 text-white px-6 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-synos-primary/15 active:scale-95 transition-all flex items-center justify-center gap-2 border border-synos-primary/30"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                    Print & Deliver
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale p-20 text-center">
                                <Truck className="w-48 h-48 mb-8" />
                                <h2 className="text-xl font-semibold uppercase tracking-tight">Delivery Queue Ready</h2>
                                <p className="text-xl font-medium mt-4">Select a report from the list to begin distribution.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Side Drawer for Inventory */}
            <StockRequestPanel
                isOpen={isInventoryModalOpen}
                onClose={() => setIsInventoryModalOpen(false)}
            />

            {/* WhatsApp Prompt Overlay */}
            {showWhatsAppPrompt && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl border dark:border-white/10 border-black/5 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-8">
                            <Smartphone className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-semibold uppercase tracking-tight mb-2 dark:text-white">WhatsApp Softcopy</h3>
                        <p className="text-sm text-zinc-550 mb-4 font-medium leading-tight">Send secure report link to patient.</p>
                        
                        {gatewayStatus && (
                            <div className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex flex-col gap-2 transition-all ${
                                gatewayStatus.isHealthy 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${gatewayStatus.isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                        <span>{gatewayStatus.statusMessage || (gatewayStatus.isHealthy ? "Gateway Connected" : "Gateway Offline")}</span>
                                    </div>
                                    {gatewayStatus.pendingOutboxCount > 0 && (
                                        <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-mono text-[10px]">
                                            {gatewayStatus.pendingOutboxCount} Syncing...
                                        </span>
                                    )}
                                </div>
                                {!gatewayStatus.isHealthy && gatewayStatus.lastError && (
                                    <div className="pt-2 border-t border-rose-500/20 text-left">
                                        <p className="text-[11px] font-normal text-rose-500 leading-normal">
                                            {gatewayStatus.lastError}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Option 1: Registered Number */}
                            {reportStructure?.patient?.phone ? (
                                <button 
                                    onClick={() => {
                                        setDeliveryPhone(reportStructure.patient.phone);
                                        handleWhatsApp();
                                    }}
                                    disabled={isDelivering}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-6 rounded-[2rem] flex flex-col items-center gap-1 group transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80 italic">Registered Number</span>
                                    <span className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                        {isDelivering ? <Loader2 className="w-6 h-6 animate-spin" /> : <MessageSquare className="w-6 h-6" />}
                                        {reportStructure.patient.phone}
                                    </span>
                                </button>
                            ) : (
                                <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-[2rem] text-center border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">No Registered Number Found</p>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="flex items-center gap-4 text-zinc-300 dark:text-zinc-700 py-2">
                                <div className="h-[1px] flex-1 bg-current" />
                                <span className="text-[8px] font-semibold uppercase tracking-widest">or send to alternative</span>
                                <div className="h-[1px] flex-1 bg-current" />
                            </div>

                            {/* Option 2: Manual Entry */}
                            <div className="space-y-4">
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={deliveryPhone}
                                        onChange={(e) => setDeliveryPhone(e.target.value)}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-3xl px-8 py-5 font-mono text-xl focus:ring-4 ring-emerald-500/20 transition-all text-center tracking-[0.3em] dark:text-white"
                                        placeholder="NEW NUMBER"
                                    />
                                </div>

                                {/* DICOM Viewer Access Option - Only shown when PACS study instances actually exist */}
                                {reportStructure?.hasPacsStudy === true && (reportStructure?.dicomInstanceCount || 0) > 0 && (
                                    <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                        <input 
                                            type="checkbox"
                                            id="includeDicomCheck"
                                            checked={includeDicom}
                                            onChange={(e) => setIncludeDicom(e.target.checked)}
                                            className="w-4 h-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <label htmlFor="includeDicomCheck" className="text-xs font-semibold select-none cursor-pointer">
                                            Include DICOM Study Files (ZIP Download)
                                        </label>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowWhatsAppPrompt(false)}
                                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-3 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleWhatsApp}
                                        disabled={isDelivering || !deliveryPhone || deliveryPhone.length < 10}
                                        className="flex-[2] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isDelivering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Send to This Number
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {toast && (
                <div className={cn(
                    "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-white/10 text-white text-sm font-semibold animate-in slide-in-from-bottom duration-300",
                    toast.type === 'success' ? "bg-emerald-600 shadow-emerald-600/20" : 
                    toast.type === 'info' ? "bg-indigo-600 shadow-indigo-600/20" : "bg-red-600 shadow-red-600/20"
                )}>
                    {toast.type === 'success' ? (
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    ) : toast.type === 'info' ? (
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    )}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    </div>
    );
}
