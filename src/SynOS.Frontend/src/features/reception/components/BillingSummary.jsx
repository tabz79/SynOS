import { useState, useEffect, useRef, useMemo } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock, AlertCircle, Smartphone, CreditCard, Plus, ShieldCheck, Search, ChevronDown, CheckCircle2 } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

// Safe extractor for B2B discount state handling case variations (b2b, b2B, B2B)
export const extractB2BInfo = (snap) => {
    const v = snap?.visit || {};
    const b = snap?.billing || {};
    const fallbackDiscount = Number(b.discountAmount) || 0;
    const rawVal = v.b2bDiscountValue ?? v.b2BDiscountValue ?? v.B2BDiscountValue ?? b.b2bDiscountAmount ?? b.b2BDiscountAmount ?? b.B2BDiscountAmount ?? fallbackDiscount;
    const rawType = (v.b2bDiscountType ?? v.b2BDiscountType ?? v.B2BDiscountType ?? 'Flat') === 'Percentage' ? 'PERCENTAGE' : 'FLAT';
    const rawAmount = v.b2bDiscountAmount ?? v.b2BDiscountAmount ?? v.B2BDiscountAmount ?? b.b2bDiscountAmount ?? b.b2BDiscountAmount ?? b.B2BDiscountAmount ?? fallbackDiscount;
    const enteredBy = v.b2bDiscountEnteredBy ?? v.b2BDiscountEnteredBy ?? v.B2BDiscountEnteredBy;
    const enteredAt = v.b2bDiscountEnteredAt ?? v.b2BDiscountEnteredAt ?? v.B2BDiscountEnteredAt;
    return { rawVal: Number(rawVal) || 0, rawType, rawAmount: Number(rawAmount) || 0, enteredBy, enteredAt };
};

