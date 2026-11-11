import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    Download, 
    Calendar, 
    User, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    FileText
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { useGlobalFilter } from '@/context/GlobalFilterContext';

export const ReferralVisitsTab = () => {
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();

    const [visits, setVisits] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [billStatusFilter, setBillStatusFilter] = useState('All');

    const loadVisits = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
            const start = presetRange === 'custom' ? customDates?.start : null;
            const end = presetRange === 'custom' ? customDates?.end : null;

            const res = await FinanceApi.getCommissionVisits({
                branchId: bId,
                preset: presetRange,
                startDate: start,
                endDate: end,
                search: search || undefined,
                billStatus: billStatusFilter === 'All' ? undefined : billStatusFilter,
                page,
                pageSize
            });

            setVisits(res?.items || []);
            setTotalCount(res?.totalCount || 0);
            setTotalPages(res?.totalPages || 1);
        } catch (err) {
            console.error("Failed to load commission visits", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVisits();
    }, [page, billStatusFilter, presetRange, customDates?.start, customDates?.end, isConsolidated, effectiveBranchId]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        loadVisits();
    };

    const handleExportCsv = () => {
        if (!visits || visits.length === 0) return;
        const headers = [
            "Token",
            "Date",
            "Patient Name",
            "MRN",
            "Primary Referring Doctor",
            "Secondary Referral (RMP)",
            "Commission Recipient",
            "Investigations",
            "Gross Tariff",
            "Concessions",
            "Net Bill",
            "Bill Payment Status",
            "Commission Accrued",
            "Commission Status"
        ];

        const rows = visits.map(v => [
            `"${v.token || ''}"`,
            `"${v.visitDate || ''}"`,
            `"${(v.patientName || '').replace(/"/g, '""')}"`,
            `"${v.patientMrn || ''}"`,
            `"${(v.primaryDoctorName || '').replace(/"/g, '""')}"`,
            `"${(v.secondaryDoctorName || 'None').replace(/"/g, '""')}"`,
            `"${(v.commissionRecipientName || '').replace(/"/g, '""')}"`,
            `"${(v.testNames?.join('; ') || '').replace(/"/g, '""')}"`,
            v.billGross || 0,
            v.concessions || 0,
            v.billNet || 0,
            `"${v.billPaymentStatus || ''}"`,
            v.commissionAccrued || 0,
            `"${v.commissionStatus || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Referral_Visits_Commission_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const billStatuses = ['All', 'Paid', 'Unpaid', 'PartialPayment', 'B2B Credit'];

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-300">
            {/* Top Info Banner explaining Exact Recipient Rule */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <CheckCircle2 size={18} />
                </div>
                <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">
                        Exact Commission Attribution & Accrual Governing Rule
                    </span>
                    <p className="text-slate-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                        If a secondary referral partner (e.g. RMP) is assigned to a visit, they become the <strong>sole commission recipient</strong> while the primary referring doctor retains permanent attribution for volume reporting. Commissions accrue immediately at bill generation even when the bill remains unpaid.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search patient, token, referring doctor..."
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                    />
                </form>

                {/* Status Pills & Export */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                        {billStatuses.map(s => (
                            <button
                                key={s}
                                onClick={() => {
                                    setBillStatusFilter(s);
                                    setPage(1);
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    billStatusFilter === s
                                        ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                                }`}
                            >
                                {s === 'PartialPayment' ? 'Partial' : s}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all shadow-2xs cursor-pointer"
                    >
                        <Download size={14} className="text-slate-400" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Visits Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                <th className="py-3 px-4">Token & Date</th>
                                <th className="py-3 px-4">Patient</th>
                                <th className="py-3 px-4">Primary Doctor</th>
                                <th className="py-3 px-4">Secondary (RMP)</th>
                                <th className="py-3 px-4">Commission Recipient</th>
                                <th className="py-3 px-4">Investigations</th>
                                <th className="py-3 px-4 text-right">Net Bill</th>
                                <th className="py-3 px-4 text-center">Bill Status</th>
                                <th className="py-3 px-4 text-right">Commission</th>
                                <th className="py-3 px-4 text-center">Comm Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                            {loading ? (
                                [1, 2, 3, 4, 5, 6].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={10} className="py-4 px-4">
                                            <div className="h-5 bg-slate-100 dark:bg-zinc-800 rounded-md w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : visits.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                        No referred visits found matching the criteria.
                                    </td>
                                </tr>
                            ) : (
                                visits.map(v => (
                                    <tr 
                                        key={v.visitId} 
                                        className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <span className="font-mono font-black text-slate-900 dark:text-white block">
                                                {v.token || "Visit"}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                                {v.visitDate}
                                            </span>
                                        </td>

                                        <td className="py-3 px-4">
                                            <span className="font-bold text-slate-900 dark:text-zinc-100 block">
                                                {v.patientName}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {v.patientMrn || "MRN-N/A"}
                                            </span>
                                        </td>

                                        <td className="py-3 px-4">
                                            <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                                {v.primaryDoctorName}
                                            </span>
                                        </td>

                                        <td className="py-3 px-4">
                                            {v.secondaryDoctorId ? (
                                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                    {v.secondaryDoctorName}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-[11px]">—</span>
                                            )}
                                        </td>

                                        <td className="py-3 px-4">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                                                <CheckCircle2 size={12} />
                                                <span>{v.commissionRecipientName}</span>
                                            </div>
                                        </td>

                                        <td className="py-3 px-4 max-w-[200px]">
                                            <p className="truncate text-slate-600 dark:text-zinc-300 font-medium" title={v.testNames?.join(', ')}>
                                                {v.testNames?.join(', ') || "Tests"}
                                            </p>
                                        </td>

                                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                            ₹{Number(v.billNet || 0).toLocaleString()}
                                        </td>

                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                                v.billPaymentStatus === 'Paid' 
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                v.billPaymentStatus === 'B2B Credit'
                                                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                                                v.billPaymentStatus === 'PartialPayment'
                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                                    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                            }`}>
                                                {v.billPaymentStatus === 'PartialPayment' ? 'Partial' : v.billPaymentStatus}
                                            </span>
                                        </td>

                                        <td className="py-3 px-4 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                                            ₹{Number(v.commissionAccrued || 0).toLocaleString()}
                                        </td>

                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                v.commissionStatus === 'Settled'
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                            }`}>
                                                {v.commissionStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                    <span>
                        Showing {visits.length} of {totalCount} referred visits
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
