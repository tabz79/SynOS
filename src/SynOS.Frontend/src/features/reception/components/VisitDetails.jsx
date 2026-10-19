import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Loader2, Lock, AlertCircle, Beaker, ShieldCheck, Package, CheckCircle2, Sparkles } from 'lucide-react'
import { ReceptionApi, fetchTestCatalogCached, fetchReferralPartnersCached, fetchReferenceLabsCached, fetchOutsourcedCatalogCached } from '@/api/reception'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import ReferralDraftForm from './ReferralDraftForm'
import OutsourceDraftForm from './OutsourceDraftForm'
import { useReceptionDrawer } from '@/features/reception/hooks/useReceptionPanelUI'
import { 
    InsuranceContextPanel, 
    CorporateContextPanel 
} from './MultiPayerPanels'

export function VisitDetails({ 
    snapshot, 
    visitId, 
    onVisitUpdated, 
    setIsPrepaidIntent, 
    isCorrectionIntent,
    billingMode = 'Standard',
    onOpenModal
}) {
    const { closePanel } = useReceptionDrawer();
    // Local UI State for Search Interaction ONLY
    const [filter, setFilter] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [testSelectedIndex, setTestSelectedIndex] = useState(0);
    const testListRef = useRef(null);
    const [catalog, setCatalog] = useState([]); // Master list for search suggestions
    const [referralPartners, setReferralPartners] = useState([]); // Referral Master
    const [referenceLabs, setReferenceLabs] = useState([]); // Reference Labs Master
    const [outsourcedCatalog, setOutsourcedCatalog] = useState([]); // ADDED: Outsourced Catalog Master
    const [insuranceCompanies, setInsuranceCompanies] = useState([]); // Insurance / TPA Master
    const [corporateAccounts, setCorporateAccounts] = useState([]); // Corporate Client Master
    const [corporateRateRules, setCorporateRateRules] = useState([]); // Rate rules for active corporate account
    const [isProcessing, setIsProcessing] = useState(false); // Command spinner

    // Auto-scroll selected test option into view
    useEffect(() => {
        if (testSelectedIndex >= 0 && testListRef.current) {
            const selectedElem = testListRef.current.children[testSelectedIndex];
            if (selectedElem) {
                selectedElem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [testSelectedIndex]);

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

    // Load Catalogs (Test + Referral + Insurance + Corporate) 
    // Load independently so one failure doesn't block the other.
    useEffect(() => {
        let isMounted = true;
        const loadCatalogs = async () => {
            const [testResult, referralResult, labsResult, outResult, insResult, corpResult] = await Promise.allSettled([
                fetchTestCatalogCached(),
                fetchReferralPartnersCached(),
                fetchReferenceLabsCached(),
                fetchOutsourcedCatalogCached(),
                ReceptionApi.getInsuranceCompanies(),
                ReceptionApi.getCorporateAccounts()
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

            if (insResult.status === 'fulfilled') {
                setInsuranceCompanies(insResult.value || []);
            } else console.warn("Failed to load insurance companies", insResult.reason);

            if (corpResult.status === 'fulfilled') {
                setCorporateAccounts(corpResult.value || []);
            } else console.warn("Failed to load corporate accounts", corpResult.reason);
        };
        loadCatalogs();
        return () => { isMounted = false; };
    }, []);

    // Load corporate rate rules whenever corporate account changes
    const activeCorporateAccountId = snapshot?.visit?.corporateAccountId;
    const activeCorporateAccount = corporateAccounts.find(a => (a.corporateAccountId || a.id) === activeCorporateAccountId);
    const corporatePackagesList = corporateRateRules.filter(r => r.isPackage || r.isProfile);
    useEffect(() => {
        if (!activeCorporateAccountId) {
            setCorporateRateRules([]);
            return;
        }
        let isMounted = true;
        ReceptionApi.getCorporateRateRules(activeCorporateAccountId)
            .then(rules => {
                if (isMounted) setCorporateRateRules(rules || []);
            })
            .catch(err => console.warn("Failed to load corporate rate rules", err));
        return () => { isMounted = false; };
    }, [activeCorporateAccountId]);

    // Update specific context fields (Insurer, Policy #, Pre-Auth #, Corporate Account, Emp ID, Co-Pay)
    const handleUpdateBillingContext = async (patch, options = {}) => {
        if (!visitId || isReadOnly) return;
        const { silent = false, persist = true, refreshSnapshot = true } = options;

        // Synchronously update in-memory visit snapshot so validations see latest values
        if (snapshot?.visit) {
            if (patch.employeeId !== undefined) snapshot.visit.employeeId = patch.employeeId;
            if (patch.policyNumber !== undefined) snapshot.visit.policyNumber = patch.policyNumber;
            if (patch.preAuthApprovalNumber !== undefined) snapshot.visit.preAuthApprovalNumber = patch.preAuthApprovalNumber;
            if (patch.insuranceCoPayAmount !== undefined) snapshot.visit.insuranceCoPayAmount = patch.insuranceCoPayAmount;
            if (patch.corporateAccountId !== undefined) snapshot.visit.corporateAccountId = patch.corporateAccountId;
            if (patch.corporatePackageId !== undefined) snapshot.visit.corporatePackageId = patch.corporatePackageId;
            if (patch.insuranceCompanyId !== undefined) snapshot.visit.insuranceCompanyId = patch.insuranceCompanyId;
            if (patch.billingType !== undefined) snapshot.visit.billingType = patch.billingType;
        }

        // If not persisting to backend yet (e.g. intermediate typing sync), return immediately
        if (!persist) return;

        if (!silent) setIsProcessing(true);
        try {
            const v = snapshot?.visit;
            const payload = {
                visitId,
                billingType: patch.billingType !== undefined ? patch.billingType : billingMode,
                insuranceCompanyId: patch.insuranceCompanyId !== undefined ? patch.insuranceCompanyId : (v?.insuranceCompanyId || null),
                policyNumber: patch.policyNumber !== undefined ? patch.policyNumber : (v?.policyNumber || null),
                preAuthApprovalNumber: patch.preAuthApprovalNumber !== undefined ? patch.preAuthApprovalNumber : (v?.preAuthApprovalNumber || null),
                insuranceCoPayAmount: patch.insuranceCoPayAmount !== undefined ? patch.insuranceCoPayAmount : (v?.insuranceCoPayAmount || 0),
                corporateAccountId: patch.corporateAccountId !== undefined ? patch.corporateAccountId : (v?.corporateAccountId || null),
                employeeId: patch.employeeId !== undefined ? patch.employeeId : (v?.employeeId || null),
                corporatePackageId: patch.corporatePackageId !== undefined ? patch.corporatePackageId : (v?.corporatePackageId || null)
            };
            await ReceptionApi.updateBillingContext(payload);
            if (refreshSnapshot && onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to update billing context:", err);
            if (!silent) alert("Failed to update billing details: " + err.message);
        } finally {
            if (!silent) setIsProcessing(false);
        }
    };

    // Pricing calculation helper aware of corporate rate rules
    const getTestPricing = (test) => {
        const code = (test.testCode || test.code || '').toLowerCase();
        const testId = test.id || test.testId;
        if (billingMode === 'Corporate' && corporateRateRules.length > 0) {
            const rule = corporateRateRules.find(r => 
                (r.testCode && r.testCode.toLowerCase() === code) ||
                (r.packageCode && r.packageCode.toLowerCase() === code) ||
                (r.testId && testId && r.testId === testId)
            );
            const corpPrice = rule ? (rule.contractedPrice ?? rule.corporatePrice) : null;
            if (corpPrice !== null && corpPrice !== undefined) {
                return {
                    price: corpPrice,
                    isCorporateRate: true,
                    standardPrice: rule.standardPrice || test.basePrice || test.price || test.Price || corpPrice
                };
            }
            if (test.isCorporateRate) {
                return {
                    price: test.price,
                    isCorporateRate: true,
                    standardPrice: test.standardPrice || test.basePrice || test.price
                };
            }
        }
        return {
            price: test.basePrice || test.price || test.Price || 0,
            isCorporateRate: false
        };
    };

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

    // COMMAND: Apply Secondary Referral Doctor (RMP)
    const handleApplySecondaryReferral = async (secondaryPartnerId) => {
        if (!visitId) return;
        setIsProcessing(true);
        try {
            await ReceptionApi.updateSecondaryReferral(visitId, secondaryPartnerId);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to update secondary referral doctor", err);
            alert("Failed to update secondary referral doctor: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Remove Secondary Referral Doctor (RMP)
    const handleRemoveSecondaryReferral = async () => {
        if (!visitId) return;
        setIsProcessing(true);
        try {
            await ReceptionApi.updateSecondaryReferral(visitId, null);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to remove secondary referral doctor", err);
            alert("Failed to remove secondary referral doctor: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Filter Logic for Search (UI Only)
    // When Corporate mode is active:
    // Strictly restrict to Corporate Packages & Contracted Corporate Rate Rules.
    // Omit all regular retail tests.
    let suggestions = [];
    if (billingMode === 'Corporate') {
        if (activeCorporateAccountId) {
            // 1. Build list from corporate contracted rate rules & packages
            const corpRulesList = corporateRateRules.map(r => {
                const code = r.testCode || r.packageCode;
                const name = r.packageName || r.testName;
                const price = r.contractedPrice ?? r.corporatePrice ?? 0;
                return {
                    id: r.testId,
                    testId: r.testId,
                    testCode: code,
                    code: code,
                    testName: name,
                    name: name,
                    price: price,
                    basePrice: r.standardPrice || price,
                    standardPrice: r.standardPrice || price,
                    isCorporateRate: true,
                    isPackage: r.isPackage || false,
                    includedTests: r.includedTests || []
                };
            });

            // 2. Also check if catalog has tests mapped to corporate rules or with explicit corporate pricing
            const ruleCodeSet = new Set(corporateRateRules.map(r => (r.testCode || r.packageCode || '').toLowerCase()).filter(Boolean));
            const catalogCorpTests = catalog.filter(t => {
                const c = (t.testCode || t.code || '').toLowerCase();
                return ruleCodeSet.has(c) || (t.pricing && t.pricing.corporate > 0);
            }).map(t => {
                const rule = corporateRateRules.find(r => (r.testCode || r.packageCode || '').toLowerCase() === (t.testCode || t.code || '').toLowerCase());
                const price = rule ? (rule.contractedPrice ?? rule.corporatePrice) : (t.pricing?.corporate || t.basePrice || t.price);
                return {
                    ...t,
                    price,
                    basePrice: t.basePrice || t.price,
                    isCorporateRate: true
                };
            });

            // Combine unique by testCode
            const seenCodes = new Set();
            const combinedCorp = [];
            for (const item of [...corpRulesList, ...catalogCorpTests]) {
                const c = (item.testCode || item.code || '').toLowerCase();
                if (c && !seenCodes.has(c)) {
                    seenCodes.add(c);
                    combinedCorp.push(item);
                }
            }

            // Exclude tests already added to this visit
            const availableCorp = combinedCorp.filter(t => 
                !tests.some(existing => (existing.code || '').toLowerCase() === (t.testCode || t.code || '').toLowerCase())
            );

            if (filter.trim().length > 0) {
                const q = filter.trim().toLowerCase();
                suggestions = availableCorp.filter(t =>
                    ((t.testName || t.name || "").toLowerCase().includes(q) ||
                     (t.testCode || t.code || "").toLowerCase().includes(q))
                );
            } else {
                suggestions = [];
            }
        } else {
            suggestions = [];
        }
    } else {
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

        suggestions = [...internalSuggestions, ...outsourcedSuggestions];
    }

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
                        type="button"
                        onClick={handleDeleteDraft}
                        disabled={isProcessing}
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-95 flex items-center gap-1 shadow-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 cursor-pointer"
                    >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete Draft"}
                    </button>
                )}
            </div>

            {/* SECTION 2: VISIT CONTEXT (Dynamic Payer Sub-Panel) */}
            <div className={cn("space-y-3 p-3 xl:p-4 rounded-xl border", ui.section)}>
                <div className="flex items-center justify-between">
                    <h4 className="type-section-header">
                        {billingMode === 'Standard' && "Referring Doctor / Clinic"}
                        {billingMode === 'PrepaidPartner' && "Prepaid Partner Referral"}
                        {billingMode === 'Insurance' && "Insurance / TPA Cashless Context"}
                        {billingMode === 'Corporate' && "Corporate B2B Account"}
                    </h4>
                    <span className={cn(
                        "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border",
                        billingMode === 'PrepaidPartner' ? "border-amber-500/40 text-amber-500 bg-amber-500/10" :
                        billingMode === 'Insurance' ? "border-blue-500/40 text-blue-500 bg-blue-500/10" :
                        billingMode === 'Corporate' ? "border-indigo-500/40 text-indigo-500 bg-indigo-500/10" :
                        "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800"
                    )}>
                        {billingMode === 'PrepaidPartner' ? 'Prepaid B2B' : billingMode}
                    </span>
                </div>

                {/* CONTEXTUAL SUB-PANEL: Standard Direct */}
                {billingMode === 'Standard' && (
                    <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-3">
                        {/* 1. PRIMARY PRESCRIBING DOCTOR */}
                        <div className="space-y-1.5">
                            <div className="type-label flex justify-between items-center">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <span>Prescribing Doctor / Consultant</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                                        Primary (On Reports & Bills)
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onOpenModal && onOpenModal('referral')}
                                    disabled={!canEditReferral}
                                    className="text-[11px] font-bold text-synos-primary hover:text-synos-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Doctor
                                </button>
                            </div>
                            {snapshot?.billing?.referral?.partner ? (
                                <div className={cn("flex items-center gap-2 font-bold p-2.5 rounded-lg border",
                                    isDark ? "text-zinc-300 bg-zinc-800/50 border-zinc-700/50" : "text-zinc-900 bg-white border-zinc-200 shadow-sm")}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate tracking-tight text-xs font-bold">
                                                {snapshot.billing.referral.partner.displayName || "Partner"}
                                            </span>
                                            {snapshot?.billing?.referral?.secondaryPartner && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                                                    Commission Routed to RMP
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                                            Type: {snapshot.billing.referral.partner.partnerType || 'Doctor'}
                                            {!snapshot?.billing?.referral?.secondaryPartner && ` • Comm: ${snapshot.billing.referral.commissionCutPercentage || 0}%`}
                                        </div>
                                    </div>
                                    {canEditReferral && (
                                        <button
                                            onClick={handleRemoveReferral}
                                            disabled={isProcessing}
                                            className="ml-auto text-zinc-500 hover:text-red-400 p-1 hover:bg-red-400/10 rounded transition-colors cursor-pointer"
                                            title="Remove Primary Doctor"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <ReferralCombinedInput
                                        initialValue={snapshot?.billing?.referral?.referrerText || ""}
                                        isReadOnly={!canEditReferral}
                                        isProcessing={isProcessing}
                                        partners={referralPartners}
                                        allowFreeText={true}
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
                                </div>
                            )}
                        </div>

                        {/* 2. SECONDARY REFERRAL DOCTOR (RMP) */}
                        <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 space-y-1.5">
                            <div className="type-label flex justify-between items-center">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <span>Second Referral Doctor / RMP</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                                        RMP (Commissions Route Here)
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onOpenModal && onOpenModal('rmp')}
                                    disabled={!canEditReferral}
                                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add RMP
                                </button>
                            </div>
                            {snapshot?.billing?.referral?.secondaryPartner ? (
                                <div className={cn("flex items-center gap-2 font-bold p-2.5 rounded-lg border",
                                    isDark ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" : "text-emerald-950 bg-emerald-50/80 border-emerald-300 shadow-sm")}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate tracking-tight text-xs font-bold">
                                                {snapshot.billing.referral.secondaryPartner.displayName}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-black uppercase">
                                                {snapshot.billing.referral.secondaryPartner.partnerType || 'RMP'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-normal">
                                            Commission Cut: {snapshot.billing.referral.secondaryPartner.commissionCutPercentage || 0}% • All referral logic & payouts route exclusively to this doctor
                                        </div>
                                    </div>
                                    {canEditReferral && (
                                        <button
                                            onClick={handleRemoveSecondaryReferral}
                                            disabled={isProcessing}
                                            className="ml-auto text-zinc-500 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                            title="Remove Second Referral Doctor"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <ReferralCombinedInput
                                        initialValue=""
                                        isReadOnly={!canEditReferral}
                                        isProcessing={isProcessing}
                                        partners={referralPartners}
                                        allowFreeText={false}
                                        onApplyPartner={handleApplySecondaryReferral}
                                        onUpdateText={() => {}}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CONTEXTUAL SUB-PANEL: Corporate B2B (Prepaid Partner) */}
                {billingMode === 'PrepaidPartner' && (
                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-3">
                        {/* 1. PRIMARY PRESCRIBING DOCTOR */}
                        <div className="space-y-1.5">
                            <div className="type-label flex justify-between items-center">
                                <span className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                                    <span>Prescribing Doctor (Main Doctor on Reports)</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onOpenModal && onOpenModal('referral')}
                                    disabled={!canEditReferral}
                                    className="text-[11px] font-bold text-synos-primary hover:text-synos-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Doctor
                                </button>
                            </div>
                            {snapshot?.billing?.referral?.partner ? (
                                <div className={cn("flex items-center gap-2 font-semibold p-2.5 rounded-lg border",
                                    isDark ? "bg-zinc-800/40 border-zinc-700/60 text-zinc-100" : "bg-slate-50 border-slate-200 text-zinc-900 shadow-xs")}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate tracking-tight text-xs font-bold">
                                            {snapshot.billing.referral.partner.displayName || "Partner"}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                                            Primary Consultant • Name retained on all patient documents
                                        </div>
                                    </div>
                                    {canEditReferral && (
                                        <button
                                            onClick={handleRemoveReferral}
                                            disabled={isProcessing}
                                            className="ml-auto text-zinc-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                            title="Remove Doctor"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <ReferralCombinedInput
                                        initialValue={snapshot?.billing?.referral?.referrerText || ""}
                                        isReadOnly={!canEditReferral}
                                        isProcessing={isProcessing}
                                        partners={referralPartners}
                                        allowFreeText={true}
                                        onApplyPartner={handleApplyReferral}
                                        onUpdateText={async (text) => {
                                            if (!visitId || !canEditReferral) return;
                                            setIsProcessing(true);
                                            try {
                                                await ReceptionApi.updateReferrerText(visitId, text);
                                                if (onVisitUpdated) onVisitUpdated();
                                            } catch (err) {
                                                console.error("Failed to update referrer text", err);
                                            } finally {
                                                setIsProcessing(false);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 2. SECONDARY REFERRAL DOCTOR (RMP) / B2B PARTNER */}
                        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1.5">
                            <div className="type-label flex justify-between items-center">
                                <span className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                                    <span>Secondary Referral Doctor / RMP (Receivables Route Here)</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onOpenModal && onOpenModal('rmp')}
                                    disabled={!canEditReferral}
                                    className="text-[11px] font-bold text-synos-primary hover:text-synos-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add RMP
                                </button>
                            </div>
                            {snapshot?.billing?.referral?.secondaryPartner ? (
                                <div className={cn("flex items-center gap-2 font-semibold p-2.5 rounded-lg border",
                                    isDark ? "bg-zinc-800/40 border-zinc-700/60 text-zinc-100" : "bg-slate-50 border-slate-200 text-zinc-900 shadow-xs")}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate tracking-tight text-xs font-bold">
                                                {snapshot.billing.referral.secondaryPartner.displayName}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-wider">
                                                {snapshot.billing.referral.secondaryPartner.partnerType || 'RMP'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                                            B2B Receivable Account • All B2B claims, rate discounts & remittances route to this partner
                                        </div>
                                    </div>
                                    {canEditReferral && (
                                        <button
                                            onClick={handleRemoveSecondaryReferral}
                                            disabled={isProcessing}
                                            className="ml-auto text-zinc-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                            title="Remove RMP"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <ReferralCombinedInput
                                        initialValue=""
                                        isReadOnly={!canEditReferral}
                                        isProcessing={isProcessing}
                                        partners={referralPartners}
                                        allowFreeText={false}
                                        onApplyPartner={handleApplySecondaryReferral}
                                        onUpdateText={() => {}}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Provisional Referral Draft */}
                        {referralDraft && (
                            <div className={cn("border rounded p-3 flex items-center justify-between", isDark ? "bg-zinc-900/50 border-zinc-700/50" : "bg-white border-zinc-200 shadow-sm")}>
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
                    </div>
                )}

                {/* CONTEXTUAL SUB-PANEL: Insurance / TPA */}
                {billingMode === 'Insurance' && (
                    <InsuranceContextPanel
                        insuranceCompanies={insuranceCompanies}
                        selectedCompanyId={snapshot?.visit?.insuranceCompanyId}
                        policyNumber={snapshot?.visit?.policyNumber}
                        preAuthNumber={snapshot?.visit?.preAuthApprovalNumber}
                        coPayAmount={snapshot?.visit?.insuranceCoPayAmount}
                        onChange={handleUpdateBillingContext}
                        onOpenAddModal={() => onOpenModal && onOpenModal('insurance')}
                        isDark={isDark}
                        disabled={isReadOnly && !isCorrectionIntent}
                    />
                )}

                {/* CONTEXTUAL SUB-PANEL: Corporate B2B */}
                {billingMode === 'Corporate' && (
                    <CorporateContextPanel
                        corporateAccounts={corporateAccounts}
                        selectedAccountId={snapshot?.visit?.corporateAccountId}
                        employeeId={snapshot?.visit?.employeeId}
                        onChange={handleUpdateBillingContext}
                        onOpenAddModal={() => onOpenModal && onOpenModal('corporate')}
                        isDark={isDark}
                        disabled={isReadOnly && !isCorrectionIntent}
                    />
                )}
            </div>

            {/* SECTION 3: Test Selection (Reordered Down) */}
            <div className={cn("p-2.5 xl:p-4 rounded-xl space-y-1.5 xl:space-y-2", ui.section)}>
                <div className="flex items-center justify-between">
                    <h4 className={ui.sectionTitle}>Test Selection</h4>
                    {billingMode === 'Corporate' && (
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                            Corporate Mode: Contracted Only
                        </span>
                    )}
                </div>

                {billingMode === 'Corporate' && !activeCorporateAccountId && (
                    <div className="p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 flex items-center gap-2 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0 text-indigo-500" />
                        <span>Select a Contracted Corporate Account above to load corporate packages & rates</span>
                    </div>
                )}

                {!isReadOnly && (
                    <div className="relative z-10">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder={billingMode === 'Corporate' 
                                ? (activeCorporateAccountId ? "Search Corporate Packages & Contracted Tests..." : "Select Corporate Account above first...") 
                                : "Add Test Code or Name..."}
                            value={filter}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => {
                                setTimeout(() => setIsSearchFocused(false), 200);
                            }}
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
                                } else if (e.key === 'Enter') {
                                    if (testSelectedIndex >= 0 && testSelectedIndex < suggestions.length) {
                                        e.preventDefault();
                                        handleAddTest(suggestions[testSelectedIndex]);
                                        setFilter("");
                                        setIsSearchFocused(false);
                                        setTestSelectedIndex(0);
                                    }
                                }
                            }}
                            disabled={isProcessing || (billingMode === 'Corporate' && !activeCorporateAccountId)}
                            className={cn("w-full h-10 rounded-lg pl-9 pr-4 py-2 focus:outline-none transition-colors disabled:opacity-50 type-code", ui.input)}
                        />

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && filter.trim().length > 0 && isSearchFocused && (
                            <div ref={testListRef} className={cn("absolute top-full left-0 right-0 mt-1 rounded-lg overflow-y-auto z-20 border shadow-lg", ui.suggestionBox, "max-h-60")}>
                                {/* INTERNAL & OUTSOURCED & CORPORATE TESTS */}
                                {suggestions.map((test, idx) => {
                                    const pricing = getTestPricing(test);
                                    return (
                                        <button
                                            key={test.testCode || test.code}
                                            onMouseEnter={() => setTestSelectedIndex(idx)}
                                            onClick={() => {
                                                handleAddTest({ ...test, price: pricing.price });
                                                setFilter("");
                                                setIsSearchFocused(false);
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
                                                    <div className="type-code flex items-center gap-1.5">
                                                        <span>{test.testCode || test.code}</span>
                                                        {test.isPackage && (
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">
                                                                Package
                                                            </span>
                                                        )}
                                                        {pricing.isCorporateRate && (
                                                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/30">
                                                                Corporate Rate
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {(test.isOutsourced || test.IsOutsourced) && (
                                                    <Beaker className="w-3 h-3 text-amber-500 opacity-60" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn("type-code", pricing.isCorporateRate ? "text-indigo-400 font-bold" : "")}>
                                                        ₹{pricing.price}
                                                    </span>
                                                    {pricing.isCorporateRate && pricing.standardPrice !== pricing.price && (
                                                        <span className="text-[9px] line-through text-zinc-500 font-mono">
                                                            ₹{pricing.standardPrice}
                                                        </span>
                                                    )}
                                                </div>
                                                <Plus className="w-4 h-4 text-zinc-500 group-hover:text-synos-primary" />
                                            </div>
                                        </button>
                                    );
                                })}

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
            </div>

            {/* SECTION 3B: Dedicated Contracted Corporate Packages Box */}
            {billingMode === 'Corporate' && activeCorporateAccountId && (
                <div className={cn(
                    "p-3 xl:p-4 rounded-xl space-y-2.5 border transition-all animate-in fade-in duration-300",
                    isDark 
                        ? "bg-zinc-900/90 border-indigo-900/40 shadow-xs" 
                        : "bg-indigo-50/40 border-indigo-200/70 shadow-xs"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                                <Package size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                                        Contracted Corporate Packages
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                                        {corporatePackagesList.length} Available
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Pre-bundled wellness profiles for {activeCorporateAccount?.companyName || 'this corporate client'}.
                                </p>
                            </div>
                        </div>
                    </div>

                    {corporatePackagesList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {corporatePackagesList.map(pkg => {
                                const pkgCode = pkg.testCode || pkg.packageCode || pkg.code;
                                const pkgName = pkg.packageName || pkg.testName || pkg.name;
                                const pkgPrice = pkg.contractedPrice ?? pkg.corporatePrice ?? pkg.price ?? 0;
                                const isAlreadyAdded = tests.some(t => (t.code || '').toLowerCase() === (pkgCode || '').toLowerCase());

                                return (
                                    <div
                                        key={pkg.corporateRateRuleId || pkg.id || pkgCode}
                                        className={cn(
                                            "p-3 rounded-xl border flex flex-col justify-between transition-all",
                                            isAlreadyAdded
                                                ? (isDark 
                                                    ? "bg-emerald-950/20 border-emerald-800/40 shadow-xs" 
                                                    : "bg-emerald-50/70 border-emerald-300 shadow-xs")
                                                : (isDark 
                                                    ? "bg-zinc-950 border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900" 
                                                    : "bg-white border-zinc-200 hover:border-indigo-400 hover:shadow-xs")
                                        )}
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                    {pkgCode}
                                                </span>
                                                <div className="text-right">
                                                    {pkg.standardPrice > 0 && (
                                                        <span className="text-[10px] text-zinc-400 line-through font-mono block">
                                                            ₹{pkg.standardPrice?.toLocaleString()}
                                                        </span>
                                                    )}
                                                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                                                        ₹{pkgPrice.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                                {pkgName}
                                            </h5>

                                            {pkg.includedTests && pkg.includedTests.length > 0 && (
                                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 flex-wrap">
                                                    <span className="font-medium text-zinc-400">Tests ({pkg.includedTests.length}):</span>
                                                    <span>
                                                        {pkg.includedTests.slice(0, 3).map(t => t.testName || t.testCode).join(', ')}
                                                        {pkg.includedTests.length > 3 && ` +${pkg.includedTests.length - 3} more`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                            {isAlreadyAdded ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                        Included in Bill
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-mono">
                                                        Constituent tests active
                                                    </span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={isProcessing || isReadOnly}
                                                    onClick={() => handleAddTest({ testCode: pkgCode, name: pkgName, price: pkgPrice, isPackage: true })}
                                                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                                                >
                                                    <Plus size={13} />
                                                    <span>Add Package to Bill</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-zinc-400 text-xs">
                            No corporate packages configured for this client. Contracted individual test rates can be selected via the Test Selection search above.
                        </div>
                    )}
                </div>
            )}
 
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
        } else if (e.key === 'Enter') {
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
