import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Loader2, Lock, AlertCircle, Beaker, ShieldCheck } from 'lucide-react'
import { ReceptionApi, fetchTestCatalogCached, fetchReferralPartnersCached, fetchReferenceLabsCached, fetchOutsourcedCatalogCached } from '@/api/reception'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import ReferralDraftForm from './ReferralDraftForm'
import OutsourceDraftForm from './OutsourceDraftForm'
import { useReceptionDrawer } from '@/features/reception/hooks/useReceptionPanelUI'

export function VisitDetails({ snapshot, visitId, onVisitUpdated, isPrepaidIntent, setIsPrepaidIntent, isCorrectionIntent }) {
    const { closePanel } = useReceptionDrawer();
    // Local UI State for Search Interaction ONLY
    const [filter, setFilter] = useState("");
    const [testSelectedIndex, setTestSelectedIndex] = useState(0);
    const [catalog, setCatalog] = useState([]); // Master list for search suggestions
    const [referralPartners, setReferralPartners] = useState([]); // Referral Master
    const [referenceLabs, setReferenceLabs] = useState([]); // Reference Labs Master
    const [outsourcedCatalog, setOutsourcedCatalog] = useState([]); // ADDED: Outsourced Catalog Master
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Command spinner

    const handleDeleteDraft = async () => {
        if (!visitId) return;
        if (!window.confirm("Are you sure you want to permanently delete this draft visit? This action cannot be undone.")) return;

        setIsProcessing(true);
        try {
            await ReceptionApi.deleteVisit(visitId);
            closePanel();
        } catch (err) {
            console.error("Failed to delete draft visit:", err);
            alert("Failed to delete draft visit: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Referral Draft UI State
    const [isDraftFormVisible, setIsDraftFormVisible] = useState(false);
    // Outsource Draft UI State
    const [isOutsourceFormVisible, setIsOutsourceFormVisible] = useState(false);

    // 1. PURE RENDER SOURCE: Snapshot
    const visit = snapshot?.visit;
    const tests = visit?.tests || [];
    const internalTests = tests.filter(t => !t.isOutsourced && !t.parentOrderId && !(t.price === 0 && !t.isProfile && tests.some(p => p.isProfile)));
    const outsourcedTests = tests.filter(t => t.isOutsourced && !t.parentOrderId && !(t.price === 0 && !t.isProfile && tests.some(p => p.isProfile)));

    // Strict Governance Rule (Phase 6.4.4) + Phase 1 Alignment:
    // UI is ReadOnly if:
    // 1. Visit Status is Finalized (Paid/Cancelled)
    // 2. Billing is Locked (Backend Flag)
    // 3. UI Hint says ReadOnly (Session closed etc.)
    const isFinalized = ["Paid", "Cancelled"].includes(visit?.status || "");
    const isLocked = snapshot?.billing?.isLocked || false;
    const isUiReadOnly = snapshot?.uiHints?.isReadOnly || false;

    // Strict Governance Rule (Phase 6.4.4):
    const isReadOnly = isFinalized || isLocked || isUiReadOnly;

    // 4. PHYSICAL LOCK (Strict Truth from Reality)
    // Rule: Locked if ANY sample is collected/processed (Status != Pending).
    // Silent enforcement.
    const isPhysicallyLocked = (visit?.samples || []).some(s => s.status !== 'Pending');

    // 5. REFERRAL EDITABILITY (Late Attribution Rule)
    // - Always allowed if strictly open.
    // - If Locked: Allowed ONLY if current partner is NULL (Late Attribution).
    // - Once set & locked -> Immutable.
    const hasReferralPartner = !!snapshot?.billing?.referral?.partner;
    const referralDraft = snapshot?.billing?.referral?.draft;
    const canEditReferral = !isReadOnly && (!isPhysicallyLocked || !hasReferralPartner);
    const canAddDraft = !hasReferralPartner && !referralDraft && !isReadOnly;

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

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        indicator: "bg-zinc-800 border-synos-border type-label",
        headerText: "type-value",
        section: "bg-zinc-950/30 border-synos-border",
        sectionTitle: "type-section-header",
        input: "bg-zinc-900 border-synos-border type-body focus:border-synos-primary",
        suggestionBox: "bg-zinc-900 border-synos-border shadow-xl",
        testCard: "bg-zinc-950/30 border-synos-border",
        testCode: "bg-zinc-800 border-zinc-700/50 type-code",
        modal: "bg-zinc-900 border-synos-border type-body",
        modalInput: "bg-black border-zinc-700 type-body focus:border-amber-500"
    } : {
        indicator: "bg-white border-zinc-200 shadow-sm type-label",
        headerText: "type-value",
        // UNIFIED CARD STYLE (From Patient Card)
        section: "p-4 rounded-lg bg-black/[0.04] border border-black/5 shadow-inner space-y-3",
        sectionTitle: "type-section-header opacity-70",
        // ETCHED INPUT: Bright & sunken into the slab
        input: "bg-white/85 border-white/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] type-body focus:ring-1 focus:ring-black/5 transition-all placeholder:text-zinc-400",
        suggestionBox: "bg-white border-zinc-200 shadow-xl",
        // TEST CARD (Inside Recess): Needs to pop out slightly to be visible
        // Default: White/60 Glass Chip. Hover: White/90 Bright Highlight.
        testCard: "group flex items-center justify-between p-3 rounded-lg bg-white/60 border border-white/40 shadow-sm hover:bg-white/90 transition-all cursor-pointer",
        testCode: "type-code opacity-70 group-hover:opacity-100 transition-opacity",
        modal: "bg-white border-zinc-200 type-body",
        modalInput: "bg-zinc-50 border-zinc-200 type-body focus:border-black"
    };

    const readOnlyReason = snapshot?.uiHints?.readOnlyReason ||
        (isFinalized ? visit.status.toUpperCase() : (isLocked ? "LOCKED" : null));

    // Load Catalogs (Test + Referral) 
    // Load independently so one failure (e.g. 403 on Referrals) doesn't block the other (Tests).
    useEffect(() => {
        let isMounted = true;
        const loadCatalogs = async () => {
            const [testResult, referralResult, labsResult, outResult] = await Promise.allSettled([
                fetchTestCatalogCached(),
                fetchReferralPartnersCached(),
                fetchReferenceLabsCached(),
                fetchOutsourcedCatalogCached()
            ]);

            if (!isMounted) return;

            if (testResult.status === 'fulfilled') setCatalog(testResult.value || []);
            else console.error("Failed to load test catalog", testResult.reason);

            if (referralResult.status === 'fulfilled') setReferralPartners(referralResult.value || []);
            else console.warn("Failed to load referral partners", referralResult.reason);

            if (labsResult.status === 'fulfilled') {
                const labsData = labsResult.value;
                setReferenceLabs(labsData?.data || labsData || []);
            } else console.warn("Failed to load reference labs", labsResult.reason);

            if (outResult.status === 'fulfilled') {
                const outCatalog = outResult.value;
                setOutsourcedCatalog(outCatalog?.data || outCatalog || []);
            } else console.warn("Failed to load outsourced catalog", outResult.reason);
        };
        loadCatalogs();
        return () => { isMounted = false; };
    }, []);

    // COMMAND: Apply Referral (Step 5.4)
    const handleApplyReferral = async (partnerId) => {
        if (!canEditReferral || !visitId) return;

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
        if (!canEditReferral || !visitId) return;

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
    const internalSuggestions = filter.length < 2 ? [] : catalog.filter(t =>
        ((t.testName || t.name || "").toLowerCase().includes(filter.toLowerCase()) ||
            (t.testCode || t.code || "").toLowerCase().includes(filter.toLowerCase())) &&
        !tests.some(existing => existing.code === (t.testCode || t.code)) // Don't suggest already added
    );

    const outsourcedSuggestions = filter.length < 2 ? [] : outsourcedCatalog.filter(t =>
        ((t.testName || t.name || "").toLowerCase().includes(filter.toLowerCase()) ||
            (t.testCode || t.code || "").toLowerCase().includes(filter.toLowerCase())) &&
        !tests.some(existing => existing.code === (t.testCode || t.code))
    );

    const suggestions = [...internalSuggestions, ...outsourcedSuggestions];

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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border", ui.indicator)}>
                        2
                    </div>
                    <h3 className={cn("tracking-tight", ui.headerText)}>Visit Details</h3>
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-synos-primary" />}
                </div>
                {isReadOnly ? (
                    <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded border", isDark ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-100 border-zinc-200")}>
                        <Lock className="w-3 h-3 text-zinc-500" />
                        <span className="type-section-header">
                            {readOnlyReason || "LOCKED"}
                        </span>
                    </div>
                ) : (
                    <button
                        onClick={handleDeleteDraft}
                        disabled={isProcessing}
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-95 flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete Draft"}
                    </button>
                )}
            </div>

            {/* SECTION 2: VISIT CONTEXT (Phase 8 - Reordered Top) */}
            <div className={cn("space-y-1.5 xl:space-y-2 p-2.5 xl:p-4 rounded-lg border", ui.section)}>
                <h4 className="type-section-header">Visit Context</h4>

                {/* A. Prepaid Checkbox */}
                <div className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        id="chkPrepaid"
                        checked={isPrepaidIntent}
                        onChange={async (e) => {
                            const checked = e.target.checked;
                            setIsPrepaidIntent(checked);
                            
                            // OPX-GPT-5: Sync Visit-Level Authority with Backend
                            if (visitId && !isReadOnly) {
                                setIsProcessing(true);
                                try {
                                    const model = checked ? "PartnerCollects" : "LabCollects";
                                    await ReceptionApi.updatePaymentCollectionModel(visitId, model);
                                    if (onVisitUpdated) onVisitUpdated();
                                } catch (err) {
                                    console.error("Failed to sync collection model", err);
                                    // Revert UI state on failure
                                    setIsPrepaidIntent(!checked);
                                } finally {
                                    setIsProcessing(false);
                                }
                            }
                        }}
                        disabled={isReadOnly && !isCorrectionIntent}
                        className="mt-0.5 accent-synos-primary cursor-pointer w-4 h-4"
                    />
                    <div className="space-y-0.5">
                        <label htmlFor="chkPrepaid" className={cn("cursor-pointer transition-colors type-body",
                            isPrepaidIntent
                                ? (isDark ? "text-amber-400" : "text-amber-700")
                                : ""
                        )}>
                            Prepaid Bill (Patient already paid)
                        </label>
                        <p className="type-meta leading-tight">
                            Select this ONLY if money was collected outside (e.g. by Referral Center).
                        </p>
                    </div>
                </div>

                {/* B. Referral Input */}
                <div className="pt-2">
                    <div className="type-label mb-1 flex justify-between">
                        <span>Referral / Doctor {isPrepaidIntent && <span className="text-red-500">*</span>}</span>
                        {isPrepaidIntent && <span className="text-amber-500/50 type-section-header">Who collected payment?</span>}
                    </div>

                    {/* 1. PARTNER BADGE (Highest Priority) */}
                    {snapshot?.billing?.referral?.partner ? (
                        <div className={cn("flex items-center gap-2 font-bold p-2 rounded border",
                            isDark ? "text-zinc-300 bg-zinc-800/50 border-zinc-700/50" : "text-zinc-900 bg-white border-zinc-200 shadow-sm")}>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                            <span className="truncate flex-1 tracking-tight type-value">
                                {snapshot.billing.referral.partner.displayName || "Partner"}
                            </span>

                            {/* Silent Lock: If not editable, show nothing. If editable, show Remove. */}
                            {canEditReferral && (
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
                            isReadOnly={!canEditReferral}
                            isProcessing={isProcessing}
                            partners={referralPartners}
                            allowFreeText={!isPrepaidIntent} // Constraint based on Checkbox
                            onApplyPartner={handleApplyReferral}
                            onUpdateText={async (text) => {
                                if (!visitId || !canEditReferral) return;

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

            {/* SECTION 2b: REFERRAL DRAFT (Provisional) */}
            <div className="py-2">
                {/* 1. Read Only Summary */}
                {referralDraft && (
                    <div className={cn("border rounded p-3 mb-2 flex items-center justify-between", isDark ? "bg-zinc-900/50 border-zinc-700/50" : "bg-white border-zinc-200 shadow-sm")}>
                        <div>
                            <div className="type-section-header mb-0.5">Provisional Referral Draft</div>
                            <div className="type-value">{referralDraft.providerName}</div>
                            {(referralDraft.clinicName || referralDraft.location) && (
                                <div className="type-label">
                                    {[referralDraft.clinicName, referralDraft.location].filter(Boolean).join(" • ")}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Inline Form */}
                {isDraftFormVisible && !referralDraft && (
                    <ReferralDraftForm
                        visitId={visitId}
                        isDark={isDark}
                        uiStyles={ui}
                        onSuccess={() => {
                            setIsDraftFormVisible(false);
                            if (onVisitUpdated) onVisitUpdated();
                        }}
                        onCancel={() => setIsDraftFormVisible(false)}
                    />
                )}

                {/* 3. Trigger Button */}
                {!isDraftFormVisible && !referralDraft && (
                    <button
                        onClick={() => setIsDraftFormVisible(true)}
                        disabled={!canAddDraft}
                        className={cn("flex items-center gap-2 type-section-header transition-all px-3 py-2 rounded-lg border group",
                            isDark
                                ? "border-zinc-800 hover:text-white hover:bg-zinc-800/50"
                                : "bg-white border-zinc-300 shadow-sm hover:border-zinc-400 hover:shadow-md")}
                    >
                        <Plus className="w-3 h-3 transition-transform group-hover:rotate-90" />
                        Add Referral Partner
                    </button>
                )}

                {/* 4. Disabled State Reminder */}
                {referralDraft && (
                    <button disabled className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-not-allowed px-1 mt-1 opacity-20",
                        isDark ? "text-zinc-700" : "text-zinc-400")}>
                        <Plus className="w-3 h-3" />
                        Add Referral Partner
                    </button>
                )}
            </div>

            {/* SECTION 3: Test Selection (Reordered Down) */}
            <div className={cn("p-2.5 xl:p-4 rounded-xl space-y-1.5 xl:space-y-2", ui.section)}>
                <h4 className={ui.sectionTitle}>Test Selection</h4>
                {!isReadOnly && (
                    <div className="relative z-10">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Add Test Code or Name..."
                            value={filter}
                            onChange={(e) => {
                                setFilter(e.target.value);
                                setTestSelectedIndex(0);
                            }}
                            onKeyDown={(e) => {
                                if (suggestions.length === 0) return;
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setTestSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setTestSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
                                } else if (e.key === 'Enter' || e.key === 'Tab') {
                                    if (testSelectedIndex >= 0 && testSelectedIndex < suggestions.length) {
                                        e.preventDefault();
                                        handleAddTest(suggestions[testSelectedIndex]);
                                        setFilter("");
                                        setTestSelectedIndex(0);
                                    }
                                }
                            }}
                            disabled={isProcessing}
                            className={cn("w-full h-10 rounded-lg pl-9 pr-4 py-2 focus:outline-none transition-colors disabled:opacity-50 type-code", ui.input)}
                        />

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <div className={cn("absolute top-full left-0 right-0 mt-1 rounded-lg overflow-y-auto z-20 border", ui.suggestionBox, "max-h-60")}>
                                {/* INTERNAL TESTS */}
                                {suggestions.map((test, idx) => (
                                    <button
                                        key={test.testCode || test.code}
                                        onMouseEnter={() => setTestSelectedIndex(idx)}
                                        onClick={() => {
                                            handleAddTest(test);
                                            setFilter("");
                                            setTestSelectedIndex(0);
                                        }}
                                        className={cn("w-full text-left px-3 py-2 flex items-center justify-between group transition-colors border-b last:border-0",
                                            idx === testSelectedIndex
                                                ? (isDark ? "bg-synos-primary/20 text-white font-bold" : "bg-blue-50 text-synos-primary font-bold")
                                                : (isDark ? "hover:bg-zinc-800 border-zinc-800/50" : "hover:bg-zinc-50 border-zinc-100"))}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <div className="type-value">{test.testName || test.name}</div>
                                                <div className="type-code">{test.testCode || test.code}</div>
                                            </div>
                                            {(test.isOutsourced || test.IsOutsourced) && (
                                                <Beaker className="w-3 h-3 text-amber-500 opacity-60" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="type-code">₹{test.basePrice || test.price || test.Price}</span>
                                            <Plus className="w-4 h-4 text-zinc-500 group-hover:text-synos-primary" />
                                        </div>
                                    </button>
                                ))}

                                {/* AD-HOC MANUAL TRIGGER REMOVED TO AVOID HYBRID MODEL */}
                            </div>
                        )}
                    </div>
                )}


                {/* Selected Internal Tests List (Pure Render from Snapshot) */}
                <div className="space-y-2">
                    {internalTests.length === 0 && !isReadOnly && (
                        <div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg type-label">
                            No internal tests added
                        </div>
                    )}

                    {internalTests.map(test => (
                        <div key={test.testCode || test.code} className={cn("rounded-lg p-3 flex items-center justify-between group animate-in zoom-in-95 duration-200 border", ui.testCard)}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={cn("px-2.5 py-1 min-w-[32px] min-h-[32px] max-w-[120px] rounded flex items-center justify-center type-code border shrink-0 font-mono text-[10px] font-bold truncate", ui.testCode)}>
                                    {test.testCode || test.code}
                                </div>
                                <div className="min-w-0">
                                    <div className="type-value leading-tight truncate">{test.testName || test.name}</div>
                                    <div className="type-section-header mt-0.5">{test.dept || test.category || test.department}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="type-code">₹{test.basePrice || test.price || test.Price}</div>
                                
                                {/* Allow Remove if NOT ReadOnly OR if Correction Intent */}
                                {(!isReadOnly || isCorrectionIntent) && (
                                    <button
                                        onClick={() => {
                                            handleRemoveTest(test.testCode || test.code, test.orderId || test.OrderId || test.TestId || test.testId);
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
 
            {/* SECTION 3b: Outsourced Tests List */}
            {outsourcedTests.length > 0 && (
                <div className={cn("p-4 rounded-xl space-y-2 border-amber-500/20", ui.section)}>
                    <div className="flex items-center gap-2 mb-1">
                        <Beaker className="w-3.5 h-3.5 text-amber-500" />
                        <h4 className={ui.sectionTitle}>Outsourced Tests</h4>
                    </div>
                    
                    <div className="space-y-2">
                        {outsourcedTests.map(test => (
                            <div key={test.orderId} className={cn("rounded-lg p-3 flex items-center justify-between group animate-in slide-in-from-right-2 duration-200 border", ui.testCard)}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded flex items-center justify-center bg-amber-500/10 border-amber-500/20")}>
                                        <Beaker className="w-3.5 h-3.5 text-amber-500" />
                                    </div>
                                    <div>
                                        <div className="type-value leading-tight">{test.testName}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="type-section-header text-amber-600/70">{test.referenceLabName || "Partner Lab"}</span>
                                            <span className="text-[10px] text-zinc-500 opacity-30">•</span>
                                            <span className="type-label opacity-50">{test.department}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <div className="type-code text-amber-500">₹{test.price}</div>
                                        {test.isPricingResolved ? (
                                            <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-500">
                                                <ShieldCheck className="w-2 h-2" /> Verified
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-amber-500 animate-pulse">
                                                <AlertCircle className="w-2 h-2" /> Pending Intel
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Allow Remove if NOT ReadOnly OR if Correction Intent */}
                                    {(!isReadOnly || isCorrectionIntent) && (
                                        <button
                                            onClick={() => {
                                                handleRemoveTest(test.testCode, test.orderId);
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
                </div>
            )}

            {/* SECTION 3c: Standalone Outsource Trigger */}
            <div className="py-2">
                {isOutsourceFormVisible ? (
                    <OutsourceDraftForm
                        visitId={visitId}
                        referenceLabs={referenceLabs}
                        outsourcedCatalog={outsourcedCatalog}
                        isDark={isDark}
                        uiStyles={ui}
                        onSuccess={() => {
                            setIsOutsourceFormVisible(false);
                            if (onVisitUpdated) onVisitUpdated();
                        }}
                        onCancel={() => setIsOutsourceFormVisible(false)}
                    />
                ) : (
                    !isReadOnly && (
                        <button
                            onClick={() => setIsOutsourceFormVisible(true)}
                            className={cn("flex items-center gap-2 type-section-header transition-all px-3 py-2 rounded-lg border group",
                                isDark
                                    ? "border-zinc-800 hover:text-white hover:bg-zinc-800/50"
                                    : "bg-white border-zinc-300 shadow-sm hover:border-zinc-400 hover:shadow-md")}
                        >
                            <Beaker className="w-3 h-3 transition-transform group-hover:rotate-12" />
                            Outsource Test
                        </button>
                    )
                )}
            </div>

            {correctionState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
                    <div className={cn("w-96 rounded-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 border", ui.modal)}>
                        <div className="space-y-1">
                            <h3 className="type-page-title flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                Confirm Correction
                            </h3>
                            <p className="type-label">
                                This action will be audited. Please provide a mandatory reason.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className={cn("type-code p-2 rounded border", isDark ? "bg-black/50 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600")}>
                                {correctionState.type}: {correctionState.payload?.testCode || correctionState.payload?.code || correctionState.payload?.testName}
                            </div>
                            <textarea
                                value={correctionState.reason}
                                onChange={(e) => setCorrectionState(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Reason for this change (Required)..."
                                className={cn("w-full rounded-lg p-3 outline-none min-h-[80px] transition-all", ui.modalInput)}
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => setCorrectionState({ ...correctionState, isOpen: false })}
                                className="px-4 py-2 rounded-lg type-label text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCorrection}
                                disabled={!correctionState.reason.trim() || isProcessing}
                                className="px-4 py-2 rounded-lg type-value bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const isSelecting = useRef(false);
    const listRef = useRef(null);

    // Sync with Snapshot (Strict Rule)
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    // Derived Suggestions
    const suggestions = value.length < 2 ? [] : partners.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
    );

    // Reset keyboard selection index when suggestions change
    useEffect(() => {
        if (showSuggestions && suggestions.length > 0) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [value, showSuggestions, suggestions.length]);

    // Scroll selected item into view inside dropdown
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const selectedElem = listRef.current.children[selectedIndex];
            if (selectedElem) {
                selectedElem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const handleApply = (partnerId) => {
        isSelecting.current = true;
        onApplyPartner(partnerId);
        setShowSuggestions(false);
        setTimeout(() => { isSelecting.current = false; }, 500);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                e.preventDefault();
                handleApply(suggestions[selectedIndex].referralPartnerId);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        input: "bg-zinc-900 border-synos-border type-body focus:border-synos-primary",
        suggestionBox: "bg-zinc-900 border-synos-border shadow-xl",
        hover: "hover:bg-zinc-800 text-zinc-300 hover:text-white"
    } : {
        input: "bg-white border-zinc-200 type-body focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all shadow-sm",
        suggestionBox: "bg-white border-zinc-300 shadow-xl",
        hover: "hover:bg-zinc-50 text-zinc-600 hover:text-black"
    };

    return (
        <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
                type="text"
                value={value}
                disabled={isReadOnly || isProcessing}
                placeholder="Search Partner or Type Name..."
                className={cn("w-full rounded-lg pl-9 pr-4 py-2 outline-none transition-colors disabled:opacity-50 type-label", ui.input)}
                onChange={(e) => {
                    setValue(e.target.value);
                    setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    // Delay to allow click or keyboard selection to register
                    setTimeout(() => {
                        setShowSuggestions(false);
                        
                        // FIX: If we are currently selecting a partner from the dropdown, skip the raw text update
                        if (isSelecting.current) return;

                        // Case B: Commit text if changed, no partner selected, and value differs from snapshot
                        const trimmedValue = value?.trim();
                        const trimmedInitial = initialValue?.trim();
                        if (trimmedValue !== trimmedInitial) {
                            onUpdateText(trimmedValue);
                        }
                    }, 200);
                }}
                onFocus={() => setShowSuggestions(true)}
            />

            {/* Suggestions Overlay */}
            {showSuggestions && suggestions.length > 0 && (
                <div 
                    ref={listRef}
                    className={cn("absolute top-full left-0 right-0 mt-1 rounded-lg overflow-y-auto z-20 border", ui.suggestionBox, "max-h-48")}
                >
                    {suggestions.map((p, idx) => (
                        <button
                            key={p.referralPartnerId}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                handleApply(p.referralPartnerId);
                            }}
                            className={cn("w-full text-left px-3 py-2 transition-colors border-b last:border-0 type-label flex items-center justify-between",
                                idx === selectedIndex 
                                    ? (isDark ? "bg-synos-primary/20 text-white font-bold" : "bg-blue-50 text-synos-primary font-bold")
                                    : ui.hover,
                                isDark ? "border-zinc-800/50" : "border-zinc-100")}
                        >
                            <span className="truncate">{p.name}</span>
                            {p.status === 0 && (
                                <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border leading-none uppercase", 
                                    isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-amber-100 border-amber-300 text-amber-700")}>
                                    Draft
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