export function BillingSummary({ 
    snapshot, 
    onVisitUpdated, 
    isCorrectionIntent, 
    isPrepaidIntent, 
    billingMode = 'Standard', 
    paymentMethod, 
    setPaymentMethod, 
    onOpenModal, 
    createdDiscountReason,
    stagedDiscount,
    onStageDiscount,
    stagedGross,
    stagedDiscountAmt,
    stagedNet,
    settlementDiff = 0,
    originalPaid = 0
}) {
    // Local UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [discountCatalog, setDiscountCatalog] = useState([]);

    // Custom Discount State (Percentage vs Flat) - Default to 'custom' as requested
    const [discountInputMode, setDiscountInputMode] = useState('custom'); // 'custom' | 'catalog'
    const [customDiscountType, setCustomDiscountType] = useState('PERCENTAGE'); // 'PERCENTAGE' | 'FLAT'
    const [customDiscountValue, setCustomDiscountValue] = useState('');
    const [customDiscountReason, setCustomDiscountReason] = useState('');

    // Preset Discount Reasons State
    const [discountReasons, setDiscountReasons] = useState([]);
    const [showReasonDropdown, setShowReasonDropdown] = useState(false);
    const [reasonSelectedIndex, setReasonSelectedIndex] = useState(-1);
    const reasonListRef = useRef(null);

    // B2B Prepaid Partner Rate State (Dual Mode: Flat vs Percentage)
    const b2bInfo = extractB2BInfo(snapshot);
    const [b2bDiscountType, setB2BDiscountType] = useState(b2bInfo.rawType);
    const [localB2BInput, setLocalB2BInput] = useState(b2bInfo.rawVal && b2bInfo.rawVal > 0 ? String(b2bInfo.rawVal) : '');
    const [isB2BEditing, setIsB2BEditing] = useState(false);

    useEffect(() => {
        if (!isB2BEditing) {
            if (isCorrectionIntent && stagedDiscount && stagedDiscount.isB2B) {
                setLocalB2BInput(stagedDiscount.value !== undefined ? String(stagedDiscount.value) : '');
                setB2BDiscountType(stagedDiscount.type === 'Percentage' ? 'PERCENTAGE' : 'FLAT');
                return;
            }
            const current = extractB2BInfo(snapshot);
            setB2BDiscountType(current.rawType);
            setLocalB2BInput(current.rawVal && current.rawVal > 0 ? String(current.rawVal) : '');
        }
    }, [
        snapshot?.visit?.b2bDiscountValue, snapshot?.visit?.b2BDiscountValue,
        snapshot?.visit?.b2bDiscountAmount, snapshot?.visit?.b2BDiscountAmount,
        snapshot?.visit?.b2bDiscountType, snapshot?.visit?.b2BDiscountType,
        snapshot?.billing?.b2bDiscountAmount, snapshot?.billing?.b2BDiscountAmount,
        isB2BEditing,
        isCorrectionIntent,
        stagedDiscount
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

    // Retain and sync applied discount details in the input fields so receptionist sees what was applied
    const prevVisitIdRef = useRef(visitId);
    const prevAppliedDiscountRef = useRef(billing?.appliedDiscount);

    useEffect(() => {
        const visitChanged = prevVisitIdRef.current !== visitId;
        const discountChanged = prevAppliedDiscountRef.current !== billing?.appliedDiscount;
        prevVisitIdRef.current = visitId;
        prevAppliedDiscountRef.current = billing?.appliedDiscount;

        if (billing?.appliedDiscount && (billing?.discountAmount > 0)) {
            const disc = billing.appliedDiscount;
            const type = (disc.type || disc.Type || '').toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT';
            setCustomDiscountType(type);
            const rawVal = disc.value ?? disc.Value;
            const val = rawVal !== undefined && rawVal !== null && rawVal > 0 
                ? String(rawVal) 
                : (billing.discountAmount > 0 ? String(billing.discountAmount) : '');
            setCustomDiscountValue(val);
            const reason = disc.reason || disc.Reason || disc.name || disc.Name || '';
            setCustomDiscountReason(reason);
        } else if (visitChanged || (discountChanged && !billing?.appliedDiscount)) {
            // Only clear when visit changes or when discount was explicitly removed
            setCustomDiscountValue('');
            setCustomDiscountReason('');
        }
    }, [
        visitId,
        billing?.appliedDiscount,
        billing?.discountAmount
    ]);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        indicator: "bg-zinc-800 border-zinc-700 text-zinc-200 font-bold",
        headerText: "text-white font-bold text-sm tracking-tight",
        container: "p-4 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.4)] space-y-4",
        rowLabel: "type-label text-zinc-400",
        rowValue: "type-code text-zinc-100", // Financials = Mono
        netLabel: "type-value text-white font-bold",
        netValue: "type-page-title text-white font-extrabold", // 20px Bold
        input: "bg-zinc-950 border border-zinc-700 text-white type-body focus:border-synos-primary shadow-xs",
        method: {
            active: "bg-white text-zinc-900 border-white shadow-md ring-2 ring-white/20 font-bold",
            inactive: "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white shadow-xs"
        }
    } : {
        indicator: "bg-blue-600 text-white border-blue-600 shadow-sm font-bold",
        headerText: "text-zinc-900 font-bold text-sm tracking-tight",
        // ELEVATED CARD STYLE (Solid white surface with crisp borders & elevation)
        container: "p-4 rounded-xl bg-white border border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.06)] space-y-4",
        rowLabel: "type-label text-zinc-700 font-semibold",
        rowValue: "type-code text-zinc-900 font-bold", // Financials = Mono
        netLabel: "type-value font-bold text-zinc-900",
        netValue: "type-page-title text-zinc-900 font-extrabold", // 20px Bold
        input: "bg-white border border-slate-300 shadow-xs type-body text-zinc-900 focus:ring-2 focus:ring-synos-primary/30 focus:border-synos-primary transition-all outline-none",
        method: {
            active: "bg-zinc-900 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900/20 font-bold",
            inactive: "bg-white border border-slate-300 text-zinc-700 hover:bg-slate-50 hover:text-black shadow-xs font-semibold"
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

    // Load Catalog and Preset Reasons once
    useEffect(() => {
        const load = async () => {
            try {
                const data = await ReceptionApi.getDiscountMaster();
                setDiscountCatalog(data || []);
            } catch (err) {
                console.warn("Failed to load discount catalog (likely permission)", err);
                setDiscountCatalog([]);
            }

            try {
                const reasons = await ReceptionApi.getDiscountReasons();
                setDiscountReasons(reasons || []);
            } catch (err) {
                console.warn("Failed to load discount reasons", err);
                setDiscountReasons([]);
            }
        };
        load();
    }, []);

    // Reactively receive and select reason created from scoped modal
    useEffect(() => {
        if (createdDiscountReason) {
            setDiscountReasons(prev => {
                const exists = prev.some(r => r.discountReasonId === createdDiscountReason.discountReasonId || r.reasonText?.toLowerCase() === createdDiscountReason.reasonText?.toLowerCase());
                return exists ? prev : [...prev, createdDiscountReason];
            });
            setCustomDiscountReason(createdDiscountReason.reasonText || '');
            setShowReasonDropdown(false);
        }
    }, [createdDiscountReason]);

    // Derived filtered suggestions for Reason Autocomplete
    const filteredReasonSuggestions = useMemo(() => {
        const query = (customDiscountReason || '').trim().toLowerCase();
        if (!query) return discountReasons;
        return discountReasons.filter(r => 
            (r.reasonText && r.reasonText.toLowerCase().includes(query)) ||
            (r.category && r.category.toLowerCase().includes(query))
        );
    }, [discountReasons, customDiscountReason]);

    // Reset selected index when suggestions change
    useEffect(() => {
        if (showReasonDropdown && filteredReasonSuggestions.length > 0) {
            setReasonSelectedIndex(0);
        } else {
            setReasonSelectedIndex(-1);
        }
    }, [customDiscountReason, showReasonDropdown, filteredReasonSuggestions.length]);

    // Scroll selected item into view inside dropdown
    useEffect(() => {
        if (reasonSelectedIndex >= 0 && reasonListRef.current) {
            const selectedElem = reasonListRef.current.children[reasonSelectedIndex];
            if (selectedElem) {
                selectedElem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [reasonSelectedIndex]);

    const handleReasonKeyDown = (e) => {
        if (!showReasonDropdown) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setShowReasonDropdown(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setReasonSelectedIndex(prev => (prev < filteredReasonSuggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setReasonSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredReasonSuggestions.length - 1));
        } else if (e.key === 'Enter') {
            if (reasonSelectedIndex >= 0 && reasonSelectedIndex < filteredReasonSuggestions.length) {
                e.preventDefault();
                setCustomDiscountReason(filteredReasonSuggestions[reasonSelectedIndex].reasonText);
                setShowReasonDropdown(false);
            }
        } else if (e.key === 'Escape') {
            setShowReasonDropdown(false);
        }
    };

    // COMMAND: Apply Discount
    const handleApplyDiscount = async (code) => {
        if (!code || !canPerformActions || !visitId) return;

        const discount = discountCatalog.find(d => d.code === code);
        const masterId = discount?.discountDefinitionId || discount?.id;

        // CORRECTION INTENT (Staged Batch Edit)
        if (isCorrectionIntent) {
            if (onStageDiscount && discount) {
                onStageDiscount({
                    mode: 'catalog',
                    code: discount.code,
                    discountMasterId: masterId,
                    type: discount.type === 0 || discount.type === 'Percentage' ? 'Percentage' : 'Flat',
                    value: discount.value,
                    reason: discount.name
                });
                return;
            }

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
        if (!customDiscountReason || !customDiscountReason.trim()) {
            alert("Please select an authorized reason preset before applying a discount.");
            return;
        }
        if (!canPerformActions || !visitId) return;

        // CORRECTION INTENT (Staged Batch Edit)
        if (isCorrectionIntent && onStageDiscount) {
            onStageDiscount({
                mode: 'custom',
                type: customDiscountType === 'PERCENTAGE' ? 'Percentage' : 'Flat',
                value: val,
                reason: customDiscountReason.trim()
            });
            return;
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.applyDiscountToVisit(visitId, {
                mode: customDiscountType,
                customValue: val,
                reason: customDiscountReason.trim()
            });
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
        const type = overrideType || b2bDiscountType;
        const val = overrideValue !== undefined ? Number(overrideValue) : (Number(localB2BInput) || 0);

        if (isCorrectionIntent && onStageDiscount) {
            setLocalB2BInput(String(val));
            onStageDiscount({
                type: type === 'PERCENTAGE' ? 'Percentage' : 'Flat',
                value: val,
                reason: 'B2B Partner Concession',
                isB2B: true
            });
            setIsB2BEditing(false);
            return;
        }

        if (!visitId) return;
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

        // CORRECTION INTENT (Staged Batch Edit)
        if (isCorrectionIntent) {
            if (onStageDiscount) {
                onStageDiscount({ mode: 'remove', remove: true });
                setCustomDiscountReason('');
                setCustomDiscountValue('');
                return;
            }
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
            setCustomDiscountReason('');
            setCustomDiscountValue('');
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
    const totalPaid = originalPaid || billing.totalPaid || 0;
    const netAmount = stagedNet !== undefined ? stagedNet : (billing.netAmount || 0);
    const effectiveDiff = settlementDiff !== undefined ? settlementDiff : (netAmount - totalPaid);
    const isSettlementNeeded = isCorrectionIntent && totalPaid > 0 && Math.abs(effectiveDiff) > 0.01;

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

            <div className={cn("rounded-lg p-4 space-y-4 relative overflow-visible border", ui.container)}>

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
                        <span className={ui.rowValue}>
                            ₹{isCorrectionIntent && stagedGross !== undefined 
                                ? stagedGross.toLocaleString() 
                                : (billing.grossAmount?.toLocaleString() ?? "—")}
                        </span>
                    </div>

                    {/* Discount Applied */}
                    <div className="flex justify-between items-center">
                        <span className={ui.rowLabel}>Discount</span>
                        {isCorrectionIntent && stagedDiscount ? (
                            stagedDiscount.remove ? (
                                <span className="type-code text-red-400 font-semibold text-xs">Discount Removed</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className={cn("font-mono font-bold flex items-center gap-1", isDark ? "text-emerald-400" : "text-emerald-600")}>
                                        - ₹{stagedDiscountAmt?.toLocaleString() ?? 0}
                                        <span className="text-xs opacity-80 font-semibold">({stagedDiscount.reason || stagedDiscount.name || (stagedDiscount.type === 'Percentage' ? `${stagedDiscount.value}%` : `₹${stagedDiscount.value}`)})</span>
                                    </span>
                                    {canPerformActions && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveDiscount}
                                            disabled={isProcessing}
                                            className={cn("p-1 rounded-full transition-colors cursor-pointer",
                                                isDark ? "hover:bg-zinc-800 text-zinc-500 hover:text-red-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-600")}
                                            title="Remove Discount"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )
                        ) : billing.appliedDiscount && (billing.discountAmount > 0) ? (
                            <div className="flex items-center gap-2">
                                <span className={cn("font-mono font-bold flex items-center gap-1", isDark ? "text-emerald-400" : "text-emerald-600")}>
                                    - ₹{billing.discountAmount?.toLocaleString()}
                                    <span className="text-xs opacity-80 font-semibold">({billing.appliedDiscount.reason || billing.appliedDiscount.name})</span>
                                </span>
                                {canPerformActions && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveDiscount}
                                        disabled={isProcessing}
                                        className={cn("p-1 rounded-full transition-colors cursor-pointer",
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
                            {isCorrectionIntent ? "Revised Net Amount" : amountLabel}
                        </span>
                        <span className={cn("flex items-center", ui.netValue)}>
                            <IndianRupee className="w-4 h-4 mr-0.5" />
                            {isCorrectionIntent && stagedNet !== undefined 
                                ? stagedNet.toLocaleString() 
                                : (displayAmountToCollect?.toLocaleString() ?? "—")}
                        </span>
                    </div>
                </div>

                {/* LIVE RECONCILER CARD (Correction / Edit Mode Only) */}
                {isCorrectionIntent && (() => {
                    if (isPrepaid) {
                        const originalGross = billing?.grossAmount || 0;
                        const currentB2BInfo = extractB2BInfo(snapshot);
                        const originalB2BAmt = currentB2BInfo.rawAmount || 0;
                        const originalB2BClaim = Math.max(0, originalGross - originalB2BAmt);

                        const currentGross = stagedGross !== undefined ? stagedGross : originalGross;
                        let currentB2BAmt = 0;
                        if (stagedDiscountAmt !== undefined) {
                            currentB2BAmt = stagedDiscountAmt;
                        } else {
                            const val = Number(localB2BInput) || currentB2BInfo.rawVal || 0;
                            if (b2bDiscountType === 'PERCENTAGE') {
                                currentB2BAmt = Math.round((currentGross * (val / 100)) * 100) / 100;
                            } else {
                                currentB2BAmt = Math.min(currentGross, val);
                            }
                        }
                        const currentB2BClaim = Math.max(0, currentGross - currentB2BAmt);
                        const b2bClaimDiff = currentB2BClaim - originalB2BClaim;

                        return (
                            <div className={cn(
                                "p-3.5 rounded-xl border space-y-2.5 transition-all shadow-sm animate-in fade-in duration-200",
                                isDark ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-slate-50 border border-slate-300 text-zinc-900"
                            )}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                        Doctor / Partner Bill
                                    </span>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                                        Billed to Doctor
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 shadow-2xs">
                                        <span className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold block">Previous Doctor Bill</span>
                                        <span className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200">₹{originalB2BClaim.toLocaleString()}</span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 shadow-2xs">
                                        <span className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold block">New Doctor Bill</span>
                                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">₹{currentB2BClaim.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-zinc-800 font-bold text-xs">
                                    <span>Difference to Doctor:</span>
                                    <span className={cn("font-mono text-base font-extrabold", b2bClaimDiff > 0 ? "text-indigo-600 dark:text-indigo-400" : b2bClaimDiff < 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                                        {b2bClaimDiff > 0 ? `+₹${b2bClaimDiff.toLocaleString()}` : b2bClaimDiff < 0 ? `-₹${Math.abs(b2bClaimDiff).toLocaleString()}` : "₹0 (No Change)"}
                                    </span>
                                </div>
                                <div className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    {b2bClaimDiff > 0 
                                        ? `* Doctor bill increases by ₹${b2bClaimDiff.toLocaleString()} (New: ₹${currentB2BClaim.toLocaleString()} vs Old: ₹${originalB2BClaim.toLocaleString()}). Lab will bill this to doctor.`
                                        : b2bClaimDiff < 0 
                                            ? `* Doctor bill decreases by ₹${Math.abs(b2bClaimDiff).toLocaleString()} (Credited to doctor's monthly account).`
                                            : `* Doctor bill unchanged at ₹${currentB2BClaim.toLocaleString()}.`}
                                </div>

                                <div className="text-[11px] p-2 rounded-lg bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Collect from Patient:</span>
                                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">₹0 (Billed directly to doctor)</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className={cn(
                            "p-3.5 rounded-xl border space-y-2.5 transition-all shadow-sm animate-in fade-in duration-200",
                            isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-200" : "bg-slate-50 border-slate-300 text-zinc-900"
                        )}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <span className={cn("w-2 h-2 rounded-full", settlementDiff < 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : settlementDiff > 0 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-zinc-400")} />
                                    Live Bill Difference
                                </span>
                                <span className={cn(
                                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                                    settlementDiff < 0 
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                        : settlementDiff > 0 
                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                            : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/20"
                                )}>
                                    {settlementDiff < 0 ? "Refund Due" : settlementDiff > 0 ? "Balance Due" : "Settled (₹0 Diff)"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-black/5 dark:border-white/5">
                                <div>
                                    <span className="opacity-70 text-[11px] block">Previously Paid:</span>
                                    <span className="font-mono font-bold text-sm">₹{originalPaid.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="opacity-70 text-[11px] block">Revised Net Total:</span>
                                    <span className="font-mono font-bold text-sm">₹{(stagedNet !== undefined ? stagedNet : netAmount).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-black/5 dark:border-white/5 font-bold text-xs">
                                <span>{settlementDiff < 0 ? "Cash Refund to Disburse:" : settlementDiff > 0 ? "Additional Balance to Collect:" : "Net Difference:"}</span>
                                <span className={cn("font-mono text-base font-extrabold", settlementDiff < 0 ? "text-emerald-600 dark:text-emerald-400" : settlementDiff > 0 ? "text-blue-600 dark:text-blue-400" : "")}>
                                    ₹{Math.abs(settlementDiff).toLocaleString()}
                                </span>
                            </div>

                            {settlementDiff < 0 && (
                                <div className="text-[11px] p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                                    <span className="font-bold text-xs">💵</span>
                                    <span>Refund will be disbursed strictly in <strong>Cash from register</strong> upon confirmation.</span>
                                </div>
                            )}

                            {settlementDiff > 0 && (
                                <div className="pt-1 space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">Payment Method for Balance</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {['Cash', 'UPI', 'Card'].map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setPaymentMethod && setPaymentMethod(m)}
                                                className={cn(
                                                    "py-1 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                                                    paymentMethod === m 
                                                        ? "bg-synos-primary text-white border-synos-primary shadow-xs" 
                                                        : "bg-white/70 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800"
                                                )}
                                            >
                                                {m === 'Cash' && <IndianRupee className="w-3 h-3" />}
                                                {m === 'UPI' && <Smartphone className="w-3 h-3" />}
                                                {m === 'Card' && <CreditCard className="w-3 h-3" />}
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* CORPORATE B2B PREPAID PARTNER TARIFF & CONCESSION CARD */}
                {isPrepaid && (() => {
                    const grossTariff = stagedGross !== undefined ? stagedGross : (billing?.grossAmount || 0);
                    const b2bInfo = extractB2BInfo(snapshot);
                    const effectiveVal = isB2BEditing ? (Number(localB2BInput) || 0) : (stagedDiscount?.value !== undefined ? Number(stagedDiscount.value) : (Number(localB2BInput) || b2bInfo.rawVal || 0));
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
                            isDark ? "bg-zinc-900 border-zinc-700 text-zinc-200 shadow-sm" : "bg-white border border-slate-300 text-zinc-900 shadow-sm"
                        )}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                                    Doctor Discount & Rate
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border border-slate-200 dark:border-zinc-700">
                                    Doctor Tariff
                                </span>
                            </div>

                            <div className="text-xs space-y-2">
                                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                                    <span>Standard Lab MRP:</span>
                                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                        ₹{grossTariff.toLocaleString()}
                                    </span>
                                </div>

                                {/* Mode Toggle & Input */}
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                            Discount Type:
                                        </span>
                                        <div className="flex items-center rounded-lg p-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-bold">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setB2BDiscountType('FLAT');
                                                    setIsB2BEditing(true);
                                                    if (isCorrectionIntent && onStageDiscount) {
                                                        onStageDiscount({
                                                            type: 'Flat',
                                                            value: Number(localB2BInput) || 0,
                                                            reason: 'B2B Partner Concession',
                                                            isB2B: true
                                                        });
                                                    }
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
                                                    if (isCorrectionIntent && onStageDiscount) {
                                                        onStageDiscount({
                                                            type: 'Percentage',
                                                            value: Number(localB2BInput) || 0,
                                                            reason: 'B2B Partner Concession',
                                                            isB2B: true
                                                        });
                                                    }
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
                                                value={isB2BEditing ? localB2BInput : (isCorrectionIntent && stagedDiscount?.value !== undefined && stagedDiscount.isB2B ? String(stagedDiscount.value) : localB2BInput)}
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
                                                    if (isCorrectionIntent && onStageDiscount) {
                                                        onStageDiscount({
                                                            type: b2bDiscountType === 'PERCENTAGE' ? 'Percentage' : 'Flat',
                                                            value: Number(clean) || 0,
                                                            reason: 'B2B Partner Concession',
                                                            isB2B: true
                                                        });
                                                    }
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
                                    <span className="text-zinc-800 dark:text-zinc-200">Final Doctor Bill:</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">
                                        ₹{computedNetClaim.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {b2bInfo.enteredBy && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-black/5 dark:border-white/5 pt-1">
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

                                <div className="space-y-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                            Discount Reason / Authority
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowReasonDropdown(false);
                                                if (onOpenModal) onOpenModal('discountReason');
                                            }}
                                            className="text-[10px] font-bold text-synos-primary hover:text-synos-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
                                            title="Add new standard preset reason to master"
                                        >
                                            <Plus className="w-3 h-3" /> Add Reason
                                        </button>
                                    </div>

                                    {/* Native System Searchable Dropdown Combobox */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Search or Select Reason (e.g. Dr. DVR)..."
                                                value={customDiscountReason}
                                                onFocus={() => setShowReasonDropdown(true)}
                                                onChange={(e) => {
                                                    setCustomDiscountReason(e.target.value);
                                                    setShowReasonDropdown(true);
                                                }}
                                                onKeyDown={handleReasonKeyDown}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        setShowReasonDropdown(false);
                                                    }, 200);
                                                }}
                                                className={cn("w-full h-8 pl-8 pr-7 rounded-md text-xs font-medium outline-none border transition-all", ui.input)}
                                            />
                                            {customDiscountReason ? (
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setCustomDiscountReason('');
                                                        setShowReasonDropdown(true);
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                                    title="Clear reason"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setShowReasonDropdown(prev => !prev);
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {/* Native Suggestions Floating Overlay */}
                                            {showReasonDropdown && (
                                                <div
                                                    ref={reasonListRef}
                                                    className={cn(
                                                        "absolute top-full left-0 right-0 mt-1 rounded-lg overflow-y-auto z-50 border max-h-52 shadow-xl",
                                                        isDark ? "bg-zinc-900 border-zinc-700/80 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                                                    )}
                                                >
                                                    {filteredReasonSuggestions.length === 0 ? (
                                                        <div className="px-3 py-2 text-[11px] text-zinc-400 italic">
                                                            No matching preset. You can still apply as custom note.
                                                        </div>
                                                    ) : (
                                                        filteredReasonSuggestions.map((r, idx) => (
                                                            <button
                                                                key={r.discountReasonId}
                                                                type="button"
                                                                onMouseEnter={() => setReasonSelectedIndex(idx)}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setCustomDiscountReason(r.reasonText);
                                                                    setShowReasonDropdown(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 transition-colors border-b last:border-0 type-label flex items-center justify-between cursor-pointer",
                                                                    idx === reasonSelectedIndex
                                                                        ? (isDark ? "bg-synos-primary/20 text-white font-bold" : "bg-blue-50 text-synos-primary font-bold")
                                                                        : (isDark ? "hover:bg-zinc-800 text-zinc-300 hover:text-white" : "hover:bg-zinc-50 text-zinc-700 hover:text-black"),
                                                                    isDark ? "border-zinc-800/50" : "border-zinc-100"
                                                                )}
                                                            >
                                                                <span className="truncate text-xs font-semibold">{r.reasonText}</span>
                                                                {r.category && (
                                                                    <span className={cn(
                                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ml-2",
                                                                        isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                                                                    )}>
                                                                        {r.category}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))
                                                    )}

                                                    {/* Quick + Add New Reason action at bottom of menu */}
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setShowReasonDropdown(false);
                                                            if (onOpenModal) onOpenModal('discountReason');
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-3 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border-t",
                                                            isDark ? "border-zinc-800 text-synos-primary hover:bg-zinc-800/60" : "border-zinc-100 text-synos-primary hover:bg-blue-50/50"
                                                        )}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>+ Add New Reason...</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            disabled={!customDiscountValue || !customDiscountReason?.trim() || isProcessing}
                                            onClick={handleApplyCustomDiscount}
                                            className="h-8 px-3 rounded-md bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 disabled:opacity-50 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                                        >
                                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                                        </button>
                                    </div>
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

                {/* D. Settlement Status Indicator (Prominent in Visit Summary Mode) */}
                {isLocked && (
                    <div className={cn(
                        "p-3 rounded-xl border flex items-center justify-between shadow-xs",
                        billing.paymentModel === 'PartnerCollects' || isPrepaid
                            ? (isDark ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300" : "bg-indigo-50/80 border-indigo-200 text-indigo-900")
                            : (isDark ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50/80 border-emerald-200 text-emerald-900")
                    )}>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className={cn("w-4 h-4", billing.paymentModel === 'PartnerCollects' || isPrepaid ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400")} />
                            <div>
                                <span className="text-xs font-bold block leading-tight">
                                    {billing.paymentModel === 'PartnerCollects' || isPrepaid
                                        ? "Billed to Doctor Account"
                                        : "Payment Settled & Complete"}
                                </span>
                                <span className="text-[10px] opacity-75 font-medium">
                                    {billing.paymentModel === 'PartnerCollects' || isPrepaid
                                        ? "Doctor will settle via monthly account"
                                        : `Paid via ${billing.paymentMethod || 'Counter Collection'}`}
                                </span>
                            </div>
                        </div>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full border bg-white/60 dark:bg-black/30 border-current/20">
                            {billing.paymentModel === 'PartnerCollects' || isPrepaid
                                ? "Doctor B2B"
                                : `₹${(billing.totalPaid || billing.netAmount || 0).toLocaleString()}`}
                        </span>
                    </div>
                )}
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
