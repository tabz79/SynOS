import { useState, useEffect } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock, AlertCircle, Smartphone, CreditCard } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

// Safe extractor for B2B discount state handling case variations (b2b, b2B, B2B)
const extractB2BInfo = (snap) => {
    const v = snap?.visit || {};
    const b = snap?.billing || {};
    const rawVal = v.b2bDiscountValue ?? v.b2BDiscountValue ?? v.B2BDiscountValue ?? b.b2bDiscountAmount ?? b.b2BDiscountAmount ?? b.B2BDiscountAmount ?? 0;
    const rawType = (v.b2bDiscountType ?? v.b2BDiscountType ?? v.B2BDiscountType ?? 'Flat') === 'Percentage' ? 'PERCENTAGE' : 'FLAT';
    const rawAmount = v.b2bDiscountAmount ?? v.b2BDiscountAmount ?? v.B2BDiscountAmount ?? b.b2bDiscountAmount ?? b.b2BDiscountAmount ?? b.B2BDiscountAmount ?? 0;
    const enteredBy = v.b2bDiscountEnteredBy ?? v.b2BDiscountEnteredBy ?? v.B2BDiscountEnteredBy;
    const enteredAt = v.b2bDiscountEnteredAt ?? v.b2BDiscountEnteredAt ?? v.B2BDiscountEnteredAt;
    return { rawVal: Number(rawVal) || 0, rawType, rawAmount: Number(rawAmount) || 0, enteredBy, enteredAt };
};

