import React, { useState, useEffect, useMemo } from 'react';
import { 
    History, 
    Search, 
    Filter, 
    Download, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Clock, 
    User, 
    Calendar, 
    Tag, 
    Building2, 
    CheckCircle2, 
    AlertCircle, 
    X, 
    Layers, 
    Receipt,
    Wallet,
    CreditCard
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { useGlobalFilter } from '@/context/GlobalFilterContext';
import { cn } from '@/lib/utils';

export const SettlementHistoryTab = () => {
    const { presetRange, customDates, isConsolidated, effectiveBranchId, isAdmin } = useGlobalFilter();
    
    // Primary Filter: 'all' | 'recoveries' (Partner Inflow) | 'payouts' (Doctor Outflow)
    const [settlementTypeFilter, setSettlementTypeFilter] = useState('all');
    // View mode: 'partners' (Partner Summaries) or 'ledger' (Transaction Ledger)
    const [activeView, setActiveView] = useState('partners');
    
    const [history, setHistory] = useState([]);
    const [partnerSummaries, setPartnerSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const bId = isConsolidated && isAdmin ? null : effectiveBranchId;
    const start = presetRange === 'custom' ? customDates?.start : null;
    const end = presetRange === 'custom' ? customDates?.end : null;

    useEffect(() => {
        loadData();
    }, [presetRange, customDates?.start, customDates?.end, effectiveBranchId, isConsolidated]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [historyData, summaryData] = await Promise.all([
                FinanceApi.getSettlementHistory(bId, presetRange, start, end).catch(err => {
                    console.error("Failed to load settlement history:", err);
                    return [];
                }),
                FinanceApi.getPartnerSettlementSummary(bId, presetRange, start, end).catch(err => {
                    console.error("Failed to load partner settlement summary:", err);
                    return [];
                })
            ]);
            setHistory(historyData || []);
            setPartnerSummaries(summaryData || []);
        } catch (err) {
            console.error("SettlementHistoryTab loadData error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Filter by settlementTypeFilter ('all', 'recoveries', 'payouts')
    const typeFilteredHistory = useMemo(() => {
        if (settlementTypeFilter === 'recoveries') {
            return history.filter(h => h.direction === 'Inflow');
        }
        if (settlementTypeFilter === 'payouts') {
            return history.filter(h => h.direction === 'Outflow');
        }
        return history;
    }, [history, settlementTypeFilter]);

    // Calculate aggregated KPIs across active settlements
    const totalRecovered = useMemo(() => {
        return history.filter(h => h.direction === 'Inflow').reduce((sum, h) => sum + (h.amount || 0), 0);
    }, [history]);

    const totalPayouts = useMemo(() => {
        return history.filter(h => h.direction === 'Outflow').reduce((sum, h) => sum + (h.amount || 0), 0);
    }, [history]);

    const totalCashSettled = useMemo(() => {
        return history.filter(h => (h.paymentMethod || h.paymentMode || '').toLowerCase().includes('cash')).reduce((sum, h) => sum + (h.amount || 0), 0);
    }, [history]);

    const totalDigitalSettled = useMemo(() => {
        return history.filter(h => !(h.paymentMethod || h.paymentMode || '').toLowerCase().includes('cash')).reduce((sum, h) => sum + (h.amount || 0), 0);
    }, [history]);

    // Filtering for Partner Summaries
    const filteredPartners = useMemo(() => {
        if (settlementTypeFilter === 'payouts') return [];
        return partnerSummaries.filter(p => {
            const query = search.toLowerCase();
            return (
                p.partnerName?.toLowerCase().includes(query) ||
                p.status?.toLowerCase().includes(query) ||
                p.lastHandledBy?.toLowerCase().includes(query)
            );
        });
    }, [partnerSummaries, search, settlementTypeFilter]);

    // Filtering for Detailed Ledger
    const filteredLedger = useMemo(() => {
        return typeFilteredHistory.filter(h => {
            const query = search.toLowerCase();
            return (
                h.payeeName?.toLowerCase().includes(query) || 
                h.notes?.toLowerCase().includes(query) ||
                h.reference?.toLowerCase().includes(query) ||
                h.recordedBy?.toLowerCase().includes(query) ||
                h.paymentMethod?.toLowerCase().includes(query)
            );
        });
    }, [typeFilteredHistory, search]);

    const periodLabel = presetRange === 'today' ? 'Today' : (presetRange === 'this_month' ? 'This Month' : 'Period');

    const exportToCsv = () => {
        if (activeView === 'partners') {
            const headers = [
                "Partner Name", 
                `Billed in ${periodLabel} (INR)`, 
                `Settled in ${periodLabel} (INR)`, 
                `${periodLabel} Balance (INR)`, 
                "All-Time Remaining Due (INR)", 
                "Prior Due (INR)", 
                "Cash (INR)", 
                "Digital (INR)", 
                "Settlement Count", 
                "Status", 
                "Last Handled By"
            ];
            const rows = filteredPartners.map(p => [
                `"${p.partnerName}"`,
                p.billedInPeriod || 0,
                p.totalSettled || 0,
                p.periodBalance || 0,
                p.remainingDue || 0,
                p.priorDue || 0,
                p.cashAmount || 0,
                p.digitalAmount || 0,
                p.settlementCount || 0,
                `"${p.status}"`,
                `"${p.lastHandledBy || 'System Admin'}"`
            ]);
            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `partner_settlement_summary_${presetRange || 'all'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const headers = ["Type", "Partner / Payee", "Amount (INR)", "Payment Mode", "Reference", "Notes", "Recorded At", "Handled By"];
            const rows = filteredLedger.map(h => [
                `"${h.direction === 'Inflow' ? 'Recovery' : 'Payout'}"`,
                `"${h.payeeName || 'Referral Partner'}"`,
                h.amount || 0,
                `"${h.paymentMethod || 'Cash'}"`,
                `"${h.reference || ''}"`,
                `"${(h.notes || '').replace(/"/g, '""')}"`,
                `"${new Date(h.recordedAt).toLocaleString()}"`,
                `"${h.recordedBy || 'System Admin'}"`
            ]);
            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `settlement_ledger_${presetRange || 'all'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-5 animate-in slide-in-from-bottom-3 duration-300">
            {/* KPI METRIC CARDS - Standard sans typography with tabular numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Recoveries</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums font-sans">
                            ₹{totalRecovered.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{partnerSummaries.length} Partner Accounts Settled</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                        <ArrowDownLeft size={18} />
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Doctor Payouts</p>
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums font-sans">
                            ₹{totalPayouts.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Commissions Disbursed</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/50">
                        <ArrowUpRight size={18} />
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cash Collections</p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1 tabular-nums font-sans">
                            ₹{totalCashSettled.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Physical Intake</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                        <Wallet size={18} />
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Digital / UPI Settlements</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums font-sans">
                            ₹{totalDigitalSettled.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Instant Digital Receipts</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                        <CreditCard size={18} />
                    </div>
                </div>
            </div>

            {/* ACTION & FILTER CONTROLS BAR (Bills & Collections Alignment) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* SETTLEMENT TYPE SWITCHER + VIEW SWITCHER */}
                <div className="flex items-center flex-wrap gap-2">
                    {/* Primary Switcher: All | Partner Recoveries | Doctor Payouts */}
                    <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setSettlementTypeFilter('all')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                settlementTypeFilter === 'all'
                                    ? "bg-white dark:bg-zinc-800 text-synos-primary dark:text-white shadow-2xs"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            All Settlements ({history.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSettlementTypeFilter('recoveries')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                settlementTypeFilter === 'recoveries'
                                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <ArrowDownLeft size={13} />
                            <span>Partner Recoveries</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSettlementTypeFilter('payouts');
                                setActiveView('ledger'); // Payouts are viewed in ledger
                            }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                settlementTypeFilter === 'payouts'
                                    ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-2xs"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <ArrowUpRight size={13} />
                            <span>Doctor Payouts</span>
                        </button>
                    </div>

                    {/* View Switcher: Partner Summaries vs Transaction Ledger */}
                    {settlementTypeFilter !== 'payouts' && (
                        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setActiveView('partners')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeView === 'partners'
                                        ? "bg-white dark:bg-zinc-800 text-synos-primary dark:text-white shadow-2xs"
                                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <Building2 size={13} />
                                <span>Partner Summaries</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                                    {partnerSummaries.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveView('ledger')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeView === 'ledger'
                                        ? "bg-white dark:bg-zinc-800 text-synos-primary dark:text-white shadow-2xs"
                                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <Receipt size={13} />
                                <span>Transaction Ledger</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                                    {typeFilteredHistory.length}
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* SEARCH & CSV EXPORT */}
                <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
                    <div className="relative group flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder={activeView === 'partners' ? "Search partner, status, or handler..." : "Search partner, notes, or reference..."} 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-synos-primary/20 focus:border-synos-primary transition-all shadow-2xs"
                        />
                        {search && (
                            <button 
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                title="Clear search"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={exportToCsv}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                        <Download size={14} className="text-zinc-500" />
                        <span>EXPORT CSV</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT TABLE (1:1 Bills & Collections Hierarchy) */}
            {activeView === 'partners' && settlementTypeFilter !== 'payouts' ? (
                /* PARTNER-WISE SETTLEMENT SUMMARY TABLE */
                <div className="synos-dept-card rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <table className="w-full text-left synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Referral Partner / Hospital</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">Billed in {periodLabel}</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">Settled in {periodLabel}</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">{periodLabel} Balance</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">All-Time Due</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-center">Payment Mode</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-center">Status</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Last Handled By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="8" className="p-4 bg-zinc-50/30 dark:bg-zinc-900/20" />
                                    </tr>
                                ))
                            ) : filteredPartners.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-zinc-400 text-xs font-medium">
                                        No settlement activity recorded for {periodLabel.toLowerCase()}.
                                    </td>
                                </tr>
                            ) : (
                                filteredPartners.map((partner) => (
                                    <tr key={partner.partnerName} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                                                    {(partner.partnerName || 'RP').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={partner.partnerName}>
                                                        {partner.partnerName}
                                                    </p>
                                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                                        {partner.settlementCount || 0} settlement txn{partner.settlementCount === 1 ? '' : 's'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tabular-nums font-sans">
                                                ₹{(partner.billedInPeriod || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-sans">
                                                +₹{(partner.totalSettled || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <span className={cn(
                                                "text-xs font-bold tabular-nums font-sans",
                                                (partner.periodBalance || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                                            )}>
                                                ₹{(partner.periodBalance || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <span className={cn(
                                                "text-xs font-bold tabular-nums font-sans",
                                                (partner.remainingDue || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-400"
                                            )}>
                                                ₹{(partner.remainingDue || 0).toLocaleString()}
                                            </span>
                                            {partner.priorDue > 0 && (
                                                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
                                                    (Prior: ₹{partner.priorDue.toLocaleString()})
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {partner.cashAmount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-sans tabular-nums">
                                                        Cash: ₹{partner.cashAmount.toLocaleString()}
                                                    </span>
                                                )}
                                                {partner.digitalAmount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-sans tabular-nums">
                                                        UPI: ₹{partner.digitalAmount.toLocaleString()}
                                                    </span>
                                                )}
                                                {!partner.cashAmount && !partner.digitalAmount && (
                                                    <span className="text-xs text-zinc-400 font-sans">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                                partner.status === 'Settled (100%)'
                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                                                    : partner.status === 'Today Cleared'
                                                        ? "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/50"
                                                        : partner.status === 'Partial Recovery'
                                                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
                                                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
                                            )}>
                                                {(partner.status === 'Settled (100%)' || partner.status === 'Today Cleared') && <CheckCircle2 size={11} />}
                                                {partner.status === 'Partial Recovery' && <Clock size={11} />}
                                                <span>{partner.status}</span>
                                            </span>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                    <User size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                                        {partner.lastHandledBy || 'System Admin'}
                                                    </p>
                                                    {partner.lastSettledAt && (
                                                        <p className="text-[11px] text-zinc-500">
                                                            {new Date(partner.lastSettledAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* TRANSACTION-BY-TRANSACTION DETAILED LEDGER TABLE */
                <div className="synos-dept-card rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <table className="w-full text-left synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Type</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Partner / Payee</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Reference & Notes</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">Amount</th>
                                <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Handled By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {loading ? (
                                [1, 2, 3, 4].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="p-4 bg-zinc-50/30 dark:bg-zinc-900/20" />
                                    </tr>
                                ))
                            ) : filteredLedger.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-zinc-400 text-xs font-medium">
                                        No settlement ledger records found for {periodLabel.toLowerCase()}.
                                    </td>
                                </tr>
                            ) : (
                                filteredLedger.map(h => (
                                    <tr key={h.factId} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-3.5">
                                            {h.direction === 'Inflow' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full w-fit border border-emerald-200 dark:border-emerald-800/50">
                                                    <ArrowDownLeft size={11} /> Recovery
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[10px] uppercase tracking-wide bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full w-fit border border-rose-200 dark:border-rose-800/50">
                                                    <ArrowUpRight size={11} /> Payout
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{h.payeeName}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Tag size={10} className="text-zinc-400" />
                                                <p className="text-[11px] text-zinc-500 font-medium">{h.category}</p>
                                            </div>
                                        </td>
                                        <td className="p-3.5 max-w-md">
                                            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium line-clamp-2">
                                                {h.notes || 'System Settlement'}
                                            </p>
                                            {h.reference && (
                                                <p className="text-[11px] text-zinc-400 uppercase font-sans font-bold mt-0.5">
                                                    Ref: {h.reference}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <span className={cn(
                                                "text-xs font-black tabular-nums font-sans",
                                                h.direction === 'Inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                            )}>
                                                {h.direction === 'Inflow' ? '+' : '-'}₹{(h.amount || 0).toLocaleString()}
                                            </span>
                                            <p className="text-[10px] text-zinc-400 mt-0.5 font-bold uppercase font-sans">
                                                {h.paymentMethod || h.paymentMode || 'Cash'}
                                            </p>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                    <User size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{h.recordedBy || 'System Admin'}</p>
                                                    <p className="text-[11px] text-zinc-500">
                                                        {h.recordedAt ? new Date(h.recordedAt).toLocaleDateString() : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
