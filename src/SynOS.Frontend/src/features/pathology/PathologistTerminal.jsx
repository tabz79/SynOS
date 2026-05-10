import React, { useState, useEffect, useRef } from 'react';
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
import { StockRequestPanel } from '../inventory/StockRequestPanel';

export function PathologistTerminal() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // State
    const [reports, setReports] = useState([]);
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

    const requestCounter = useRef(0);

    // Initial Fetch
    useEffect(() => {
        fetchWorklist();
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
        } else {
            setReportStructure(null);
            setReportData(null);
            setInterpretation({ interpretation: "", comments: "" });
            setLastSavedAt(null);
        }
    }, [selectedReportId]);

    const fetchWorklist = async () => {
        setIsLoadingList(true);
        try {
            // Fetch reports ready for verification or already finalized
            const data = await ReportsApi.getReportsByStatus('ReadyForVerification,Signed,ManualVerified');
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
        if (!userProfile?.signatureImageUrl) {
            setShowSignatureModal(true);
            return;
        }

        if (!window.confirm("Are you sure you want to sign this report? This action is irreversible.")) return;

        setIsSigning(true);
        const reportId = selectedReportId; // Lock ID before async

        try {
            await ReportsApi.signReport(reportId);
            await fetchWorklist();
            // UX Fix: Don't clear selection. Re-fetch current report to show SIGNED state.
            await fetchReportDetail(reportId);
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

    // GPT-5: Data-driven investigative identity guard
    const isValid = (v) => v && v.trim().length > 0;
    const missingIdentityFields = [];
    if (!isValid(userProfile?.name)) missingIdentityFields.push("Full Name");
    if (!isValid(userProfile?.designation)) missingIdentityFields.push("Professional Designation");
    if (!userProfile?.signatureImageUrl) missingIdentityFields.push("Digital Signature Image");

    const isIdentityComplete = missingIdentityFields.length === 0;

    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';
    const [activeTab, setActiveTab] = useState("available"); // available | assigned

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             r.testName.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

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
            {/* Atmospheric Background Layers (Common SynOS Canon) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
                <div className="absolute top-[5%] left-[35%] w-[25%] h-[25%]" style={{ background: 'radial-gradient(circle at center, rgba(39, 39, 42, 0.04) 0%, rgba(39, 39, 42, 0) 75%)' }} />
                <div className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]" style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.06) 0%, rgba(52, 211, 153, 0.01) 40%, rgba(52, 211, 153, 0) 80%)' }} />
                <div className="absolute top-[10%] left-[15%] w-[30%] h-[30%]" style={{ background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.03) 0%, rgba(251, 191, 36, 0) 70%)' }} />
            </div>

            <SystemBar serverTime={null} syncStatus="Synced" />

            <div className="flex-1 flex flex-row gap-4 p-4 overflow-hidden relative">
                {/* Main Content Container for Scaling Effect */}
                <div className={cn(
                    "flex-1 flex flex-row gap-4 transition-all duration-500 ease-out h-full",
                    isInventoryModalOpen ? "opacity-40 pointer-events-none scale-[0.99]" : "opacity-100"
                )}>
                
                {/* LEFT PANEL: Worklist (15%) */}
                <div className="w-[15%] flex flex-col gap-4 min-h-0 relative">
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
                </div>

                {/* CENTER PANEL: Report Editor (35%) */}
                <div className="w-[35%] flex flex-col gap-4 min-h-0">
                    <div className="dark:bg-zinc-900 bg-white dark:border-white/5 border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-6 flex-1 flex flex-col min-h-0">
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
                                <div className="flex items-center justify-between mb-8 pb-6 border-b dark:border-white/5 border-zinc-100 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 dark:bg-zinc-800 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight dark:text-zinc-200">{reportStructure?.patientName}</h2>
                                            <div className="flex items-center gap-2 dark:text-zinc-500 text-zinc-500 text-sm font-medium">
                                                <span>{reportStructure?.patientAgeGender}</span>
                                                <span className="w-1 h-1 dark:bg-zinc-700 bg-zinc-300 rounded-full" />
                                                <span className="font-mono">{reportStructure?.token}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <span className="text-[10px] uppercase font-black dark:text-zinc-600 text-zinc-400 block tracking-widest">Status / Modality</span>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                reportStructure?.status === 'Signed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                reportStructure?.status === 'ManualVerified' ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                                                reportStructure?.status === 'ReadyForVerification' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {reportStructure?.status?.replace(/([A-Z])/g, ' $1').trim() || 'Draft'}
                                            </div>
                                            <span className="dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-300 text-zinc-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border dark:border-white/5 border-zinc-200">
                                                {reportStructure?.modality}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mx-2 px-2">
                                    <table className="w-full border-separate border-spacing-y-2">
                                        <thead>
                                            <tr className="text-[10px] uppercase font-black tracking-widest dark:text-zinc-600 text-zinc-400">
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
                                                                    {reportStructure?.canEditValues && !isReadOnly ? (
                                                                        <input 
                                                                            type="text"
                                                                            value={resultsState[param.parameterCode] || ""}
                                                                            onChange={(e) => setResultsState(prev => ({ ...prev, [param.parameterCode]: e.target.value }))}
                                                                            className="w-24 text-right bg-indigo-50/50 border-b border-indigo-200 focus:outline-none focus:border-indigo-500 font-bold px-1"
                                                                        />
                                                                    ) : (
                                                                        <span className={cn(isAbnormal && "font-black text-red-600 underline decoration-red-200 underline-offset-4")}>
                                                                            {param.value || "-"}
                                                                        </span>
                                                                    )}
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

                                 <div className="mt-8 border-t dark:border-white/5 border-zinc-100 pt-6 shrink-0 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-black dark:text-zinc-600 text-zinc-400 block mb-2 tracking-widest">
                                                Clinical Summary (Ready for Verification)
                                            </label>
                                            <textarea 
                                                className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-zinc-200 transition-all min-h-[100px] disabled:opacity-60 disabled:cursor-not-allowed"
                                                placeholder="Verify core clinical findings..."
                                                value={interpretation.interpretation}
                                                onChange={(e) => setInterpretation(prev => ({ ...prev, interpretation: e.target.value }))}
                                                disabled={isReadOnly || isSaving}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-black dark:text-zinc-600 text-zinc-400 block mb-2 tracking-widest">
                                                Pathologist Remarks / Additional Insights
                                            </label>
                                            <textarea 
                                                className="w-full dark:bg-zinc-950/50 bg-zinc-50 border dark:border-white/10 border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[80px] disabled:opacity-60 disabled:cursor-not-allowed"
                                                placeholder="Append final pathologist notes..."
                                                value={interpretation.comments}
                                                onChange={(e) => setInterpretation(prev => ({ ...prev, comments: e.target.value }))}
                                                disabled={isReadOnly || isSaving}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-6">
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
                                                            disabled={isSaving || (!interpretation.interpretation && !interpretation.comments)}
                                                            className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-bold text-xs px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                                                        >
                                                            {isSaving ? "Syncing..." : "Update Report"}
                                                        </button>
                                                        {reportStructure?.status === 'ReadyForVerification' && (
                                                            <button 
                                                                onClick={handleReopen}
                                                                className="text-red-500 hover:bg-red-50 font-bold text-xs px-6 py-2.5 rounded-xl transition-all border border-transparent hover:border-red-100"
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
                                                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                    Print Review
                                                </button>
                                                <button 
                                                    onClick={handleSign}
                                                    disabled={isSigning || !selectedReportId || !isIdentityComplete}
                                                    className="bg-slate-900 text-white hover:bg-black px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all active:scale-95 flex items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                                >
                                                    {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Signature className="w-4 h-4" />}
                                                    Verify & Sign Digitally
                                                </button>
                                            </div>
                                        )}
                                        {isReadOnly && (
                                            <button 
                                                onClick={handlePrint}
                                                className="bg-synos-primary text-white hover:opacity-90 px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-synos-primary/20 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Printer className="w-4 h-4" />
                                                Print Final Report
                                            </button>
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
                        <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-6 py-3 border-b dark:border-white/5 border-black/5 flex items-center justify-between z-10 shrink-0">
                             <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-synos-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest dark:text-zinc-400 text-zinc-600">
                                    {isReadOnly ? "Audit Evidence" : "Live Preview"}
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
                        
                        <div className="flex-1 overflow-auto bg-zinc-300/50 dark:bg-zinc-900/50 p-4 custom-scrollbar">
                            {isLoadingDetail ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <Loader2 className="w-6 h-6 animate-spin mb-4" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Assembling Preview...</span>
                                </div>
                            ) : !reportData ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8">
                                    <Printer className="w-12 h-12 mb-4" />
                                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                                        Select record for high-fidelity render
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 origin-top min-w-max flex justify-center">
                                    <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden">
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
        </div>
    );
}
