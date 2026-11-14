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
    TrendingUp,
    Pencil,
    RotateCcw,
    Plus,
    Minus,
    HelpCircle
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

    // Soft Adjustments / Corrections State
    // keys: 'deskCash', 'deskUpi', 'remainingDue', 'b2bRecovered', 'dailyExpenses', 'refundsCash', 'openingFloat'
    const [adjustments, setAdjustments] = useState({});
    const [activeCorrectionTarget, setActiveCorrectionTarget] = useState(null);
    const [correctionModalForm, setCorrectionModalForm] = useState({
        newVal: '',
        reason: '',
        presetReason: ''
    });

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

    // Effective Metric Helpers (Accounting for Soft Adjustments)
    const getEffectiveValue = (metricKey, originalValue) => {
        if (adjustments[metricKey] !== undefined) {
            return adjustments[metricKey].value;
        }
        return originalValue;
    };

    const effectiveDeskCash = useMemo(() => {
        return getEffectiveValue('deskCash', summary?.retailActivity?.cashCollected || 0);
    }, [adjustments, summary]);

    const effectiveDeskUpi = useMemo(() => {
        return getEffectiveValue('deskUpi', summary?.retailActivity?.upiCollected || 0);
    }, [adjustments, summary]);

    const effectiveRemainingDue = useMemo(() => {
        return getEffectiveValue('remainingDue', summary?.retailActivity?.remainingDue || 0);
    }, [adjustments, summary]);

    const effectiveB2bRecovered = useMemo(() => {
        return getEffectiveValue('b2bRecovered', summary?.inflows?.b2bCashRecovered || 0);
    }, [adjustments, summary]);

    const effectiveDailyExpenses = useMemo(() => {
        return getEffectiveValue('dailyExpenses', summary?.outflows?.dailyExpensesCash || 0);
    }, [adjustments, summary]);

    const effectiveRefundsCash = useMemo(() => {
        return getEffectiveValue('refundsCash', summary?.outflows?.refundsCash || 0);
    }, [adjustments, summary]);

    const effectiveOpeningFloat = useMemo(() => {
        return parseFloat(openingFloat) || 0;
    }, [openingFloat]);

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

    // Live Math: System Expected Cash (incorporating soft adjustments)
    const systemExpected = useMemo(() => {
        const insuranceCash = summary?.insuranceActivity?.coPayCashCollected || 0;
        const totalInflows = effectiveDeskCash + insuranceCash + effectiveB2bRecovered;
        const totalOutflows = effectiveDailyExpenses + effectiveRefundsCash;
        return Math.max(0, effectiveOpeningFloat + totalInflows - totalOutflows);
    }, [effectiveOpeningFloat, effectiveDeskCash, effectiveB2bRecovered, effectiveDailyExpenses, effectiveRefundsCash, summary]);

    // Live Math: Variance
    const variance = useMemo(() => {
        return physicalCounted - systemExpected;
    }, [physicalCounted, systemExpected]);

    const isMatch = Math.abs(variance) < 0.01;
    const isShortage = variance < -0.01;
    const isSurplus = variance > 0.01;

    // Denomination Increments / Decrements
    const handleDenomChange = (field, val) => {
        if (submissionResult) return;
        setDenominations(prev => ({
            ...prev,
            [field]: val
        }));
    };

    const handleDenomStep = (field, step) => {
        if (submissionResult) return;
        setDenominations(prev => {
            const current = parseInt(prev[field], 10) || 0;
            const next = Math.max(0, current + step);
            return {
                ...prev,
                [field]: next === 0 ? '' : next.toString()
            };
        });
    };

    // Soft Adjustment Modal Handlers
    const openCorrectionModal = (metricKey, label, originalVal) => {
        if (submissionResult) return;
        const existingAdj = adjustments[metricKey];
        setActiveCorrectionTarget({
            key: metricKey,
            label: label,
            originalVal: originalVal,
            currentVal: existingAdj !== undefined ? existingAdj.value : originalVal
        });
        setCorrectionModalForm({
            newVal: (existingAdj !== undefined ? existingAdj.value : originalVal).toString(),
            reason: existingAdj?.reason || '',
            presetReason: ''
        });
    };

    const applyCorrection = () => {
        if (!activeCorrectionTarget) return;
        const parsedNew = parseFloat(correctionModalForm.newVal);
        if (isNaN(parsedNew) || parsedNew < 0) {
            alert("Please enter a valid non-negative amount.");
            return;
        }
        if (!correctionModalForm.reason.trim()) {
            alert("A reason is mandatory for adjusting shift records (audit compliance).");
            return;
        }

        setAdjustments(prev => ({
            ...prev,
            [activeCorrectionTarget.key]: {
                original: activeCorrectionTarget.originalVal,
                value: parsedNew,
                reason: correctionModalForm.reason.trim(),
                timestamp: new Date().toLocaleTimeString()
            }
        }));

        setActiveCorrectionTarget(null);
    };

    const resetCorrection = (metricKey) => {
        setAdjustments(prev => {
            const copy = { ...prev };
            delete copy[metricKey];
            return copy;
        });
        setActiveCorrectionTarget(null);
    };

    // Submit Shift Closing
    const handleSubmitClosing = async () => {
        try {
            setSubmitting(true);
            setErrorMessage(null);

            const payload = {
                shiftName: shiftName || 'Day Shift',
                openingFloat: effectiveOpeningFloat,
                physicalCountedCash: physicalCounted,
                adjustedExpectedCash: systemExpected,
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
                supervisorUserId: supervisorUserId ? supervisorUserId : null,
                correctionsJson: Object.keys(adjustments).length > 0 ? JSON.stringify(adjustments) : null,
                activitySummaryJson: JSON.stringify({
                    retail: {
                        netBilled: summary?.retailActivity?.netBilled || 0,
                        deskCash: effectiveDeskCash,
                        upi: effectiveDeskUpi,
                        remainingDue: effectiveRemainingDue
                    },
                    b2b: {
                        partnerBilled: summary?.b2bActivity?.partnerBilled || 0,
                        recoveriesCash: effectiveB2bRecovered
                    },
                    outflows: {
                        expenses: effectiveDailyExpenses,
                        refunds: effectiveRefundsCash
                    },
                    reconciliation: {
                        openingFloat: effectiveOpeningFloat,
                        systemExpected: systemExpected,
                        physicalCounted: physicalCounted,
                        variance: variance
                    },
                    adjustments: adjustments
                })
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

    const adjustmentCount = Object.keys(adjustments).length;

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
                            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                                End Shift & Handover Cash
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 font-mono">
                                #SHIFT-CLOSING
                            </span>
                            {adjustmentCount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono flex items-center gap-1">
                                    <Pencil className="w-3 h-3" />
                                    {adjustmentCount} {adjustmentCount === 1 ? 'ADJUSTMENT' : 'ADJUSTMENTS'} ACTIVE
                                </span>
                            )}
                            {submissionResult && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    LOCKED & HANDED OVER
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                            Cashier: <span className="font-bold text-slate-800 dark:text-zinc-200">{summary?.userName || user?.name || user?.username}</span> • Shift Date: <span className="font-mono font-semibold">{summary?.shiftDate || new Date().toISOString().split('T')[0]}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setIsPrintSlipOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print Handover Slip</span>
                    </button>
                    <button
                        type="button"
                        onClick={loadSummary}
                        disabled={loading}
                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                        title="Reload Shift Data"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ERROR BANNER */}
            {errorMessage && (
                <div className="mx-6 mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-center justify-between">
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
                    <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">Reconciling today's front-desk intake & ledgers...</p>
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                    {/* TOP SUMMARY POD (SUCCESS CELEBRATION IF SUBMITTED) */}
                    {submissionResult && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <Check className="w-6 h-6 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-base">Shift Successfully Closed & Handed Over</h3>
                                    <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mt-0.5">
                                        Physically Counted: <span className="tabular-nums font-black">₹{physicalCounted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> • Variance: <span className="tabular-nums font-black">{isMatch ? '₹0.00 (Balanced)' : `₹${variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 self-end md:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsPrintSlipOpen(true)}
                                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-zinc-900 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Print Envelope Slip</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                                >
                                    <LogOut className="w-4 h-4" />
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
                            <div className={cn("p-6 space-y-5", ui.card)}>
                                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                                Intake & Billing Across 3 Canonical Payer Modes
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                                                Click any metric with <Pencil className="w-3 h-3 inline text-slate-400" /> to perform a soft correction with reason
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                                        {(summary?.retailActivity?.billsCount || 0) + (summary?.b2bActivity?.billsCount || 0) + (summary?.insuranceActivity?.claimsCount || 0)} Total Visits
                                    </span>
                                </div>

                                {/* 3-MODE SUMMARY TILES */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    {/* MODE 1: DIRECT STANDARD */}
                                    <div className={cn("p-4 flex flex-col justify-between rounded-xl", ui.pod)}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">Direct / Standard</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono">
                                                    Retail
                                                </span>
                                            </div>
                                            <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                                                ₹{(summary?.retailActivity?.netBilled || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                                {summary?.retailActivity?.billsCount || 0} Bills • Gross: ₹{(summary?.retailActivity?.grossTariff || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-300/60 dark:border-zinc-700/60 text-xs sm:text-sm space-y-2">
                                            {/* Desk Cash with soft edit */}
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500 font-medium">Desk Cash:</span>
                                                    {!submissionResult && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openCorrectionModal('deskCash', 'Desk Cash Collected', summary?.retailActivity?.cashCollected || 0)}
                                                            className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-opacity"
                                                            title="Correct Desk Cash with reason"
                                                        >
                                                            <Pencil className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={cn("font-mono font-bold text-emerald-600 dark:text-emerald-400", adjustments.deskCash && "underline decoration-dotted")}>
                                                        ₹{effectiveDeskCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </span>
                                                    {adjustments.deskCash && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono" title={`Reason: ${adjustments.deskCash.reason}`}>
                                                            ADJ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Desk UPI with soft edit */}
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500 font-medium">UPI / QR:</span>
                                                    {!submissionResult && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openCorrectionModal('deskUpi', 'Desk UPI/Online Collected', summary?.retailActivity?.upiCollected || 0)}
                                                            className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-opacity"
                                                            title="Correct UPI with reason"
                                                        >
                                                            <Pencil className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={cn("font-mono font-bold text-blue-600 dark:text-blue-400", adjustments.deskUpi && "underline decoration-dotted")}>
                                                        ₹{effectiveDeskUpi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </span>
                                                    {adjustments.deskUpi && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono" title={`Reason: ${adjustments.deskUpi.reason}`}>
                                                            ADJ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Remaining Due */}
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500 font-medium">Remaining Due:</span>
                                                    {!submissionResult && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openCorrectionModal('remainingDue', 'Retail Remaining Due', summary?.retailActivity?.remainingDue || 0)}
                                                            className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-opacity"
                                                            title="Correct Remaining Due with reason"
                                                        >
                                                            <Pencil className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={cn("font-mono font-bold text-amber-600 dark:text-amber-400", adjustments.remainingDue && "underline decoration-dotted")}>
                                                        ₹{effectiveRemainingDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </span>
                                                    {adjustments.remainingDue && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono" title={`Reason: ${adjustments.remainingDue.reason}`}>
                                                            ADJ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MODE 2: CORPORATE B2B PREPAID */}
                                    <div className={cn("p-4 flex flex-col justify-between rounded-xl", ui.pod)}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">Corporate B2B</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono">
                                                    B2B Prepaid
                                                </span>
                                            </div>
                                            <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                                                ₹{(summary?.b2bActivity?.partnerBilled || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                                {summary?.b2bActivity?.billsCount || 0} Bills • Gross: ₹{(summary?.b2bActivity?.grossTariff || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-300/60 dark:border-zinc-700/60 text-xs sm:text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Desk Cash:</span>
                                                <span className="tabular-nums font-bold text-slate-400">₹0.00 (Partner)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">B2B Billing:</span>
                                                <span className="font-bold text-amber-600 dark:text-amber-400">Monthly Ledger</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Concession:</span>
                                                <span className="font-bold text-slate-600 dark:text-zinc-300">Contract Rate</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MODE 3: INSURANCE / TPA */}
                                    <div className={cn("p-4 flex flex-col justify-between rounded-xl", ui.pod)}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">Insurance / TPA</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                                                    Cashless
                                                </span>
                                            </div>
                                            <div className="mt-2 text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                                                ₹{(summary?.insuranceActivity?.preAuthGross || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                                {summary?.insuranceActivity?.claimsCount || 0} Claims Pre-Approved
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-300/60 dark:border-zinc-700/60 text-xs sm:text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Co-Pay Cash:</span>
                                                <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">₹{(summary?.insuranceActivity?.coPayCashCollected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Settlement:</span>
                                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">TPA Claims</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Status:</span>
                                                <span className="font-mono font-bold text-slate-600 dark:text-zinc-300">Pre-Auth Cleared</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 2: MID-SHIFT DRAWER INFLOWS & OUTFLOWS */}
                            <div className={cn("p-6 space-y-5", ui.card)}>
                                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                                Mid-Shift Desk Inflows & Counter Outflows
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                                                B2B Debt recoveries in cash and petty disbursements (editable with audit reason)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* INFLOWS: B2B CASH RECOVERIES */}
                                    <div className={cn("p-4 space-y-3 rounded-xl", ui.cardSecondary)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">B2B Cash Recoveries</span>
                                                {!submissionResult && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openCorrectionModal('b2bRecovered', 'B2B Cash Recoveries', summary?.inflows?.b2bCashRecovered || 0)}
                                                        className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-opacity"
                                                        title="Correct B2B Cash Recoveries with reason"
                                                    >
                                                        <Pencil className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className={cn("font-mono font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400", adjustments.b2bRecovered && "underline decoration-dotted")}>
                                                    +₹{effectiveB2bRecovered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                                {adjustments.b2bRecovered && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono" title={`Reason: ${adjustments.b2bRecovered.reason}`}>
                                                        ADJ
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {summary?.inflows?.settlements?.length > 0 ? (
                                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                                {summary.inflows.settlements.map((s, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60">
                                                        <div>
                                                            <span className="font-bold block text-slate-800 dark:text-zinc-200">{s.partnerName}</span>
                                                            <span className="text-[11px] text-slate-500 font-mono">{s.receiptNo} • {s.time}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                            ₹{s.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 text-center rounded-lg bg-slate-100/60 dark:bg-zinc-900/40 text-xs text-slate-500">
                                                No B2B partner cash settlements recorded today.
                                            </div>
                                        )}
                                    </div>

                                    {/* OUTFLOWS: PETTY CASH EXPENSES & REFUNDS */}
                                    <div className={cn("p-4 space-y-3 rounded-xl", ui.cardSecondary)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">Daily Expenses & Refunds</span>
                                                {!submissionResult && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openCorrectionModal('dailyExpenses', 'Daily Desk Petty Expenses', summary?.outflows?.dailyExpensesCash || 0)}
                                                        className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-opacity"
                                                        title="Correct Daily Expenses with reason"
                                                    >
                                                        <Pencil className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className={cn("font-mono font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400", adjustments.dailyExpenses && "underline decoration-dotted")}>
                                                    -₹{(effectiveDailyExpenses + effectiveRefundsCash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                                {adjustments.dailyExpenses && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono" title={`Reason: ${adjustments.dailyExpenses.reason}`}>
                                                        ADJ
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {summary?.outflows?.expenses?.length > 0 ? (
                                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                                {summary.outflows.expenses.map((e, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60">
                                                        <div>
                                                            <span className="font-bold block text-slate-800 dark:text-zinc-200 truncate max-w-[190px]">{e.description}</span>
                                                            <span className="text-[11px] text-slate-500 font-mono">{e.category} • {e.time}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                                            -₹{e.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 text-center rounded-lg bg-slate-100/60 dark:bg-zinc-900/40 text-xs text-slate-500">
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
                            <div className={cn("p-6 space-y-5", ui.card)}>
                                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-zinc-800">
                                    <div className="flex items-center gap-2.5">
                                        <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                            Physical Cash Drawer Settlement
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider block font-bold">System Expected</span>
                                        <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                                            ₹{systemExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* OPENING FLOAT INPUT */}
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 block">Shift Opening Float</span>
                                        <span className="text-xs text-slate-500">Initial change drawer reserve</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold font-mono text-slate-500">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            value={openingFloat}
                                            disabled={!!submissionResult}
                                            onChange={(e) => setOpeningFloat(e.target.value)}
                                            className={cn("w-32 px-3 py-1.5 text-right text-sm font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", ui.input)}
                                        />
                                    </div>
                                </div>

                                {/* DENOMINATION INPUT TABLE (EXPANDED FONTS & CLEAN STEPPERS) */}
                                <div className="space-y-2.5">
                                    <div className="grid grid-cols-12 px-2 text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                        <span className="col-span-5">Denomination</span>
                                        <span className="col-span-4 text-center">Count</span>
                                        <span className="col-span-3 text-right">Subtotal</span>
                                    </div>

                                    {[
                                        { key: 'notes500', note: 500, label: '₹500 Note', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' },
                                        { key: 'notes200', note: 200, label: '₹200 Note', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25' },
                                        { key: 'notes100', note: 100, label: '₹100 Note', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25' },
                                        { key: 'notes50',  note: 50,  label: '₹50 Note',  color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25' },
                                        { key: 'notes20',  note: 20,  label: '₹20 Note',  color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25' },
                                        { key: 'notes10',  note: 10,  label: '₹10 Note',  color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25' },
                                        { key: 'coins',    note: 1,   label: 'Coins / Small', color: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25' }
                                    ].map(d => {
                                        const count = d.key === 'coins' ? parseFloat(denominations[d.key]) || 0 : parseInt(denominations[d.key], 10) || 0;
                                        const subtotal = d.key === 'coins' ? count : count * d.note;

                                        return (
                                            <div key={d.key} className="grid grid-cols-12 items-center p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800">
                                                {/* Denomination badge */}
                                                <div className="col-span-5 flex items-center">
                                                    <span className={cn("px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold font-mono border", d.color)}>
                                                        {d.label}
                                                    </span>
                                                </div>

                                                {/* Count Column with clean steppers (NO curving native spinners) */}
                                                <div className="col-span-4 flex items-center justify-center gap-1">
                                                    {!submissionResult && d.key !== 'coins' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDenomStep(d.key, -1)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200/70 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer active:scale-95 text-xs font-bold"
                                                            title="Subtract 1"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={denominations[d.key]}
                                                        disabled={!!submissionResult}
                                                        onChange={(e) => handleDenomChange(d.key, e.target.value)}
                                                        className={cn(
                                                            "w-16 sm:w-20 py-1.5 text-center text-sm sm:text-base font-mono font-black text-slate-900 dark:text-white rounded-lg border",
                                                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                            ui.input
                                                        )}
                                                    />

                                                    {!submissionResult && d.key !== 'coins' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDenomStep(d.key, 1)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200/70 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer active:scale-95 text-xs font-bold"
                                                            title="Add 1"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Subtotal */}
                                                <div className="col-span-3 text-right">
                                                    <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                                        ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* LIVE TOTAL COUNTED & VARIANCE POD */}
                                <div className={cn("p-4 sm:p-5 space-y-3 rounded-xl", ui.pod)}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">Total Counted Cash:</span>
                                        <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
                                            ₹{physicalCounted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs sm:text-sm">
                                        <span className="text-slate-500 font-medium">System Expected:</span>
                                        <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                                            ₹{systemExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {/* VARIANCE INDICATOR */}
                                    <div className="pt-2.5 border-t border-slate-300/80 dark:border-zinc-700 flex items-center justify-between">
                                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-200">Variance / Discrepancy:</span>
                                        <div>
                                            {isMatch && (
                                                <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    MATCH (₹0.00)
                                                </span>
                                            )}
                                            {isShortage && (
                                                <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-xs">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    SHORTAGE -₹{Math.abs(variance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                            {isSurplus && (
                                                <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5 shadow-xs">
                                                    <TrendingUp className="w-4 h-4" />
                                                    SURPLUS +₹{variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* HANDOVER DESTINATION & NOTES */}
                                <div className="space-y-3 pt-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                                Shift Session
                                            </label>
                                            <select
                                                value={shiftName}
                                                disabled={!!submissionResult}
                                                onChange={(e) => setShiftName(e.target.value)}
                                                className={cn("w-full px-3 py-2 text-xs sm:text-sm font-medium", ui.input)}
                                            >
                                                <option value="Day Shift">Day Shift</option>
                                                <option value="Morning Shift">Morning Shift</option>
                                                <option value="Evening Shift">Evening Shift</option>
                                                <option value="Night Shift">Night Shift</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                                Supervisor / Reliever
                                            </label>
                                            <select
                                                value={supervisorUserId}
                                                disabled={!!submissionResult}
                                                onChange={(e) => setSupervisorUserId(e.target.value)}
                                                className={cn("w-full px-3 py-2 text-xs sm:text-sm font-medium", ui.input)}
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
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                            Handover Notes / Cash Envelope Reference
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. Sealed Envelope #ENV-402, handed over to evening cashier. Any operational context..."
                                            value={handoverNotes}
                                            disabled={!!submissionResult}
                                            onChange={(e) => setHandoverNotes(e.target.value)}
                                            className={cn("w-full px-3 py-2 text-xs sm:text-sm", ui.input)}
                                        />
                                    </div>
                                </div>

                                {/* PRIMARY COMMIT BUTTON */}
                                {!submissionResult ? (
                                    <button
                                        type="button"
                                        onClick={handleSubmitClosing}
                                        disabled={submitting}
                                        className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
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
                                    <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-center text-sm font-bold text-slate-500 flex items-center justify-center gap-2">
                                        <Lock className="w-4 h-4 text-emerald-600" />
                                        <span>Shift Handover Recorded in System Ledger</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SOFT CORRECTION / NUMBER ADJUSTMENT MODAL */}
            {activeCorrectionTarget && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-zinc-800 p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    <Pencil className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                        Adjust Metric: {activeCorrectionTarget.label}
                                    </h3>
                                    <p className="text-xs text-slate-500">Soft adjustment with required audit reason</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveCorrectionTarget(null)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Values Comparison */}
                            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 text-xs sm:text-sm">
                                <div>
                                    <span className="text-slate-500 block text-xs">System Recorded:</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300 text-sm">
                                        ₹{activeCorrectionTarget.originalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-slate-700 dark:text-zinc-300 block text-xs font-bold mb-1">
                                        Adjusted Amount (₹):
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={correctionModalForm.newVal}
                                        onChange={(e) => setCorrectionModalForm({ ...correctionModalForm, newVal: e.target.value })}
                                        className={cn("w-full px-3 py-1.5 font-mono font-bold text-sm", ui.input)}
                                    />
                                </div>
                            </div>

                            {/* Preset Reason Chips */}
                            <div className="space-y-1.5">
                                <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 block">
                                    Quick Preset Reasons:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        "Mismatched Payment Mode (UPI marked as Cash)",
                                        "Offline Cash Collection",
                                        "Counter Change Discrepancy",
                                        "Late Partner Settle Inflow",
                                        "Petty Voucher Typo Correction"
                                    ].map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setCorrectionModalForm({ ...correctionModalForm, reason: preset })}
                                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mandatory Reason Input */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                    Mandatory Reason for Adjustment <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Explain why this number is being adjusted for audit logs..."
                                    value={correctionModalForm.reason}
                                    onChange={(e) => setCorrectionModalForm({ ...correctionModalForm, reason: e.target.value })}
                                    className={cn("w-full px-3 py-2 text-xs sm:text-sm", ui.input)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-zinc-800">
                            {adjustments[activeCorrectionTarget.key] ? (
                                <button
                                    type="button"
                                    onClick={() => resetCorrection(activeCorrectionTarget.key)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset to System</span>
                                </button>
                            ) : <div />}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveCorrectionTarget(null)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={applyCorrection}
                                    disabled={!correctionModalForm.reason.trim()}
                                    className="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Apply Adjustment</span>
                                </button>
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
                                    <span>₹{effectiveOpeningFloat.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>(+) Patient Desk Cash:</span>
                                    <span>₹{effectiveDeskCash.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>(+) B2B Cash Recovered:</span>
                                    <span>₹{effectiveB2bRecovered.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                    <span>(-) Desk Petty Expenses:</span>
                                    <span>-₹{effectiveDailyExpenses.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-amber-600">
                                    <span>(-) Patient Refunds:</span>
                                    <span>-₹{effectiveRefundsCash.toFixed(2)}</span>
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

                            {/* AUDIT ADJUSTMENTS SUMMARY IN SLIP */}
                            {adjustmentCount > 0 && (
                                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-zinc-700 text-[10px] space-y-0.5 text-indigo-700 dark:text-indigo-400">
                                    <div className="font-bold">Adjustments Recorded ({adjustmentCount}):</div>
                                    {Object.entries(adjustments).map(([k, adj]) => (
                                        <div key={k}>• {k}: was ₹{adj.original} ➔ ₹{adj.value} ({adj.reason})</div>
                                    ))}
                                </div>
                            )}

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
