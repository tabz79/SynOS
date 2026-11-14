import React, { useState, useEffect } from 'react';
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

    // Calculate aggregated KPIs across partners
    const totalRecovered = partnerSummaries.reduce((sum, p) => sum + (p.totalSettled || 0), 0);
    const totalRemainingDue = partnerSummaries.reduce((sum, p) => sum + (p.remainingDue || 0), 0);
    const totalCashSettled = partnerSummaries.reduce((sum, p) => sum + (p.cashAmount || 0), 0);
    const totalDigitalSettled = partnerSummaries.reduce((sum, p) => sum + (p.digitalAmount || 0), 0);
    const activeSettledCount = partnerSummaries.filter(p => (p.totalSettled || 0) > 0).length;

    // Filtering for Partner Summaries
    const filteredPartners = partnerSummaries.filter(p => {
        const query = search.toLowerCase();
        return (
            p.partnerName?.toLowerCase().includes(query) ||
            p.status?.toLowerCase().includes(query) ||
            p.lastHandledBy?.toLowerCase().includes(query)
        );
    });

    // Filtering for Detailed Ledger
    const filteredLedger = history.filter(h => {
        const query = search.toLowerCase();
        return (
            h.payeeName?.toLowerCase().includes(query) || 
            h.notes?.toLowerCase().includes(query) ||
            h.reference?.toLowerCase().includes(query) ||
            h.recordedBy?.toLowerCase().includes(query) ||
            h.paymentMethod?.toLowerCase().includes(query)
        );
    });

    const exportToCsv = () => {
        if (activeView === 'partners') {
            const headers = ["Partner Name", "Settled Amount (INR)", "Remaining Due (INR)", "Total Billed (INR)", "Cash (INR)", "Digital (INR)", "Settlement Count", "Status", "Last Handled By"];
            const rows = filteredPartners.map(p => [
                `"${p.partnerName}"`,
                p.totalSettled || 0,
                p.remainingDue || 0,
                p.totalBilled || 0,
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
        <div className="p-6 md:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Recovered</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums font-mono">
                            ₹{totalRecovered.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{activeSettledCount} Active Partners Settled</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                        <ArrowDownLeft size={20} />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Outstanding Due Left</p>
                        <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums font-mono">
                            ₹{totalRemainingDue.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Uncollected Receivables</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
                        <AlertCircle size={20} />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cash Collections</p>
                        <p className="text-xl font-black text-zinc-900 dark:text-white mt-1 tabular-nums font-mono">
                            ₹{totalCashSettled.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Physical Counter Intake</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                        <Wallet size={20} />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Digital / UPI Settlements</p>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums font-mono">
                            ₹{totalDigitalSettled.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Online Bank / UPI Intake</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                        <CreditCard size={20} />
                    </div>
                </div>
            </div>

            {/* ACTION & VIEW CONTROLS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* SUB-TABS: Partner Summaries vs Transaction Ledger */}
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveView('partners')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            activeView === 'partners'
                                ? "bg-white dark:bg-zinc-800 text-synos-primary dark:text-white shadow-xs"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        )}
                    >
                        <Building2 size={14} />
                        <span>Partner Summaries</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200/70 dark:bg-zinc-700 font-mono">
                            {partnerSummaries.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('ledger')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            activeView === 'ledger'
                                ? "bg-white dark:bg-zinc-800 text-synos-primary dark:text-white shadow-xs"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        )}
                    >
                        <Receipt size={14} />
                        <span>Transaction Ledger</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200/70 dark:bg-zinc-700 font-mono">
                            {history.length}
                        </span>
                    </button>
                </div>

                {/* SEARCH & EXPORT */}
                <div className="flex items-center gap-3 flex-1 max-w-lg justify-end">
                    <div className="relative group flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder={activeView === 'partners' ? "Search partner name, status, or handler..." : "Search partner, notes, reference, or cashier..."} 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-synos-primary/20 focus:border-synos-primary transition-all shadow-2xs"
                        />
                        {search && (
                            <button 
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={exportToCsv}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                        <Download size={15} className="text-zinc-500" />
                        <span>EXPORT CSV</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {activeView === 'partners' ? (
                /* PARTNER-WISE AGGREGATION TABLE */
                <div className="synos-dept-card rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <table className="w-full text-left synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b dark:border-zinc-800 border-slate-300">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Referral Partner / Hospital</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Settled in Period</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Remaining Due</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Total Billed</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Settlement Mode</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Status</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Last Handled By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {loading ? (
                                [1, 2, 3, 4].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="p-6 bg-zinc-50/30 dark:bg-zinc-900/20" />
                                    </tr>
                                ))
                            ) : filteredPartners.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-16 text-center text-zinc-400 text-xs font-medium">
                                        No partner settlement activity found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                filteredPartners.map((partner, idx) => (
                                    <tr key={partner.partnerName || idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                                                    {(partner.partnerName || 'RP').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={partner.partnerName}>
                                                        {partner.partnerName}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                                                        <span>{partner.settlementCount || 0} settlement txns</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                                                +₹{(partner.totalSettled || 0).toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className={cn(
                                                "text-xs font-bold tabular-nums font-mono",
                                                (partner.remainingDue || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"
                                            )}>
                                                ₹{(partner.remainingDue || 0).toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums font-mono">
                                                ₹{(partner.totalBilled || 0).toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {partner.cashAmount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-mono">
                                                        Cash: ₹{partner.cashAmount.toLocaleString()}
                                                    </span>
                                                )}
                                                {partner.digitalAmount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-mono">
                                                        UPI: ₹{partner.digitalAmount.toLocaleString()}
                                                    </span>
                                                )}
                                                {!partner.cashAmount && !partner.digitalAmount && (
                                                    <span className="text-[10px] text-zinc-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                partner.status === 'Settled (100%)'
                                                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                                    : partner.status === 'Partial Recovery'
                                                        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                                            )}>
                                                {partner.status === 'Settled (100%)' && <CheckCircle2 size={11} />}
                                                {partner.status === 'Partial Recovery' && <Clock size={11} />}
                                                <span>{partner.status}</span>
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                    <User size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                                        {partner.lastHandledBy || 'System Admin'}
                                                    </p>
                                                    {partner.lastSettledAt && (
                                                        <p className="text-[10px] text-zinc-400 font-mono">
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
                /* TRANSACTION-BY-TRANSACTION DETAILED LEDGER */
                <div className="synos-dept-card rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <table className="w-full text-left synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b dark:border-zinc-800 border-slate-300">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Type</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Partner / Payee</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Reference & Notes</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Amount</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Handled By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="p-6 bg-zinc-50/30 dark:bg-zinc-900/20" />
                                    </tr>
                                ))
                            ) : filteredLedger.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center text-zinc-400 text-xs font-medium">
                                        No settlement ledger records found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                filteredLedger.map(h => (
                                    <tr key={h.factId} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-4">
                                            {h.direction === 'Inflow' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full w-fit border border-emerald-200 dark:border-emerald-900/50">
                                                    <ArrowDownLeft size={12} /> Recovery
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[10px] uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full w-fit border border-rose-200 dark:border-rose-900/50">
                                                    <ArrowUpRight size={12} /> Payout
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{h.payeeName}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Tag size={10} className="text-zinc-400" />
                                                <p className="text-[10px] text-zinc-500 font-medium">{h.category}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-md">
                                            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium line-clamp-2">
                                                {h.notes || 'System Settlement'}
                                            </p>
                                            {h.reference && (
                                                <p className="text-[10px] text-zinc-400 uppercase font-mono font-bold mt-1">
                                                    Ref: {h.reference}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className={cn(
                                                "text-xs font-black tabular-nums font-mono",
                                                h.direction === 'Inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                            )}>
                                                {h.direction === 'Inflow' ? '+' : '-'}₹{(h.amount || 0).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 mt-0.5 font-bold uppercase">{h.paymentMethod || h.paymentMode || 'Cash'}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                    <User size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{h.recordedBy || 'System Admin'}</p>
                                                    <p className="text-[10px] text-zinc-400 font-mono">
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
