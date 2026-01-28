import { useState, useEffect } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock, AlertCircle } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'

export function BillingSummary({ snapshot, onVisitUpdated, isCorrectionIntent }) {
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

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 mt-6">
                <div className="flex items-center gap-2 text-zinc-400">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-synos-border">
                        3
                    </div>
                    <h3 className="font-medium text-sm text-zinc-200 uppercase tracking-wide">Financials</h3>
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-synos-primary" />}
                </div>
                {billing.paymentStatus && (
                    <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                        billing.paymentStatus === 'Paid'
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
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
                        ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-100" // Refund
                        : "bg-red-950/40 border-red-500/50 text-red-100" // Due
                )}>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {settlementDiff > 0 ? "Refund Due to Patient" : "Additional Payment Due"}
                        </span>
                        <span className="text-sm opacity-70">
                            audit-trail-pending...
                        </span>
                    </div>
                    <div className="text-xl font-mono font-bold">
                        {settlementDiff > 0 ? "+" : ""}{settlementDiff > 0 ? settlementDiff.toLocaleString() : Math.abs(settlementDiff).toLocaleString()}
                    </div>
                </div>
            )}

            <div className="bg-zinc-950 border border-synos-border rounded-lg p-4 space-y-4 shadow-inner relative overflow-hidden">

                {/* Visual Lock Indicator */}
                {isStrictReadOnly && (
                    <div className="absolute top-0 right-0 p-2">
                        <Lock className="w-12 h-12 text-zinc-900/50 -rotate-12" />
                    </div>
                )}

                {/* A. Totals Section (DUMB RENDERER) */}
                <div className="space-y-3 text-sm">
                    {/* Gross */}
                    <div className="flex justify-between items-center text-zinc-400">
                        <span>Total Amount</span>
                        <span className="font-mono">₹{billing.grossAmount?.toLocaleString() ?? "—"}</span>
                    </div>

                    {/* Discount Applied */}
                    <div className="flex justify-between items-center text-zinc-400">
                        <span>Discount</span>
                        {billing.appliedDiscount ? (
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-emerald-400 flex items-center gap-1">
                                    - ₹{billing.discountAmount?.toLocaleString()}
                                    <span className="text-xs opacity-70">({billing.appliedDiscount.name})</span>
                                </span>
                                {canPerformActions && (
                                    <button
                                        onClick={handleRemoveDiscount}
                                        disabled={isProcessing}
                                        className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-400 transition-colors"
                                        title="Remove Discount"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <span className="font-mono text-zinc-600">No discount applied</span>
                        )}
                    </div>

                    {/* Tax */}
                    <div className="flex justify-between items-center text-zinc-500 text-xs">
                        <span>GST / Tax</span>
                        <span className="font-mono">₹{billing.taxAmount?.toLocaleString() ?? "—"}</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-zinc-800 my-2"></div>

                    {/* Net Payable */}
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-200">
                            {billing.paymentStatus === 'Paid' ? "Total Bill Amount" : "Amount to Collect"}
                        </span>
                        <span className="text-lg font-bold font-mono text-white flex items-center">
                            <IndianRupee className="w-4 h-4 mr-0.5" />
                            {billing.netAmount?.toLocaleString() ?? "—"}
                        </span>
                    </div>
                </div>

                {/* B. Discount Selector (Step 5.3) - ALWAYS VISIBLE for Replace Flow */}
                {canPerformActions && (
                    <div className="pt-2 animate-in fade-in">
                        <select
                            className="w-full bg-zinc-900 border border-synos-border rounded-md px-3 py-2 text-xs text-white focus:border-synos-primary outline-none transition-colors disabled:opacity-50"
                            disabled={isProcessing}
                            value=""
                            onChange={(e) => {
                                if (e.target.value) handleApplyDiscount(e.target.value);
                            }}
                        >
                            <option value="" disabled>
                                {billing.appliedDiscount ? "Replace Discount..." : "Apply a Discount..."}
                            </option>
                            {discountCatalog.map(discount => (
                                <option key={discount.code} value={discount.code}>
                                    {discount.name} ({discount.code})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* D. Payment Mode (Read Only for now, based on snapshot) */}
                <div className="mt-2 text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                    {billing.paymentModel === 'PartnerCollects' ? "Prepaid Visit" : "Checkout at Counter"}
                </div>
            </div>

            {/* CORRECTION REASON MODAL */}
            {correctionState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-synos-border w-96 rounded-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                Confirm Financial Change
                            </h3>
                            <p className="text-xs text-zinc-400">
                                This action will be audited.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-mono text-zinc-500 bg-black/50 p-2 rounded border border-zinc-800">
                                {correctionState.type}: {correctionState.payload?.code}
                            </div>
                            <textarea
                                value={correctionState.reason}
                                onChange={(e) => setCorrectionState(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Reason for this change (Required)..."
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 outline-none min-h-[80px]"
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
