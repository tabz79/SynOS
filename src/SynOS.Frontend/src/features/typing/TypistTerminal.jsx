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
    FileText, 
    Send,
    Loader2,
    User,
    Clock,
    Printer
} from 'lucide-react';

export function TypistTerminal() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // State
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [interpretation, setInterpretation] = useState({ summary: "", notes: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Initial Fetch
    useEffect(() => {
        fetchWorklist();
    }, []);

    // Selection Fetch
    useEffect(() => {
        if (selectedReportId) {
            fetchReportDetail(selectedReportId);
        } else {
            setReportStructure(null);
            setInterpretation({ summary: "", notes: "" });
        }
    }, [selectedReportId]);

    const fetchWorklist = async () => {
        setIsLoadingList(true);
        try {
            // Fetch both Draft and ReadyForVerification to see pending work
            const data = await ReportsApi.getReportsByStatus('Draft,ReadyForVerification');
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
            const data = await ReportsApi.getFullReport(reportId);
            setReportStructure(data.report);
            setInterpretation({
                summary: data.interpretation?.summary || "",
                notes: data.interpretation?.notes || ""
            });
        } catch (err) {
            console.error("Failed to fetch report detail:", err);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleSaveInterpretation = async () => {
        if (!selectedReportId) return;
        setIsSaving(true);
        try {
            await ReportsApi.updateInterpretation(
                selectedReportId, 
                interpretation.summary, 
                interpretation.notes
            );
        } catch (err) {
            console.error("Save failed:", err);
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedReportId) return;
        if (!window.confirm("Submit for Pathologist verification? This will lock the report for editing.")) return;

        setIsSubmitting(true);
        try {
            // 1. Save current work first
            await handleSaveInterpretation();
            // 2. Submit
            await ReportsApi.submitReport(selectedReportId);
            // 3. Refresh
            await fetchWorklist();
            setSelectedReportId(null);
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Failed to submit report: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const isLocked = reportStructure?.status === 'ReadyForVerification' || reportStructure?.status === 'Signed' || reportStructure?.status === 'ManualVerified';

    const filteredReports = reports.filter(r => 
        r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.testName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden no-print">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
            </div>

            <div className="no-print">
                <SystemBar serverTime={null} syncStatus="Synced" />
            </div>

            <div className="flex-1 flex flex-row gap-4 p-4 overflow-hidden">
                <div className="w-[20%] flex flex-col gap-4 min-h-0 no-print">
                    <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-4 flex flex-col gap-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2 dark:text-zinc-200">
                                <ClipboardList className="w-5 h-5 text-synos-primary" />
                                Typing Queue
                            </h2>
                            <span className="bg-synos-primary/10 text-synos-primary dark:text-synos-primary/80 text-xs font-bold px-2 py-0.5 rounded-full">
                                {reports.length}
                            </span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                            <input 
                                type="text"
                                placeholder="Search draft reports..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-synos-primary/20 focus:border-synos-primary dark:text-zinc-200 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
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
                </div>

                <div className="w-[55%] flex flex-col gap-4 min-h-0 no-print">
                    <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-6 flex-1 flex flex-col min-h-0">
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
                        ) : (
                            <div className="flex flex-col h-full min-h-0">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b dark:border-white/5 border-zinc-100 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 dark:bg-zinc-800 bg-synos-primary/5 rounded-xl flex items-center justify-center text-synos-primary">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight dark:text-zinc-200 uppercase">{reportStructure?.patientName}</h2>
                                            <div className="flex items-center gap-2 dark:text-zinc-500 text-zinc-500 text-sm font-medium">
                                                <span>{reportStructure?.patientAgeGender}</span>
                                                <span className="w-1 h-1 dark:bg-zinc-700 bg-zinc-300 rounded-full" />
                                                <span className="font-mono tracking-tighter opacity-70">{reportStructure?.token}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase font-black dark:text-zinc-600 text-zinc-400 block mb-1 tracking-widest">Stage</span>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            reportStructure?.status === 'ReadyForVerification' 
                                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                                : "bg-synos-primary/10 text-synos-primary border border-synos-primary/20"
                                        )}>
                                            {reportStructure?.status === 'ReadyForVerification' ? 'SUBMITTED' : (reportStructure?.status?.replace(/([A-Z])/g, ' $1').trim() || 'Draft')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mx-2 px-2">
                                    <table className="w-full border-separate border-spacing-y-2">
                                        <thead>
                                            <tr className="text-[10px] uppercase font-black tracking-widest dark:text-zinc-600 text-zinc-400 opacity-60">
                                                <th className="text-left px-4 pb-2">Analysis</th>
                                                <th className="text-right px-4 pb-2">Result</th>
                                                <th className="text-left px-4 pb-2">Unit</th>
                                                <th className="text-left px-4 pb-2">Reference</th>
                                                <th className="text-left px-4 pb-2">Flag</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportStructure?.groups?.map((group, gIdx) => (
                                                <React.Fragment key={gIdx}>
                                                    {group.groupName && (
                                                        <tr className="contents">
                                                            <td colSpan={5} className="pt-4 pb-1">
                                                                <span className="text-[10px] font-black text-synos-primary uppercase tracking-widest bg-synos-primary/5 px-2 py-0.5 rounded">
                                                                    {group.groupName}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {group.parameters.map((param, pIdx) => {
                                                        const isAbnormal = param.flag && param.flag !== "Normal" && param.flag !== "" && param.flag !== "N";
                                                        return (
                                                            <tr key={pIdx} className={cn(
                                                                "group transition-all duration-300",
                                                                isAbnormal ? "dark:bg-amber-500/5 bg-amber-50" : "hover:dark:bg-white/[0.02] hover:bg-zinc-50"
                                                            )}>
                                                                <td className="px-4 py-3 text-sm font-semibold dark:text-zinc-300 text-zinc-900 first:rounded-l-xl border-y border-transparent">
                                                                    {param.parameterName}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm font-mono font-bold text-right dark:text-zinc-100 text-zinc-900 border-y border-transparent">
                                                                    {param.value || "-"}
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px] font-medium text-zinc-500 border-y border-transparent">
                                                                    {param.unit}
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px] font-medium text-zinc-500 border-y border-transparent">
                                                                    {param.referenceRange}
                                                                </td>
                                                                <td className="px-4 py-3 last:rounded-r-xl border-y border-transparent">
                                                                    {isAbnormal && (
                                                                        <span className={cn(
                                                                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter",
                                                                            param.flag?.includes("Critical") 
                                                                                ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                                                                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                                        )}>
                                                                            {param.flag}
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

                                <div className="mt-8 border-t dark:border-white/5 border-zinc-100 pt-6 shrink-0 space-y-6">
                                    <div>
                                        <label className="text-[10px] uppercase font-black tracking-widest dark:text-zinc-600 text-zinc-400 block mb-3">
                                            Clinical Interpretation / Summary
                                        </label>
                                        <textarea 
                                            className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-synos-primary/10 focus:border-synos-primary dark:text-zinc-200 transition-all min-h-[120px] disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="Translate clinical data into descriptive summary..."
                                            value={interpretation.summary}
                                            onChange={(e) => setInterpretation(prev => ({ ...prev, summary: e.target.value }))}
                                            disabled={isLocked || isSaving}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] uppercase font-black tracking-widest dark:text-zinc-600 text-zinc-400 block mb-3">
                                            Internal Lab Metadata
                                        </label>
                                        <textarea 
                                            className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-synos-primary/10 focus:border-synos-primary dark:text-zinc-200 transition-all min-h-[80px] disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="Internal technical notes (not visible to patient)..."
                                            value={interpretation.notes}
                                            onChange={(e) => setInterpretation(prev => ({ ...prev, notes: e.target.value }))}
                                            disabled={isLocked || isSaving}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-6">
                                        <button 
                                            onClick={handlePrint}
                                            className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 hover:dark:bg-zinc-700 hover:bg-zinc-200 font-bold text-xs px-6 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print Report
                                        </button>

                                        {!isLocked ? (
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={handleSaveInterpretation}
                                                    disabled={isSaving || !interpretation.summary}
                                                    className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 hover:dark:bg-zinc-700 hover:bg-zinc-200 font-bold text-xs px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                                                >
                                                    {isSaving ? "Auto-saving..." : "Save Draft"}
                                                </button>
                                                <button 
                                                    onClick={handleSubmit}
                                                    disabled={isSubmitting || !interpretation.summary}
                                                    className="bg-synos-primary text-white hover:opacity-90 px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-synos-primary/20 transition-all active:scale-95 flex items-center gap-2 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:shadow-none"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    Submit for Verification
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 max-w-sm flex items-center justify-center p-3 dark:bg-amber-500/10 bg-amber-50 rounded-2xl border border-amber-500/20 gap-3 ml-4">
                                                <Clock className="w-4 h-4 text-amber-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">
                                                    Locked: Pending Pathologist Review
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-[25%] flex flex-col min-h-0">
                    <div className="dark:bg-zinc-950/30 bg-zinc-100/50 dark:border-white/5 border-black/[0.05] border rounded-xl p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center">
                        <div id="printable-report" className="w-full bg-white shadow-2xl min-h-[800px] p-8 flex flex-col gap-6 relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-synos-primary" />
                            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                                <div className="text-2xl font-black italic tracking-tighter">SynOS</div>
                                <div className="text-right">
                                    <h4 className="font-bold text-sm uppercase">Draft Report</h4>
                                    <p className="text-[10px] text-slate-500">PROVISIONAL DATA</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-lg">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Patient Identity</p>
                                    <p className="font-bold text-sm uppercase underline decoration-synos-primary decoration-2 underline-offset-4">{reportStructure?.patientName || "---"}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">System Spine</p>
                                    <p className="font-bold text-sm font-mono">{reportStructure?.token || "---"}</p>
                                </div>
                            </div>

                            <div className="flex-1">
                                <table className="w-full text-[11px]">
                                    <thead className="border-b border-zinc-100">
                                        <tr className="text-zinc-400 font-black uppercase tracking-widest">
                                            <th className="text-left pb-2">Analysis</th>
                                            <th className="text-right pb-2">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {reportStructure?.groups?.map(g => g.parameters.map((p, i) => (
                                            <tr key={i}>
                                                <td className="py-2.5 text-zinc-600 font-semibold">{p.parameterName}</td>
                                                <td className="py-2.5 text-right font-bold text-zinc-900">{p.value || "-"} {p.unit}</td>
                                            </tr>
                                        )))}
                                    </tbody>
                                </table>
                            </div>

                            {interpretation.summary && (
                                <div className="border-t border-zinc-100 pt-6">
                                    <h5 className="text-[9px] uppercase font-black text-zinc-400 mb-3 tracking-widest">Clinical Summary</h5>
                                    <p className="text-xs leading-relaxed text-zinc-700 italic border-l-2 border-synos-primary pl-4">
                                        {interpretation.summary}
                                    </p>
                                </div>
                            )}

                            <div className="mt-auto pt-8 border-t border-dashed border-zinc-200">
                                <div className="flex justify-between items-end opacity-30">
                                    <div className="space-y-1">
                                        <p className="text-[7px] font-black tracking-[0.2em] text-zinc-500 uppercase">Provisional Capture</p>
                                        <p className="text-[8px] font-bold text-zinc-400 font-mono tracking-tighter">TYPIST: {user?.name?.toUpperCase()}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="w-24 h-10 border-b-2 border-zinc-200 mb-1" />
                                        <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Technician Sign</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
