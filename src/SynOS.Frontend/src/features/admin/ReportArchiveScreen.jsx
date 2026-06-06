import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { ReportsApi } from '@/api/reports';
import { AdminApi } from '@/api/admin';
import { useTheme } from '@/context/ThemeContext';
import { 
    Search, 
    Archive, 
    Loader2, 
    Printer, 
    Download, 
    ChevronLeft, 
    ChevronRight, 
    Calendar, 
    Filter, 
    CheckCircle2, 
    AlertTriangle, 
    FileText, 
    Building, 
    RefreshCw,
    X,
    FileCheck2
} from 'lucide-react';
import { ReportA4 } from '../documents/templates/ReportA4';
import { useTemplateForReport } from '../documents/templates/hooks/useReportTemplates';

// Timezone-safe local date YYYY-MM-DD helper
const getLocalYYYYMMDD = (date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

export function ReportArchiveScreen() {
    const { theme } = useTheme();
    
    // Core query parameters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState(['Signed', 'ManualVerified', 'Delivered']);
    const [startDate, setStartDate] = useState(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return getLocalYYYYMMDD(sevenDaysAgo);
    });
    const [endDate, setEndDate] = useState(() => getLocalYYYYMMDD(new Date()));
    const [selectedInterval, setSelectedInterval] = useState("last7");

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // List and Detail Data
    const [reports, setReports] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [reportListItem, setReportListItem] = useState(null); // Selected item from list
    const [reportStructure, setReportStructure] = useState(null); // Full DTO structure
    const [reportData, setReportData] = useState(null); // High-fidelity A4 parameter contract

    // Meta filters loaders
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    // UI States
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // High fidelity template resolver hook
    const { template, loading: templateLoading } = useTemplateForReport(reportData);

    // Fetch branches and departments on mount
    useEffect(() => {
        loadMetadata();
    }, []);

    // Debounced search trigger + query parameters change watcher
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchReports();
        }, 250);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm, selectedBranchId, selectedDepartment, selectedStatuses, startDate, endDate, page, limit]);

    // Load full details when selection changes
    useEffect(() => {
        if (selectedReportId) {
            fetchReportDetail(selectedReportId);
        } else {
            setReportStructure(null);
            setReportData(null);
            setReportListItem(null);
        }
    }, [selectedReportId]);

    const loadMetadata = async () => {
        try {
            const [branchList, deptList] = await Promise.all([
                AdminApi.getBranches(),
                AdminApi.getDepartments()
            ]);
            setBranches(branchList || []);
            setDepartments(deptList || []);
        } catch (err) {
            console.error("Failed to load metadata filters:", err);
        }
    };

    const fetchReports = async () => {
        setIsLoadingList(true);
        try {
            const params = {
                pageNumber: page,
                pageSize: limit,
                searchTerm,
                branchId: selectedBranchId,
                department: selectedDepartment,
                statuses: selectedStatuses,
                startDate: startDate ? new Date(startDate).toISOString() : null,
                endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : null
            };
            const result = await ReportsApi.searchReportsArchive(params);
            setReports(result.items || []);
            setTotalCount(result.totalCount || 0);

            // Auto-select first item if none is selected
            if (result.items?.length > 0 && !selectedReportId) {
                setSelectedReportId(result.items[0].reportId);
                setReportListItem(result.items[0]);
            }
        } catch (err) {
            console.error("Failed to query report archive:", err);
        } finally {
            setIsLoadingList(false);
        }
    };

    const fetchReportDetail = async (reportId) => {
        setIsLoadingDetail(true);
        try {
            const [fullRes, dataRes] = await Promise.all([
                ReportsApi.getFullReport(reportId),
                ReportsApi.getReportData(reportId, true)
            ]);
            setReportStructure(fullRes.report);
            setReportData(dataRes);
        } catch (err) {
            console.error("Failed to load report details:", err);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleIntervalChange = (interval) => {
        setSelectedInterval(interval);
        const today = new Date();
        let start = "";
        let end = getLocalYYYYMMDD(today);

        if (interval === 'today') {
            start = getLocalYYYYMMDD(today);
        } else if (interval === 'last7') {
            const last7 = new Date();
            last7.setDate(today.getDate() - 7);
            start = getLocalYYYYMMDD(last7);
        } else if (interval === 'last30') {
            const last30 = new Date();
            last30.setDate(today.getDate() - 30);
            start = getLocalYYYYMMDD(last30);
        } else if (interval === 'year') {
            start = `${today.getFullYear()}-01-01`;
        } else if (interval === 'all') {
            start = "";
            end = "";
        }

        setStartDate(start);
        setEndDate(end);
        setPage(1);
    };

    const toggleStatus = (status) => {
        setSelectedStatuses(prev => {
            const index = prev.indexOf(status);
            if (index === -1) {
                return [...prev, status];
            } else {
                return prev.filter(s => s !== status);
            }
        });
        setPage(1);
    };

    const handlePrint = async () => {
        if (!selectedReportId) return;
        try {
            await ReportsApi.deliverViaPrint(selectedReportId);
            window.open(`/print/report/${selectedReportId}?forceLive=true`, '_blank');
        } catch (err) {
            console.error("Print invocation failed:", err);
        }
    };

    const handleDownload = async () => {
        if (!reportListItem || !reportListItem.pdfUrl) {
            alert("Report PDF has not been generated or synced yet.");
            return;
        }
        try {
            const response = await fetch(reportListItem.pdfUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const patientClean = reportListItem.patientName.replace(/\s+/g, '_');
            a.download = `${reportListItem.token || 'N_A'}_${reportListItem.mrn || 'N_A'}_${patientClean}_${reportListItem.testName.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF blob:", err);
            window.open(reportListItem.pdfUrl, '_blank');
        }
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="h-full w-full dark:bg-synos-background bg-zinc-50 text-foreground flex flex-row overflow-hidden font-sans selection:bg-synos-primary/20">
            {/* LEFT COLUMN: Master List (40% width) */}
            <div className="w-[40%] min-w-[380px] border-r dark:border-white/5 border-zinc-200 flex flex-col bg-white dark:bg-zinc-950/20 backdrop-blur-xl relative z-20">
                {/* Header */}
                <div className="p-6 pb-4 shrink-0 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-synos-primary/10 flex items-center justify-center text-synos-primary">
                                <Archive className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight dark:text-white text-zinc-900">Report Archive</h2>
                                <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">Enterprise Registry</p>
                            </div>
                        </div>
                        <button 
                            onClick={fetchReports}
                            className="p-2 hover:bg-zinc-500/10 rounded-lg text-zinc-400 transition-colors"
                            title="Force Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                        <input 
                            type="text"
                            placeholder="Name, MRN, Token, Accession..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="w-full bg-zinc-100 dark:bg-zinc-900 border dark:border-white/5 border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-synos-primary/20 transition-all font-medium"
                        />
                    </div>

                    {/* Quick Date Interval Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                            { id: "today", label: "Today" },
                            { id: "last7", label: "7 Days" },
                            { id: "last30", label: "30 Days" },
                            { id: "year", label: "This Year" },
                            { id: "all", label: "All Time" }
                        ].map(chip => (
                            <button
                                key={chip.id}
                                onClick={() => handleIntervalChange(chip.id)}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                                    selectedInterval === chip.id
                                        ? "bg-synos-primary text-white border-transparent shadow-sm"
                                        : "dark:bg-zinc-900 bg-white border-zinc-200 dark:border-white/5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Advanced Filters Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center justify-between w-full px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border",
                            showFilters
                                ? "bg-synos-primary/10 text-synos-primary border-synos-primary/20"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5" />
                            Advanced Query Filters
                        </span>
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-300", showFilters && "rotate-90")} />
                    </button>

                    {/* Collapsible Filter Panel */}
                    {showFilters && (
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border dark:border-white/5 border-zinc-200 space-y-4 animate-in slide-in-from-top-4 duration-200">
                            {/* Branch and Department dropdowns */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">Branch</label>
                                    <select
                                        value={selectedBranchId}
                                        onChange={(e) => {
                                            setSelectedBranchId(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full bg-white dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-xl px-3 py-2 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map(b => (
                                            <option key={b.branchId || b.id} value={b.branchId || b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">Department</label>
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => {
                                            setSelectedDepartment(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full bg-white dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-xl px-3 py-2 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(d => (
                                            <option key={d.code} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Statuses Checkboxes (Multi-select) */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1 block">Report Status</label>
                                <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                                    {[
                                        { id: 'Signed', label: 'Signed' },
                                        { id: 'Delivered', label: 'Delivered' },
                                        { id: 'Draft', label: 'Draft' },
                                        { id: 'ReadyForVerification', label: 'Pending Sig' },
                                        { id: 'ManualVerified', label: 'Manual Sig' }
                                    ].map(stat => {
                                        const isChecked = selectedStatuses.includes(stat.id);
                                        return (
                                            <label key={stat.id} className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleStatus(stat.id)}
                                                    className="rounded border-zinc-300 text-synos-primary focus:ring-synos-primary/20 dark:bg-zinc-950 dark:border-white/5 w-3.5 h-3.5"
                                                />
                                                {stat.label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom Date Ranges */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">Start Date</label>
                                    <input 
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setSelectedInterval("");
                                            setPage(1);
                                        }}
                                        className="w-full bg-white dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-xl px-3 py-2 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">End Date</label>
                                    <input 
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setSelectedInterval("");
                                            setPage(1);
                                        }}
                                        className="w-full bg-white dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-xl px-3 py-2 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2 custom-scrollbar">
                    {isLoadingList ? (
                        <div className="flex items-center justify-center py-20 opacity-30">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-20 opacity-20 font-black uppercase text-xs tracking-widest">
                            No reports match query
                        </div>
                    ) : (
                        reports.map(report => {
                            const isSelected = selectedReportId === report.reportId;
                            const formattedDate = new Date(report.createdAt).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            });
                            
                            return (
                                <button
                                    key={report.reportId}
                                    onClick={() => {
                                        setSelectedReportId(report.reportId);
                                        setReportListItem(report);
                                    }}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl transition-all duration-200 border flex flex-col gap-2 relative group",
                                        isSelected 
                                            ? "bg-synos-primary/10 dark:bg-synos-primary/5 border-synos-primary/30 dark:border-synos-primary/20 shadow-md shadow-synos-primary/5"
                                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-0.5 max-w-[70%]">
                                            <h4 className={cn("text-xs font-bold truncate transition-colors", isSelected ? "text-synos-primary dark:text-white" : "text-zinc-800 dark:text-zinc-200")}>
                                                {report.patientName}
                                            </h4>
                                            <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">
                                                {report.patientAgeGender} &bull; {report.mrn || 'No MRN'}
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold dark:text-zinc-500 text-zinc-450">
                                            Token: {report.token}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-t dark:border-white/5 border-zinc-100 pt-2 text-[10px] font-medium text-zinc-500">
                                        <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                                            <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px] font-bold tracking-tight text-zinc-500 truncate">
                                                {report.testName}
                                            </span>
                                            <span className="text-[9px] text-zinc-400">
                                                {report.branchName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
                                                report.status === "Signed" || report.status === "Delivered"
                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                    : report.status === "ReadyForVerification"
                                                    ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {report.status}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Pagination Controls */}
                {!isLoadingList && reports.length > 0 && (
                    <div className="p-4 border-t dark:border-white/5 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20 shrink-0">
                        <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                            <div className="flex items-center gap-1.5">
                                <span>Rows:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="bg-white dark:bg-zinc-900 border dark:border-white/5 border-zinc-200 rounded px-1.5 py-0.5 outline-none cursor-pointer font-bold"
                                >
                                    {[5, 10, 20, 50].map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                            <span>Total: {totalCount}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1 rounded-lg border dark:border-white/5 border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-zinc-500" />
                            </button>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-150 dark:bg-zinc-850 rounded-md text-zinc-600 dark:text-zinc-300">
                                Page {page} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-1 rounded-lg border dark:border-white/5 border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: Detail & High Fidelity Preview (60% width) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-synos-background relative z-10">
                {isLoadingDetail || templateLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-synos-background/50 backdrop-blur-sm z-50">
                        <Loader2 className="w-10 h-10 animate-spin text-synos-primary" />
                    </div>
                ) : (reportStructure && template) ? (
                    <div className="h-full flex flex-col p-6 overflow-hidden">
                        {/* Master Preview Render Box */}
                        <div className="flex-1 border dark:border-white/5 border-zinc-200 rounded-3xl overflow-hidden bg-zinc-200/50 dark:bg-zinc-900/50 flex flex-col shadow-inner relative min-h-0">
                            {/* Preview Label Ribbon */}
                            <div className="absolute inset-x-0 top-0 h-12 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b dark:border-white/5 border-black/5 flex items-center justify-between px-6 z-10">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-synos-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-widest dark:text-zinc-400 text-zinc-600">
                                        High-Fidelity Document Preview
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">
                                        Archived Copy
                                    </span>
                                </div>
                            </div>
                            
                            {/* Page Renderer View */}
                            <div className="flex-1 overflow-auto p-6 pt-16 custom-scrollbar flex justify-center">
                                <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden h-max origin-top scale-[0.9]">
                                    <ReportA4 reportData={reportData} template={template} />
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM UTILITY & ACTION BAR */}
                        <div className="mt-6 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border dark:border-white/5 border-zinc-200 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shrink-0 shadow-lg shadow-black/[0.02]">
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                                    <FileCheck2 className="w-4 h-4 text-synos-primary" />
                                    {reportListItem?.patientName} ({reportListItem?.patientAgeGender})
                                </h4>
                                <div className="text-[10px] text-zinc-550 dark:text-zinc-500 font-medium flex items-center gap-3 flex-wrap">
                                    <span>MRN: <strong>{reportListItem?.mrn || 'N/A'}</strong></span>
                                    <span>&bull;</span>
                                    <span>Token: <strong>{reportListItem?.token}</strong></span>
                                    <span>&bull;</span>
                                    <span>Referrer: <strong>{reportListItem?.referrerName}</strong></span>
                                    <span>&bull;</span>
                                    <span>Status: <strong className="uppercase">{reportListItem?.status}</strong></span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-auto">
                                <button 
                                    onClick={handleDownload}
                                    className="px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 hover:dark:bg-zinc-700 active:scale-95 transition-all flex items-center gap-2"
                                    title="Download PDF File"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                </button>
                                <button 
                                    onClick={handlePrint}
                                    className="px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg bg-synos-primary text-white hover:bg-opacity-95 active:scale-95 transition-all flex items-center gap-2"
                                    title="Open Print Dialog"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print Report
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale p-20 text-center">
                        <Archive className="w-40 h-40 mb-6" />
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Report Registry</h2>
                        <p className="text-sm font-medium mt-2 max-w-sm">Select a diagnostic report from the registry list to load details, preview PDF templates, print, or download records.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