export function BillingSummary({ snapshot, onVisitUpdated, isCorrectionIntent, isPrepaidIntent, billingMode = 'Standard', paymentMethod, setPaymentMethod }) {
    // Local UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [discountCatalog, setDiscountCatalog] = useState([]);

    // Custom Discount State (Percentage vs Flat) - Default to 'custom' as requested
    const [discountInputMode, setDiscountInputMode] = useState('custom'); // 'custom' | 'catalog'
    const [customDiscountType, setCustomDiscountType] = useState('PERCENTAGE'); // 'PERCENTAGE' | 'FLAT'
    const [customDiscountValue, setCustomDiscountValue] = useState('');
    const [customDiscountReason, setCustomDiscountReason] = useState('');

    // B2B Prepaid Partner Rate State (Dual Mode: Flat vs Percentage)
    const initialB2B = extractB2BInfo(snapshot);
    const [b2bDiscountType, setB2BDiscountType] = useState(initialB2B.rawType);
    const [localB2BInput, setLocalB2BInput] = useState(initialB2B.rawVal && initialB2B.rawVal > 0 ? String(initialB2B.rawVal) : '');
    const [isB2BEditing, setIsB2BEditing] = useState(false);

    useEffect(() => {
        if (!isB2BEditing) {
            const current = extractB2BInfo(snapshot);
            setB2BDiscountType(current.rawType);
            setLocalB2BInput(current.rawVal && current.rawVal > 0 ? String(current.rawVal) : '');
        }
    }, [
        snapshot?.visit?.b2bDiscountValue, snapshot?.visit?.b2BDiscountValue,
        snapshot?.visit?.b2bDiscountAmount, snapshot?.visit?.b2BDiscountAmount,
        snapshot?.visit?.b2bDiscountType, snapshot?.visit?.b2BDiscountType,
        snapshot?.billing?.b2bDiscountAmount, snapshot?.billing?.b2BDiscountAmount,
        isB2BEditing
    ]);

    // Correction Modal State
    const [correctionState, setCorrectionState] = useState({
        isOpen: false,
        type: null,
        payload: null,
        reason: ""
    });

    // 1. PURE RENDER SOURCE: Snapshot
    const billing = snapshot?.billing;
    const uiHints = snapshot?.uiHints;
    const visitId = snapshot?.visit?.visitId || snapshot?.visit?.id;

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        indicator: "bg-zinc-800 border-synos-border type-label",
        headerText: "type-value",
        container: "bg-zinc-950/25 border-synos-border",
        rowLabel: "type-label",
        rowValue: "type-code", // Financials = Mono
        netLabel: "type-value",
        netValue: "type-page-title", // 20px Bold
        input: "bg-zinc-900 border-synos-border type-body focus:border-synos-primary",
        method: {
            active: "bg-zinc-100 border-white shadow-md",
            inactive: "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
        }
    } : {
        indicator: "bg-white border-zinc-200 shadow-sm type-label",
        headerText: "type-value",
        // UNIFIED CARD STYLE (From Patient Card)
        container: "p-4 rounded-lg bg-black/[0.04] border border-black/5 shadow-inner space-y-4",
        rowLabel: "type-label opacity-70",
        rowValue: "type-code opacity-90", // Financials = Mono
        netLabel: "type-value font-medium",
        netValue: "type-page-title", // 20px Bold
        input: "bg-white/85 border-white/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] type-body focus:ring-1 focus:ring-black/5 transition-all outline-none",
        method: {
            active: "bg-black text-white border-zinc-900 shadow-md ring-1 ring-black/10",
            inactive: "bg-white/50 border-black/5 hover:bg-white hover:text-black shadow-sm"
        }
    };

    // Strict Guard: If no billing object, render nothing (or skeleton).
    if (!billing) return null;

    // 2. READ-ONLY Flags (Strictly from Snapshot)
    // Phase 6.4.4: Governance Rule - If Locked OR ReadOnly -> UI is Dead.
    const isLocked = billing.isLocked || false;
    const isUiReadOnly = uiHints?.isReadOnly || false;
    const isStrictReadOnly = (isLocked || isUiReadOnly) && !isCorrectionIntent; // Unlocked for Correction

    // Actions allowed ONLY if NOT ReadOnly
    const canPerformActions = !isStrictReadOnly;

    // Load Catalog once
    useEffect(() => {
        const load = async () => {
            try {
                const data = await ReceptionApi.getDiscountMaster();
                setDiscountCatalog(data || []);
            } catch (err) {
                console.warn("Failed to load discount catalog (likely permission)", err);
                // Don't block UI; just show empty list
                setDiscountCatalog([]);
            }
        };
        load();
    }, []);

    // COMMAND: Apply Discount
    const handleApplyDiscount = async (code) => {
        if (!code || !canPerformActions || !visitId) return;

        // CORRECTION INTENT
        // CORRECTION INTENT
        if (isCorrectionIntent) {
            const discount = discountCatalog.find(d => d.code === code);
            const masterId = discount?.discountDefinitionId || discount?.id;
            console.log("DEBUG: Selected Discount:", discount, "MasterID:", masterId);

            if (!masterId) {
                console.error("Critical: Discount ID not found on object", discount);
                alert("System Error: Cannot identify selected discount. Please report this to IT.");
                return;
            }

            setCorrectionState({
                isOpen: true,
                type: 'ChangeDiscount',
                payload: { discountMasterId: masterId, code },
                reason: ""
            });
            return;
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.applyDiscountToVisit(visitId, code);
            // Notify parent to refresh snapshot
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to apply discount", err);
            alert("Failed to apply discount: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Apply User-Defined Custom Discount (% or Flat)
    const handleApplyCustomDiscount = async () => {
        const val = parseFloat(customDiscountValue);
        if (isNaN(val) || val <= 0) {
            alert("Please enter a valid discount value greater than 0.");
            return;
        }
        if (customDiscountType === 'PERCENTAGE' && val > 100) {
            alert("Percentage discount cannot exceed 100%.");
            return;
        }
        if (!canPerformActions || !visitId) return;

        setIsProcessing(true);
        try {
            await ReceptionApi.applyDiscountToVisit(visitId, {
                mode: customDiscountType,
                customValue: val,
                reason: customDiscountReason.trim() || 'Custom Reception Concession'
            });
            setCustomDiscountValue('');
            setCustomDiscountReason('');
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to apply custom discount", err);
            alert("Failed to apply custom discount: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Save B2B Partner Concession Rate (Prepaid)
    const handleSaveB2BDiscount = async (overrideValue, overrideType) => {
        if (!visitId) return;
        const type = overrideType || b2bDiscountType;
        const val = overrideValue !== undefined ? Number(overrideValue) : (Number(localB2BInput) || 0);
        const gross = billing?.grossAmount || 0;
        let discountAmt = 0;
        if (type === 'PERCENTAGE') {
            const pct = Math.min(100, Math.max(0, val));
            discountAmt = Math.round((gross * (pct / 100)) * 100) / 100;
        } else {
            discountAmt = Math.min(gross, Math.max(0, val));
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.updateB2BDiscountRate(visitId, {
                discountAmount: discountAmt,
                discountType: type === 'PERCENTAGE' ? 'Percentage' : 'Flat',
                discountValue: val
            });
            setIsB2BEditing(false);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to update B2B discount rate", err);
            alert("Failed to update B2B discount rate: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Remove Discount
    const handleRemoveDiscount = async () => {
        if (!canPerformActions || !visitId) return;

        // CORRECTION INTENT
        if (isCorrectionIntent) {
            setCorrectionState({
                isOpen: true,
                type: 'ChangeDiscount',
                payload: { discountMasterId: null, code: "REMOVE" }, // Null implies remove
                reason: ""
            });
            return;
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.removeDiscountFromVisit(visitId);
            // Notify parent to refresh snapshot
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to remove discount", err);
        } finally {
            setIsProcessing(false);
        }
    };

    // EXECUTE CORRECTION
    const confirmCorrection = async () => {
        if (!correctionState.reason.trim()) {
            alert("Reason is mandatory for corrections.");
            return;
        }

        setIsProcessing(true);
        try {
            // ChangeDiscount expects TargetEntityId = MasterId (or null for remove)
            const masterId = correctionState.payload?.discountMasterId;
            // We can pass null if masterId is undefined/null
            await ReceptionApi.applyCorrection(visitId, 'ChangeDiscount', correctionState.reason, masterId);

            setCorrectionState({ isOpen: false, type: null, payload: null, reason: "" });
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            alert("Correction Failed: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Settlement Logic
    const totalPaid = billing.totalPaid || 0;
    const netAmount = billing.netAmount || 0;
    const settlementDiff = totalPaid - netAmount; // Positive = Refund, Negative = Due
    const isSettlementNeeded = isCorrectionIntent && totalPaid > 0 && Math.abs(settlementDiff) > 0.01;

    // MULTI-PAYER DISPLAY LOGIC
    const isPrepaid = isPrepaidIntent || billingMode === 'PrepaidPartner';
    const isInsurance = billingMode === 'Insurance';
    const isCorporate = billingMode === 'Corporate';

    let displayAmountToCollect = billing.netAmount;
    let amountLabel = billing.paymentStatus === 'Paid' ? "Total Bill Amount" : "Amount to Collect";

    if (isPrepaid) {
        displayAmountToCollect = 0;
        amountLabel = "Amount to Collect (Prepaid Partner)";
    } else if (isCorporate) {
        displayAmountToCollect = 0;
        amountLabel = "Billed to Corporate (₹0 at desk)";
    } else if (isInsurance) {
        displayAmountToCollect = snapshot?.visit?.insuranceCoPayAmount || 0;
        amountLabel = displayAmountToCollect > 0 ? "Patient Co-Pay to Collect" : "Cashless Claim (₹0 at desk)";
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border", ui.indicator)}>
                        3
                    </div>
                    <h3 className={cn("tracking-tight", ui.headerText)}>Financials</h3>
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-synos-primary" />}
                </div>
                {billing.paymentStatus && (
                    <div className={cn(
                        "px-2 py-0.5 rounded type-section-header tracking-wider border",
                        billing.paymentStatus === 'Paid'
                            ? (isDark ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-emerald-100 text-emerald-700 border-emerald-200")
                            : (isDark ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-amber-100 text-amber-700 border-amber-200")
                    )}>
                        {billing.paymentStatus}
                    </div>
                )}
            </div>

            {/* SETTLEMENT ALERT (High Visibility) */}
            {isSettlementNeeded && (
                <div className={cn(
                    "p-4 rounded-lg border flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-300",
                    settlementDiff > 0
                        ? (isDark ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-100" : "bg-emerald-50 border-emerald-200 text-emerald-800") // Refund
                        : (isDark ? "bg-red-950/40 border-red-500/50 text-red-100" : "bg-red-50 border-red-200 text-red-800") // Due
                )}>
                    <div className="flex flex-col">
                        <span className="type-section-header opacity-80">
                            {settlementDiff > 0 ? "Refund Due to Patient" : "Additional Payment Due"}
                        </span>
                        <span className="type-body opacity-70">
                            {settlementDiff > 0 ? "Credit balance found after changes" : "Amount due after audit changes"}
                        </span>
                    </div>
                    <div className="type-page-title">
                        {settlementDiff > 0 ? "+" : ""}{settlementDiff > 0 ? settlementDiff.toLocaleString() : Math.abs(settlementDiff).toLocaleString()}
                    </div>
                </div>
            )}

            <div className={cn("rounded-lg p-4 space-y-4 relative overflow-hidden border", ui.container)}>

                {/* Visual Lock Indicator - REMOVED for Silent Enforcement */}

                {/* REFERRAL SOURCE (Read-Only Visualization) */}
                <div className="space-y-2">
                    <label className="type-section-header">Referral Source</label>
                    <div className={cn("type-label font-bold p-2.5 rounded border flex flex-col gap-1.5",
                        isDark ? "text-zinc-300 bg-zinc-900/50 border-zinc-800" : "text-zinc-900 bg-white border-black/[0.05] shadow-sm")}>
                        {snapshot?.billing?.referral?.secondaryPartner ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_emerald]"></div>
                                        <span className="font-bold">{snapshot.billing.referral.secondaryPartner.displayName}</span>
                                    </span>
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold tracking-wider border border-emerald-500/20">
                                        Secondary Doctor (RMP)
                                    </span>
                                </div>
                                {snapshot?.billing?.referral?.partner && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 pl-3 border-l-2 border-zinc-200 dark:border-zinc-800">
                                        <span>Main Doctor:</span>
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{snapshot.billing.referral.partner.displayName}</span>
                                    </div>
                                )}
                            </>
                        ) : snapshot?.billing?.referral?.partner ? (
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_indigo]"></div>
                                {snapshot.billing.referral.partner.displayName}
                            </span>
                        ) : (
                            <span className="type-label italic">No Referral Partner</span>
                        )}
                    </div>
                </div>

                {/* A. Totals Section (DUMB RENDERER) */}
                <div className="space-y-3 text-sm">
                    {/* Gross */}
                    <div className="flex justify-between items-center">
                        <span className={ui.rowLabel}>Total Amount</span>
                        <span className={ui.rowValue}>₹{billing.grossAmount?.toLocaleString() ?? "—"}</span>
                    </div>

                    {/* Discount Applied */}
                    <div className="flex justify-between items-center">
                        <span className={ui.rowLabel}>Discount</span>
                        {billing.appliedDiscount ? (
                            <div className="flex items-center gap-2">
                                <span className={cn("font-mono font-bold flex items-center gap-1", isDark ? "text-emerald-400" : "text-emerald-600")}>
                                    - ₹{billing.discountAmount?.toLocaleString()}
                                    <span className="text-xs opacity-70">({billing.appliedDiscount.name})</span>
                                </span>
                                {canPerformActions && (
                                    <button
                                        onClick={handleRemoveDiscount}
                                        disabled={isProcessing}
                                        className={cn("p-1 rounded-full transition-colors",
                                            isDark ? "hover:bg-zinc-800 text-zinc-500 hover:text-red-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-600")}
                                        title="Remove Discount"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <span className="type-code opacity-50">No discount applied</span>
                        )}
                    </div>

                    {/* Tax */}
                    <div className="flex justify-between items-center text-xs">
                        <span className={ui.rowLabel}>GST / Tax</span>
                        <span className={ui.rowValue}>₹{billing.taxAmount?.toLocaleString() ?? "—"}</span>
                    </div>

                    {/* Divider */}
                    <div className={cn("border-t border-dashed", isDark ? "border-zinc-800" : "border-zinc-200")}></div>

                    {/* Net Payable */}
                    <div className="flex justify-between items-center">
                        <span className={ui.netLabel}>
                            {amountLabel}
                        </span>
                        <span className={cn("flex items-center", ui.netValue)}>
                            <IndianRupee className="w-4 h-4 mr-0.5" />
                            {displayAmountToCollect?.toLocaleString() ?? "—"}
                        </span>
                    </div>
                </div>

                {/* CORPORATE B2B PREPAID PARTNER TARIFF & CONCESSION CARD */}
                {isPrepaid && (() => {
                    const grossTariff = billing?.grossAmount || 0;
                    const b2bInfo = extractB2BInfo(snapshot);
                    const effectiveVal = isB2BEditing ? (Number(localB2BInput) || 0) : (Number(localB2BInput) || b2bInfo.rawVal || 0);
                    const rawVal = effectiveVal;
                    let computedDiscountAmt = 0;
                    if (b2bDiscountType === 'PERCENTAGE') {
                        const pct = Math.min(100, Math.max(0, rawVal));
                        computedDiscountAmt = Math.round((grossTariff * (pct / 100)) * 100) / 100;
                    } else {
                        computedDiscountAmt = Math.min(grossTariff, Math.max(0, rawVal));
                    }
                    const computedNetClaim = Math.max(0, grossTariff - computedDiscountAmt);

                    return (
                        <div className={cn(
                            "p-3 rounded-xl border space-y-2.5",
                            isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-200" : "bg-slate-50 border-slate-200 text-zinc-900 shadow-xs"
                        )}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                                    B2B Partner Concession & Rate
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold border border-zinc-300/50 dark:border-zinc-700">
                                    Self-Learning Rate
                                </span>
                            </div>

                            <div className="text-xs space-y-2">
                                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                                    <span>Standard Lab Tariff:</span>
                                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                        ₹{grossTariff.toLocaleString()}
                                    </span>
                                </div>

                                {/* Mode Toggle & Input */}
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                                            Partner Discount Mode:
                                        </span>
                                        <div className="flex items-center rounded-lg p-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-bold">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setB2BDiscountType('FLAT');
                                                    setIsB2BEditing(true);
                                                }}
                                                className={cn(
                                                    "px-2 py-0.5 rounded transition-all cursor-pointer",
                                                    b2bDiscountType === 'FLAT'
                                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                                )}
                                            >
                                                Flat (₹)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setB2BDiscountType('PERCENTAGE');
                                                    setIsB2BEditing(true);
                                                }}
                                                className={cn(
                                                    "px-2 py-0.5 rounded transition-all cursor-pointer",
                                                    b2bDiscountType === 'PERCENTAGE'
                                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                                )}
                                            >
                                                % Off
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                                            {b2bDiscountType === 'PERCENTAGE' ? 'Discount Percentage:' : 'Flat Concession:'}
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-zinc-400">
                                                {b2bDiscountType === 'FLAT' ? '₹' : '%'}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                max={b2bDiscountType === 'PERCENTAGE' ? 100 : (grossTariff || 100000)}
                                                value={localB2BInput}
                                                disabled={!canPerformActions || isProcessing}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                    setIsB2BEditing(true);
                                                }}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    const clean = raw.startsWith('0') && raw.length > 1 && !raw.startsWith('0.') ? raw.replace(/^0+/, '') : raw;
                                                    setLocalB2BInput(clean);
                                                    setIsB2BEditing(true);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSaveB2BDiscount(e.target.value, b2bDiscountType);
                                                    }
                                                }}
                                                className={cn(
                                                    "w-20 h-7 px-2 text-right text-xs font-mono font-bold rounded border outline-none",
                                                    isDark ? "bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-synos-primary" : "bg-white border-zinc-300 text-zinc-900 focus:border-synos-primary shadow-xs"
                                                )}
                                                placeholder="0"
                                            />
                                            {isB2BEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveB2BDiscount(localB2BInput, b2bDiscountType)}
                                                    className="px-2.5 py-1 bg-synos-primary text-white rounded text-[10px] font-bold hover:bg-synos-primary/90 cursor-pointer shadow-xs active:scale-95"
                                                >
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {b2bDiscountType === 'PERCENTAGE' && rawVal > 0 && (
                                        <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                                            <span>Calculated {rawVal}% Discount:</span>
                                            <span className="font-mono font-medium">₹{computedDiscountAmt.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-zinc-800 font-bold">
                                    <span className="text-zinc-700 dark:text-zinc-300">Net B2B Partner Receivable:</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                        ₹{computedNetClaim.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {b2bInfo.enteredBy && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-slate-200 dark:border-zinc-800 pt-1">
                                    Recorded by: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{b2bInfo.enteredBy}</span>
                                    {b2bInfo.enteredAt && ` on ${new Date(b2bInfo.enteredAt).toLocaleDateString()}`}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* B. Discount Selector (Step 5.3) - Dual Mode: Catalog Preset vs Custom Concession */}
                {canPerformActions && !isPrepaid && (
                    <div className="pt-2 animate-in fade-in space-y-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                        {/* Discount Mode Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Concession / Discount
                            </span>
                            <div className="flex items-center rounded-lg p-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-bold">
                                <button
                                    type="button"
                                    onClick={() => setDiscountInputMode('catalog')}
                                    className={cn(
                                        "px-2 py-0.5 rounded transition-all cursor-pointer",
                                        discountInputMode === 'catalog'
                                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                    )}
                                >
                                    Preset Code
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDiscountInputMode('custom')}
                                    className={cn(
                                        "px-2 py-0.5 rounded transition-all cursor-pointer",
                                        discountInputMode === 'custom'
                                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                    )}
                                >
                                    Custom % / Flat
                                </button>
                            </div>
                        </div>

                        {discountInputMode === 'catalog' ? (
                            <select
                                className={cn("w-full h-9 rounded-lg px-2.5 outline-none transition-colors disabled:opacity-50 text-xs font-medium focus:ring-2 focus:ring-synos-primary focus:border-synos-primary cursor-pointer border", ui.input)}
                                disabled={isProcessing}
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) handleApplyDiscount(e.target.value);
                                }}
                            >
                                <option value="" disabled className="text-zinc-500">
                                    {billing.appliedDiscount ? "Replace Discount from Master..." : "Select Master Discount Code..."}
                                </option>
                                {discountCatalog.map(discount => (
                                    <option key={discount.code} value={discount.code} className={isDark ? "bg-zinc-900" : "bg-white"}>
                                        {discount.name} ({discount.code}) — {discount.type === 0 || discount.type === 'Percentage' ? `${discount.value}%` : `₹${discount.value}`}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="space-y-2 p-2.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-black/[0.02] dark:bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <div className="flex rounded-md p-0.5 bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setCustomDiscountType('PERCENTAGE')}
                                            className={cn(
                                                "px-2 py-1 rounded cursor-pointer transition-all",
                                                customDiscountType === 'PERCENTAGE'
                                                    ? "bg-synos-primary text-white"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            )}
                                        >
                                            % Off
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomDiscountType('FLAT')}
                                            className={cn(
                                                "px-2 py-1 rounded cursor-pointer transition-all",
                                                customDiscountType === 'FLAT'
                                                    ? "bg-synos-primary text-white"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            )}
                                        >
                                            ₹ Flat
                                        </button>
                                    </div>

                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max={customDiscountType === 'PERCENTAGE' ? 100 : (billing.grossAmount || 100000)}
                                            step={customDiscountType === 'PERCENTAGE' ? '1' : '10'}
                                            placeholder={customDiscountType === 'PERCENTAGE' ? 'Discount % (e.g. 15)' : 'Flat ₹ (e.g. 200)'}
                                            value={customDiscountValue}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                const clean = raw.startsWith('0') && raw.length > 1 && !raw.startsWith('0.') ? raw.replace(/^0+/, '') : raw;
                                                setCustomDiscountValue(clean);
                                            }}
                                            className={cn("w-full h-8 px-2.5 rounded-md text-xs font-mono font-medium outline-none border", ui.input)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Reason / Authorized By (e.g. Senior Citizen, Director Approval)"
                                        value={customDiscountReason}
                                        onChange={(e) => setCustomDiscountReason(e.target.value)}
                                        className={cn("flex-1 h-8 px-2.5 rounded-md text-xs font-medium outline-none border", ui.input)}
                                    />
                                    <button
                                        type="button"
                                        disabled={!customDiscountValue || isProcessing}
                                        onClick={handleApplyCustomDiscount}
                                        className="h-8 px-3 rounded-md bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* E. Payment Method (STAGE 2) - Only show when desk collection is required */}
                {displayAmountToCollect > 0 && billing.paymentStatus === 'PendingPayment' && (
                    <div className="pt-2 animate-in fade-in space-y-2">
                        <label className="type-section-header">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Cash', 'UPI', 'Card'].map(method => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => setPaymentMethod && setPaymentMethod(method)}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-2 rounded-md border type-section-header transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1 cursor-pointer",
                                        paymentMethod === method
                                            ? ui.method.active
                                            : ui.method.inactive
                                    )}
                                >
                                    {method === 'Cash' && <IndianRupee className="w-3 h-3 mb-1" />}
                                    {method === 'UPI' && <Smartphone className="w-3 h-3 mb-1" />}
                                    {method === 'Card' && <CreditCard className="w-3 h-3 mb-1" />}
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* D. Payment Mode (Read Only for now, based on snapshot) */}
                <div className="type-section-header text-center">
                    {billing.paymentModel === 'PartnerCollects' ? "Prepaid Visit" : "Checkout at Counter"}
                </div>
            </div>

            {/* CORRECTION REASON MODAL */}
            {correctionState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
                    <div className={cn("w-96 rounded-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 border",
                        isDark ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900")}>
                        <div className="space-y-1">
                            <h3 className="type-page-title flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                Confirm Financial Change
                            </h3>
                            <p className="type-label">
                                {isDark ? "This action will be audited." : "Mandatory audit reason required for financial override."}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className={cn("type-code p-2 rounded border",
                                isDark ? "bg-black/50 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600")}>
                                {correctionState.type}: {correctionState.payload?.code}
                            </div>
                            <textarea
                                value={correctionState.reason}
                                onChange={(e) => setCorrectionState(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Reason for this change (Required)..."
                                className={cn("w-full rounded-lg p-3 outline-none min-h-[80px] transition-all type-body",
                                    isDark ? "bg-black border-zinc-700 text-white focus:border-amber-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900")}
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => setCorrectionState({ ...correctionState, isOpen: false })}
                                className="px-4 py-2 rounded-lg type-value text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCorrection}
                                disabled={!correctionState.reason.trim() || isProcessing}
                                className="px-4 py-2 rounded-lg type-value bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Change"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
