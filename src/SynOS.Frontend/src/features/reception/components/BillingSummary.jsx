import { useState } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'

export function BillingSummary({ snapshot }) {
    // Local UI State for INPUT only (Discount Code draft)
    const [discountCode, setDiscountCode] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. PURE RENDER SOURCE: Snapshot
    const billing = snapshot?.billing;
    const uiHints = snapshot?.uiHints;

    // Strict Guard: If no billing object, render nothing (or skeleton).
    if (!billing) return null;

    // 2. READ-ONLY Flags (Strictly from Snapshot)
    const isReadOnly = uiHints?.isReadOnly || false;
    const canEditDiscount = !isReadOnly; // Assuming simple inverse for now unless specific hint exists

    // COMMAND: Apply Discount
    const handleApplyDiscount = async () => {
        if (!discountCode.trim() || !canEditDiscount) return;

        setIsProcessing(true);
        try {
            await ReceptionApi.applyIntakeDiscount(discountCode);
            setDiscountCode(""); // Clear Input on success (Snapshot will show applied discount)
        } catch (err) {
            console.error("Failed to apply discount", err);
            // Optionally show error toast
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Remove Discount
    const handleRemoveDiscount = async () => {
        if (!canEditDiscount) return;

        setIsProcessing(true);
        try {
            await ReceptionApi.removeIntakeDiscount();
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
                {billing.status && (
                    <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                        billing.status === 'Paid'
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                        {billing.status}
                    </div>
                )}
            </div>

            <div className="bg-zinc-950 border border-synos-border rounded-lg p-4 space-y-4 shadow-inner">

                {/* A. Totals Section (DUMB RENDERER) */}
                <div className="space-y-3 text-sm">
                    {/* Gross */}
                    <div className="flex justify-between items-center text-zinc-400">
                        <span>Total Amount</span>
                        <span className="font-mono">₹{billing.grossAmount?.toLocaleString() ?? 0}</span>
                    </div>

                    {/* Discount Applied */}
                    {billing.discountAmount > 0 && (
                        <div className="flex justify-between items-center text-emerald-400 animate-in slide-in-from-left-2">
                            <div className="flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" />
                                <span>Discount ({billing.discountCode})</span>
                                {canEditDiscount && (
                                    <button
                                        onClick={handleRemoveDiscount}
                                        disabled={isProcessing}
                                        className="text-zinc-500 hover:text-red-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <span className="font-mono">- ₹{billing.discountAmount?.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Tax */}
                    <div className="flex justify-between items-center text-zinc-500 text-xs">
                        <span>GST / Tax</span>
                        <span className="font-mono">₹{billing.taxAmount?.toLocaleString() ?? 0}</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-zinc-800 my-2"></div>

                    {/* Net Payable */}
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-200">Net Payable</span>
                        <span className="text-lg font-bold font-mono text-white flex items-center">
                            <IndianRupee className="w-4 h-4 mr-0.5" />
                            {billing.netAmount?.toLocaleString() ?? 0}
                        </span>
                    </div>
                </div>

                {/* B. Discount Input (Conditional Command Trigger) */}
                {/* Only show if NO discount applied AND editable */}
                {!billing.discountCode && canEditDiscount && (
                    <div className="pt-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Discount Code"
                                value={discountCode}
                                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                disabled={isProcessing}
                                className="flex-1 bg-zinc-900 border border-synos-border rounded-md px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-synos-primary outline-none font-mono uppercase"
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                            />
                            <button
                                onClick={handleApplyDiscount}
                                disabled={!discountCode || isProcessing}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}

                {/* C. Payment Mode (Read Only for now, based on snapshot) */}
                <div className="mt-2 text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                    Collection: {billing.paymentModel || "Cash"}
                </div>
            </div>
        </div>
    )
}
