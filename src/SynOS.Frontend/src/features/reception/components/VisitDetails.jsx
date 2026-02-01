import { useState, useEffect } from 'react'
import { Search, X, Plus, Loader2, Lock, AlertCircle } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'

export function VisitDetails({ snapshot, visitId, onVisitUpdated, isPrepaidIntent, setIsPrepaidIntent, isCorrectionIntent }) {
    // Local UI State for Search Interaction ONLY
    const [filter, setFilter] = useState("");
    const [catalog, setCatalog] = useState([]); // Master list for search suggestions
    const [referralPartners, setReferralPartners] = useState([]); // Referral Master
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Command spinner

    // 1. PURE RENDER SOURCE: Snapshot
    const visit = snapshot?.visit;
    const tests = visit?.tests || [];

    // Strict Governance Rule (Phase 6.4.4) + Phase 1 Alignment:
    // UI is ReadOnly if:
    // 1. Visit Status is Finalized (Paid/Cancelled)
    // 2. Billing is Locked (Backend Flag)
    // 3. UI Hint says ReadOnly (Session closed etc.)
    const isFinalized = ["Paid", "Cancelled"].includes(visit?.status || "");
    const isLocked = snapshot?.billing?.isLocked || false;
    const isUiReadOnly = snapshot?.uiHints?.isReadOnly || false;
    const isReadOnly = isFinalized || isLocked || isUiReadOnly;

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

    const readOnlyReason = snapshot?.uiHints?.readOnlyReason ||
        (isFinalized ? visit.status.toUpperCase() : (isLocked ? "LOCKED" : null));

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
        if ((isReadOnly && !isCorrectionIntent) || !visitId) return;

        // CORRECTION INTENT
        if (isCorrectionIntent) {
            setCorrectionState({
                isOpen: true,
                type: 'ChangeReferral',
                payload: { partnerId },
                reason: ""
            });
            return;
        }
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
        if ((isReadOnly && !isCorrectionIntent) || !visitId) return;

        // CORRECTION INTENT
        if (isCorrectionIntent) {
            setCorrectionState({
                isOpen: true,
                type: 'ChangeReferral',
                payload: { partnerId: null, referrerText: null }, // Clears both
                reason: ""
            });
            return;
        }
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

    // State for Correction Reason Modal
    const [correctionState, setCorrectionState] = useState({
        isOpen: false,
        type: null, // 'AddTest' | 'RemoveTest' | 'ChangeDiscount'
        payload: null, // Data needed for the action
        reason: ""
    });

    // COMMAND: Add Test (Intent Aware)
    const handleAddTest = async (test) => {
        if (!visitId) return;

        // 1. CORRECTION INTENT (Paid/Finalized)
        if (isCorrectionIntent) {
            // Open Modal for Reason
            setCorrectionState({
                isOpen: true,
                type: 'AddTest',
                payload: test,
                reason: ""
            });
            return;
        }

        // 2. STANDARD INTENT (Create/Resume)
        if (isReadOnly) return; // Block if read-only and not correcting

        setIsProcessing(true);
        setFilter("");
        try {
            const code = test.testCode || test.code;
            await ReceptionApi.addTestToVisit(visitId, code);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to add test", err);
            alert("Failed to add test: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };


    // COMMAND: Remove Test (Intent Aware)
    const handleRemoveTest = async (testCode, orderId) => {
        if (!visitId) return;

        // 1. CORRECTION INTENT
        if (isCorrectionIntent) {
            setCorrectionState({
                isOpen: true,
                type: 'RemoveTest',
                payload: { testCode, orderId }, // Need OrderId for correction if possible, but backend might look it up via context? 
                // CorrectionService RemoveTest uses TargetEntityId (OrderId). 
                // Snapshot matches TestCode to OrderId? 
                // We need to look up OrderID from 'test' object in the map loop.
                reason: ""
            });
            return;
        }

        // 2. STANDARD INTENT
        if (isReadOnly) return;

        setIsProcessing(true);
        try {
            await ReceptionApi.removeTestFromVisit(visitId, testCode);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to remove test", err);
            alert("Failed to remove test: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // EXECUTE CORRECTION (Called from Modal)
    const confirmCorrection = async () => {
        if (!correctionState.reason.trim()) {
            alert("Reason is mandatory for corrections.");
            return;
        }

        setIsProcessing(true);
        try {
            if (correctionState.type === 'AddTest') {
                const code = correctionState.payload.testCode || correctionState.payload.code;
                await ReceptionApi.applyCorrection(visitId, 'AddTest', correctionState.reason, null, code);
            } else if (correctionState.type === 'RemoveTest') {
                // We need OrderId. If not available, we can't strict correct. 
                // Passed payload has { testCode, orderId }
                if (!correctionState.payload.orderId) throw new Error("Order ID missing for correction.");
                await ReceptionApi.applyCorrection(visitId, 'RemoveTest', correctionState.reason, correctionState.payload.orderId);
            } else if (correctionState.type === 'ChangeReferral') {
                // Determine Payload
                const targetEntityId = correctionState.payload.partnerId || null;
                const payloadJson = correctionState.payload.referrerText || null;
                // For "Remove", both are null
                await ReceptionApi.applyCorrection(visitId, 'ChangeReferral', correctionState.reason, targetEntityId, payloadJson);
            }

            setCorrectionState({ isOpen: false, type: null, payload: null, reason: "" });
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            alert("Correction Failed: " + err.message);
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
            <div className="space-y-4 bg-zinc-950/30 p-4 border border-synos-border rounded-lg">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Visit Context</h4>

                {/* A. Prepaid Checkbox */}
                <div className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        id="chkPrepaid"
                        checked={isPrepaidIntent}
                        onChange={(e) => setIsPrepaidIntent(e.target.checked)}
                        disabled={isReadOnly && !isCorrectionIntent} // Allow in Correction
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

                            {isReadOnly && !isCorrectionIntent ? (
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
                                if (!visitId || (isReadOnly && !isCorrectionIntent)) return;

                                if (isCorrectionIntent) {
                                    setCorrectionState({
                                        isOpen: true,
                                        type: 'ChangeReferral',
                                        payload: { referrerText: text, partnerId: null },
                                        reason: ""
                                    });
                                    return;
                                }
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
                        <div key={test.testCode || test.code} className="bg-zinc-950/30 border border-synos-border rounded-lg p-3 flex items-center justify-between group animate-in zoom-in-95 duration-200">
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
                                {/* Allow Remove if NOT ReadOnly OR if Correction Intent */}
                                {(!isReadOnly || isCorrectionIntent) && (
                                    <button
                                        onClick={() => {
                                            console.log("DEBUG TEST OBJ:", test); // Debugging
                                            handleRemoveTest(test.testCode || test.code, test.orderId || test.OrderId || test.TestId || test.testId); // Fallback to TestId? No, need OrderId.
                                        }}
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

            {/* CORRECTION REASON MODAL */}
            {correctionState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-synos-border w-96 rounded-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                Confirm Correction
                            </h3>
                            <p className="text-xs text-zinc-400">
                                This action will be audited. Please provide a mandatory reason.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-mono text-zinc-500 bg-black/50 p-2 rounded border border-zinc-800">
                                {correctionState.type}: {correctionState.payload?.testCode || correctionState.payload?.code || correctionState.payload?.testName}
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
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Correction"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
