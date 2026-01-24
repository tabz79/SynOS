import { useState, useEffect } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'

export function BillingSummary({ snapshot, onVisitUpdated }) {
    // Local UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [discountCatalog, setDiscountCatalog] = useState([]);

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
    const isStrictReadOnly = isLocked || isUiReadOnly;

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

        setIsProcessing(true);
        try {
            await ReceptionApi.applyDiscountToVisit(visitId, code);
            // Snapshot update will reflect change
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

        setIsProcessing(true);
        try {
            await ReceptionApi.removeDiscountFromVisit(visitId);
        } catch (err) {
            console.error("Failed to remove discount", err);
        } finally {
            setIsProcessing(false);
        }
    };

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
                            <span className="font-mono text-emerald-400">
                                - ₹{billing.discountAmount?.toLocaleString()}
                                <span className="text-xs ml-1 opacity-70">({billing.appliedDiscount.name})</span>
                            </span>
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

                {/* B. Discount Selector (Step 5.3) */}
                {!billing.appliedDiscount && canPerformActions && (
                    <div className="pt-2 animate-in fade-in">
                        <select
                            className="w-full bg-zinc-900 border border-synos-border rounded-md px-3 py-2 text-xs text-white focus:border-synos-primary outline-none transition-colors disabled:opacity-50"
                            disabled={isProcessing}
                            value=""
                            onChange={(e) => {
                                if (e.target.value) handleApplyDiscount(e.target.value);
                            }}
                        >
                            <option value="" disabled>Apply a Discount...</option>
                            {discountCatalog.map(discount => (
                                <option key={discount.code} value={discount.code}>
                                    {discount.name} ({discount.code})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* C. Payment Trigger - MOVED TO INTENT PANEL FOOTER */}

                {/* D. Payment Mode (Read Only for now, based on snapshot) */}
                <div className="mt-2 text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                    {billing.paymentModel === 'PartnerCollects' ? "Prepaid Visit" : "Checkout at Counter"}
                </div>
            </div>
        </div>
    )
}
