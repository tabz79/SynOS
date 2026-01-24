import { useState, useEffect } from 'react'
import { Search, X, Plus, Loader2, Lock } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'

export function VisitDetails({ snapshot, visitId, onVisitUpdated, isPrepaidIntent, setIsPrepaidIntent }) {
    // Local UI State for Search Interaction ONLY
    const [filter, setFilter] = useState("");
    const [catalog, setCatalog] = useState([]); // Master list for search suggestions
    const [referralPartners, setReferralPartners] = useState([]); // Referral Master
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Command spinner

    // 1. PURE RENDER SOURCE: Snapshot
    const visit = snapshot?.visit;
    const tests = visit?.tests || [];

    // Strict Governance Rule (Phase 6.4.4):
    // UI is ReadOnly if:
    // 1. Billing is Locked (Paid/Prepaid)
    // 2. UI Hint says ReadOnly (Session closed etc.)
    const isLocked = snapshot?.billing?.isLocked || false;
    const isUiReadOnly = snapshot?.uiHints?.isReadOnly || false;
    const isReadOnly = isLocked || isUiReadOnly;

    // Sync isPrepaidIntent with actual locked status (if locked as Paid/Prepaid)
    useEffect(() => {
        if (isLocked) {
            // If locked and Paid, we can assume it was prepaid flow or just paid. 
            // Logic: If locked, checkbox is read-only anyway.
            // But let's check payment collection model? No, just leave as user logic.
            // Actually, if it's already locked/paid, checkbox should probably reflect truth?
            // Prompt says: "Reversible until final lock". After lock, it's immutable.
            setIsPrepaidIntent(visit?.paymentCollectionModel === 'PartnerCollects');
        }
    }, [isLocked, visit?.paymentCollectionModel]);

    const readOnlyReason = snapshot?.uiHints?.readOnlyReason || (isLocked ? "LOCKED" : null);

    // Load Catalogs (Test + Referral) 
    // Load independently so one failure (e.g. 403 on Referrals) doesn't block the other (Tests).
    useEffect(() => {
        const loadCatalogs = async () => {
            // 1. Load Test Catalog (Critical)
            try {
                const testData = await ReceptionApi.getTestCatalog();
                setCatalog(testData || []);
            } catch (err) {
                console.error("Failed to load test catalog", err);
            }

            // 2. Load Referral Partners (Secondary - might be 403 for Receptionist)
            try {
                const referralData = await ReceptionApi.getReferralPartners();
                setReferralPartners(referralData || []);
            } catch (err) {
                console.warn("Failed to load referral partners (likely permission)", err);
            }
        };
        loadCatalogs();
    }, []);

    // COMMAND: Apply Referral (Step 5.4)
    const handleApplyReferral = async (partnerId) => {
        if (isReadOnly || !visitId) return;
        setIsProcessing(true);
        try {
            await ReceptionApi.applyReferralToVisit(visitId, partnerId);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to apply referral", err);
            alert("Failed to apply referral: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Remove Referral
    const handleRemoveReferral = async () => {
        if (isReadOnly || !visitId) return;
        setIsProcessing(true);
        try {
            await ReceptionApi.removeReferralFromVisit(visitId);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to remove referral", err);
            alert("Failed to remove referral: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Filter Logic for Search (UI Only)
    // Backend returns: { testName, testCode, basePrice, department }
    const suggestions = filter.length < 2 ? [] : catalog.filter(t =>
        ((t.testName || t.name || "").toLowerCase().includes(filter.toLowerCase()) ||
            (t.testCode || t.code || "").toLowerCase().includes(filter.toLowerCase())) &&
        !tests.some(existing => existing.code === (t.testCode || t.code)) // Don't suggest already added
    );

    // COMMAND: Add Test
    const handleAddTest = async (test) => {
        if (isReadOnly || !visitId) return;
        setIsProcessing(true);
        setFilter(""); // Clear UI input immediately
        try {
            // Support both formats just in case
            const code = test.testCode || test.code;
            await ReceptionApi.addTestToVisit(visitId, code);
            // No local mutation. Wait for snapshot.
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to add test", err);
            alert("Failed to add test: " + err.message); // Simple feedback
        } finally {
            setIsProcessing(false);
        }
    };


    // COMMAND: Remove Test
    const handleRemoveTest = async (testCode) => {
        if (isReadOnly || !visitId) return;
        setIsProcessing(true);
        try {
            await ReceptionApi.removeTestFromVisit(visitId, testCode);
            // No local mutation. Wait for snapshot.
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to remove test", err);
            alert("Failed to remove test: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Confirm & Lock - MOVED TO INTENT PANEL FOOTER

    if (!visit) return null; // Safety: Should be controlled by parent, but good to have.

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 mt-6">
                <div className="flex items-center gap-2 text-zinc-400">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-synos-border">
                        2
                    </div>
                    <h3 className="font-medium text-sm text-zinc-200 uppercase tracking-wide">Visit Details</h3>
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-synos-primary" />}
                </div>
                {isReadOnly && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/50 border border-zinc-700">
                        <Lock className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                            {readOnlyReason || "LOCKED"}
                        </span>
                    </div>
                )}
            </div>

            {/* SECTION 2: VISIT CONTEXT (Phase 8 - Reordered Top) */}
            <div className="space-y-4 bg-zinc-950/50 p-4 border border-synos-border rounded-lg">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Visit Context</h4>

                {/* A. Prepaid Checkbox */}
                <div className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        id="chkPrepaid"
                        checked={isPrepaidIntent}
                        onChange={(e) => setIsPrepaidIntent(e.target.checked)}
                        disabled={isReadOnly}
                        className="mt-0.5 accent-synos-primary cursor-pointer w-4 h-4"
                    />
                    <div className="space-y-0.5">
                        <label htmlFor="chkPrepaid" className={cn("text-sm font-medium cursor-pointer", isPrepaidIntent ? "text-amber-400" : "text-zinc-300")}>
                            Prepaid Bill (Patient already paid)
                        </label>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                            Select this ONLY if money was collected outside (e.g. by Referral Center).
                        </p>
                    </div>
                </div>

                {/* B. Referral Input */}
                <div className="pt-2">
                    <div className="text-xs text-zinc-500 mb-1 flex justify-between">
                        <span>Referral / Doctor {isPrepaidIntent && <span className="text-red-500">*</span>}</span>
                        {isPrepaidIntent && <span className="text-amber-500/50 text-[10px] uppercase">Who collected payment?</span>}
                    </div>

                    {/* 1. PARTNER BADGE (Highest Priority) */}
                    {snapshot?.billing?.referral?.partner ? (
                        <div className="flex items-center gap-2 text-zinc-300 font-medium bg-zinc-800/50 p-2 rounded border border-zinc-700/50">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="truncate flex-1">
                                {snapshot.billing.referral.partner.displayName || "Partner"}
                            </span>

                            {/* Collection Label Badge */}
                            {snapshot.billing.referral.partner.collectionLabel && (
                                <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 uppercase">
                                    {snapshot.billing.referral.partner.collectionLabel}
                                </span>
                            )}

                            {isReadOnly ? (
                                <Lock className="w-3 h-3 text-zinc-600 ml-auto" />
                            ) : (
                                <button
                                    onClick={handleRemoveReferral}
                                    disabled={isProcessing}
                                    className="ml-auto text-zinc-500 hover:text-red-400 p-1 hover:bg-red-400/10 rounded transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ) : (
                        // 2. HYBRID INPUT (Text + Suggestions)
                        <ReferralCombinedInput
                            initialValue={snapshot?.billing?.referral?.referrerText || ""}
                            isReadOnly={isReadOnly}
                            isProcessing={isProcessing}
                            partners={referralPartners}
                            allowFreeText={!isPrepaidIntent} // Constraint based on Checkbox
                            onApplyPartner={handleApplyReferral}
                            onUpdateText={async (text) => {
                                if (!visitId || isReadOnly) return;
                                if (isPrepaidIntent) {
                                    // Should be blocked by UI component, but defensive check
                                    console.warn("Free text not allowed in prepaid mode");
                                    return;
                                }
                                setIsProcessing(true);
                                try {
                                    await ReceptionApi.updateReferrerText(visitId, text);
                                    if (onVisitUpdated) onVisitUpdated();
                                } catch (err) {
                                    console.error("Failed to update referrer text", err);
                                    alert(err.message);
                                } finally {
                                    setIsProcessing(false);
                                }
                            }}
                        />
                    )}
                </div>
            </div>

            {/* SECTION 3: Test Selection (Reordered Down) */}
            <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Test Selection</h4>
                {!isReadOnly && (
                    <div className="relative z-10">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Add Test Code or Name..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            disabled={isProcessing}
                            className="w-full bg-zinc-900 border border-synos-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-synos-primary transition-colors placeholder:text-zinc-600 font-mono disabled:opacity-50"
                        />

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-synos-border rounded-lg shadow-xl max-h-60 overflow-y-auto z-20">
                                {suggestions.map(test => (
                                    <button
                                        key={test.testCode || test.code}
                                        onClick={() => handleAddTest(test)}
                                        className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center justify-between group transition-colors"
                                    >
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200">{test.testName || test.name}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{test.testCode || test.code}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-synos-emerald">₹{test.basePrice || test.price}</span>
                                            <Plus className="w-4 h-4 text-zinc-500 group-hover:text-synos-primary" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Tests List (Pure Render from Snapshot) */}
                <div className="space-y-2">
                    {tests.length === 0 && !isReadOnly && (
                        <div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-600">
                            No tests added yet
                        </div>
                    )}

                    {tests.map(test => (
                        <div key={test.testCode || test.code} className="bg-synos-surface border border-synos-border rounded-lg p-3 flex items-center justify-between group animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 font-mono border border-zinc-700/50">
                                    {test.testCode || test.code}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white leading-tight">{test.testName || test.name}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{test.dept || test.category}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-mono text-synos-emerald font-medium">₹{test.basePrice || test.price}</div>
                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleRemoveTest(test.testCode || test.code)}
                                        disabled={isProcessing}
                                        className="text-zinc-500 hover:text-red-400 p-1 hover:bg-red-400/10 rounded transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div >

            {/* SECTION 4: FINAL LOCK (Only for Prepaid) - REMOVED (Moved to Footer) */}

        </div >
    )
}

function ReferralCombinedInput({ initialValue, isReadOnly, isProcessing, partners, onApplyPartner, onUpdateText }) {
    const [value, setValue] = useState(initialValue);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Sync with Snapshot (Strict Rule)
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    // Derived Suggestions
    const suggestions = value.length < 2 ? [] : partners.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
    );

    return (
        <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
                type="text"
                value={value}
                disabled={isReadOnly || isProcessing}
                placeholder="Search Partner or Type Name..."
                className="w-full bg-zinc-900 border border-synos-border rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-synos-primary transition-colors placeholder:text-zinc-600 disabled:opacity-50"
                onChange={(e) => {
                    setValue(e.target.value);
                    setShowSuggestions(true);
                }}
                onBlur={() => {
                    // Delay to allow click on suggestion to register
                    setTimeout(() => {
                        setShowSuggestions(false);
                        // Case B: Commit text if changed, no partner selected, and value differs from snapshot
                        if (value !== initialValue) {
                            onUpdateText(value);
                        }
                    }, 200);
                }}
                onFocus={() => setShowSuggestions(true)}
            />

            {/* Suggestions Overlay */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-synos-border rounded-lg shadow-xl max-h-48 overflow-y-auto z-20">
                    {suggestions.map(p => (
                        <button
                            key={p.referralPartnerId}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                onApplyPartner(p.referralPartnerId);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors border-b border-zinc-800/50 last:border-0"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
