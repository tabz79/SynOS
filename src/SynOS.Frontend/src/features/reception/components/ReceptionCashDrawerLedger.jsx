import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    ArrowLeft, 
    Wallet, 
    Receipt, 
    Search, 
    Printer, 
    Loader2, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Coins, 
    Banknote, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    ShieldCheck, 
    User,
    Building2,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { FinanceApi } from '@/api/finance';

export function ReceptionCashDrawerLedger({
    isOpen,
    embedded = false,
    onClose,
    onBack,
    onDataUpdated
}) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const [ledgerData, setLedgerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // 'All' | 'Inflows' | 'Outflows' | 'Refunds'
    const [searchQuery, setSearchQuery] = useState('');
    const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadLedger();
        }
    }, [isOpen]);

    const loadLedger = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getMyCashDrawerLedger();
            setLedgerData(data);
        } catch (err) {
            console.error("Failed to load cash drawer shift ledger:", err);
            setLedgerData(null);
        } finally {
            setLoading(false);
        }
    };

    const transactions = ledgerData?.transactions || [];

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (filter === 'Inflows' && t.category !== 'Inflow') return false;
            if (filter === 'Outflows' && t.category !== 'Outflow') return false;
            if (filter === 'Refunds' && t.type !== 'PATIENT_REFUND') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const refMatch = (t.referenceNo || '').toLowerCase().includes(q);
                const tokenMatch = (t.token || '').toLowerCase().includes(q);
                const partMatch = (t.particulars || '').toLowerCase().includes(q);
                const notesMatch = (t.notes || '').toLowerCase().includes(q);
                if (!refMatch && !tokenMatch && !partMatch && !notesMatch) return false;
            }

            return true;
        });
    }, [transactions, filter, searchQuery]);

    const ui = isDark ? {
        panel: "bg-zinc-950 text-white",
        header: "border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md",
        card: "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 rounded-2xl shadow-xl",
        pod: "rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
        input: "bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 rounded-xl",
        tableHeader: "bg-zinc-900/90 text-zinc-400 border-b border-zinc-800",
        tableRow: "hover:bg-zinc-900/50 border-b border-zinc-800/60"
    } : {
        panel: "bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)] text-slate-900",
        header: "border-b border-slate-200/60 bg-transparent backdrop-blur-md",
        card: "bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border border-white/90 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF] rounded-2xl",
        pod: "rounded-xl border border-[#CCDCE8] bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)]",
        input: "bg-white/90 border border-[#D5E2EC] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-slate-900 placeholder-slate-400 rounded-xl",
        tableHeader: "bg-white/80 text-slate-600 border-b border-slate-200/80 font-bold",
        tableRow: "hover:bg-white/60 border-b border-slate-200/50 transition-colors"
    };

    return (
        <div className={cn("flex flex-col h-full overflow-hidden w-full", ui.panel)}>
            {/* TOP BAR */}
            <div className={cn("px-6 py-4 flex items-center justify-between backdrop-blur-md shrink-0", ui.header)}>
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                            title="Return to Options Menu"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">My Cash Drawer Ledger</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                ACTIVE SHIFT
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                            Cashier: <span className="font-semibold text-slate-700 dark:text-zinc-300">{ledgerData?.userName || user?.name || user?.username}</span> • Shift: Today ({ledgerData?.shiftDate || new Date().toISOString().split('T')[0]})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsPrintSlipOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print Shift Settlement Slip</span>
                    </button>
                    <button
                        type="button"
                        onClick={loadLedger}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-all cursor-pointer"
                    >
                        Refresh
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* STATS SHIFT DECK */}
            <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                {/* 1. Opening Float */}
                <div className={cn("p-4 rounded-2xl", ui.pod)}>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                        Opening Float
                    </span>
                    <div className="text-2xl font-black font-mono mt-1 text-slate-800 dark:text-zinc-200">
                        ₹{(ledgerData?.openingFloat || 0).toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                        Shift Starting Change
                    </span>
                </div>

                {/* 2. Total Inflows */}
                <div className={cn("p-4 rounded-2xl", ui.pod)}>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        Total Cash Inflows (+)
                    </span>
                    <div className="text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                        +₹{(ledgerData?.totalInflow || 0).toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                        Desk: ₹{(ledgerData?.inflowBreakdown?.patientDeskCash || 0).toLocaleString()} • B2B: ₹{(ledgerData?.inflowBreakdown?.b2bPartnerCash || 0).toLocaleString()}
                    </span>
                </div>

                {/* 3. Total Outflows */}
                <div className={cn("p-4 rounded-2xl", ui.pod)}>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                        Total Cash Outflows (-)
                    </span>
                    <div className="text-2xl font-black font-mono mt-1 text-rose-600 dark:text-rose-400">
                        -₹{(ledgerData?.totalOutflow || 0).toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                        Exp: ₹{(ledgerData?.outflowBreakdown?.dailyExpensesCash || 0).toLocaleString()} • Ref: ₹{(ledgerData?.outflowBreakdown?.refundsCash || 0).toLocaleString()}
                    </span>
                </div>

                {/* 4. Physical Cash in Hand */}
                <div className={cn("p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5", ui.pod)}>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block flex items-center justify-between">
                        <span>Physical Cash in Hand (=)</span>
                        <Coins className="w-4 h-4 text-emerald-600" />
                    </span>
                    <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
                        ₹{(ledgerData?.netCashInDrawer || 0).toLocaleString()}
                    </div>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        Exact Drawer Count Expected
                    </span>
                </div>
            </div>

            {/* FILTER & SEARCH BAR */}
            <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-zinc-800/70 border border-slate-300/50 dark:border-zinc-700/60">
                    {[
                        { id: 'All', label: `All Transactions (${transactions.length})` },
                        { id: 'Inflows', label: `Inflows (+)` },
                        { id: 'Outflows', label: `Expenses & Outflows (-)` },
                        { id: 'Refunds', label: `Patient Refunds (-)` }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id)}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                filter === tab.id
                                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative min-w-[260px] max-w-sm flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search reference, token, particular..."
                        className={cn("w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none font-medium", ui.input)}
                    />
                </div>
            </div>

            {/* CHRONOLOGICAL TRANSACTION LEDGER TABLE */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className={cn("rounded-2xl border overflow-hidden shadow-xs", ui.card)}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                            <span className="text-xs font-medium">Reconciling shift cash journal...</span>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Wallet className="w-10 h-10 text-slate-300 dark:text-zinc-700 mb-2" />
                            <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">No Cash Movements Recorded</h3>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
                                {filter === 'All' 
                                    ? "You have not recorded any cash receipts, petty cash disbursements, or refunds during this shift yet." 
                                    : "No transactions matching the selected filter."}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className={ui.tableHeader}>
                                    <th className="py-3 px-4 font-bold">TIME</th>
                                    <th className="py-3 px-4 font-bold">EVENT TYPE</th>
                                    <th className="py-3 px-4 font-bold">VOUCHER / REF #</th>
                                    <th className="py-3 px-4 font-bold">PARTICULARS / DESCRIPTION</th>
                                    <th className="py-3 px-4 font-bold text-right">OUTFLOW (-)</th>
                                    <th className="py-3 px-4 font-bold text-right">INFLOW (+)</th>
                                    <th className="py-3 px-4 font-bold text-right">RUNNING BALANCE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                                {filteredTransactions.map((tx) => {
                                    const isInflow = tx.category === 'Inflow';
                                    const isExpense = tx.type === 'DAILY_EXPENSE';
                                    const isRefund = tx.type === 'PATIENT_REFUND';
                                    const isB2B = tx.type === 'B2B_CASH';

                                    return (
                                        <tr key={tx.id} className={ui.tableRow}>
                                            <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                                                {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {isExpense ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                                        DAILY EXPENSE
                                                    </span>
                                                ) : isRefund ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                                                        PATIENT REFUND
                                                    </span>
                                                ) : isB2B ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                                        B2B CASH
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                                        PATIENT CASH
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                                                {tx.referenceNo}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-slate-900 dark:text-white block">
                                                    {tx.particulars}
                                                </span>
                                                {tx.notes && (
                                                    <span className="text-[11px] text-slate-400 italic block">
                                                        {tx.notes}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                {tx.outflowAmount > 0 ? `-₹${tx.outflowAmount.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                {tx.inflowAmount > 0 ? `+₹${tx.inflowAmount.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                ₹{tx.runningBalance.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* PRINTABLE SHIFT SETTLEMENT SLIP MODAL */}
            {isPrintSlipOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}>
                        <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800 border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Shift Cash Handover Slip</h3>
                                    <p className="text-[11px] text-slate-500">Official POS Register Settlement Sheet</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrintSlipOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Slip Paper Preview */}
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-dashed border-slate-300 dark:border-zinc-700 font-mono text-xs space-y-3">
                            <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-zinc-700">
                                <span className="font-bold text-sm block">SYN-OS CLINICAL LABORATORY</span>
                                <span className="text-[11px] text-slate-500 block">DESK CASH REGISTER SHIFT SETTLEMENT</span>
                                <span className="text-[10px] text-slate-400 block mt-1">Generated: {new Date().toLocaleString()}</span>
                            </div>

                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Cashier Name:</span>
                                    <span className="font-bold">{ledgerData?.userName || user?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Shift Date:</span>
                                    <span className="font-bold">{ledgerData?.shiftDate || new Date().toISOString().split('T')[0]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Transactions:</span>
                                    <span className="font-bold">{transactions.length} events</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-zinc-700 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span>Opening Float:</span>
                                    <span>₹{(ledgerData?.openingFloat || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>(+) Patient Desk Cash:</span>
                                    <span>₹{(ledgerData?.inflowBreakdown?.patientDeskCash || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>(+) B2B Partner Inflow:</span>
                                    <span>₹{(ledgerData?.inflowBreakdown?.b2bPartnerCash || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                    <span>(-) Daily Cash Expenses:</span>
                                    <span>-₹{(ledgerData?.outflowBreakdown?.dailyExpensesCash || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-amber-600">
                                    <span>(-) Cash Refunds Disbursed:</span>
                                    <span>-₹{(ledgerData?.outflowBreakdown?.refundsCash || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t-2 border-slate-400 dark:border-zinc-600 flex justify-between text-sm font-black">
                                <span>NET PHYSICAL CASH:</span>
                                <span>₹{(ledgerData?.netCashInDrawer || 0).toFixed(2)}</span>
                            </div>

                            {/* Signatures */}
                            <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px]">
                                <div>
                                    <div className="border-b border-slate-300 dark:border-zinc-700 pb-6 mb-1"></div>
                                    <span className="text-slate-500 font-semibold">Cashier Signature</span>
                                </div>
                                <div>
                                    <div className="border-b border-slate-300 dark:border-zinc-700 pb-6 mb-1"></div>
                                    <span className="text-slate-500 font-semibold">Supervisor / Receiver</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print Slip</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPrintSlipOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
