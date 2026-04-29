import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { SystemBar } from '@/components/layout/SystemBar';
import { ReportsApi } from '@/api/reports';
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
    FileText
} from 'lucide-react';
import { ReportA4 } from '../documents/templates/ReportA4';

export function DeliveryTerminal() {
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
            setDeliveryPhone(fullRes.report.patientPhone || "");
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
            // GPT-5: Pass a system/null user as the desk operator just marks it seen
            await ReportsApi.verifyManual(selectedReportId, "00000000-0000-0000-0000-000000000000");
            await fetchReportDetail(selectedReportId);
            await fetchWorklist();
        } catch (err) {
            alert("Verification failed: " + err.message);
        } finally {
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
    const isVerified = reportStructure?.isPhysicallyVerified || isDigital;

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-zinc-50 text-foreground flex flex-col overflow-hidden font-sans selection:bg-synos-primary/20 relative">
            <SystemBar serverTime={null} syncStatus="Synced" />

            <div className="flex-1 flex flex-row overflow-hidden">
                {/* LEFT: Worklist (30%) */}
                <div className="w-[30%] border-r dark:border-white/5 border-zinc-200 flex flex-col bg-white/50 dark:bg-zinc-950/20 backdrop-blur-xl">
                    <div className="p-6 space-y-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-synos-primary/10 flex items-center justify-center text-synos-primary">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight dark:text-white text-zinc-900">Delivery Desk</h2>
                                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Queue Management</p>
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

                    <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2 custom-scrollbar">
                        {isLoadingList ? (
                            <div className="flex items-center justify-center py-12 opacity-30"><Loader2 className="w-8 h-8 animate-spin" /></div>
                        ) : filteredReports.length === 0 ? (
                            <div className="text-center py-12 opacity-20 font-black uppercase text-xs tracking-widest">No pending reports</div>
                        ) : filteredReports.map(report => (
                            <DeliveryWorklistCard
                                key={report.reportId}
                                report={report}
                                isSelected={selectedReportId === report.reportId}
                                onClick={() => setSelectedReportId(report.reportId)}
                            />
                        ))}
                    </div>
                </div>

                {/* RIGHT: Preview & Actions (70%) */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-synos-background">
                    <div className="flex-1 overflow-hidden relative">
                        {isLoadingDetail ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-synos-background/50 backdrop-blur-sm z-10">
                                <Loader2 className="w-12 h-12 animate-spin text-synos-primary" />
                            </div>
                        ) : reportStructure ? (
                            <div className="h-full flex flex-col p-8 overflow-hidden">
                                {/* Standardized Report Preview (Standard SynOS Template) */}
                                <div className="flex-1 border dark:border-white/5 border-zinc-200 rounded-3xl overflow-hidden bg-zinc-300/50 dark:bg-zinc-900/50 flex flex-col shadow-inner relative">
                                    <div className="absolute inset-x-0 top-0 h-12 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b dark:border-white/5 border-black/5 flex items-center px-6 z-10">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-synos-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-widest dark:text-zinc-400 text-zinc-600">
                                                High-Fidelity Preview
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto p-8 pt-20 custom-scrollbar flex justify-center">
                                        <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden h-max origin-top scale-[0.85]">
                                            <ReportA4 reportData={reportData} />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* BOTTOM ACTION BAR */}
                                <div className="h-32 mt-8 shrink-0 flex items-center justify-between px-10 rounded-3xl bg-white dark:bg-zinc-900 border dark:border-white/5 border-zinc-200 shadow-2xl shadow-black/10">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                                            isVerified ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                                        )}>
                                            {isVerified ? <CheckCircle2 className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black tracking-tight dark:text-white text-zinc-900">
                                                {isVerified ? "Verification Complete" : "Physical Verification Needed"}
                                            </h4>
                                            <p className="text-xs text-zinc-500 font-medium">
                                                {isDigital ? "Digital signature detected. System trust verified." : 
                                                 isVerified ? "Manually verified by desk operator." : 
                                                 "Requires manual signature on hardcopy before release."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {!isVerified ? (
                                            <button 
                                                onClick={handleMarkVerified}
                                                disabled={isVerifying}
                                                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                            >
                                                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                                Mark Physically Verified
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-4 animate-in slide-in-from-right-8 duration-300">
                                                <button 
                                                    onClick={() => setShowWhatsAppPrompt(true)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-3"
                                                >
                                                    <MessageSquare className="w-5 h-5" />
                                                    Send WhatsApp
                                                </button>
                                                <button 
                                                    onClick={handlePrint}
                                                    className="bg-synos-primary hover:bg-synos-primary/90 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-synos-primary/20 active:scale-95 transition-all flex items-center gap-3"
                                                >
                                                    <Printer className="w-5 h-5" />
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
                                <h2 className="text-4xl font-black uppercase tracking-tighter">Delivery Queue Ready</h2>
                                <p className="text-xl font-medium mt-4">Select a report from the list to begin distribution.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* WhatsApp Prompt Overlay */}
            {showWhatsAppPrompt && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl border dark:border-white/10 border-black/5 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-8">
                            <Smartphone className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 dark:text-white">WhatsApp Softcopy</h3>
                        <p className="text-lg text-zinc-500 mb-10 font-medium leading-tight">Confirm the recipient's mobile number. A secure download link will be sent instantly.</p>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Mobile Number</label>
                                <input 
                                    type="text"
                                    value={deliveryPhone}
                                    onChange={(e) => setDeliveryPhone(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-3xl px-8 py-6 font-mono text-3xl focus:ring-4 ring-emerald-500/20 transition-all text-center tracking-widest"
                                    placeholder="10-digit number"
                                />
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={handleWhatsApp}
                                    disabled={isDelivering || deliveryPhone.length < 10}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isDelivering ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                    Send Now
                                </button>
                                <button 
                                    onClick={() => setShowWhatsAppPrompt(false)}
                                    className="px-8 py-6 rounded-[2rem] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
