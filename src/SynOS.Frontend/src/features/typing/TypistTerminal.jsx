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
    Package
} from 'lucide-react';
import { ReportA4 } from '../documents/templates/ReportA4';
import { StockRequestPanel } from '../inventory/StockRequestPanel';

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
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportStructure, setReportStructure] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [interpretation, setInterpretation] = useState({ interpretation: "", comments: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const requestCounter = useRef(0);

    const calculatedReportStructure = useMemo(
        () => applyCalculatedValues(reportStructure),
        [reportStructure]
    );


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
            setInterpretation({ interpretation: "", comments: "" });
            setLastSavedAt(null);
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
            // 1. Save to Backend
            await ReportsApi.updateInterpretation(
                selectedReportId, 
                interpretation.interpretation, 
                interpretation.comments
            );

            // 2. Hard Re-fetch (Rule 1: Backend is Truth, bypass snapshot in Draft)
            const freshData = await ReportsApi.getReportData(selectedReportId, true);

            // 3. Race Condition Guard (GPT-5 Safeguard)
            if (currentRequestId === requestCounter.current) {
                setReportData(freshData);
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

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden no-print">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
            </div>

            <div className="no-print">
                <SystemBar serverTime={null} syncStatus="Synced" />
            </div>

            <div className="flex-1 flex flex-row gap-4 p-4 overflow-hidden relative">
                {/* Main Content Container for Scaling Effect */}
                <div className={cn(
                    "flex-1 flex flex-row gap-4 transition-all duration-500 ease-out h-full",
                    isInventoryModalOpen ? "opacity-40 pointer-events-none scale-[0.99]" : "opacity-100"
                )}>
                <div className="w-[15%] flex flex-col gap-4 min-h-0 no-print relative">
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
                </div>

                <div className="w-[35%] flex flex-col gap-4 min-h-0 no-print">
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
                                <div className="flex items-center justify-between mb-8 pb-6 border-b dark:border-white/5 border-zinc-100 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 dark:bg-zinc-800 bg-synos-primary/5 rounded-xl flex items-center justify-center text-synos-primary">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight dark:text-zinc-200 uppercase">{calculatedReportStructure?.patientName}</h2>
                                            <div className="flex items-center gap-2 dark:text-zinc-500 text-zinc-500 text-sm font-medium">
                                                <span>{calculatedReportStructure?.patientAgeGender}</span>
                                                <span className="w-1 h-1 dark:bg-zinc-700 bg-zinc-300 rounded-full" />
                                                <span className="font-mono tracking-tighter opacity-70">{calculatedReportStructure?.token}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase font-black dark:text-zinc-600 text-zinc-400 block mb-1 tracking-widest">Stage</span>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            calculatedReportStructure?.status === 'ReadyForVerification' 
                                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                                : "bg-synos-primary/10 text-synos-primary border border-synos-primary/20"
                                        )}>
                                            {calculatedReportStructure?.status === 'ReadyForVerification' ? 'SUBMITTED' : (calculatedReportStructure?.status?.replace(/([A-Z])/g, ' $1').trim() || 'Draft')}
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
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calculatedReportStructure?.groups?.map((group, gIdx) => (
                                                <React.Fragment key={gIdx}>
                                                    {group.groupName && (
                                                        <tr className="contents">
                                                            <td colSpan={3} className="pt-4 pb-1">
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
                                                                    <span className={cn(isAbnormal && "font-black text-red-600 underline decoration-red-200 underline-offset-4")}>
                                                                        {param.value || "-"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-[11px] font-medium text-zinc-500 border-y border-transparent last:rounded-r-xl">
                                                                    {param.unit}
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
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-black dark:text-zinc-600 text-zinc-400 block mb-2 tracking-widest">
                                                Clinical Interpretation
                                            </label>
                                            <textarea 
                                                className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-synos-primary/10 focus:border-synos-primary dark:text-zinc-200 transition-all min-h-[120px] disabled:opacity-60 disabled:cursor-not-allowed"
                                                placeholder="Translate clinical data into descriptive summary..."
                                                value={interpretation.interpretation}
                                                onChange={(e) => setInterpretation(prev => ({ ...prev, interpretation: e.target.value }))}
                                                disabled={isLocked || isSaving}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-black dark:text-zinc-600 text-zinc-400 block mb-2 tracking-widest">
                                                Pathologist Remarks / Comments
                                            </label>
                                            <textarea 
                                                className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-synos-primary/10 focus:border-synos-primary dark:text-zinc-200 transition-all min-h-[80px] disabled:opacity-60 disabled:cursor-not-allowed"
                                                placeholder="Internal notes or additional pathologist remarks..."
                                                value={interpretation.comments}
                                                onChange={(e) => setInterpretation(prev => ({ ...prev, comments: e.target.value }))}
                                                disabled={isLocked || isSaving}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-6">
                                        {!isLocked ? (
                                            <div className="flex flex-col gap-3 w-full">
                                                {lastSavedAt && (
                                                    <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest animate-pulse flex items-center gap-1.5 self-end">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                        Preview Updated via Backend
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-3 w-full">
                                                    <button 
                                                        onClick={handleSaveInterpretation}
                                                        disabled={isSaving || (!interpretation.interpretation && !interpretation.comments)}
                                                        className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 hover:dark:bg-zinc-700 hover:bg-zinc-200 font-bold text-[10px] px-2 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-40 uppercase tracking-tight"
                                                    >
                                                        {isSaving ? "Saving..." : "Save Draft"}
                                                    </button>
                                                    <button 
                                                        onClick={() => window.print()}
                                                        disabled={!selectedReportId}
                                                        className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-600 hover:dark:bg-zinc-700 hover:bg-zinc-200 font-bold text-[10px] px-2 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tight"
                                                    >
                                                        <Printer className="w-3 h-3" />
                                                        Quick Print
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleSubmit(false)}
                                                        disabled={isSubmitting || isSaving || !interpretation.interpretation}
                                                        className="col-span-2 bg-synos-primary text-white hover:opacity-90 px-4 py-3 rounded-xl font-black text-[10px] shadow-xl shadow-synos-primary/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:shadow-none uppercase tracking-tight"
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
                                                        className="col-span-2 border-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/5 px-4 py-3 rounded-xl font-black text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40 uppercase tracking-tight"
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
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Pure Live Render (50%) */}
                <div className="w-[50%] flex flex-col min-h-0">
                    <div className="dark:bg-zinc-900 bg-zinc-200 shadow-inner rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden border dark:border-white/5 border-black/5">
                        <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-6 py-3 border-b dark:border-white/5 border-black/5 flex items-center justify-between z-10 no-print">
                             <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-synos-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest dark:text-zinc-400 text-zinc-600">Draft Preview</span>
                             </div>
                             {reportData && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter text-green-600">Synced</span>
                                </div>
                             )}
                        </div>
                        
                        <div className="flex-1 overflow-auto bg-zinc-300/50 dark:bg-zinc-900/50 p-4 custom-scrollbar print:overflow-visible print:bg-white print:p-0">
                            {isLoadingDetail ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 no-print">
                                    <Loader2 className="w-6 h-6 animate-spin mb-4" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Synchronizing Context...</span>
                                </div>
                            ) : !reportData ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8 no-print">
                                    <Printer className="w-12 h-12 mb-4" />
                                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                                        Select a record to initialize high-fidelity render
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 origin-top min-w-max flex justify-center print:p-0 print:block">
                                    <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden print:shadow-none print:rounded-none">
                                        <ReportA4 reportData={reportData} />
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

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}} />
        </div>
    );
}
