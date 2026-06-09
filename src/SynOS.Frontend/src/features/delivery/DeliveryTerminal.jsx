import React, { useState, useEffect } from 'react';
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
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isDelivering, setIsDelivering] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
    const [deliveryPhone, setDeliveryPhone] = useState("");
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

    const { template, loading: templateLoading } = useTemplateForReport(reportData);

    useEffect(() => {
        fetchWorklist();
    }, []);

    useEffect(() => {
        if (selectedReportId) {
            fetchReportDetail(selectedReportId);
        } else {
            setReportStructure(null);
            setReportData(null);
        }
    }, [selectedReportId]);

    const fetchWorklist = async () => {
        setIsLoadingList(true);
        try {
            // GPT-5: List all reports that are NOT Draft and NOT Reopened
            const data = await ReportsApi.getReportsByStatus('ReadyForVerification,Signed,ManualVerified');
            setReports(data);
            
            // Auto-select first if none selected
            if (data.length > 0 && !selectedReportId) {
                setSelectedReportId(data[0].reportId);
            }
        } catch (err) {
            console.error("Failed to fetch delivery worklist:", err);
        } finally {
            setIsLoadingList(false);
        }
    };

    const fetchReportDetail = async (reportId) => {
        setIsLoadingDetail(true);
        try {
            const [fullRes, dataRes] = await Promise.all([
                ReportsApi.getFullReport(reportId),
                ReportsApi.getReportData(reportId, true) // Force live to see most recent changes
            ]);
            setReportStructure(fullRes.report);
            setReportData(dataRes);
            setDeliveryPhone(fullRes.report.patient?.phone || "");
        } catch (err) {
            console.error("Failed to fetch report detail:", err);
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

    const handleMarkVerified = async () => {
        if (!selectedReportId) return;
        setIsVerifying(true);
        try {
            // GPT-5: Record the desk operator's ID as the verifier for the manual flow audit trail
            await ReportsApi.verifyManual(selectedReportId, user?.id || "00000000-0000-0000-0000-000000000000");
        } catch (err) {
            // If it's already verified or has another non-critical issue, we still want to refresh the UI
            console.warn("Verification API note:", err.message);
        } finally {
            // ALWAYS refresh state to ensure UI is in sync with DB truth
            await fetchReportDetail(selectedReportId);
            await fetchWorklist();
            setIsVerifying(false);
        }
    };

    const handlePrint = async () => {
        if (!selectedReportId) return;
        try {
            await ReportsApi.deliverViaPrint(selectedReportId);
            window.open(`/print/report/${selectedReportId}?forceLive=true`, '_blank');
            autoAdvance();
        } catch (err) {
            console.error("Print delivery failed:", err);
        }
    };

    const handleWhatsApp = async () => {
        if (!selectedReportId || !deliveryPhone) return;
        setIsDelivering(true);
        try {
            await ReportsApi.deliverViaWhatsApp(selectedReportId, deliveryPhone);
            setShowWhatsAppPrompt(false);
            autoAdvance();
        } catch (err) {
            alert("WhatsApp distribution failed: " + err.message);
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
                <div className="w-[30%] border-r dark:border-white/5 border-zinc-200 flex flex-col bg-white/50 dark:bg-zinc-950/20 backdrop-blur-xl relative">
                    <div className="p-6 space-y-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-synos-primary/10 flex items-center justify-center text-synos-primary">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight dark:text-white text-zinc-900">Delivery Desk</h2>
                                <p className="text-[10px] uppercase font-medium tracking-widest text-zinc-400">Queue Management</p>
                            </div>
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
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-synos-background/50 backdrop-blur-sm z-10">
                                <Loader2 className="w-12 h-12 animate-spin text-synos-primary" />
                            </div>
                        ) : (reportStructure && template) ? (
                            <div className="h-full flex flex-col p-8 overflow-hidden">
                                {/* Standardized Report Preview (Standard SynOS Template) */}
                                <div className="flex-1 border dark:border-white/5 border-zinc-200 rounded-3xl overflow-hidden bg-zinc-300/50 dark:bg-zinc-900/50 flex flex-col shadow-inner relative">
                                    <div className="absolute inset-x-0 top-0 h-12 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b dark:border-white/5 border-black/5 flex items-center px-6 z-10">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-synos-primary" />
                                            <span className="text-[10px] font-semibold uppercase tracking-widest dark:text-zinc-400 text-zinc-600">
                                                High-Fidelity Preview
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto p-8 pt-20 custom-scrollbar flex justify-center">
                                        <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden h-max origin-top scale-[0.85]">
                                            <ReportA4 reportData={reportData} template={template} />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* BOTTOM ACTION BAR */}
                                <div className="h-20 mt-4 shrink-0 flex items-center justify-between px-6 rounded-2xl bg-white dark:bg-zinc-900 border dark:border-white/5 border-zinc-200 shadow-xl shadow-black/5">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                            isVerified ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                                        )}>
                                            {isVerified ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold tracking-tight dark:text-white text-zinc-900">
                                                {isVerified ? "Verification Complete" : 
                                                 reportStructure?.isManualFlow ? "Awaiting Manual Signature" : "Physical Verification Needed"}
                                            </h4>
                                            <p className="text-[11px] text-zinc-550 font-medium">
                                                {isVerified ? "Manually verified by desk operator." : 
                                                 isDigital && !reportStructure?.isManualFlow ? "Digital signature detected. System trust verified." : 
                                                 reportStructure?.isManualFlow ? "Typist requested manual sign-off on paper report. Please check hardcopy." :
                                                 "Requires manual signature on hardcopy before release."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {!isVerified ? (
                                            <button 
                                                onClick={handleMarkVerified}
                                                disabled={isVerifying}
                                                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                Mark Physically Verified
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-3 animate-in slide-in-from-right-8 duration-300">
                                                <button 
                                                    onClick={() => setShowWhatsAppPrompt(true)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all flex items-center gap-2"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Send WhatsApp
                                                </button>
                                                <button 
                                                    onClick={handlePrint}
                                                    className="bg-synos-primary hover:bg-synos-primary/90 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-synos-primary/10 active:scale-95 transition-all flex items-center gap-2"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                    Print & Mark Delivered
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
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl border dark:border-white/10 border-black/5 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-8">
                            <Smartphone className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-semibold uppercase tracking-tight mb-2 dark:text-white">WhatsApp Softcopy</h3>
                        <p className="text-sm text-zinc-550 mb-6 font-medium leading-tight">Send secure report link to patient.</p>
                        
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
        </div>
    </div>
    );
}
