import React, { useMemo } from 'react';
import { 
    IndianRupee, 
    Coins, 
    ArrowRightLeft, 
    AlertTriangle, 
    CheckCircle2, 
    Split, 
    Sparkles, 
    Wallet, 
    Smartphone 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

/**
 * Common Indian currency note denominations
 */
const INDIAN_NOTE_DENOMINATIONS = [10, 20, 50, 100, 200, 500];

export function PosCashTenderModule({
    billAmount = 0,
    tenderedAmount = '',
    onTenderChange,
    changeReturnedNow = '',
    onChangeReturnedNowChange,
    isChangeRetainedAsDue = false,
    onToggleChangeRetained,
    isSplitPayment = false,
    onToggleSplitPayment,
    splitCashAmount = '',
    onSplitCashChange,
    splitUpiAmount = '',
    onSplitUpiChange,
    disabled = false
}) {
    const { isDark } = useTheme();

    const netBill = Math.max(0, Number(billAmount) || 0);
    const tendered = Number(tenderedAmount) || 0;

    // Smart Denomination Suggestions:
    // Suggests exact bill amount plus common notes greater than the bill
    const suggestedDenominations = useMemo(() => {
        if (netBill <= 0) return [];
        const set = new Set();
        // Exact
        set.add(netBill);

        // Next round 50 / 100
        const nextFifty = Math.ceil(netBill / 50) * 50;
        if (nextFifty > netBill) set.add(nextFifty);

        const nextHundred = Math.ceil(netBill / 100) * 100;
        if (nextHundred > netBill) set.add(nextHundred);

        // Standard Indian Notes greater than bill
        INDIAN_NOTE_DENOMINATIONS.forEach(d => {
            if (d >= netBill) set.add(d);
        });

        // Common large notes
        if (netBill < 500) set.add(500);
        if (netBill < 1000) set.add(1000);

        return Array.from(set).sort((a, b) => a - b).slice(0, 5);
    }, [netBill]);

    // Live Change Calculations
    const nominalChange = Math.max(0, tendered - netBill);
    const returnedNow = isChangeRetainedAsDue ? (Number(changeReturnedNow) || 0) : nominalChange;
    const remainingChangeDue = Math.max(0, nominalChange - returnedNow);

    // Split Payment Balance
    const splitCash = Number(splitCashAmount) || 0;
    const splitUpi = Number(splitUpiAmount) || 0;
    const splitTotal = splitCash + splitUpi;
    const splitDiff = netBill - splitTotal;

    const ui = isDark ? {
        pod: "bg-zinc-900/90 border-zinc-800",
        recessed: "bg-zinc-950/80 border-zinc-800",
        input: "bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-synos-primary",
        chipActive: "bg-white text-zinc-900 border-white shadow-xs font-bold",
        chipInactive: "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750"
    } : {
        pod: "bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border-white/90 shadow-[0_4px_16px_rgba(15,35,60,0.05)]",
        recessed: "bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] border-[#CCDCE8] shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)]",
        input: "bg-white border-[#CBD5E1] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-slate-900 placeholder-slate-400 focus:border-blue-500",
        chipActive: "bg-slate-900 text-white border-slate-900 shadow-xs font-bold",
        chipInactive: "bg-white/90 text-slate-700 border-slate-200/90 hover:bg-slate-100 shadow-2xs"
    };

    if (netBill <= 0) return null;

    return (
        <div className={cn("p-3.5 rounded-2xl border space-y-3 transition-all animate-in fade-in duration-200", ui.pod)}>
            {/* Header: Mode Switcher (Cash Tender vs Split Payment) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                        {isSplitPayment ? "Split / Multi-Channel Payment" : "Counter Cash Tender Calculator"}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onToggleSplitPayment}
                    disabled={disabled}
                    className={cn(
                        "px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 synos-focus-btn",
                        isSplitPayment
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-white/80 dark:bg-zinc-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50"
                    )}
                >
                    <Split className="w-3 h-3" />
                    <span>{isSplitPayment ? "Switch to Pure Cash" : "Split Cash + Online"}</span>
                </button>
            </div>

            {/* A. SPLIT PAYMENT MODE */}
            {isSplitPayment ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Cash Leg */}
                        <div className={cn("p-2.5 rounded-xl border space-y-1.5", ui.recessed)}>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                <span className="flex items-center gap-1">
                                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                    Cash from Patient
                                </span>
                                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">₹{splitCash}</span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={netBill}
                                    step="1"
                                    disabled={disabled}
                                    value={splitCashAmount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        onSplitCashChange(val);
                                        // Auto-balance remaining into UPI
                                        const num = Number(val) || 0;
                                        if (num <= netBill) {
                                            onSplitUpiChange(String(netBill - num));
                                        }
                                    }}
                                    placeholder="0"
                                    className={cn("w-full h-8 pl-6 pr-2 rounded-lg text-xs font-mono font-bold outline-none", ui.input)}
                                />
                            </div>
                        </div>

                        {/* UPI Leg */}
                        <div className={cn("p-2.5 rounded-xl border space-y-1.5", ui.recessed)}>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                <span className="flex items-center gap-1">
                                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                                    UPI / QR Scan
                                </span>
                                <span className="font-mono text-blue-700 dark:text-blue-400 font-extrabold">₹{splitUpi}</span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={netBill}
                                    step="1"
                                    disabled={disabled}
                                    value={splitUpiAmount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        onSplitUpiChange(val);
                                        const num = Number(val) || 0;
                                        if (num <= netBill) {
                                            onSplitCashChange(String(netBill - num));
                                        }
                                    }}
                                    placeholder="0"
                                    className={cn("w-full h-8 pl-6 pr-2 rounded-lg text-xs font-mono font-bold outline-none", ui.input)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Split Balance Verification */}
                    <div className={cn(
                        "p-2 rounded-xl border flex items-center justify-between text-xs font-bold",
                        splitDiff === 0 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                    )}>
                        <span className="flex items-center gap-1.5">
                            {splitDiff === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                            {splitDiff === 0 ? "Bill Fully Balanced Across Both Channels" : `Remaining Difference: ₹${Math.abs(splitDiff)}`}
                        </span>
                        <span className="font-mono">
                            Total: ₹{splitTotal} / ₹{netBill}
                        </span>
                    </div>
                </div>
            ) : (
                /* B. PURE CASH TENDER CALCULATOR */
                <div className="space-y-3">
                    {/* Quick Tender Currency Chips */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                            <span>Quick Currency Notes</span>
                            <span className="font-mono">Bill Target: ₹{netBill.toLocaleString()}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            {suggestedDenominations.map(amount => {
                                const isSelected = tendered === amount;
                                return (
                                    <button
                                        key={amount}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => onTenderChange(String(amount))}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer synos-focus-btn active:scale-95",
                                            isSelected ? ui.chipActive : ui.chipInactive
                                        )}
                                    >
                                        ₹{amount.toLocaleString()}
                                        {amount === netBill && (
                                            <span className="ml-1 text-[9px] opacity-75 font-normal">Exact</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tendered Input & Change Output */}
                    <div className={cn("p-3 rounded-xl border space-y-2.5", ui.recessed)}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                            {/* Tendered Input */}
                            <div className="space-y-1">
                                <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block">
                                    Cash Tendered / Received (₹) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        required
                                        disabled={disabled}
                                        value={tenderedAmount}
                                        onChange={(e) => onTenderChange(e.target.value)}
                                        placeholder={String(netBill)}
                                        className={cn("w-full h-10 pl-7 pr-3 rounded-xl text-base font-black font-mono outline-none", ui.input)}
                                    />
                                </div>
                            </div>

                            {/* Live Change Calculation Card */}
                            <div className="space-y-1">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block">
                                    Change to Return (₹)
                                </span>
                                <div className={cn(
                                    "h-10 px-3.5 rounded-xl border flex items-center justify-between font-mono font-black",
                                    nominalChange > 0 
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                        : "bg-white/80 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500"
                                )}>
                                    <span className="text-xs font-bold tracking-tight">
                                        {nominalChange > 0 ? "Return to Patient:" : "Exact Match:"}
                                    </span>
                                    <span className="text-base sm:text-lg">
                                        ₹{nominalChange.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Shortage Warning if Tendered is less than Bill */}
                        {tendered > 0 && tendered < netBill && (
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    ₹{(netBill - tendered).toLocaleString()} Short of Total Bill
                                </span>
                                <span className="text-[10.5px] opacity-80">Use "Partial Due" tab if booking on credit</span>
                            </div>
                        )}

                        {/* DRAWER SHORTAGE: Change Not Given / Hold as Change Due */}
                        {nominalChange > 0 && (
                            <div className="pt-2 border-t border-slate-300/60 dark:border-zinc-700/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isChangeRetainedAsDue}
                                            onChange={onToggleChangeRetained}
                                            disabled={disabled}
                                            className="w-4 h-4 rounded text-rose-600 focus:ring-0 cursor-pointer"
                                        />
                                        <span className={cn(
                                            "text-xs font-extrabold",
                                            isChangeRetainedAsDue ? "text-rose-700 dark:text-rose-400" : "text-slate-700 dark:text-zinc-300"
                                        )}>
                                            ⚠️ Drawer Shortage: Change Not Returned (₹{nominalChange} Due to Patient)
                                        </span>
                                    </label>
                                </div>

                                {isChangeRetainedAsDue && (
                                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2 text-xs animate-in fade-in">
                                        <div className="flex items-start gap-1.5 text-rose-900 dark:text-rose-200">
                                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                            <p className="leading-tight text-[11px]">
                                                Physical cash of <strong>₹{tendered}</strong> will be deposited into your counter drawer. An official <strong>Change Due liability of ₹{remainingChangeDue}</strong> will be recorded for this patient and routed to the <strong>Change Due & Patient Refunds Terminal</strong>.
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-rose-500/20 text-[11px] font-bold">
                                            <span className="text-slate-700 dark:text-zinc-300">
                                                Change Due (Collect Later):
                                            </span>
                                            <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-400">
                                                ₹{remainingChangeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
