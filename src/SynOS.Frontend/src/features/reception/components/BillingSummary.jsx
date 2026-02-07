import { useState, useEffect } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock, AlertCircle, Smartphone, CreditCard } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

export function BillingSummary({ snapshot, onVisitUpdated, isCorrectionIntent, isPrepaidIntent, paymentMethod, setPaymentMethod }) {
    // Local UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [discountCatalog, setDiscountCatalog] = useState([]);

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
        indicator: "bg-zinc-800 border-synos-border text-zinc-400",
        headerText: "text-zinc-200",
        container: "bg-zinc-950/25 border-synos-border",
        rowLabel: "text-zinc-400",
        rowValue: "text-zinc-400 font-mono",
        netLabel: "text-zinc-200",
        netValue: "text-white",
        input: "bg-zinc-900 border-synos-border text-white focus:border-synos-primary",
        method: {
            active: "bg-zinc-100 text-black border-white font-bold shadow-md",
            inactive: "bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300"
        }
    } : {
        indicator: "bg-white border-zinc-200 text-zinc-500 shadow-sm font-bold",
        headerText: "text-zinc-800 font-bold",
        // SIMULATION GLASS: White/60 + Deep Shadow + Solid Inputs
        container: "bg-white/60 backdrop-blur-none border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5",
        rowLabel: "text-zinc-700",
        rowValue: "text-black font-mono font-bold",
        netLabel: "text-black font-bold",
        netValue: "text-black font-black",
        input: "bg-white border-zinc-200 text-black focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm", // Solid White Input
        method: {
            active: "bg-black text-white border-zinc-900 font-bold shadow-md ring-1 ring-black/10", // Crisp Black Active
            inactive: "bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-50 hover:text-black shadow-sm" // High contrast inactive
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

    // PREPAID DISPLAY LOGIC
    // If Prepaid Intent is active, Reception collects ZERO.
    const displayAmountToCollect = isPrepaidIntent ? 0 : billing.netAmount;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 mt-6">
                <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border", ui.indicator)}>
                        3
                    </div>
                    <h3 className={cn("font-bold text-sm uppercase tracking-wide", ui.headerText)}>Financials</h3>
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-synos-primary" />}
                </div>
                {billing.paymentStatus && (
                    <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
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
                    "p-3 rounded-lg border flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-300",
                    settlementDiff > 0
                        ? (isDark ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-100" : "bg-emerald-50 border-emerald-200 text-emerald-800") // Refund
                        : (isDark ? "bg-red-950/40 border-red-500/50 text-red-100" : "bg-red-50 border-red-200 text-red-800") // Due
                )}>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {settlementDiff > 0 ? "Refund Due to Patient" : "Additional Payment Due"}
                        </span>
                        <span className="text-sm opacity-70">
                            {settlementDiff > 0 ? "Credit balance found after changes" : "Amount due after audit changes"}
                        </span>
                    </div>
                    <div className="text-xl font-mono font-bold">
                        {settlementDiff > 0 ? "+" : ""}{settlementDiff > 0 ? settlementDiff.toLocaleString() : Math.abs(settlementDiff).toLocaleString()}
                    </div>
                </div>
            )}

            <div className={cn("rounded-lg p-4 space-y-4 relative overflow-hidden border", ui.container)}>

                {/* Visual Lock Indicator - REMOVED for Silent Enforcement */}

                {/* REFERRAL SOURCE (Read-Only Visualization) */}
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Referral Source</label>
                    <div className={cn("text-xs font-bold p-2 rounded border flex items-center justify-between",
                        isDark ? "text-zinc-300 bg-zinc-900/50 border-zinc-800" : "text-zinc-900 bg-white border-black/[0.05] shadow-sm")}>
                        {snapshot?.billing?.referral?.partner ? (
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_indigo]"></div>
                                {snapshot.billing.referral.partner.displayName}
                            </span>
                        ) : (
                            <span className="text-zinc-400 italic font-medium">No Referral Partner</span>
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
                            <span className="font-mono text-zinc-500 opacity-50">No discount applied</span>
                        )}
                    </div>

                    {/* Tax */}
                    <div className="flex justify-between items-center text-xs">
                        <span className={ui.rowLabel}>GST / Tax</span>
                        <span className={ui.rowValue}>₹{billing.taxAmount?.toLocaleString() ?? "—"}</span>
                    </div>

                    {/* Divider */}
                    <div className={cn("border-t border-dashed my-2", isDark ? "border-zinc-800" : "border-zinc-200")}></div>

                    {/* Net Payable */}
                    <div className="flex justify-between items-center">
                        <span className={cn("font-bold text-sm", ui.netLabel)}>
                            {isPrepaidIntent ? "Amount to Collect (Prepaid)" : (billing.paymentStatus === 'Paid' ? "Total Bill Amount" : "Amount to Collect")}
                        </span>
                        <span className={cn("text-xl font-bold font-mono flex items-center", ui.netValue)}>
                            <IndianRupee className="w-4 h-4 mr-0.5" />
                            {displayAmountToCollect?.toLocaleString() ?? "—"}
                        </span>
                    </div>
                </div>

                {/* B. Discount Selector (Step 5.3) - ALWAYS VISIBLE for Replace Flow */}
                {canPerformActions && (
                    <div className="pt-2 animate-in fade-in">
                        <select
                            className={cn("w-full rounded-md px-3 py-2 text-xs outline-none transition-colors disabled:opacity-50 font-bold", ui.input)}
                            disabled={isProcessing}
                            value=""
                            onChange={(e) => {
                                if (e.target.value) handleApplyDiscount(e.target.value);
                            }}
                        >
                            <option value="" disabled className="text-zinc-500">
                                {billing.appliedDiscount ? "Replace Discount..." : "Apply a Discount..."}
                            </option>
                            {discountCatalog.map(discount => (
                                <option key={discount.code} value={discount.code} className={isDark ? "bg-zinc-900" : "bg-white"}>
                                    {discount.name} ({discount.code})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* E. Payment Method (STAGE 2) */}
                {!isPrepaidIntent && billing.paymentStatus === 'PendingPayment' && (
                    <div className="pt-2 animate-in fade-in space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Cash', 'UPI', 'Card'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod && setPaymentMethod(method)}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-2 rounded-md border text-[10px] uppercase font-bold tracking-widest transition-all active:scale-95",
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
                <div className="mt-2 text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                    {billing.paymentModel === 'PartnerCollects' ? "Prepaid Visit" : "Checkout at Counter"}
                </div>
            </div>

            {/* CORRECTION REASON MODAL */}
            {correctionState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
                    <div className={cn("w-96 rounded-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 border",
                        isDark ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900")}>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                Confirm Financial Change
                            </h3>
                            <p className="text-xs text-zinc-500 font-medium">
                                {isDark ? "This action will be audited." : "Mandatory audit reason required for financial override."}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className={cn("text-xs font-mono p-2 rounded border",
                                isDark ? "bg-black/50 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600")}>
                                {correctionState.type}: {correctionState.payload?.code}
                            </div>
                            <textarea
                                value={correctionState.reason}
                                onChange={(e) => setCorrectionState(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Reason for this change (Required)..."
                                className={cn("w-full rounded-lg p-3 text-sm outline-none min-h-[80px] transition-all",
                                    isDark ? "bg-black border-zinc-700 text-white focus:border-amber-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900")}
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => setCorrectionState({ ...correctionState, isOpen: false })}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCorrection}
                                disabled={!correctionState.reason.trim() || isProcessing}
                                className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
