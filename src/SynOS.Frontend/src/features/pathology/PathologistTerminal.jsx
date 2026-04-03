import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { ReportsApi } from '@/api/reports';
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
    Signature
} from 'lucide-react';

export function PathologistTerminal() {
    const { user } = useAuth();
    
    // State
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [interpretation, setInterpretation] = useState({ summary: "", notes: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
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
            const data = await ReportsApi.getReportsByStatus('ReadyForSignature');
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
            // Optional: Show toast
        } catch (err) {
            console.error("Save failed:", err);
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSign = async () => {
        if (!selectedReportId) return;
        if (!window.confirm("Are you sure you want to sign this report? This action is irreversible.")) return;

        setIsSigning(true);
        try {
            await ReportsApi.signReport(selectedReportId);
            // Refresh list and clear selection
            await fetchWorklist();
            setSelectedReportId(null);
        } catch (err) {
            console.error("Signing failed:", err);
            alert("Failed to sign report: " + err.message);
        } finally {
            setIsSigning(false);
        }
    };

    const isReadOnly = reportStructure?.status === 'Signed' || reportStructure?.status === 'Finalized';

    const filteredReports = reports.filter(r => 
        r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.testName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-screen w-screen bg-[#F1F5F9] text-slate-800 flex flex-col overflow-hidden font-sans">
            <SystemBar syncStatus="Synced" />

            <div className="flex-1 flex flex-row gap-4 p-4 overflow-hidden">
                
                {/* LEFT PANEL: Worklist (20%) */}
                <div className="w-[20%] flex flex-col gap-4 min-h-0">
                    <div className="bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-indigo-500" />
                                Worklist
                            </h2>
                            <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {reports.length}
                            </span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search reports..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {isLoadingList ? (
                            <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <span className="text-sm font-medium">Loading reports...</span>
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-slate-300">
                                <p className="text-slate-400 text-sm">No reports to sign</p>
                            </div>
                        ) : filteredReports.map(report => (
                            <button
                                key={report.reportId}
                                onClick={() => setSelectedReportId(report.reportId)}
                                className={cn(
                                    "w-full text-left bg-white p-4 rounded-2xl shadow-sm border-2 transition-all group",
                                    selectedReportId === report.reportId 
                                        ? "border-indigo-500 ring-4 ring-indigo-500/10" 
                                        : "border-transparent hover:border-slate-200"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-sm group-hover:text-indigo-600 transition-colors truncate pr-2">
                                        {report.patientName}
                                    </h3>
                                    {report.isStat && (
                                        <span className="shrink-0 bg-red-100 text-red-700 text-[10px] font-black uppercase px-1.5 py-0.5 rounded">
                                            STAT
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 font-medium mb-3">
                                    {report.testName}
                                </p>
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Calendar className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">
                                            {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {report.abnormalCount > 0 && (
                                        <div className="flex items-center gap-1 text-amber-600">
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">
                                                {report.abnormalCount} Abnormal
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* CENTER PANEL: Report Editor (55%) */}
                <div className="w-[55%] flex flex-col gap-4 min-h-0">
                    <div className="bg-white shadow-sm rounded-2xl p-6 flex-1 flex flex-col min-h-0">
                        {isLoadingDetail ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                                <h3 className="text-lg font-bold">Fetching report structure...</h3>
                                <p className="text-slate-500">Assembling parameters and calculations</p>
                            </div>
                        ) : !selectedReportId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <FileText className="w-20 h-20 mb-6 text-slate-300" />
                                <h3 className="text-2xl font-bold text-slate-400">Select a Report</h3>
                                <p className="text-slate-400 max-w-xs">
                                    Choose a record from the worklist to start interpretation and signing.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full min-h-0">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight">{reportStructure?.patientName}</h2>
                                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                                <span>{reportStructure?.patientAgeGender}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <span>{reportStructure?.token}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">Department</span>
                                        <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold">{reportStructure?.modality}</span>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mx-2 px-2">
                                    <table className="w-full border-separate border-spacing-y-2">
                                        <thead>
                                            <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                <th className="text-left px-4 pb-2">Parameter</th>
                                                <th className="text-right px-4 pb-2">Value</th>
                                                <th className="text-left px-4 pb-2">Unit</th>
                                                <th className="text-left px-4 pb-2">Reference Range</th>
                                                <th className="text-left px-4 pb-2">Flag</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportStructure?.groups?.map((group, gIdx) => (
                                                <React.Fragment key={gIdx}>
                                                    {group.groupName && (
                                                        <tr className="contents">
                                                            <td colSpan={5} className="pt-4 pb-1">
                                                                <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-tight bg-indigo-50 px-2 py-0.5 rounded">
                                                                    {group.groupName}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {group.parameters.map((param, pIdx) => {
                                                        const isAbnormal = param.flag && param.flag !== "Normal" && param.flag !== "" && param.flag !== "N";
                                                        return (
                                                            <tr key={pIdx} className={cn(
                                                                "group transition-colors",
                                                                isAbnormal ? "bg-amber-50 hover:bg-amber-100/70" : "hover:bg-slate-50"
                                                            )}>
                                                                <td className="px-4 py-3 text-sm font-bold first:rounded-l-xl border-y border-transparent">
                                                                    {param.parameterName}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm font-mono font-bold text-right text-slate-900 border-y border-transparent">
                                                                    {param.value || "-"}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs font-medium text-slate-500 border-y border-transparent">
                                                                    {param.unit}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs font-medium text-slate-500 border-y border-transparent">
                                                                    {param.referenceRange}
                                                                </td>
                                                                <td className="px-4 py-3 last:rounded-r-xl border-y border-transparent">
                                                                    {isAbnormal && (
                                                                        <span className={cn(
                                                                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                                                            param.flag?.includes("Critical") 
                                                                                ? "bg-red-100 text-red-700" 
                                                                                : "bg-amber-100 text-amber-700"
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

                                 {/* Interpretation Area */}
                                <div className="mt-8 border-t border-slate-100 pt-6 shrink-0 space-y-6">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-3">
                                            Clinical Summary (Required)
                                        </label>
                                        <textarea 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[100px] disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="Enter core clinical findings..."
                                            value={interpretation.summary}
                                            onChange={(e) => setInterpretation(prev => ({ ...prev, summary: e.target.value }))}
                                            disabled={isReadOnly || isSaving}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-3">
                                            Internal Notes / Follow-up
                                        </label>
                                        <textarea 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[80px] disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="Additional notes (not for patient)..."
                                            value={interpretation.notes}
                                            onChange={(e) => setInterpretation(prev => ({ ...prev, notes: e.target.value }))}
                                            disabled={isReadOnly || isSaving}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-6">
                                        <div className="flex items-center gap-2">
                                            {!isReadOnly && (
                                                <button 
                                                    onClick={handleSaveInterpretation}
                                                    disabled={isSaving || !interpretation.summary}
                                                    className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
                                                >
                                                    {isSaving ? "Saving..." : "Save Interpretation"}
                                                </button>
                                            )}
                                            {isReadOnly && (
                                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-bold border border-amber-100">
                                                    <Signature className="w-4 h-4" />
                                                    Report is Signed (Read Only)
                                                </div>
                                            )}
                                        </div>
                                        {!isReadOnly && (
                                            <button 
                                                onClick={handleSign}
                                                disabled={isSigning || !selectedReportId}
                                                className="bg-slate-900 text-white hover:bg-black px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all active:scale-95 flex items-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
                                            >
                                                {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Signature className="w-4 h-4" />}
                                                Sign Report
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Live Preview (25%) */}
                <div className="w-[25%] flex flex-col min-h-0">
                    <div className="bg-slate-200/50 rounded-2xl p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center">
                        <div className="w-full bg-white shadow-2xl min-h-[800px] p-8 flex flex-col gap-6 relative">
                            {/* Watermark for draft? */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                            
                            {/* Simple Preview Stub - Mirrors report structure */}
                            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                                <div className="text-2xl font-black italic tracking-tighter">SynOS</div>
                                <div className="text-right">
                                    <h4 className="font-bold text-sm uppercase">Medical Report</h4>
                                    <p className="text-[10px] text-slate-500">#{reportStructure?.token || "---"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Patient</p>
                                    <p className="font-bold text-sm">{reportStructure?.patientName || "---"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Date</p>
                                    <p className="font-bold text-sm">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="flex-1">
                                <table className="w-full text-[12px]">
                                    <thead className="border-b border-slate-100">
                                        <tr className="text-slate-400">
                                            <th className="text-left pb-2">Analysis</th>
                                            <th className="text-right pb-2">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {reportStructure?.groups?.map(g => g.parameters.map((p, i) => (
                                            <tr key={i}>
                                                <td className="py-2 text-slate-600">{p.parameterName}</td>
                                                <td className="py-2 text-right font-bold">{p.value || "-"} {p.unit}</td>
                                            </tr>
                                        )))}
                                    </tbody>
                                </table>
                            </div>

                            {interpretation.summary && (
                                <div className="border-t pt-4">
                                    <h5 className="text-[10px] uppercase font-bold text-slate-400 mb-2">Interpretation</h5>
                                    <p className="text-xs italic leading-relaxed text-slate-600">
                                        {interpretation.summary}
                                    </p>
                                    {interpretation.notes && (
                                        <p className="text-[10px] mt-2 text-slate-400 italic">
                                            Note: {interpretation.notes}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="mt-auto pt-8 flex justify-between items-end opacity-20">
                                <div>
                                    <p className="text-[8px] font-bold tracking-widest text-slate-400">SYSTEM GENERATED PREVIEW</p>
                                </div>
                                <div className="w-24 h-8 border-b-2 border-slate-200" />
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
