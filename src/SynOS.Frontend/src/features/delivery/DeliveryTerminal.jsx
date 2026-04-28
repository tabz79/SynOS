import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { ReportsApi } from '@/api/reports';
import { useTheme } from '@/context/ThemeContext';
import { PathologistWorklistCard } from '../pathology/components/PathologistWorklistCard';
import { 
    ClipboardList, 
    Search, 
    Truck,
    CheckCircle2,
    Loader2,
    User,
    ShieldCheck,
    FileText,
    Printer
} from 'lucide-react';

export function DeliveryTerminal() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [pathologists, setPathologists] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showManualPrompt, setShowManualPrompt] = useState(false);
    const [selectedPathologistId, setSelectedPathologistId] = useState("");

    useEffect(() => {
        fetchWorklist();
        fetchPathologists();
    }, []);

    useEffect(() => {
        if (selectedReportId) {
            fetchReportDetail(selectedReportId);
        } else {
            setReportStructure(null);
        }
    }, [selectedReportId]);

    const fetchWorklist = async () => {
        setIsLoadingList(true);
        try {
            // Reports that can be delivered: Signed or ReadyForVerification (if manual is allowed)
            const data = await ReportsApi.getReportsByStatus('ReadyForVerification,Signed,ManualVerified');
            setReports(data);
        } catch (err) {
            console.error("Failed to fetch worklist:", err);
        } finally {
            setIsLoadingList(false);
        }
    };

    const fetchPathologists = async () => {
        try {
            const data = await ReportsApi.getPathologists();
            setPathologists(data);
        } catch (err) {
            console.error("Failed to fetch pathologists:", err);
        }
    };

    const fetchReportDetail = async (reportId) => {
        setIsLoadingDetail(true);
        try {
            const data = await ReportsApi.getFullReport(reportId);
            setReportStructure(data.report);
        } catch (err) {
            console.error("Failed to fetch report detail:", err);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleManualVerify = async () => {
        if (!selectedReportId || !selectedPathologistId) return;
        
        setIsVerifying(true);
        try {
            await ReportsApi.verifyManual(selectedReportId, selectedPathologistId);
            setShowManualPrompt(false);
            setSelectedPathologistId("");
            await fetchWorklist();
            setSelectedReportId(null);
        } catch (err) {
            alert("Verification failed: " + err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePrint = () => {
        if (!selectedReportId) return;
        // GPT-5 Rule: Terminal reviews SHOULD use forceLive to ensure what you see is what you get
        window.open(`/print/report/${selectedReportId}?forceLive=true`, '_blank');
    };

    const filteredReports = reports.filter(r => 
        r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.token.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            <SystemBar serverTime={null} syncStatus="Synced" />

            <div className="flex-1 flex flex-row gap-4 p-4 overflow-hidden">
                {/* Worklist */}
                <div className="w-[25%] flex flex-col gap-4 min-h-0">
                    <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-xl rounded-2xl p-4 flex flex-col gap-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2 dark:text-zinc-200">
                                <Truck className="w-5 h-5 text-synos-primary" />
                                Delivery Desk
                            </h2>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                            <input 
                                type="text"
                                placeholder="Search by Token or Name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-synos-primary/20 transition-all font-mono tracking-tighter"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {isLoadingList ? (
                            <div className="flex flex-col items-center justify-center py-12 opacity-50"><Loader2 className="w-8 h-8 animate-spin" /></div>
                        ) : filteredReports.map(report => (
                            <PathologistWorklistCard
                                key={report.reportId}
                                report={report}
                                isSelected={selectedReportId === report.reportId}
                                onClick={() => setSelectedReportId(report.reportId)}
                            />
                        ))}
                    </div>
                </div>

                {/* Report Check */}
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-xl rounded-2xl p-8 flex-1 overflow-hidden flex flex-col">
                        {!selectedReportId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                                <ShieldCheck className="w-24 h-24 mb-6" />
                                <h3 className="text-2xl font-black uppercase tracking-widest">Awaiting Verification</h3>
                                <p className="max-w-xs mt-2">Check report status before physical release.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 dark:bg-zinc-800 bg-synos-primary/5 rounded-2xl flex items-center justify-center text-synos-primary shadow-inner">
                                            <User className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tighter dark:text-zinc-100 uppercase">{reportStructure?.patientName}</h2>
                                            <p className="text-zinc-500 font-mono tracking-widest">{reportStructure?.token}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-inner",
                                            reportStructure?.status === 'Signed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                            reportStructure?.status === 'ManualVerified' ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                                            reportStructure?.status === 'ReadyForVerification' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                            "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        )}>
                                            {reportStructure?.status?.replace(/([A-Z])/g, ' $1').trim() || 'Draft'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 border dark:border-white/5 border-zinc-100 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col">
                                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar opacity-60 grayscale-[0.5] pointer-events-none">
                                        {/* Simplified data view for desk check */}
                                        <div className="space-y-4">
                                            {reportStructure?.groups?.map((g, i) => (
                                                <div key={i}>
                                                    <h4 className="text-[10px] font-black uppercase text-synos-primary mb-2">{g.groupName}</h4>
                                                    <div className="space-y-1">
                                                        {g.parameters.map((p, j) => (
                                                            <div key={j} className="flex justify-between text-xs py-1 border-b dark:border-white/5 border-black/5">
                                                                <span className="text-zinc-500">{p.parameterName}</span>
                                                                <span className="font-bold">{p.value} {p.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="shrink-0 p-6 border-t dark:border-white/10 border-zinc-200 bg-white dark:bg-zinc-900">
                                        {reportStructure?.status === 'Signed' || reportStructure?.status === 'ManualVerified' ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-3 text-emerald-500">
                                                        <CheckCircle2 className="w-6 h-6" />
                                                        <span className="font-bold">Clinical Release Authorized</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-9">
                                                        Verified By: <span className="text-zinc-600 dark:text-zinc-200">{reportStructure?.verifiedByUserName || 'System'}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={handlePrint}
                                                    className="bg-synos-primary text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-synos-primary/20 active:scale-95 transition-all flex items-center gap-2"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                    Print & Mark Delivered
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-6">
                                                <div className="flex-1 bg-zinc-50 dark:bg-zinc-950/20 border dark:border-white/5 border-zinc-200 rounded-xl p-4 flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                        <User className="w-3 h-3" />
                                                        Prepared By: <span className="text-zinc-600 dark:text-zinc-200">{reportStructure?.typedByUserName || 'Unknown'}</span>
                                                    </div>
                                                    <div className="text-amber-600 dark:text-amber-500 text-[11px] font-medium leading-relaxed italic border-l-2 border-amber-500 pl-3">
                                                        This report is pending digital signature. You must obtain a manual signature on the printed hard-copy before releasing it.
                                                    </div>
                                                </div>
                                                {showManualPrompt ? (
                                                    <div className="flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                                                        <select 
                                                            value={selectedPathologistId}
                                                            onChange={(e) => setSelectedPathologistId(e.target.value)}
                                                            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 ring-synos-primary transition-all pr-10"
                                                        >
                                                            <option value="">Select Verifying Pathologist...</option>
                                                            {pathologists.map(p => (
                                                                <option key={p.userId} value={p.userId}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                        <button 
                                                            onClick={handleManualVerify}
                                                            disabled={!selectedPathologistId || isVerifying}
                                                            className="bg-synos-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-40"
                                                        >
                                                            {isVerifying ? "Verifying..." : "Confirm Manual Signature"}
                                                        </button>
                                                        <button 
                                                            onClick={() => setShowManualPrompt(false)}
                                                            className="text-zinc-400 hover:text-zinc-600 font-bold text-xs px-2"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => setShowManualPrompt(true)}
                                                        className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                                                    >
                                                        Manual Verification
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
