import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Loader2, Lock, AlertCircle, Beaker, ShieldCheck, Package, CheckCircle2, Sparkles, Check, ChevronDown } from 'lucide-react'
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
    onOpenModal,
    stagedAddedTests = [],
    onAddStagedTest,
    stagedRemovedOrderIds = [],
    onToggleRemoveOrderId,
    onRemoveStagedAddedTest,
    stagedReferralPartnerId,
    stagedSecondaryPartnerId,
    onStageReferral,
    onStageSecondaryReferral
}) {
    const { closePanel } = useReceptionDrawer();
    // Local UI State for Search Interaction ONLY
    const [filter, setFilter] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [testSelectedIndex, setTestSelectedIndex] = useState(0);
    const testListRef = useRef(null);
    const testSearchInputRef = useRef(null);
    const standardSecondaryReferralRef = useRef(null);
    const prepaidSecondaryReferralRef = useRef(null);
    const doctorSectionRef = useRef(null);
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

    // 5. REFERRAL EDITABILITY & EFFECTIVE PARTNER STATE
    // In Correction Intent, operator can freely change/remove referral partners
    const effectivePartner = isCorrectionIntent && stagedReferralPartnerId !== undefined
        ? (stagedReferralPartnerId ? (referralPartners.find(p => (p.referralPartnerId || p.id) === stagedReferralPartnerId) || snapshot?.billing?.referral?.partner) : null)
        : snapshot?.billing?.referral?.partner;

    const effectiveSecondaryPartner = isCorrectionIntent && stagedSecondaryPartnerId !== undefined
        ? (stagedSecondaryPartnerId ? (referralPartners.find(p => (p.referralPartnerId || p.id) === stagedSecondaryPartnerId) || snapshot?.billing?.referral?.secondaryPartner) : null)
        : snapshot?.billing?.referral?.secondaryPartner;

    const hasReferralPartner = !!effectivePartner;
    const referralDraft = snapshot?.billing?.referral?.draft;
    const canEditReferral = isCorrectionIntent || (!isReadOnly && (!isPhysicallyLocked || !hasReferralPartner));

    const hasDoctorConfigured = Boolean(
        effectivePartner || 
        effectiveSecondaryPartner || 
        snapshot?.billing?.referral?.referrerText
    );
    const hasTests = (snapshot?.tests?.length || 0) > 0 || (stagedAddedTests?.length || 0) > 0;
    const [userDoctorExpandedState, setUserDoctorExpandedState] = useState(null);
    const isDoctorSectionCollapsed = userDoctorExpandedState !== null
        ? !userDoctorExpandedState
        : Boolean(isFinalized || isLocked || (hasDoctorConfigured && hasTests));

    // Auto-minimize Referring Doctor section when user moves to or interacts with other sections
    useEffect(() => {
        if (!userDoctorExpandedState) return;

        const handlePointerDown = (e) => {
            if (doctorSectionRef.current && !doctorSectionRef.current.contains(e.target)) {
                const isPortal = e.target.closest && (
                    e.target.closest('[role="dialog"]') || 
                    e.target.closest('[role="listbox"]') ||
                    e.target.closest('.suggestion-portal')
                );
                if (!isPortal) {
                    setUserDoctorExpandedState(false);
                }
            }
        };

        const handleFocusIn = (e) => {
            if (doctorSectionRef.current && !doctorSectionRef.current.contains(e.target)) {
                const isPortal = e.target.closest && (
                    e.target.closest('[role="dialog"]') || 
                    e.target.closest('[role="listbox"]') ||
                    e.target.closest('.suggestion-portal')
                );
                if (!isPortal) {
                    setUserDoctorExpandedState(false);
                }
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('focusin', handleFocusIn);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, [userDoctorExpandedState]);

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
        indicator: "bg-slate-600 text-white border-transparent",
        headerText: "text-xl font-bold text-white tracking-normal",
        section: "rounded-[24px] bg-zinc-900/90 border border-zinc-800 shadow-xl p-6 sm:p-7 space-y-4",
        sectionTitle: "text-base font-bold text-white tracking-normal",
        input: "bg-zinc-950/70 border-zinc-800 text-base focus:border-synos-primary rounded-xl h-12 px-4 tracking-normal",
        suggestionBox: "bg-zinc-900 border-zinc-700 shadow-xl",
        testCard: "bg-zinc-900/60 border-zinc-800 text-zinc-200",
        testCode: "bg-zinc-800 border-zinc-700 text-zinc-300",
        modal: "bg-zinc-900 border-zinc-800 text-white",
        modalInput: "bg-black border-zinc-700 text-white focus:border-synos-primary"
    } : {
        indicator: "bg-slate-500 text-white border-transparent shadow-xs",
        headerText: "text-xl font-bold text-slate-900 tracking-normal",
        section: "rounded-[24px] bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border border-white/90 shadow-[0_12px_36px_rgba(15,35,60,0.07),0_2px_6px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF] p-6 sm:p-7 space-y-4",
        sectionTitle: "text-base font-bold text-slate-900 tracking-normal",
        input: "bg-white/90 border border-[#D5E2EC] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-base focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 rounded-xl h-12 px-4 tracking-normal",
        suggestionBox: "bg-white border-slate-200 shadow-xl",
        testCard: "group flex items-center justify-between p-4 rounded-xl bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] border border-[#CCDCE8] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04),0_1px_0_rgba(255,255,255,0.7)] hover:border-slate-400 transition-all",
        testCode: "px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200/90 shadow-[0_1px_2px_rgba(15,35,60,0.06)] font-mono text-xs font-bold",
        modal: "bg-white border-slate-200 text-slate-900",
        modalInput: "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
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

    // Load corporate / insurance rate rules whenever institution changes
    const activeCorporateAccountId = snapshot?.visit?.corporateAccountId || snapshot?.visit?.insuranceCompanyId;
    const activeCorporateAccount = corporateAccounts.find(a => (a.corporateAccountId || a.id) === activeCorporateAccountId) ||
                                  insuranceCompanies.find(c => (c.insuranceCompanyId || c.id) === activeCorporateAccountId);
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
            .catch(err => {
                console.warn("Failed to load corporate rate rules", err);
                if (isMounted) setCorporateRateRules([]);
            });
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
        if ((billingMode === 'Corporate' || billingMode === 'Insurance') && corporateRateRules.length > 0) {
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
            if (onStageReferral) {
                onStageReferral(partnerId);
                return;
            }
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
            if (onVisitUpdated) await onVisitUpdated();
            setTimeout(() => {
                if (!document.activeElement || document.activeElement === document.body) {
                    if (standardSecondaryReferralRef.current) {
                        standardSecondaryReferralRef.current.focus();
                    } else if (prepaidSecondaryReferralRef.current) {
                        prepaidSecondaryReferralRef.current.focus();
                    } else if (testSearchInputRef.current) {
                        testSearchInputRef.current.focus();
                    }
                }
            }, 100);
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
            if (onStageReferral) {
                onStageReferral(null);
                return;
            }
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
        if (isCorrectionIntent && onStageSecondaryReferral) {
            onStageSecondaryReferral(secondaryPartnerId);
            return;
        }
        setIsProcessing(true);
        try {
            await ReceptionApi.updateSecondaryReferral(visitId, secondaryPartnerId);
            if (onVisitUpdated) await onVisitUpdated();
            setTimeout(() => {
                if (!document.activeElement || document.activeElement === document.body) {
                    testSearchInputRef.current?.focus();
                }
            }, 100);
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
        if (isCorrectionIntent && onStageSecondaryReferral) {
            onStageSecondaryReferral(null);
            return;
        }
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
    // When Insurance / Corporate mode is active:
    // Strictly restrict to Institutional Packages & Contracted Rate Rules for the selected Insurer / Corporate Client.
    // When Standard or Prepaid mode is active:
    // Strictly exclude any institutional / insurance packages (e.g. PKG-LIC-*, CorporatePackage, etc.)
    let suggestions = [];
    const isInstitutionalMode = billingMode === 'Corporate' || billingMode === 'Insurance';

    if (isInstitutionalMode) {
        if (activeCorporateAccountId) {
            // 1. Build list from contracted rate rules & packages for this account
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

            // 2. Also check if catalog has tests mapped to these rules or with explicit corporate pricing
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

            const q = filter.replace(/^[\/\\#\s]+/, '').trim().toLowerCase();
            if (q.length > 0) {
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
        // Retail / Standard or Partner Prepaid mode:
        // Helper to detect and BLOCK institutional packages (e.g. PKG-LIC-*, CorporatePackage, Wellness bundles)
        const isInstitutionalPackage = (t) => {
            const code = (t.testCode || t.code || '').toUpperCase();
            const name = (t.testName || t.name || '').toLowerCase();
            const cat = (t.category || t.Category || '').toLowerCase();
            return t.isPackage === true ||
                t.isCorporateRate === true ||
                code.startsWith('PKG-') ||
                cat.includes('corporate') ||
                name.includes('employee wellness');
        };

        const activeExistingCodes = tests
            .filter(existing => !(isCorrectionIntent && stagedRemovedOrderIds.includes(existing.orderId || existing.OrderId || existing.TestId || existing.testId)))
            .map(t => (t.testCode || t.code || '').toLowerCase());
        const stagedAddedCodes = stagedAddedTests.map(t => (t.testCode || t.code || '').toLowerCase());

        const isAlreadyAdded = (t) => {
            const c = (t.testCode || t.code || '').toLowerCase();
            return activeExistingCodes.includes(c) || stagedAddedCodes.includes(c);
        };

        const cleanQuery = filter.replace(/^[\/\\#\s]+/, '').trim().toLowerCase();
        const internalSuggestions = cleanQuery.length < 2 ? [] : catalog.filter(t =>
            !isInstitutionalPackage(t) &&
            ((t.testName || t.name || "").toLowerCase().includes(cleanQuery) ||
                (t.testCode || t.code || "").toLowerCase().includes(cleanQuery)) &&
            !isAlreadyAdded(t)
        );

        const outsourcedSuggestions = cleanQuery.length < 2 ? [] : outsourcedCatalog.filter(t =>
            !isInstitutionalPackage(t) &&
            ((t.testName || t.name || "").toLowerCase().includes(cleanQuery) ||
                (t.testCode || t.code || "").toLowerCase().includes(cleanQuery)) &&
            !isAlreadyAdded(t)
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


    // COMMAND: Add Test (Intent Aware & Keyboard Loop Optimized)
    const handleAddTest = async (test) => {
        if (!visitId || isProcessing) return;

        // 1. CORRECTION INTENT (Paid/Finalized)
        if (isCorrectionIntent) {
            if (onAddStagedTest) {
                onAddStagedTest(test);
                setFilter("");
                setIsSearchFocused(true);
                setTimeout(() => {
                    testSearchInputRef.current?.focus();
                }, 50);
                return;
            }
            // Fallback Modal for Reason
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
            if (onVisitUpdated) await onVisitUpdated();
        } catch (err) {
            console.error("Failed to add test", err);
            alert("Failed to add test: " + err.message);
        } finally {
            setIsProcessing(false);
            // Enterprise multi-test keyboard loop: immediately refocus search input for consecutive test additions
            setTimeout(() => {
                testSearchInputRef.current?.focus();
                setIsSearchFocused(true);
            }, 50);
        }
    };


    // COMMAND: Remove Test (Intent Aware)
    const handleRemoveTest = async (testCode, orderId) => {
        if (!visitId) return;

        // 1. CORRECTION INTENT
        if (isCorrectionIntent) {
            if (onToggleRemoveOrderId) {
                onToggleRemoveOrderId(orderId, testCode);
                return;
            }
            setCorrectionState({
                isOpen: true,
                type: 'RemoveTest',
                payload: { testCode, orderId },
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
                <div className="flex items-center gap-2.5">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-xs", ui.indicator)}>
                        2
                    </div>
                    <h3 className={ui.headerText}>Visit Details</h3>
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-synos-primary" />}
                </div>
                {isReadOnly ? (
                    <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold tracking-normal", isDark ? "bg-zinc-800/80 border-zinc-700 text-zinc-300" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{readOnlyReason || "PAID"}</span>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleDeleteDraft}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-normal bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 cursor-pointer"
                    >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Draft"}
                    </button>
                )}
            </div>

            {/* SECTION 2: VISIT CONTEXT (Dynamic Payer Sub-Panel) */}
            <div ref={doctorSectionRef} className={cn(ui.section, "transition-all")}>
                <div className="flex items-center justify-between">
                    <h4 className={ui.sectionTitle}>
                        {billingMode === 'Standard' && "Referring Doctor / Clinic"}
                        {billingMode === 'PrepaidPartner' && "Referring Doctor / Partner (Prepaid B2B)"}
                        {billingMode === 'Insurance' && "Insurance Details"}
                        {billingMode === 'Corporate' && "Corporate B2B Account"}
                    </h4>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-xs font-bold tracking-normal px-2.5 py-0.5 rounded-md border",
                            billingMode === 'PrepaidPartner' ? "border-amber-500/40 text-amber-500 bg-amber-500/10" :
                            billingMode === 'Insurance' ? "border-blue-500/40 text-blue-500 bg-blue-500/10" :
                            billingMode === 'Corporate' ? "border-indigo-500/40 text-indigo-500 bg-indigo-500/10" :
                            "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800"
                        )}>
                            {billingMode === 'PrepaidPartner' ? 'Doctor Bill (B2B)' : billingMode}
                        </span>

                        {billingMode === 'Standard' && (
                            isDoctorSectionCollapsed ? (
                                <button
                                    type="button"
                                    onClick={() => setUserDoctorExpandedState(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/40 transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="Change Referring Doctor details"
                                >
                                    <span>Change</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setUserDoctorExpandedState(false)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-95"
                                    title="Minimize"
                                >
                                    <span>Minimize</span>
                                    <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform duration-200" />
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* CONTEXTUAL SUB-PANEL: Standard Direct */}
                {billingMode === 'Standard' && (
                    isDoctorSectionCollapsed ? (
                        /* MINIMIZED: SIDE BY SIDE IN A SINGLE ROW */
                        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                            {/* Doctor 1: Prescribing Doctor / Consultant */}
                            <div 
                                onClick={() => setUserDoctorExpandedState(true)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                    isDark ? "bg-zinc-800/60 border-zinc-700/60 text-zinc-100 hover:border-zinc-600" : "bg-white border border-[#D5E2EC] text-slate-900 shadow-[0_1px_3px_rgba(15,35,60,0.04)] hover:border-blue-400"
                                )}
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)] shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block leading-tight">
                                        Prescribing Doctor
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="truncate tracking-normal text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                            {effectivePartner ? (effectivePartner.displayName || effectivePartner.name) : (snapshot?.billing?.referral?.referrerText || "Self / No Doctor")}
                                        </span>
                                        {effectivePartner && effectiveSecondaryPartner && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF8EE] text-[#9A6B2F] dark:bg-amber-950/30 dark:text-amber-300 font-bold border border-[#F5E2C8] dark:border-amber-900/40 shrink-0">
                                                Commission to RMP
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                                        Type: {effectivePartner?.partnerType || 'Doctor'}
                                        {!effectiveSecondaryPartner && ` • Comm: ${snapshot?.billing?.referral?.commissionCutPercentage || 0}%`}
                                    </div>
                                </div>
                                {canEditReferral && effectivePartner && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveReferral();
                                        }}
                                        disabled={isProcessing}
                                        className="text-zinc-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors shrink-0"
                                        title="Remove Primary Doctor"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Doctor 2: Second Referral Doctor / RMP */}
                            <div 
                                onClick={() => setUserDoctorExpandedState(true)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                    effectiveSecondaryPartner
                                        ? (isDark ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300 hover:border-emerald-800/60" : "bg-[#F4F9F6] border-[#D3E8DD] text-slate-900 shadow-2xs hover:border-[#BCDDCB]")
                                        : (isDark ? "bg-zinc-900/40 border-dashed border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/40" : "bg-slate-50/60 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:bg-blue-50/20")
                                )}
                            >
                                <div className={cn(
                                    "w-2.5 h-2.5 rounded-full shrink-0",
                                    effectiveSecondaryPartner ? "bg-[#3D9970] shadow-[0_0_6px_rgba(61,153,112,0.35)]" : "bg-slate-300 dark:bg-zinc-600"
                                )}></div>
                                <div className="flex-1 min-w-0">
                                    <span className={cn(
                                        "text-[11px] font-bold uppercase tracking-wider block leading-tight",
                                        effectiveSecondaryPartner ? "text-[#2D6A4F] dark:text-emerald-300" : "text-slate-400 dark:text-zinc-500"
                                    )}>
                                        Second Referral Doctor / RMP
                                    </span>
                                    {effectiveSecondaryPartner ? (
                                        <>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="truncate tracking-normal text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                                    {effectiveSecondaryPartner.displayName}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E1F1E8] text-[#245E49] dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-[#BCE2CD] dark:border-emerald-800 uppercase shrink-0">
                                                    {effectiveSecondaryPartner.partnerType || 'RMP'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-[#3D705C] dark:text-emerald-400/90 font-medium truncate mt-0.5">
                                                Commission Cut: {effectiveSecondaryPartner.commissionCutPercentage || 0}% • Exclusive RMP Route
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium italic">
                                                No RMP assigned (Optional)
                                            </span>
                                            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold group-hover:underline">
                                                + Add RMP
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {canEditReferral && effectiveSecondaryPartner && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveSecondaryReferral();
                                        }}
                                        disabled={isProcessing}
                                        className="text-zinc-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors shrink-0"
                                        title="Remove Second Referral Doctor"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* EXPANDED: FULL 2-TIER STACKED VIEW */
                        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 space-y-4">
                            {/* 1. PRIMARY PRESCRIBING DOCTOR */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2.5 text-base font-semibold text-slate-800 dark:text-zinc-200 tracking-normal">
                                        <span>Prescribing Doctor / Consultant</span>
                                        <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold border border-blue-200/60 dark:border-blue-900/60 tracking-normal">
                                            Primary (On Reports & Bills)
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onOpenModal && onOpenModal('referral')}
                                        disabled={!canEditReferral}
                                        className="bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 rounded-lg px-3 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer tracking-normal shadow-2xs"
                                    >
                                        <Plus className="w-4 h-4" /> Add Doctor
                                    </button>
                                </div>
                                {effectivePartner ? (
                                    <div className={cn("flex items-center gap-3 font-bold p-3.5 rounded-xl border",
                                        isDark ? "bg-zinc-800/60 border-zinc-700/60 text-zinc-100" : "bg-white border border-[#D5E2EC] text-slate-900 shadow-[0_1px_3px_rgba(15,35,60,0.04)]")}>
                                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate tracking-normal text-base font-bold text-slate-900 dark:text-white">
                                                    {effectivePartner.displayName || effectivePartner.name || "Partner"}
                                                </span>
                                                {effectiveSecondaryPartner && (
                                                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#FFF8EE] text-[#9A6B2F] dark:bg-amber-950/30 dark:text-amber-300 font-bold border border-[#F5E2C8] dark:border-amber-900/40">
                                                        Commission Routed to RMP
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                                                Type: {effectivePartner.partnerType || 'Doctor'}
                                                {!effectiveSecondaryPartner && ` • Comm: ${snapshot?.billing?.referral?.commissionCutPercentage || 0}%`}
                                            </div>
                                        </div>
                                        {canEditReferral && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveReferral}
                                                disabled={isProcessing}
                                                tabIndex={-1}
                                                className="ml-auto text-zinc-500 hover:text-red-400 p-1 hover:bg-red-400/10 rounded transition-colors cursor-pointer"
                                                title="Remove Primary Doctor"
                                            >
                                                <X className="w-4 h-4" />
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
                                            nextInputRef={snapshot?.billing?.referral?.secondaryPartner ? testSearchInputRef : standardSecondaryReferralRef}
                                            fallbackNextRef={testSearchInputRef}
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
                            <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2.5 text-base font-semibold text-slate-800 dark:text-zinc-200 tracking-normal">
                                        <span>Second Referral Doctor / RMP</span>
                                        <span className="text-xs px-2.5 py-1 rounded-md bg-[#EBF5EF] text-[#245E49] dark:bg-emerald-950/30 dark:text-emerald-300 font-bold border border-[#CCE8D8] dark:border-emerald-900/40 tracking-normal">
                                            RMP (Commissions Route Here)
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onOpenModal && onOpenModal('rmp')}
                                        disabled={!canEditReferral}
                                        className="bg-[#EBF5EF] hover:bg-[#DFF0E6] text-[#245E49] border border-[#CCE8D8] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 rounded-lg px-3 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer tracking-normal shadow-2xs"
                                    >
                                        <Plus className="w-4 h-4" /> Add RMP
                                    </button>
                                </div>
                                {snapshot?.billing?.referral?.secondaryPartner ? (
                                    <div className={cn("flex items-center gap-3 font-bold p-3.5 rounded-xl border",
                                        isDark ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300" : "bg-[#F4F9F6] border-[#D3E8DD] text-slate-900 shadow-2xs")}>
                                        <div className="w-3 h-3 rounded-full bg-[#3D9970] shadow-[0_0_6px_rgba(61,153,112,0.35)]"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate tracking-normal text-base font-bold text-slate-900 dark:text-white">
                                                    {snapshot.billing.referral.secondaryPartner.displayName}
                                                </span>
                                                <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#E1F1E8] text-[#245E49] dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-[#BCE2CD] dark:border-emerald-800 uppercase">
                                                    {snapshot.billing.referral.secondaryPartner.partnerType || 'RMP'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-[#3D705C] dark:text-emerald-400/90 font-medium mt-0.5">
                                                Commission Cut: {snapshot.billing.referral.secondaryPartner.commissionCutPercentage || 0}% • All referral logic & payouts route exclusively to this doctor
                                            </div>
                                        </div>
                                        {canEditReferral && (
                                            <button
                                                onClick={handleRemoveSecondaryReferral}
                                                disabled={isProcessing}
                                                tabIndex={-1}
                                                className="ml-auto text-zinc-500 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                                title="Remove Second Referral Doctor"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <ReferralCombinedInput
                                            inputRef={standardSecondaryReferralRef}
                                            nextInputRef={testSearchInputRef}
                                            fallbackNextRef={testSearchInputRef}
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
                    )
                )}

                {/* CONTEXTUAL SUB-PANEL: Corporate B2B (Prepaid Partner) */}
                {billingMode === 'PrepaidPartner' && (
                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-3">
                        {/* 1. PRIMARY PRESCRIBING DOCTOR */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300">
                                    <span>Prescribing Doctor (Main Doctor on Reports)</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onOpenModal && onOpenModal('referral')}
                                    disabled={!canEditReferral}
                                    className="bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 rounded-lg px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Doctor
                                </button>
                            </div>
                            {effectivePartner ? (
                                <div className={cn("flex items-center gap-2 font-semibold p-3 rounded-xl border",
                                    isDark ? "bg-zinc-800/60 border-zinc-700/60 text-zinc-100" : "bg-white border border-[#D5E2EC] text-slate-900 shadow-[0_1px_3px_rgba(15,35,60,0.04)]")}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate tracking-normal text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                            {effectivePartner.displayName || effectivePartner.name || "Partner"}
                                        </div>
                                        <div className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                                            Primary Consultant • Name retained on all patient documents
                                        </div>
                                    </div>
                                    {canEditReferral && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveReferral}
                                            disabled={isProcessing}
                                            tabIndex={-1}
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
                                        nextInputRef={testSearchInputRef}
                                        fallbackNextRef={testSearchInputRef}
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
                        corporateAccounts={corporateAccounts}
                        selectedCompanyId={snapshot?.visit?.insuranceCompanyId || snapshot?.visit?.corporateAccountId}
                        policyNumber={snapshot?.visit?.policyNumber}
                        preAuthNumber={snapshot?.visit?.preAuthApprovalNumber}
                        coPayAmount={snapshot?.visit?.insuranceCoPayAmount}
                        onChange={handleUpdateBillingContext}
                        onOpenAddModal={() => onOpenModal && onOpenModal('insurance')}
                        isDark={isDark}
                        disabled={isReadOnly && !isCorrectionIntent}
                    />
                )}

                {/* CONTEXTUAL SUB-PANEL: Corporate B2B (Legacy compatibility) */}
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
            <div 
                className={cn(ui.section)}
                onFocusCapture={() => { if (userDoctorExpandedState !== false) setUserDoctorExpandedState(false); }}
                onPointerDownCapture={() => { if (userDoctorExpandedState !== false) setUserDoctorExpandedState(false); }}
            >
                <div className="flex items-center justify-between">
                    <h4 className={ui.sectionTitle}>Test Selection</h4>
                    {isInstitutionalMode && (
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-normal">
                            Insurance Rates Active
                        </span>
                    )}
                </div>

                {isInstitutionalMode && !activeCorporateAccountId && (
                    <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 flex items-center gap-2 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0 text-blue-500" />
                        <span>Select an insurance company above to view available packages and rates</span>
                    </div>
                )}

                {(!isReadOnly || isCorrectionIntent) && (
                    <div className="relative z-10">
                        {isProcessing ? (
                            <Loader2 className="absolute left-4 top-3.5 w-5 h-5 text-synos-primary animate-spin" />
                        ) : (
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        )}
                        <input
                            ref={testSearchInputRef}
                            type="text"
                            placeholder={isInstitutionalMode 
                                ? (activeCorporateAccountId ? "Search insurance packages & tests..." : "Select insurance company above first...") 
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
                                if (e.key === 'ArrowDown') {
                                    if (suggestions.length > 0) {
                                        e.preventDefault();
                                        setTestSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
                                    }
                                } else if (e.key === 'ArrowUp') {
                                    if (suggestions.length > 0) {
                                        e.preventDefault();
                                        setTestSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
                                    }
                                } else if (e.key === 'Enter') {
                                    if (suggestions.length > 0 && testSelectedIndex >= 0 && testSelectedIndex < suggestions.length) {
                                        e.preventDefault();
                                        handleAddTest(suggestions[testSelectedIndex]);
                                    }
                                } else if (e.key === 'Tab') {
                                    // Smoothly dismiss suggestions dropdown so tab focus advances to next section
                                    setIsSearchFocused(false);
                                }
                            }}
                            disabled={isInstitutionalMode && !activeCorporateAccountId}
                            style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                            className={cn(ui.input, "w-full h-12 rounded-xl py-2 focus:outline-none transition-colors disabled:opacity-50 text-base")}
                        />

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && filter.trim().length > 0 && isSearchFocused && (
                            <div 
                                ref={testListRef} 
                                className={cn(
                                    "absolute top-full left-0 right-0 mt-1.5 rounded-xl p-1 shadow-xl z-20 border overflow-y-auto space-y-1 backdrop-blur-md max-h-64",
                                    ui.suggestionBox,
                                    isDark ? "bg-zinc-900/95 border-zinc-700/60 shadow-black/50" : "bg-white/95 border-zinc-200/90 shadow-zinc-900/10"
                                )}
                            >
                                {/* INTERNAL & OUTSOURCED & CORPORATE TESTS */}
                                {suggestions.map((test, idx) => {
                                    const pricing = getTestPricing(test);
                                    const isSelected = idx === testSelectedIndex;
                                    return (
                                        <button
                                            key={test.testCode || test.code}
                                            type="button"
                                            onMouseEnter={() => setTestSelectedIndex(idx)}
                                            onClick={() => {
                                                handleAddTest({ ...test, price: pricing.price });
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between group transition-all duration-150 cursor-pointer",
                                                isSelected
                                                    ? (isDark 
                                                        ? "bg-blue-500/15 border border-blue-400/40 text-white font-bold shadow-xs scale-[0.99]" 
                                                        : "bg-blue-50/90 border border-blue-400/50 text-blue-900 font-bold shadow-xs scale-[0.99]")
                                                    : (isDark 
                                                        ? "hover:bg-zinc-800/70 border border-transparent text-zinc-300 hover:text-white" 
                                                        : "hover:bg-zinc-50 border border-transparent text-zinc-700 hover:text-zinc-900")
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <div className="type-value">{test.testName || test.name}</div>
                                                    <div className="type-code flex items-center gap-1.5">
                                                        <span>{test.testCode || test.code}</span>
                                                        {test.isPackage && (
                                                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">
                                                                Package
                                                            </span>
                                                        )}
                                                        {pricing.isCorporateRate && (
                                                            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 font-bold border border-indigo-500/30">
                                                                {isInstitutionalMode ? "Insurance Rate" : "Special Rate"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {(test.isOutsourced || test.IsOutsourced) && (
                                                    <Beaker className="w-3.5 h-3.5 text-amber-500 opacity-70" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn("type-code", pricing.isCorporateRate ? "text-indigo-400 font-bold" : "")}>
                                                        ₹{pricing.price}
                                                    </span>
                                                    {pricing.isCorporateRate && pricing.standardPrice !== pricing.price && (
                                                        <span className="text-xs line-through text-zinc-500 font-mono">
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


                {/* Selected Internal Tests List (Dynamic 1-Col <=4, 2-Col Split >4, Internal Scroll >8) */}
                {(() => {
                    const totalSelectedTests = internalTests.length + (isCorrectionIntent ? stagedAddedTests.length : 0);
                    const isSplitGrid = totalSelectedTests > 4;
                    const hasInternalScroll = totalSelectedTests > 8;

                    if (totalSelectedTests === 0 && (!isReadOnly || isCorrectionIntent)) {
                        return (
                            <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-700/80 bg-slate-50/50 dark:bg-zinc-800/30 p-6 flex flex-col items-center justify-center text-center gap-1.5">
                                <Beaker className="w-6 h-6 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">No internal tests added</span>
                                <span className="text-xs text-slate-400 dark:text-zinc-500">Search and add tests to this visit</span>
                            </div>
                        );
                    }

                    return (
                        <div className={cn(
                            isSplitGrid ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5" : "space-y-2.5",
                            hasInternalScroll && "max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-700"
                        )}>
                            {internalTests.map(test => {
                                const orderId = test.orderId || test.OrderId || test.TestId || test.testId;
                                const isStagedRemoved = isCorrectionIntent && stagedRemovedOrderIds.includes(orderId);

                                return (
                                    <div key={test.testCode || test.code} className={cn(
                                        "rounded-xl p-3 flex items-center justify-between group animate-in zoom-in-95 duration-200 border transition-all min-w-0",
                                        isStagedRemoved 
                                            ? "opacity-50 bg-red-950/20 border-red-500/30 line-through" 
                                            : ui.testCard
                                    )}>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={cn("px-2.5 py-1 min-w-[32px] min-h-[28px] max-w-[120px] rounded-lg flex items-center justify-center border shrink-0 font-mono text-xs font-bold truncate", ui.testCode)}>
                                                {test.testCode || test.code}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="leading-tight truncate flex items-center gap-1.5">
                                                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                                        {test.testName || test.name}
                                                    </span>
                                                    {isStagedRemoved && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 no-underline not-italic shrink-0">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 uppercase tracking-wide truncate">
                                                    {test.dept || test.category || test.department}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                            <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                                                ₹{test.basePrice || test.price || test.Price}
                                            </div>
                                            
                                            {/* Allow Remove / Undo if NOT ReadOnly OR if Correction Intent */}
                                            {(!isReadOnly || isCorrectionIntent) && (
                                                isStagedRemoved ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTest(test.testCode || test.code, orderId)}
                                                        className="text-xs font-bold text-synos-primary hover:underline px-2 py-0.5 bg-synos-primary/10 rounded cursor-pointer no-underline"
                                                    >
                                                        Undo
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleRemoveTest(test.testCode || test.code, orderId);
                                                        }}
                                                        disabled={isProcessing}
                                                        className="text-zinc-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                                        title="Remove Test"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* STAGED ADD-ON TESTS IN EDIT MODE */}
                            {isCorrectionIntent && stagedAddedTests.length > 0 && stagedAddedTests.map((test, sIdx) => (
                                <div key={`staged-add-${test.code || test.testCode}-${sIdx}`} className="rounded-xl p-3 flex items-center justify-between group border border-emerald-500/40 bg-emerald-500/10 animate-in zoom-in-95 duration-200 min-w-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="px-2.5 py-1 min-w-[32px] min-h-[28px] max-w-[120px] rounded-lg flex items-center justify-center border shrink-0 font-mono text-xs font-bold truncate bg-emerald-500/20 border-emerald-500/40 text-emerald-400">
                                            {test.code || test.testCode}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="leading-tight truncate flex items-center gap-1.5">
                                                <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                                    {test.name || test.testName}
                                                </span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                                                    + Staged
                                                </span>
                                            </div>
                                            <div className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-500/80 mt-0.5 uppercase tracking-wide truncate">
                                                {test.specimenTypeCode ? `Specimen: ${test.specimenTypeCode}` : (test.dept || test.department || "Add-On Test")}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                        <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            ₹{test.price || test.basePrice || 0}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveStagedAddedTest && onRemoveStagedAddedTest(sIdx)}
                                            className="text-emerald-500 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                            title="Discard Add-On"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* SECTION 3B: Available Packages (SynOS Card Design) */}
            {isInstitutionalMode && activeCorporateAccountId && (
                <div className={cn("p-3.5 xl:p-4 rounded-xl space-y-3 transition-all animate-in fade-in duration-200 border", ui.section)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-synos-primary opacity-80" />
                            <div className="flex items-center gap-2">
                                <h4 className={ui.sectionTitle}>
                                    Available Packages
                                </h4>
                                <span className={cn("px-2.5 py-0.5 rounded text-xs font-mono font-bold border", ui.testCode)}>
                                    {corporatePackagesList.length} Available
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                            {activeCorporateAccount?.companyName ? `Special rates for ${activeCorporateAccount.companyName}` : "Pre-configured packages"}
                        </span>
                    </div>

                    {corporatePackagesList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                            {corporatePackagesList.map(pkg => {
                                const pkgCode = pkg.testCode || pkg.packageCode || pkg.code;
                                const pkgName = pkg.packageName || pkg.testName || pkg.name;
                                const pkgPrice = pkg.contractedPrice ?? pkg.corporatePrice ?? pkg.price ?? 0;
                                const matchedTest = tests.find(t => (t.code || '').toLowerCase() === (pkgCode || '').toLowerCase());
                                const isAlreadyAdded = Boolean(matchedTest);

                                return (
                                    <div
                                        key={pkg.corporateRateRuleId || pkg.id || pkgCode}
                                        onClick={() => {
                                            if (isProcessing || (isReadOnly && !isCorrectionIntent)) return;
                                            if (isAlreadyAdded && matchedTest) {
                                                handleRemoveTest(matchedTest.code || pkgCode, matchedTest.orderId || matchedTest.OrderId || matchedTest.TestId || matchedTest.testId);
                                            } else {
                                                handleAddTest({ testCode: pkgCode, name: pkgName, price: pkgPrice, isPackage: true });
                                            }
                                        }}
                                        className={cn(
                                            "group relative p-3 rounded-lg border transition-all duration-150 flex flex-col justify-between space-y-2.5 cursor-pointer select-none",
                                            isAlreadyAdded
                                                ? isDark
                                                    ? "bg-emerald-950/25 border-emerald-500/50 ring-1 ring-emerald-500/40 shadow-xs"
                                                    : "bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400/80 shadow-xs"
                                                : isDark
                                                    ? "bg-zinc-900/60 border-synos-border hover:border-zinc-600 hover:bg-zinc-800/60 hover:shadow-xs active:scale-[0.99]"
                                                    : "bg-white/80 border-black/5 shadow-xs hover:bg-white hover:border-black/15 hover:shadow-sm active:scale-[0.99]"
                                        )}
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className={cn("px-2 py-0.5 rounded flex items-center justify-center type-code border shrink-0 font-mono text-xs font-bold truncate", ui.testCode)}>
                                                        {pkgCode}
                                                    </div>
                                                    {isAlreadyAdded && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                                            <Check size={12} className="stroke-[3]" /> Added
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {pkg.standardPrice > pkgPrice && (
                                                        <span className="text-xs text-zinc-400 line-through font-mono block leading-tight">
                                                            ₹{pkg.standardPrice?.toLocaleString()}
                                                        </span>
                                                    )}
                                                    <span className="type-code text-sm font-bold">
                                                        ₹{pkgPrice.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="type-value leading-snug line-clamp-1 group-hover:text-synos-primary transition-colors">
                                                {pkgName}
                                            </div>

                                            {pkg.includedTests && pkg.includedTests.length > 0 && (
                                                <div className="type-label flex items-center gap-1 flex-wrap text-xs opacity-80">
                                                    <span className="font-semibold">Tests ({pkg.includedTests.length}):</span>
                                                    <span className="truncate">
                                                        {pkg.includedTests.slice(0, 3).map(t => t.testName || t.testCode).join(', ')}
                                                        {pkg.includedTests.length > 3 && ` +${pkg.includedTests.length - 3} more`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                                            {isAlreadyAdded ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="type-label text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                                        Included in Bill
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (matchedTest) {
                                                                handleRemoveTest(matchedTest.code || pkgCode, matchedTest.orderId || matchedTest.OrderId || matchedTest.TestId || matchedTest.testId);
                                                            }
                                                        }}
                                                        disabled={isProcessing || (isReadOnly && !isCorrectionIntent)}
                                                        className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <X size={12} /> Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="type-label text-xs text-zinc-400">
                                                        Click card to add
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={isProcessing || isReadOnly}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddTest({ testCode: pkgCode, name: pkgName, price: pkgPrice, isPackage: true });
                                                        }}
                                                        className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <Plus size={12} />
                                                        <span>Add</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-zinc-400 text-xs">
                            No packages configured for this company. Individual rates can be searched above.
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
                                            <span className="text-xs text-zinc-500 opacity-40">•</span>
                                            <span className="type-label opacity-60">{test.department}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <div className="type-code text-amber-500">₹{test.price}</div>
                                        {test.isPricingResolved ? (
                                            <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-500">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-500 animate-pulse">
                                                <AlertCircle className="w-3.5 h-3.5" /> Pending Intel
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
                            className="rounded-xl border border-[#D5E2EC] dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm font-semibold text-slate-800 dark:text-zinc-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-700/50 flex items-center gap-2 cursor-pointer transition-all tracking-normal"
                        >
                            <Beaker className="w-4 h-4 text-slate-500" />
                            <span>Outsource Test</span>
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

function ReferralCombinedInput({ 
    initialValue, 
    isReadOnly, 
    isProcessing, 
    partners, 
    onApplyPartner, 
    onUpdateText,
    inputRef,
    nextInputRef,
    fallbackNextRef
}) {
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

        // Immediate forward focus transfer before component unmounts
        const target = nextInputRef?.current ? nextInputRef.current : fallbackNextRef?.current;
        if (target) {
            target.focus();
        }

        setTimeout(() => { 
            isSelecting.current = false; 
            // Re-assert focus if browser dropped it during re-render
            const targetAfter = nextInputRef?.current ? nextInputRef.current : fallbackNextRef?.current;
            if (targetAfter && document.activeElement !== targetAfter) {
                targetAfter.focus();
            }
        }, 150);
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
        } else if (e.key === 'Tab') {
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
        input: "bg-white/90 border border-[#D5E2EC] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] focus:ring-1 focus:ring-blue-500 rounded-xl transition-all",
        suggestionBox: "bg-white border-zinc-300 shadow-xl",
        hover: "hover:bg-zinc-50 text-zinc-600 hover:text-black"
    };

    return (
        <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                readOnly={isReadOnly}
                aria-disabled={isProcessing}
                placeholder="Search Doctor / Clinic Name..."
                style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                className={cn(ui.input, "w-full h-12 rounded-xl text-base font-medium outline-none transition-colors", 
                    isProcessing && "opacity-70 pointer-events-none",
                    isReadOnly && "cursor-default bg-slate-50/80 dark:bg-zinc-850 font-bold text-zinc-900 dark:text-zinc-100 border-slate-300 dark:border-zinc-700 shadow-none")}
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
                    className={cn(
                        "absolute top-full left-0 right-0 mt-1.5 rounded-xl p-1 shadow-xl z-20 border overflow-y-auto space-y-1 backdrop-blur-md max-h-48",
                        ui.suggestionBox,
                        isDark ? "bg-zinc-900/95 border-zinc-700/60 shadow-black/50" : "bg-white/95 border-zinc-200/90 shadow-zinc-900/10"
                    )}
                >
                    {suggestions.map((p, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                            <button
                                key={p.referralPartnerId}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent blur
                                    handleApply(p.referralPartnerId);
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-lg transition-all duration-150 type-label flex items-center justify-between cursor-pointer",
                                    isSelected 
                                        ? (isDark 
                                            ? "bg-blue-500/15 border border-blue-400/40 text-white font-bold shadow-xs scale-[0.99]" 
                                            : "bg-blue-50/90 border border-blue-400/50 text-blue-900 font-bold shadow-xs scale-[0.99]")
                                        : (isDark 
                                            ? "hover:bg-zinc-800/70 border border-transparent text-zinc-300 hover:text-white" 
                                            : "hover:bg-zinc-50 border border-transparent text-zinc-700 hover:text-zinc-900")
                                )}
                            >
                                <span className="truncate">{p.name}</span>
                                {p.status === 0 && (
                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md border leading-none uppercase", 
                                        isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-amber-100 border-amber-300 text-amber-700")}>
                                        Draft
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
