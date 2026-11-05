import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    ArrowLeft, 
    Wallet, 
    Receipt, 
    Printer, 
    Loader2, 
    ArrowDownLeft, 
    Coins, 
    Banknote, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    ShieldCheck, 
    User,
    Building2,
    FileText,
    AlertTriangle,
    Sunset,
    Check,
    Lock,
    LogOut,
    Sparkles,
    CreditCard,
    QrCode,
    RefreshCw,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { FinanceApi } from '@/api/finance';

export function ReceptionShiftClosingDrawer({
    isOpen,
    embedded = false,
    onClose,
    onBack,
    onDataUpdated
}) {
    const { isDark } = useTheme();
    const { user, logout } = useAuth();

    // Data State
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [summary, setSummary] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Form inputs
    const [openingFloat, setOpeningFloat] = useState(0);
    const [shiftName, setShiftName] = useState('Day Shift');
    const [supervisorUserId, setSupervisorUserId] = useState('');
    const [handoverNotes, setHandoverNotes] = useState('');

    // Denominations State
    const [denominations, setDenominations] = useState({
        notes500: '',
        notes200: '',
        notes100: '',
        notes50: '',
        notes20: '',
        notes10: '',
        coins: ''
    });

    // Thermal Slip Modal State & Success State
    const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);
    const [submissionResult, setSubmissionResult] = useState(null);

    // Facelift Atmospheric Tokens
    const ui = isDark ? {
        panel: "bg-zinc-950 text-white",
        header: "border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md",
        footer: "border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]",
        card: "bg-zinc-900/70 border border-zinc-800 rounded-2xl shadow-xl",
        cardSecondary: "bg-zinc-900/40 border border-zinc-800/80 rounded-xl",
        pod: "rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
        input: "bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20",
        tableHeader: "bg-zinc-900/90 text-zinc-400 border-b border-zinc-800",
        tableRow: "hover:bg-zinc-900/50 border-b border-zinc-800/60 transition-colors"
    } : {
        panel: "bg-[#CBD5E1] dark:bg-zinc-950 text-slate-900",
        header: "border-b border-slate-300/80 bg-white/80 backdrop-blur-md",
        footer: "border-t border-slate-300/80 bg-white/80 backdrop-blur-md shadow-[0_-4px_20px_-10px_rgba(15,35,60,0.05)]",
        card: "bg-white border border-[#CBD5E1] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.09),0_4px_10px_-2px_rgba(0,0,0,0.04)] rounded-2xl",
        cardSecondary: "bg-slate-50/70 border border-[#CCDCE8] rounded-xl",
        pod: "rounded-xl border border-[#CCDCE8] bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)]",
        input: "bg-white border border-[#CBD5E1] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-slate-900 placeholder-slate-400 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20",
        tableHeader: "bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold",
        tableRow: "hover:bg-slate-50 border-b border-slate-200/70 transition-colors"
    };

    // Load initial shift summary
    const loadSummary = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const data = await FinanceApi.getMyShiftClosingSummary();
            setSummary(data);

            if (data?.reconciliation?.openingFloat !== undefined) {
                setOpeningFloat(data.reconciliation.openingFloat);
            }

            // If already submitted previously, hydrate inputs
            if (data?.isAlreadySubmitted && data?.existingSubmission) {
                const sub = data.existingSubmission;
                setSubmissionResult(sub);
                setShiftName(sub.shiftName || 'Day Shift');
                setOpeningFloat(sub.openingFloat || 0);
                setHandoverNotes(sub.handoverNotes || '');
                if (sub.denominations) {
                    setDenominations({
                        notes500: sub.denominations.notes500 || '',
                        notes200: sub.denominations.notes200 || '',
                        notes100: sub.denominations.notes100 || '',
                        notes50: sub.denominations.notes50 || '',
                        notes20: sub.denominations.notes20 || '',
                        notes10: sub.denominations.notes10 || '',
                        coins: sub.denominations.coins || ''
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load shift summary:", err);
            setErrorMessage(err.message || "Unable to load shift records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadSummary();
        }
    }, [isOpen]);

    // Live Math: Total Physical Count from Denominations
    const physicalCounted = useMemo(() => {
        const c500 = (parseInt(denominations.notes500, 10) || 0) * 500;
        const c200 = (parseInt(denominations.notes200, 10) || 0) * 200;
        const c100 = (parseInt(denominations.notes100, 10) || 0) * 100;
        const c50 = (parseInt(denominations.notes50, 10) || 0) * 50;
        const c20 = (parseInt(denominations.notes20, 10) || 0) * 20;
        const c10 = (parseInt(denominations.notes10, 10) || 0) * 10;
        const cCoins = parseFloat(denominations.coins) || 0;
        return c500 + c200 + c100 + c50 + c20 + c10 + cCoins;
    }, [denominations]);

    // Live Math: System Expected Cash
    const systemExpected = useMemo(() => {
        if (!summary?.reconciliation) return 0;
        const totalInflows = summary.reconciliation.totalInflowCash || 0;
        const totalOutflows = summary.reconciliation.totalOutflowCash || 0;
        const floatVal = parseFloat(openingFloat) || 0;
        return Math.max(0, floatVal + totalInflows - totalOutflows);
    }, [summary, openingFloat]);

    // Live Math: Variance
    const variance = useMemo(() => {
        return physicalCounted - systemExpected;
    }, [physicalCounted, systemExpected]);

    const isMatch = Math.abs(variance) < 0.01;
    const isShortage = variance < -0.01;
    const isSurplus = variance > 0.01;

    // Handle Denomination Change
    const handleDenomChange = (field, val) => {
        if (submissionResult) return; // Locked once submitted
        setDenominations(prev => ({
            ...prev,
            [field]: val
        }));
    };

    // Submit Shift Closing
    const handleSubmitClosing = async () => {
        try {
            setSubmitting(true);
            setErrorMessage(null);

            const payload = {
                shiftName: shiftName || 'Day Shift',
                openingFloat: parseFloat(openingFloat) || 0,
                physicalCountedCash: physicalCounted,
                denominations: {
                    notes500: parseInt(denominations.notes500, 10) || 0,
                    notes200: parseInt(denominations.notes200, 10) || 0,
                    notes100: parseInt(denominations.notes100, 10) || 0,
                    notes50: parseInt(denominations.notes50, 10) || 0,
                    notes20: parseInt(denominations.notes20, 10) || 0,
                    notes10: parseInt(denominations.notes10, 10) || 0,
                    coins: parseFloat(denominations.coins) || 0
                },
                handoverNotes: handoverNotes.trim(),
                supervisorUserId: supervisorUserId ? supervisorUserId : null
            };

            const result = await FinanceApi.submitShiftClosing(payload);
            setSubmissionResult(result);
            onDataUpdated?.();
        } catch (err) {
            console.error("Submission failed:", err);
            setErrorMessage(err.message || "Failed to submit shift closing");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={cn("flex flex-col h-full overflow-hidden w-full select-none", ui.panel)}>
            {/* TOP HEADER */}
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
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-emerald-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Sunset className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                End Shift & Handover Cash
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                                #SHIFT-CLOSING
                            </span>
                            {submissionResult && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                                    <CheckCircle2 className="w-3 h-3" />
                                    LOCKED & HANDED OVER
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                            Cashier: <span className="font-semibold text-slate-700 dark:text-zinc-200">{summary?.userName || user?.name || user?.username}</span> • Shift Date: <span className="font-mono">{summary?.shiftDate || new Date().toISOString().split('T')[0]}</span>
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
                        <span>Print Handover Slip</span>
                    </button>
                    <button
                        type="button"
                        onClick={loadSummary}
                        disabled={loading}
                        className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                        title="Reload Shift Data"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ERROR BANNER */}
            {errorMessage && (
                <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                    <button type="button" onClick={() => setErrorMessage(null)} className="text-xs font-bold hover:underline">Dismiss</button>
                </div>
            )}

            {/* BODY CANVAS */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <p className="text-xs text-slate-500 font-medium">Reconciling today's front-desk intake & ledgers...</p>
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                    {/* TOP SUMMARY POD (SUCCESS CELEBRATION IF SUBMITTED) */}
                    {submissionResult && (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <Check className="w-5 h-5 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Shift Successfully Closed & Handed Over</h3>
                                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                        Physically Counted: <span className="font-mono font-bold">₹{physicalCounted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> • Variance: <span className="font-mono font-bold">{isMatch ? '₹0.00 (Balanced)' : `₹${variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end md:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsPrintSlipOpen(true)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Envelope Slip</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Switch User / Log Out</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TWO-COLUMN WIDESCREEN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* ========================================================= */}
                        {/* LEFT COLUMN: PRE-FILLED OPERATIONAL ACTIVITY (7 COLS) */}
                        {/* ========================================================= */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* CARD 1: INTAKE ACROSS 3 CANONICAL MODES */}
                            <div className={cn("p-5 space-y-4", ui.card)}>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                Intake & Billing Across 3 Canonical Payer Modes
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                Direct Desk Retail vs Corporate B2B Partner vs Cashless Insurance
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                                        {(summary?.retailActivity?.billsCount || 0) + (summary?.b2bActivity?.billsCount || 0) + (summary?.insuranceActivity?.claimsCount || 0)} Total Visits
                                    </span>
                                </div>

                                {/* 3-MODE SUMMARY TILES */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* MODE 1: DIRECT STANDARD */}
                                    <div className={cn("p-3.5 flex flex-col justify-between", ui.pod)}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Direct / Standard</span>
                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono">
                                                    Retail
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                                                ₹{(summary?.retailActivity?.netBilled || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                                                {summary?.retailActivity?.billsCount || 0} Bills • Gross: ₹{(summary?.retailActivity?.grossTariff || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-slate-300/60 dark:border-zinc-700/60 text-[10.5px] space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Desk Cash:</span>
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{(summary?.retailActivity?.cashCollected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">UPI / QR:</span>
                                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">₹{(summary?.retailActivity?.upiCollected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Remaining Due:</span>
                                                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">₹{(summary?.retailActivity?.remainingDue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MODE 2: CORPORATE B2B PREPAID */}
                                    <div className={cn("p-3.5 flex flex-col justify-between", ui.pod)}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Corporate B2B</span>
                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono">
                                                    B2B Prepaid
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                                                ₹{(summary?.b2bActivity?.partnerBilled || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                                                {summary?.b2bActivity?.billsCount || 0} Bills • Gross: ₹{(summary?.b2bActivity?.grossTariff || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-slate-300/60 dark:border-zinc-700/60 text-[10.5px] space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Desk Cash:</span>
                                                <span className="font-mono font-bold text-slate-400">₹0.00 (Partner)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">B2B Billing:</span>
                                                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">Monthly Ledger</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Concession:</span>
                                                <span className="font-mono font-bold text-slate-600 dark:text-zinc-300">Contract Rate</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MODE 3: INSURANCE / TPA */}
                                    <div className={cn("p-3.5 flex flex-col justify-between", ui.pod)}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Insurance / TPA</span>
                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 font-mono">
                                                    Cashless
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                                                ₹{(summary?.insuranceActivity?.preAuthGross || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                                                {summary?.insuranceActivity?.claimsCount || 0} Claims Pre-Approved
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-slate-300/60 dark:border-zinc-700/60 text-[10.5px] space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Co-Pay Cash:</span>
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{(summary?.insuranceActivity?.coPayCashCollected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Settlement:</span>
                                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">TPA Claims</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Status:</span>
                                                <span className="font-mono font-bold text-slate-600 dark:text-zinc-300">Pre-Auth Cleared</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 2: MID-SHIFT DRAWER INFLOWS & OUTFLOWS */}
                            <div className={cn("p-5 space-y-4", ui.card)}>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                Mid-Shift Desk Inflows & Counter Outflows
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                B2B Debt settlements recovered in cash and petty disbursements
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* INFLOWS: B2B CASH RECOVERIES */}
                                    <div className={cn("p-4 space-y-3", ui.cardSecondary)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">B2B Cash Recoveries</span>
                                            </div>
                                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                                +₹{(summary?.inflows?.b2bCashRecovered || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {summary?.inflows?.settlements?.length > 0 ? (
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                {summary.inflows.settlements.map((s, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60">
                                                        <div>
                                                            <span className="font-bold block text-slate-800 dark:text-zinc-200">{s.partnerName}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{s.receiptNo} • {s.time}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                            ₹{s.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 text-center rounded-lg bg-slate-100/60 dark:bg-zinc-900/40 text-[11px] text-slate-400">
                                                No B2B partner cash settlements recorded today.
                                            </div>
                                        )}
                                    </div>

                                    {/* OUTFLOWS: PETTY CASH EXPENSES & REFUNDS */}
                                    <div className={cn("p-4 space-y-3", ui.cardSecondary)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Daily Expenses & Refunds</span>
                                            </div>
                                            <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                                                -₹{((summary?.outflows?.dailyExpensesCash || 0) + (summary?.outflows?.refundsCash || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {summary?.outflows?.expenses?.length > 0 ? (
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                {summary.outflows.expenses.map((e, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60">
                                                        <div>
                                                            <span className="font-bold block text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">{e.description}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{e.category} • {e.time}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                                            -₹{e.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 text-center rounded-lg bg-slate-100/60 dark:bg-zinc-900/40 text-[11px] text-slate-400">
                                                No cash petty expenses disbursed from desk today.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ========================================================= */}
                        {/* RIGHT COLUMN: RECONCILIATION & DENOMINATIONS (5 COLS) */}
                        {/* ========================================================= */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* CARD 3: CASH RECONCILIATION & DENOMINATION COUNT */}
                            <div className={cn("p-5 space-y-5", ui.card)}>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                            Physical Cash Drawer Settlement
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">System Expected</span>
                                        <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                                            ₹{systemExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* OPENING FLOAT INPUT */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Shift Opening Float</span>
                                        <span className="text-[10px] text-slate-400">Initial change drawer reserve</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold font-mono text-slate-500">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            value={openingFloat}
                                            disabled={!!submissionResult}
                                            onChange={(e) => setOpeningFloat(e.target.value)}
                                            className={cn("w-28 px-2.5 py-1 text-right text-xs font-mono font-bold", ui.input)}
                                        />
                                    </div>
                                </div>

                                {/* DENOMINATION INPUT TABLE */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <span>Denomination</span>
                                        <span className="text-center pl-10">Count</span>
                                        <span>Subtotal</span>
                                    </div>

                                    {[
                                        { key: 'notes500', note: 500, label: '₹500 Note', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
                                        { key: 'notes200', note: 200, label: '₹200 Note', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20' },
                                        { key: 'notes100', note: 100, label: '₹100 Note', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
                                        { key: 'notes50',  note: 50,  label: '₹50 Note',  color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20' },
                                        { key: 'notes20',  note: 20,  label: '₹20 Note',  color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
                                        { key: 'notes10',  note: 10,  label: '₹10 Note',  color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
                                        { key: 'coins',    note: 1,   label: 'Coins / Small', color: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20' }
                                    ].map(d => {
                                        const count = d.key === 'coins' ? parseFloat(denominations[d.key]) || 0 : parseInt(denominations[d.key], 10) || 0;
                                        const subtotal = d.key === 'coins' ? count : count * d.note;

                                        return (
                                            <div key={d.key} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
                                                <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold font-mono border", d.color)}>
                                                    {d.label}
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={denominations[d.key]}
                                                    disabled={!!submissionResult}
                                                    onChange={(e) => handleDenomChange(d.key, e.target.value)}
                                                    className={cn("w-24 px-2.5 py-1 text-center text-xs font-mono font-bold", ui.input)}
                                                />

                                                <span className="w-24 text-right font-mono font-bold text-xs text-slate-800 dark:text-zinc-200">
                                                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* LIVE TOTAL COUNTED & VARIANCE POD */}
                                <div className={cn("p-4 space-y-2.5", ui.pod)}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Total Counted Cash:</span>
                                        <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                                            ₹{physicalCounted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">System Expected:</span>
                                        <span className="font-mono text-slate-700 dark:text-zinc-300">
                                            ₹{systemExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {/* VARIANCE INDICATOR */}
                                    <div className="pt-2 border-t border-slate-300/80 dark:border-zinc-700 flex items-center justify-between">
                                        <span className="text-xs font-bold">Variance / Discrepancy:</span>
                                        <div>
                                            {isMatch && (
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    MATCH (₹0.00)
                                                </span>
                                            )}
                                            {isShortage && (
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    SHORTAGE -₹{Math.abs(variance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                            {isSurplus && (
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    SURPLUS +₹{variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* HANDOVER DESTINATION & NOTES */}
                                <div className="space-y-3 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                                Shift Session
                                            </label>
                                            <select
                                                value={shiftName}
                                                disabled={!!submissionResult}
                                                onChange={(e) => setShiftName(e.target.value)}
                                                className={cn("w-full px-2.5 py-1.5 text-xs font-medium", ui.input)}
                                            >
                                                <option value="Day Shift">Day Shift</option>
                                                <option value="Morning Shift">Morning Shift</option>
                                                <option value="Evening Shift">Evening Shift</option>
                                                <option value="Night Shift">Night Shift</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                                Supervisor / Reliever
                                            </label>
                                            <select
                                                value={supervisorUserId}
                                                disabled={!!submissionResult}
                                                onChange={(e) => setSupervisorUserId(e.target.value)}
                                                className={cn("w-full px-2.5 py-1.5 text-xs font-medium", ui.input)}
                                            >
                                                <option value="">Select Supervisor...</option>
                                                {summary?.supervisors?.map(s => (
                                                    <option key={s.userId} value={s.userId}>
                                                        {s.name} ({s.designation})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                            Handover Notes / Cash Envelope Reference
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. Sealed Envelope #ENV-402, handed over to evening cashier. ₹100 shortage due to patient change pending..."
                                            value={handoverNotes}
                                            disabled={!!submissionResult}
                                            onChange={(e) => setHandoverNotes(e.target.value)}
                                            className={cn("w-full px-3 py-1.5 text-xs", ui.input)}
                                        />
                                    </div>
                                </div>

                                {/* PRIMARY COMMIT BUTTON */}
                                {!submissionResult ? (
                                    <button
                                        type="button"
                                        onClick={handleSubmitClosing}
                                        disabled={submitting}
                                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Locking & Submitting Shift Handover...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4" />
                                                <span>Submit Handover & Lock Shift ➔</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5">
                                        <Lock className="w-4 h-4 text-emerald-600" />
                                        <span>Shift Handover Recorded in System Ledger</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* THERMAL 80MM SLIP PREVIEW MODAL */}
            {isPrintSlipOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-zinc-800 p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Printer className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cashier Shift Handover Slip</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrintSlipOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* THERMAL SLIP BODY */}
                        <div id="shift-thermal-slip" className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-dashed border-slate-300 dark:border-zinc-700 font-mono text-xs space-y-3">
                            <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-zinc-700">
                                <span className="font-black text-sm block">SRI DIVYA DIAGNOSTIC CENTRE</span>
                                <span className="text-[11px] text-slate-500 block uppercase font-bold">Cashier Shift Handover Voucher</span>
                                <span className="text-[10px] text-slate-400 block mt-1">Generated: {new Date().toLocaleString()}</span>
                            </div>

                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Cashier:</span>
                                    <span className="font-bold">{summary?.userName || user?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Shift Date / Session:</span>
                                    <span className="font-bold">{summary?.shiftDate || new Date().toISOString().split('T')[0]} ({shiftName})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Visits Handled:</span>
                                    <span className="font-bold">{(summary?.retailActivity?.billsCount || 0) + (summary?.b2bActivity?.billsCount || 0)}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-zinc-700 space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span>Opening Float:</span>
                                    <span>₹{(parseFloat(openingFloat) || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>(+) Patient Desk Cash:</span>
                                    <span>₹{(summary?.retailActivity?.cashCollected || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>(+) B2B Cash Recovered:</span>
                                    <span>₹{(summary?.inflows?.b2bCashRecovered || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                    <span>(-) Desk Petty Expenses:</span>
                                    <span>-₹{(summary?.outflows?.dailyExpensesCash || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-amber-600">
                                    <span>(-) Patient Refunds:</span>
                                    <span>-₹{(summary?.outflows?.refundsCash || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-zinc-700 space-y-1 text-xs">
                                <div className="flex justify-between font-bold">
                                    <span>System Expected Cash:</span>
                                    <span>₹{systemExpected.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
                                    <span>Physical Counted Cash:</span>
                                    <span>₹{physicalCounted.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Handover Variance:</span>
                                    <span className={isMatch ? "text-emerald-600" : isShortage ? "text-rose-600" : "text-blue-600"}>
                                        {isMatch ? "₹0.00 (Balanced)" : `${variance > 0 ? '+' : ''}₹${variance.toFixed(2)}`}
                                    </span>
                                </div>
                            </div>

                            {/* DENOMINATIONS MINI BREAKDOWN */}
                            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-zinc-700 text-[10px] space-y-0.5">
                                <div className="font-bold text-slate-500 mb-1">Sealed Cash Breakdown:</div>
                                {denominations.notes500 && <div>500 x {denominations.notes500} = ₹{(parseInt(denominations.notes500, 10) * 500).toFixed(2)}</div>}
                                {denominations.notes200 && <div>200 x {denominations.notes200} = ₹{(parseInt(denominations.notes200, 10) * 200).toFixed(2)}</div>}
                                {denominations.notes100 && <div>100 x {denominations.notes100} = ₹{(parseInt(denominations.notes100, 10) * 100).toFixed(2)}</div>}
                                {denominations.notes50 && <div>50 x {denominations.notes50} = ₹{(parseInt(denominations.notes50, 10) * 50).toFixed(2)}</div>}
                                {denominations.notes20 && <div>20 x {denominations.notes20} = ₹{(parseInt(denominations.notes20, 10) * 20).toFixed(2)}</div>}
                                {denominations.notes10 && <div>10 x {denominations.notes10} = ₹{(parseInt(denominations.notes10, 10) * 10).toFixed(2)}</div>}
                                {denominations.coins && <div>Coins = ₹{parseFloat(denominations.coins).toFixed(2)}</div>}
                            </div>

                            {handoverNotes && (
                                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-zinc-700 text-[10px] text-slate-600 italic">
                                    Notes: {handoverNotes}
                                </div>
                            )}

                            {/* DUAL SIGNATURE QUAD */}
                            <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px]">
                                <div>
                                    <div className="border-b border-slate-300 dark:border-zinc-700 pb-5 mb-1"></div>
                                    <span className="text-slate-500 font-semibold">Cashier Signature</span>
                                </div>
                                <div>
                                    <div className="border-b border-slate-300 dark:border-zinc-700 pb-5 mb-1"></div>
                                    <span className="text-slate-500 font-semibold">Supervisor / Receiver</span>
                                </div>
                            </div>
                        </div>

                        {/* MODAL ACTIONS */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print Thermal Slip</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
