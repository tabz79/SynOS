import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    ArrowLeft, 
    RotateCcw, 
    Search, 
    Receipt, 
    Wallet, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Printer, 
    Loader2, 
    ChevronRight,
    Coins,
    Banknote,
    QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { FinanceApi } from '@/api/finance';

export function ReceptionRefundTerminal({
    isOpen,
    embedded = false,
    onClose,
    onBack,
    onDataUpdated
}) {
    const { isDark } = useTheme();
    const [cancellations, setCancellations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pending'); // 'Pending' | 'All' | 'Settled'
    const [searchQuery, setSearchQuery] = useState('');

    // Disburse Modal State
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [disburseAmount, setDisburseAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [disburseNotes, setDisburseNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Settlement Voucher / Receipt Modal State
    const [settlementReceipt, setSettlementReceipt] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadCancellations();
        }
    }, [isOpen]);

    const loadCancellations = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getVisitCancellations({ preset: 'Today' });
            setCancellations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load visit cancellations:", err);
            setCancellations([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredClaims = useMemo(() => {
        return cancellations.filter(c => {
            const pendingDue = Number(c.balancePendingRefund || 0);
            const isSettled = c.refundStatus === 'Settled' || (pendingDue === 0 && Number(c.refundedAmount || 0) > 0);
            const isPending = pendingDue > 0 || c.refundStatus === 'Pending' || c.refundStatus === 'PartiallySettled';

            if (filter === 'Pending' && !isPending) return false;
            if (filter === 'Settled' && !isSettled) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const tokenMatch = (c.visitToken || '').toLowerCase().includes(q);
                const nameMatch = (c.patientName || '').toLowerCase().includes(q);
                const phoneMatch = (c.patientPhone || '').includes(q);
                const mrnMatch = (c.patientMrn || '').toLowerCase().includes(q);
                if (!tokenMatch && !nameMatch && !phoneMatch && !mrnMatch) return false;
            }

            return true;
        });
    }, [cancellations, filter, searchQuery]);

    // KPI Summary Calculations
    const totalPendingCount = cancellations.filter(c => Number(c.balancePendingRefund || 0) > 0 || c.refundStatus === 'Pending' || c.refundStatus === 'PartiallySettled').length;
    const totalPendingAmount = cancellations.reduce((sum, c) => sum + Number(c.balancePendingRefund || 0), 0);
    const totalSettledTodayAmount = cancellations.reduce((sum, c) => sum + Number(c.refundedAmount || 0), 0);

    const handleOpenDisburse = (claim) => {
        setSelectedClaim(claim);
        const pending = Number(claim.balancePendingRefund || 0);
        setDisburseAmount(pending > 0 ? String(pending) : String(claim.totalAmountPaid || claim.refundedAmount || '0'));
        setPaymentMethod('Cash');
        setDisburseNotes(`Refund balance collected by patient at desk`);
    };

    const handleConfirmDisburse = async () => {
        if (!selectedClaim || !disburseAmount || Number(disburseAmount) <= 0) return;
        setIsSubmitting(true);
        try {
            const res = await FinanceApi.disburseCancellationRefund(selectedClaim.cancelId, {
                amount: Number(disburseAmount),
                paymentMethod: paymentMethod,
                notes: disburseNotes
            });

            // Show printed voucher slip
            setSettlementReceipt({
                receiptNo: res.receiptNo,
                patientName: selectedClaim.patientName,
                visitToken: selectedClaim.visitToken,
                amountDisbursed: res.amountDisbursed,
                remainingBalance: res.remainingBalance,
                refundStatus: res.refundStatus,
                paymentMethod: res.paymentMethod,
                disbursedAt: res.disbursedAt,
                notes: disburseNotes
            });

            setSelectedClaim(null);
            await loadCancellations();
            onDataUpdated?.();
        } catch (err) {
            alert(err.message || "Failed to disburse refund.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const ui = isDark ? {
        panel: "bg-zinc-950 text-white",
        header: "border-b border-zinc-800 bg-zinc-900/60",
        card: "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700",
        pod: "bg-zinc-900/90 border border-zinc-800",
        input: "bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500",
        tableHeader: "bg-zinc-900/90 text-zinc-400 border-b border-zinc-800",
        tableRow: "hover:bg-zinc-900/50 border-b border-zinc-800/60"
    } : {
        panel: "bg-[#F8FAFC] text-slate-900",
        header: "border-b border-slate-200 bg-white/80",
        card: "bg-white border-slate-200 hover:border-slate-300 shadow-xs",
        pod: "bg-white border border-slate-200 shadow-xs",
        input: "bg-white border-slate-200 text-slate-900 placeholder-slate-400",
        tableHeader: "bg-slate-50 text-slate-500 border-b border-slate-200",
        tableRow: "hover:bg-slate-50 border-b border-slate-100"
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
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">Refunds & Claims Terminal</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                #REF-CLAIM
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                            Disburse patient refunds, settle 'Refund Later' claims, and balance cash drawers
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadCancellations}
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
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* STATS DECK */}
            <div className="p-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                <div className={cn("p-4 rounded-2xl flex items-center justify-between", ui.pod)}>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                            Pending Patient Claims
                        </span>
                        <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
                            ₹{totalPendingAmount.toLocaleString()}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                            {totalPendingCount} patient{totalPendingCount === 1 ? '' : 's'} awaiting refund
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                </div>

                <div className={cn("p-4 rounded-2xl flex items-center justify-between", ui.pod)}>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                            Refunds Paid Today
                        </span>
                        <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
                            ₹{totalSettledTodayAmount.toLocaleString()}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                            Disbursed from desk & online
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className={cn("p-4 rounded-2xl flex items-center justify-between", ui.pod)}>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                            Desk Payout Policy
                        </span>
                        <div className="text-sm font-bold mt-1 text-slate-800 dark:text-zinc-200">
                            Cash Drawer / Instant UPI
                        </div>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                            Auto-syncs cash drawer ledger
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* FILTER & SEARCH BAR */}
            <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-zinc-800/70 border border-slate-300/50 dark:border-zinc-700/60">
                    {[
                        { id: 'Pending', label: `Pending Claims (${totalPendingCount})` },
                        { id: 'All', label: `All Cancellations (${cancellations.length})` },
                        { id: 'Settled', label: 'Settled' }
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
                        placeholder="Search patient, token, phone, MRN..."
                        className={cn("w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none font-medium", ui.input)}
                    />
                </div>
            </div>

            {/* MAIN CLAIMS QUEUE TABLE */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className={cn("rounded-2xl border overflow-hidden shadow-xs", ui.card)}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                            <span className="text-xs font-medium">Scanning cancellation claims ledger...</span>
                        </div>
                    ) : filteredClaims.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                            <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">No Pending Refund Claims Found</h3>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
                                {filter === 'Pending' 
                                    ? "All patient cancellations for this shift are fully settled. There are no outstanding refund liabilities." 
                                    : "No records matching the selected search query."}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className={ui.tableHeader}>
                                    <th className="py-3 px-4 font-bold">TOKEN & PATIENT</th>
                                    <th className="py-3 px-4 font-bold">CANCELLATION REASON</th>
                                    <th className="py-3 px-4 font-bold">ORIGINAL BILLED</th>
                                    <th className="py-3 px-4 font-bold">DISBURSED</th>
                                    <th className="py-3 px-4 font-bold">BALANCE PENDING</th>
                                    <th className="py-3 px-4 font-bold text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                                {filteredClaims.map((claim) => {
                                    const pending = Number(claim.balancePendingRefund || 0);
                                    const hasPending = pending > 0 || claim.refundStatus === 'Pending' || claim.refundStatus === 'PartiallySettled';

                                    return (
                                        <tr key={claim.cancelId} className={ui.tableRow}>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                                                        {claim.visitToken}
                                                    </span>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block">
                                                            {claim.patientName}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 font-mono">
                                                            {claim.patientPhone || claim.patientMrn || 'Direct'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-slate-700 dark:text-zinc-300 font-medium block">
                                                    {claim.reason}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    by {claim.cancelledByName} • {new Date(claim.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-zinc-200">
                                                ₹{Number(claim.totalAmountPaid || claim.totalBilled || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                                ₹{Number(claim.refundedAmount || claim.immediateRefundPaid || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                {hasPending ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                                                        ₹{pending.toLocaleString()} DUE
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {hasPending ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDisburse(claim)}
                                                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1"
                                                    >
                                                        <span>Disburse Refund</span>
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSettlementReceipt({
                                                                receiptNo: claim.settlementReceiptNo || `REF-${claim.visitToken}`,
                                                                patientName: claim.patientName,
                                                                visitToken: claim.visitToken,
                                                                amountDisbursed: claim.refundedAmount,
                                                                remainingBalance: 0,
                                                                refundStatus: 'Settled',
                                                                paymentMethod: claim.refundMethod || 'Cash',
                                                                disbursedAt: claim.finalSettledAt || claim.cancelledAt,
                                                                notes: claim.settlementNotes || claim.notes
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" /> Slip
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* DISBURSE REFUND MODAL */}
            {selectedClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}>
                        <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800 border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <Banknote className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Disburse Patient Refund</h3>
                                    <p className="text-xs text-slate-500">Token: <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{selectedClaim.visitToken}</span></p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedClaim(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Patient & Financial Info */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Patient:</span>
                                <span className="font-bold">{selectedClaim.patientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Original Paid:</span>
                                <span className="font-mono font-bold">₹{Number(selectedClaim.totalAmountPaid || selectedClaim.totalBilled || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Already Refunded:</span>
                                <span className="font-mono text-emerald-600 font-bold">₹{Number(selectedClaim.refundedAmount || selectedClaim.immediateRefundPaid || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-zinc-700">
                                <span className="font-bold text-rose-600">Pending Balance Due:</span>
                                <span className="font-mono font-black text-sm text-rose-600">
                                    ₹{Number(selectedClaim.balancePendingRefund || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Amount to Disburse Now (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedClaim.balancePendingRefund}
                                    value={disburseAmount}
                                    onChange={(e) => setDisburseAmount(e.target.value)}
                                    className={cn("w-full pl-8 pr-4 py-2 text-sm font-bold font-mono rounded-xl border outline-none", ui.input)}
                                />
                            </div>
                        </div>

                        {/* Payout Channel */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Disbursement Channel
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('Cash')}
                                    className={cn(
                                        "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all",
                                        paymentMethod === 'Cash'
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                            : "bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                                    )}
                                >
                                    <Wallet className="w-4 h-4" />
                                    <span>Cash Drawer</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('UPI')}
                                    className={cn(
                                        "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all",
                                        paymentMethod === 'UPI'
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                            : "bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                                    )}
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>UPI / Online Transfer</span>
                                </button>
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                Remarks / Received By
                            </label>
                            <input
                                type="text"
                                value={disburseNotes}
                                onChange={(e) => setDisburseNotes(e.target.value)}
                                placeholder="e.g. Paid in cash to patient in-person"
                                className={cn("w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium", ui.input)}
                            />
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-zinc-800 border-slate-100">
                            <button
                                type="button"
                                onClick={() => setSelectedClaim(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting || !disburseAmount || Number(disburseAmount) <= 0}
                                onClick={handleConfirmDisburse}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span>Authorize & Pay ₹{Number(disburseAmount || 0).toLocaleString()}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SETTLEMENT VOUCHER / RECEIPT SLIP MODAL */}
            {settlementReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className={cn(
                        "w-full max-w-sm rounded-2xl border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}>
                        <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800 border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Refund Disbursement Voucher</h3>
                                    <p className="text-[11px] font-mono text-slate-500">{settlementReceipt.receiptNo}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettlementReceipt(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Voucher Receipt Content */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-dashed border-slate-300 dark:border-zinc-700 font-mono text-xs space-y-2">
                            <div className="text-center pb-2 border-b border-dashed border-slate-200 dark:border-zinc-800">
                                <span className="font-bold text-sm block">PATIENT REFUND RECEIPT</span>
                                <span className="text-[10px] text-slate-500">{new Date(settlementReceipt.disbursedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Token ID:</span>
                                <span className="font-bold">{settlementReceipt.visitToken}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Patient Name:</span>
                                <span className="font-bold">{settlementReceipt.patientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Payment Mode:</span>
                                <span className="font-bold">{settlementReceipt.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800 text-sm">
                                <span className="font-bold">Refund Paid:</span>
                                <span className="font-bold text-emerald-600">₹{Number(settlementReceipt.amountDisbursed).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-500">Remaining Balance:</span>
                                <span className="font-bold font-mono">₹{Number(settlementReceipt.remainingBalance || 0).toLocaleString()}</span>
                            </div>
                            {settlementReceipt.notes && (
                                <p className="text-[10px] text-slate-500 pt-1 italic">
                                    "{settlementReceipt.notes}"
                                </p>
                            )}
                        </div>

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
                                onClick={() => setSettlementReceipt(null)}
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
