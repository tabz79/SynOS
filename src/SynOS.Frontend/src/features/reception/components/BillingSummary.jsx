import { useState, useEffect, useRef, useMemo } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock, AlertCircle, Smartphone, CreditCard, Plus, ShieldCheck, Search, ChevronDown, CheckCircle2, Clock, ShieldAlert, Building2, Coins, FlaskConical, Stethoscope, Circle, CircleDot } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { PosCashTenderModule } from './PosCashTenderModule'

// Safe extractor for B2B discount state handling case variations (b2b, b2B, B2B)
export const extractB2BInfo = (snap) => {
    const v = snap?.visit || {};
    const b = snap?.billing || {};
    const fallbackDiscount = Number(b.discountAmount) || 0;
    const rawVal = v.b2bDiscountValue ?? v.b2BDiscountValue ?? v.B2BDiscountValue ?? b.b2bDiscountAmount ?? b.b2BDiscountAmount ?? b.B2BDiscountAmount ?? fallbackDiscount;
    const rawTypeVal = String(v.b2bDiscountType ?? v.b2BDiscountType ?? v.B2BDiscountType ?? b.b2bDiscountType ?? b.b2BDiscountType ?? b.discountType ?? 'Flat').trim().toLowerCase();
    const rawType = (rawTypeVal === 'percentage' || rawTypeVal === 'percent') ? 'PERCENTAGE' : 'FLAT';
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
    isPayerScrolledOut = false,
    onScrollToPayerMode, 
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
    originalPaid = 0,
    isPartialPayment = false,
    setIsPartialPayment,
    customPaymentAmount = '',
    setCustomPaymentAmount,
    settlementTerm = 'FULL',
    setSettlementTerm,
    referralPartners = [],
    // POS Cash Tender & Split Payment Props
    tenderedAmount = '',
    setTenderedAmount,
    changeReturnedNow = '',
    setChangeReturnedNow,
    isChangeRetainedAsDue = false,
    setIsChangeRetainedAsDue,
    isSplitPayment = false,
    setIsSplitPayment,
    splitCashAmount = '',
    setSplitCashAmount,
    splitUpiAmount = '',
    setSplitUpiAmount
}) {
    // Local UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [discountCatalog, setDiscountCatalog] = useState([]);

    // Custom Discount State (Percentage vs Flat) - Default to 'FLAT' for standard Indian clinical concessions
    const [discountInputMode, setDiscountInputMode] = useState('custom'); // 'custom' | 'catalog'
    const [customDiscountType, setCustomDiscountType] = useState('FLAT'); // 'FLAT' | 'PERCENTAGE'
    const [customDiscountValue, setCustomDiscountValue] = useState('');
    const [customDiscountReason, setCustomDiscountReason] = useState('');
    const [userDiscountExpandedState, setUserDiscountExpandedState] = useState(null);
    const concessionEditorRef = useRef(null);
    const concessionTriggerRef = useRef(null);

    // Preset Discount Reasons State
    const [discountReasons, setDiscountReasons] = useState([]);
    const [showReasonDropdown, setShowReasonDropdown] = useState(false);
    const [reasonSelectedIndex, setReasonSelectedIndex] = useState(-1);
    const reasonListRef = useRef(null);

    // Secondary Discount & Owner Write-Off State (For Active Due Bills)
    const [isSecondaryExpanded, setIsSecondaryExpanded] = useState(true);
    const [secondaryDiscountType, setSecondaryDiscountType] = useState('FLAT'); // FLAT by default per invariant Rule 2
    const [secondaryDiscountValue, setSecondaryDiscountValue] = useState('');
    const [secondaryReason, setSecondaryReason] = useState('Lab Owner Discretionary Concession');
    const [isApplyingSecondary, setIsApplyingSecondary] = useState(false);
    const [showSecondaryReasonDropdown, setShowSecondaryReasonDropdown] = useState(false);
    const [secondaryReasonSelectedIndex, setSecondaryReasonSelectedIndex] = useState(-1);
    const secondaryReasonListRef = useRef(null);

    // Corporate B2B Billing Doctor Override State
    const [b2bDoctorSearch, setB2BDoctorSearch] = useState('');
    const [showB2BDoctorDropdown, setShowB2BDoctorDropdown] = useState(false);
    const [b2bDoctorSelectedIndex, setB2BDoctorSelectedIndex] = useState(0);
    const b2bDoctorListRef = useRef(null);

    const filteredB2BDoctors = useMemo(() => {
        const q = (b2bDoctorSearch || '').trim().toLowerCase();
        const docs = Array.isArray(referralPartners) ? referralPartners : [];
        if (!q) return docs.slice(0, 30);
        return docs.filter(p => 
            (p.name || p.displayName || '').toLowerCase().includes(q) ||
            (p.code || '').toLowerCase().includes(q) ||
            (p.partnerType || '').toLowerCase().includes(q)
        ).slice(0, 30);
    }, [referralPartners, b2bDoctorSearch]);

    useEffect(() => {
        if (showB2BDoctorDropdown && filteredB2BDoctors.length > 0) {
            setB2BDoctorSelectedIndex(0);
        } else {
            setB2BDoctorSelectedIndex(-1);
        }
    }, [b2bDoctorSearch, showB2BDoctorDropdown, filteredB2BDoctors.length]);

    useEffect(() => {
        if (showB2BDoctorDropdown && b2bDoctorSelectedIndex >= 0 && b2bDoctorListRef.current) {
            const selectedElem = b2bDoctorListRef.current.children[b2bDoctorSelectedIndex];
            if (selectedElem) selectedElem.scrollIntoView({ block: 'nearest' });
        }
    }, [b2bDoctorSelectedIndex, showB2BDoctorDropdown]);

    const handleB2BDoctorKeyDown = (e) => {
        if (e.key === 'Tab') {
            setShowB2BDoctorDropdown(false);
            if (!e.shiftKey) {
                const submitBtn = document.getElementById('btn-unified-action') || document.getElementById('btn-confirm-visit');
                if (submitBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    submitBtn.focus();
                }
            } else {
                const discountTarget = document.getElementById('input-b2b-discount') || 
                                       document.getElementById('btn-edit-b2b-discount');
                if (discountTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    discountTarget.focus();
                } else {
                    const outsourceBtn = document.getElementById('btn-outsource-test');
                    if (outsourceBtn && outsourceBtn.offsetParent !== null) {
                        e.preventDefault();
                        e.stopPropagation();
                        outsourceBtn.focus();
                    } else {
                        const allTestButtons = Array.from(document.querySelectorAll('[data-test-remove-btn="true"]'));
                        if (allTestButtons.length > 0) {
                            allTestButtons[allTestButtons.length - 1].focus();
                        } else {
                            document.getElementById('input-test-search')?.focus();
                        }
                    }
                }
            }
            return;
        }

        if (!showB2BDoctorDropdown) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setShowB2BDoctorDropdown(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setB2BDoctorSelectedIndex(prev => (prev < filteredB2BDoctors.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setB2BDoctorSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredB2BDoctors.length - 1));
        } else if (e.key === 'Enter') {
            if (b2bDoctorSelectedIndex >= 0 && b2bDoctorSelectedIndex < filteredB2BDoctors.length) {
                e.preventDefault();
                const chosen = filteredB2BDoctors[b2bDoctorSelectedIndex];
                handleApplyB2BOverrideDoctor(chosen.referralPartnerId || chosen.id);
            }
        } else if (e.key === 'Escape') {
            setShowB2BDoctorDropdown(false);
        }
    };

    const handleApplyB2BOverrideDoctor = async (doctorId) => {
        const visitId = snapshot?.visit?.visitId || snapshot?.visit?.id;
        setShowB2BDoctorDropdown(false);
        setB2BDoctorSearch('');
        if (!visitId || !doctorId) return;

        // Check duplicate with primary doctor
        const primaryDoctor = snapshot?.billing?.referral?.partner || snapshot?.visit?.referralPartner;
        const primaryId = primaryDoctor?.referralPartnerId || primaryDoctor?.id || snapshot?.visit?.referralPartnerId;
        const selectedDoc = (referralPartners || []).find(p => (p.referralPartnerId || p.id) === doctorId);
        const isSame = (primaryId && String(primaryId).toLowerCase() === String(doctorId).toLowerCase()) ||
                       (primaryDoctor && selectedDoc && (primaryDoctor.displayName || primaryDoctor.name || '').trim().toLowerCase() === (selectedDoc.displayName || selectedDoc.name || '').trim().toLowerCase());

        if (isSame) {
            if (snapshot?.billing?.referral?.secondaryPartner || snapshot?.visit?.secondaryReferralPartner) {
                try {
                    await ReceptionApi.updateSecondaryReferral(visitId, null);
                    if (onVisitUpdated) onVisitUpdated();
                } catch (_) {}
            }
            window.dispatchEvent(new CustomEvent('synos:notification-hint', {
                detail: {
                    id: 'dup-b2b-doc',
                    title: 'Doctor Already Selected',
                    message: 'Same doctor selected above. B2B bills go to this doctor automatically.'
                }
            }));
            return;
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.updateSecondaryReferral(visitId, doctorId);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to set B2B billing override doctor:", err);
            alert(err.message || "Failed to set B2B billing doctor");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearB2BOverrideDoctor = async () => {
        const visitId = snapshot?.visit?.visitId || snapshot?.visit?.id;
        if (!visitId) return;
        setIsProcessing(true);
        try {
            await ReceptionApi.updateSecondaryReferral(visitId, null);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to clear B2B billing override doctor:", err);
            alert(err.message || "Failed to clear B2B billing doctor");
        } finally {
            setIsProcessing(false);
        }
    };

    // B2B Prepaid Partner Rate State (Dual Mode: Flat vs Percentage)
    const b2bInfo = extractB2BInfo(snapshot);
    const [b2bDiscountType, setB2BDiscountType] = useState(b2bInfo.rawType);
    const [localB2BInput, setLocalB2BInput] = useState(b2bInfo.rawVal && b2bInfo.rawVal > 0 ? String(b2bInfo.rawVal) : '');
    const [isB2BEditing, setIsB2BEditing] = useState(false);
    const [isB2BExpanded, setIsB2BExpanded] = useState(false);

    useEffect(() => {
        if (!isB2BEditing) {
            if (isCorrectionIntent && stagedDiscount && stagedDiscount.isB2B) {
                setLocalB2BInput(stagedDiscount.value !== undefined ? String(stagedDiscount.value) : '');
                const stagedType = String(stagedDiscount.type || 'Flat').trim().toLowerCase();
                setB2BDiscountType(stagedType === 'percentage' || stagedType === 'percent' ? 'PERCENTAGE' : 'FLAT');
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
        snapshot?.billing?.b2bDiscountType, snapshot?.billing?.b2BDiscountType,
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
        indicator: "bg-slate-600 text-white border-transparent",
        headerText: "text-base sm:text-lg font-bold text-white tracking-normal",
        container: "rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl p-3.5 sm:p-4 space-y-2.5",
        rowLabel: "text-xs sm:text-sm font-medium text-zinc-400",
        rowValue: "text-xs sm:text-sm font-mono font-bold text-zinc-100",
        netLabel: "text-sm sm:text-base font-bold text-white",
        netValue: "text-lg sm:text-xl font-bold text-white font-mono",
        input: "bg-zinc-950/70 border-zinc-800 text-xs sm:text-sm focus:border-synos-primary rounded-xl h-9 sm:h-10 px-3 tracking-normal",
        method: {
            active: "bg-zinc-100 text-zinc-900 border-white shadow-md",
            inactive: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
        }
    } : {
        indicator: "bg-slate-500 text-white border-transparent shadow-xs",
        headerText: "text-base sm:text-lg font-bold text-slate-900 tracking-normal",
        container: "rounded-2xl bg-gradient-to-b from-[#DCE5EE] via-[#D2DFE9] to-[#C7D6E2] border border-[#B3C5D5] shadow-[0_8px_24px_rgba(15,35,60,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] p-3.5 sm:p-4 space-y-2.5",
        rowLabel: "text-xs sm:text-sm font-medium text-slate-600",
        rowValue: "text-xs sm:text-sm font-mono font-bold text-slate-900",
        netLabel: "text-sm sm:text-base font-bold text-slate-900",
        netValue: "text-lg sm:text-xl font-bold text-slate-900 font-mono",
        input: "bg-white/90 border border-[#D5E2EC] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all rounded-xl h-9 sm:h-10 px-3 tracking-normal",
        method: {
            active: "bg-slate-900 text-white border-slate-900 shadow-sm",
            inactive: "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-[0_1px_2px_rgba(15,35,60,0.04)]"
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
            setIsDiscountExpanded(true);
        }
    }, [createdDiscountReason]);

    // Auto populate custom discount input when drawer opens with an existing staged or applied discount
    useEffect(() => {
        if (isDiscountExpanded) {
            if (stagedDiscount && !stagedDiscount.remove) {
                setCustomDiscountType(stagedDiscount.type === 'Flat' ? 'FLAT' : 'PERCENTAGE');
                if (stagedDiscount.value !== undefined && stagedDiscount.value !== null) {
                    setCustomDiscountValue(String(stagedDiscount.value));
                }
                if (stagedDiscount.reason) {
                    setCustomDiscountReason(stagedDiscount.reason);
                }
                setDiscountInputMode('custom');
            } else if (billing?.appliedDiscount && !customDiscountValue) {
                const isPct = billing.appliedDiscount.type === 0 || billing.appliedDiscount.type === 'Percentage';
                setCustomDiscountType(isPct ? 'PERCENTAGE' : 'FLAT');
                if (billing.appliedDiscount.value !== undefined && billing.appliedDiscount.value !== null) {
                    setCustomDiscountValue(String(billing.appliedDiscount.value));
                }
                if (billing.appliedDiscount.reason || billing.appliedDiscount.name) {
                    setCustomDiscountReason(billing.appliedDiscount.reason || billing.appliedDiscount.name);
                }
            }
        }
    }, [isDiscountExpanded, stagedDiscount]);

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

    // Enterprise keyboard navigation helper: smoothly advance focus to Settlement Terms or Payment
    const advanceFocusToSettlementOrPayment = () => {
        setTimeout(() => {
            const target = document.getElementById('btn-settlement-full') ||
                           document.getElementById('btn-settlement-partial') ||
                           document.querySelector('[data-payment-method="true"]') ||
                           document.getElementById('btn-unified-action');
            if (target) {
                target.focus();
            }
        }, 50);
    };

    const handleReasonKeyDown = (e) => {
        if (e.key === 'Tab') {
            if (!e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                setShowReasonDropdown(false);
                document.getElementById('btn-add-discount-reason')?.focus();
            } else {
                e.preventDefault();
                e.stopPropagation();
                setShowReasonDropdown(false);
                document.getElementById('input-flat-concession')?.focus();
            }
            return;
        }

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
                setTimeout(() => {
                    document.getElementById('btn-apply-custom-discount')?.focus();
                }, 40);
            } else if (customDiscountReason && customDiscountReason.trim()) {
                e.preventDefault();
                setShowReasonDropdown(false);
                setTimeout(() => {
                    document.getElementById('btn-apply-custom-discount')?.focus();
                }, 40);
            }
        } else if (e.key === 'Escape') {
            setShowReasonDropdown(false);
        }
    };

    // Derived filtered suggestions for Secondary Discount / Write-Off Reason Autocomplete
    const standardSecondaryReasons = useMemo(() => [
        { reasonText: 'Lab Owner Discretionary Concession', category: 'Management' },
        { reasonText: 'Chief Pathologist Courtesy Concession', category: 'Clinical' },
        { reasonText: 'Indigent Patient Full Write-off', category: 'Charity' },
        { reasonText: 'VIP / Personal Relative Courtesy', category: 'Management' },
        { reasonText: 'Director Approved Concession', category: 'Executive' },
        { reasonText: 'Management Waiver / Write-off', category: 'Management' }
    ], []);

    const filteredSecondaryReasonSuggestions = useMemo(() => {
        const query = (secondaryReason || '').trim().toLowerCase();
        const combined = [...standardSecondaryReasons, ...(discountReasons || [])];
        const unique = [];
        const seen = new Set();
        for (const item of combined) {
            const key = (item.reasonText || '').toLowerCase();
            if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(item);
            }
        }
        if (!query) return unique;
        return unique.filter(r => 
            (r.reasonText && r.reasonText.toLowerCase().includes(query)) ||
            (r.category && r.category.toLowerCase().includes(query))
        );
    }, [standardSecondaryReasons, discountReasons, secondaryReason]);

    useEffect(() => {
        if (showSecondaryReasonDropdown && filteredSecondaryReasonSuggestions.length > 0) {
            setSecondaryReasonSelectedIndex(0);
        } else {
            setSecondaryReasonSelectedIndex(-1);
        }
    }, [secondaryReason, showSecondaryReasonDropdown, filteredSecondaryReasonSuggestions.length]);

    useEffect(() => {
        if (showSecondaryReasonDropdown && secondaryReasonSelectedIndex >= 0 && secondaryReasonListRef.current) {
            const selectedElem = secondaryReasonListRef.current.children[secondaryReasonSelectedIndex];
            if (selectedElem) selectedElem.scrollIntoView({ block: 'nearest' });
        }
    }, [secondaryReasonSelectedIndex, showSecondaryReasonDropdown]);

    const handleSecondaryReasonKeyDown = (e) => {
        if (!showSecondaryReasonDropdown) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setShowSecondaryReasonDropdown(true);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSecondaryReasonSelectedIndex(prev => (prev < filteredSecondaryReasonSuggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSecondaryReasonSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredSecondaryReasonSuggestions.length - 1));
        } else if (e.key === 'Enter') {
            if (secondaryReasonSelectedIndex >= 0 && secondaryReasonSelectedIndex < filteredSecondaryReasonSuggestions.length) {
                e.preventDefault();
                setSecondaryReason(filteredSecondaryReasonSuggestions[secondaryReasonSelectedIndex].reasonText);
                setShowSecondaryReasonDropdown(false);
                setTimeout(() => {
                    document.getElementById('btn-apply-secondary-discount')?.focus();
                }, 40);
            }
        } else if (e.key === 'Escape') {
            setShowSecondaryReasonDropdown(false);
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
                setIsDiscountExpanded(false);
                advanceFocusToSettlementOrPayment();
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
            setIsDiscountExpanded(false);
            // Notify parent to refresh snapshot
            if (onVisitUpdated) onVisitUpdated();
            advanceFocusToSettlementOrPayment();
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
            alert("Please select or enter an authorized discount reason from the dropdown.");
            return;
        }
        const effectiveReason = customDiscountReason.trim();
        if (!canPerformActions || !visitId) return;

        // Stage discount locally for instant reactive updates in UI & IntentPanel
        if (onStageDiscount) {
            onStageDiscount({
                mode: 'custom',
                type: customDiscountType === 'PERCENTAGE' ? 'Percentage' : 'Flat',
                value: val,
                reason: effectiveReason,
                userDismissed: true
            });
        }

        // If in draft visit or correction intent, state update is complete
        if (isDraftVisit || isCorrectionIntent) {
            setIsDiscountExpanded(false);
            advanceFocusToSettlementOrPayment();
            return;
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.applyDiscountToVisit(visitId, {
                mode: customDiscountType,
                customValue: val,
                reason: effectiveReason
            });
            setIsDiscountExpanded(false);
            if (onVisitUpdated) onVisitUpdated();
            advanceFocusToSettlementOrPayment();
        } catch (err) {
            console.error("Failed to apply custom discount", err);
            alert("Failed to apply custom discount: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Apply Secondary Concession / Owner Write-Off (Due Settlement)
    const handleApplySecondaryConcession = async () => {
        if (!visitId || !secondaryDiscountValue || Number(secondaryDiscountValue) <= 0) return;
        if (!secondaryReason?.trim()) {
            alert("A valid authorization reason is mandatory for secondary concession or write-off.");
            return;
        }

        const secVal = Number(secondaryDiscountValue);
        const addedSecondary = secondaryDiscountType === 'PERCENTAGE'
            ? Math.round(remainingDue * (Math.min(100, secVal) / 100))
            : Math.min(remainingDue, secVal);

        if (addedSecondary <= 0) return;

        // Cumulative discount: existing discount + secondary concession
        const currentDiscountAmt = billing?.discountAmount || 0;
        const totalNewDiscount = currentDiscountAmt + addedSecondary;

        setIsApplyingSecondary(true);
        setIsProcessing(true);
        try {
            const auditReason = `${secondaryReason.trim()} [Authorized Secondary Concession: -₹${addedSecondary}]`;
            await ReceptionApi.applyDiscountToVisit(visitId, {
                mode: 'Flat',
                customValue: totalNewDiscount,
                reason: auditReason
            });
            setIsSecondaryExpanded(false);
            setSecondaryDiscountValue('');
            if (onVisitUpdated) onVisitUpdated();
            advanceFocusToSettlementOrPayment();
        } catch (err) {
            console.error("Failed to apply secondary concession", err);
            alert("Failed to apply secondary concession: " + err.message);
        } finally {
            setIsApplyingSecondary(false);
            setIsProcessing(false);
        }
    };

    // COMMAND: Save B2B Partner Concession Rate (Prepaid)
    const handleSaveB2BDiscount = async (overrideValue, overrideType, shouldMinimize = false) => {
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
            if (shouldMinimize) setIsB2BExpanded(false);
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
            if (shouldMinimize) setIsB2BExpanded(false);
            if (onVisitUpdated) onVisitUpdated();

            // Seamless focus forwarding: advance to primary confirm button or next input if minimized
            if (shouldMinimize) {
                setTimeout(() => {
                    const target = document.getElementById('btn-unified-action') || document.getElementById('input-b2b-doctor-search');
                    target?.focus();
                }, 50);
            }
        } catch (err) {
            console.error("Failed to update B2B discount rate", err);
            alert("Failed to update B2B discount rate: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSwitchDiscountType = async (newType) => {
        setB2BDiscountType(newType);
        setIsB2BEditing(true);
        setIsB2BExpanded(true); // Never auto-minimize on type toggle!
        if (isCorrectionIntent && onStageDiscount) {
            onStageDiscount({
                type: newType === 'PERCENTAGE' ? 'Percentage' : 'Flat',
                value: Number(localB2BInput) || 0,
                reason: 'B2B Partner Concession',
                isB2B: true
            });
        } else if (visitId && localB2BInput && Number(localB2BInput) > 0) {
            await handleSaveB2BDiscount(localB2BInput, newType, false);
        }
    };

    // COMMAND: Remove Discount
    const handleRemoveDiscount = async () => {
        if (!canPerformActions || !visitId) return;

        // Preserve keyboard focus: return focus to Concession trigger after removal
        const refocusTrigger = () => {
            setTimeout(() => {
                const trigger = document.querySelector('[data-concession-trigger="true"]');
                if (trigger) trigger.focus();
            }, 60);
        };

        // Stage removal locally for instant reactive updates in UI & IntentPanel
        if (onStageDiscount) {
            onStageDiscount({ mode: 'remove', remove: true, userDismissed: true });
            setCustomDiscountReason('');
            setCustomDiscountValue('');
        }

        // CORRECTION INTENT (Staged Batch Edit)
        if (isCorrectionIntent) {
            if (!onStageDiscount) {
                setCorrectionState({
                    isOpen: true,
                    type: 'ChangeDiscount',
                    payload: { discountMasterId: null, code: "REMOVE" }, // Null implies remove
                    reason: ""
                });
            }
            refocusTrigger();
            return;
        }

        // Draft visits don't have persisted discount on server to delete
        if (isDraftVisit) {
            refocusTrigger();
            return;
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.removeDiscountFromVisit(visitId);
            setCustomDiscountReason('');
            setCustomDiscountValue('');
            // Notify parent to refresh snapshot
            if (onVisitUpdated) onVisitUpdated();
            refocusTrigger();
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

    // MULTI-PAYER DISPLAY LOGIC
    const isPrepaid = isPrepaidIntent || billingMode === 'PrepaidPartner' || billing?.paymentModel === 'PartnerCollects';
    const isInsurance = billingMode === 'Insurance';
    const isCorporate = billingMode === 'Corporate';
    const isDirectStandard = !isPrepaid && !isCorporate && !isInsurance;

    // Settlement Logic
    const tokenStr = snapshot?.visit?.token || snapshot?.visit?.visitToken || '';
    const isDraftVisit = !tokenStr || tokenStr.toUpperCase().startsWith('D-') || (snapshot?.visit?.status || '').toLowerCase() === 'draft';
    const totalPaid = isPrepaid ? 0 : (originalPaid || billing.totalPaid || 0);
    const netAmount = stagedNet !== undefined ? stagedNet : (billing.netAmount || 0);
    const effectiveDiff = settlementDiff !== undefined ? settlementDiff : (netAmount - totalPaid);
    const isSettlementNeeded = isCorrectionIntent && totalPaid > 0 && Math.abs(effectiveDiff) > 0.01;

    const totalNet = stagedNet !== undefined ? stagedNet : (billing?.netAmount || billing?.totalAmount || 0);
    const remainingDue = Math.max(0, totalNet - totalPaid);

    // Secondary Concession & Owner Write-Off is strictly for Direct/Standard patient bills
    // that were already finalized and kept under Partial Due or Full Due (remainingDue > 0).
    // It must NEVER appear during initial registration/intake, nor on Corporate B2B (Prepaid) or Insurance.
    const isExistingBilledDueVisit = isDirectStandard && 
        !isDraftVisit && 
        remainingDue > 0;

    // Enterprise-grade settlement term determination ('FULL' | 'PARTIAL' | 'FULL_DUE')
    const effectiveSettlementTerm = settlementTerm || (
        isPartialPayment 
            ? (customPaymentAmount === '0' ? 'FULL_DUE' : 'PARTIAL') 
            : 'FULL'
    );

    const hasDiscountApplied = isCorrectionIntent 
        ? (stagedDiscountAmt > 0 || (snapshot?.billing?.discountAmount > 0 && !stagedDiscount?.remove))
        : (billing?.discountAmount > 0 || stagedDiscountAmt > 0);

    let displayAmountToCollect = remainingDue;
    let amountLabel = billing?.paymentStatus === 'Paid' 
        ? "Total Bill Amount" 
        : ((!isDraftVisit || totalPaid > 0) ? "Remaining Due to Collect" : "Amount to Collect");

    if (isPrepaid) {
        displayAmountToCollect = 0;
        amountLabel = "Amount to Collect";
    } else if (isCorporate) {
        displayAmountToCollect = 0;
        amountLabel = "Billed to Corporate (₹0 at desk)";
    } else if (isInsurance) {
        displayAmountToCollect = snapshot?.visit?.insuranceCoPayAmount || 0;
        amountLabel = displayAmountToCollect > 0 ? "Patient Co-Pay to Collect" : "Cashless Claim (₹0 at desk)";
    }

    const currentGross = (stagedGross !== undefined)
        ? stagedGross
        : (billing?.grossAmount || 0);
    const hasTestsForBilling = currentGross > 0 || (snapshot?.tests?.length || 0) > 0;
    const isInitialIntake = isDraftVisit || isCorrectionIntent;
    const isDiscountExpanded = isInitialIntake && (userDiscountExpandedState !== null
        ? Boolean(userDiscountExpandedState)
        : Boolean(hasTestsForBilling && canPerformActions && !isPrepaid && !isCorporate && (billing?.paymentStatus === 'PendingPayment' || !billing?.paymentStatus)));
    const setIsDiscountExpanded = (val) => {
        if (!isInitialIntake) return;
        setUserDiscountExpandedState(typeof val === 'function' ? val(isDiscountExpanded) : val);
    };

    return (
        <div id="synos-financials-container" data-section="financials" className="flex flex-col space-y-2">
            {/* Header (Sticky at top when user scrolls down right column) */}
            <div className={cn(
                "sticky top-0 z-20 flex items-center justify-between py-1.5 transition-all duration-300",
                isPayerScrolledOut 
                    ? "bg-[#F5F8FA]/95 dark:bg-zinc-900/95 backdrop-blur-md pb-2 pt-1.5 border-b border-slate-200/80 dark:border-zinc-800/80 -mx-1 px-1 rounded-t-xl" 
                    : "bg-transparent"
            )}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-xs shrink-0", ui.indicator)}>
                        3
                    </div>
                    <h3 className={cn(ui.headerText, "shrink-0")}>Financials</h3>
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-synos-primary shrink-0" />}

                    {/* Animated Collapsing Payer Mode Badge (Box 2 in screenshot) */}
                    <div className={cn(
                        "transition-all duration-300 ease-out flex items-center min-w-0",
                        isPayerScrolledOut 
                            ? "opacity-100 scale-100 translate-x-0 ml-1.5 max-w-[280px]" 
                            : "opacity-0 scale-90 -translate-x-3 pointer-events-none max-w-0 overflow-hidden ml-0"
                    )}>
                        <button
                            type="button"
                            onClick={onScrollToPayerMode}
                            className={cn(
                                "group px-2.5 py-1 rounded-full text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer shrink-0",
                                isPrepaid
                                    ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                    : isInsurance
                                        ? "bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/70 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                        : "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            )}
                            title="Click to view or change Payer Mode"
                        >
                            {isPrepaid ? (
                                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            ) : isInsurance ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                            ) : (
                                <IndianRupee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[130px] sm:max-w-[170px]">
                                {isPrepaid ? 'Corporate B2B (Prepaid)' : isInsurance ? 'Insurance / TPA' : 'Direct / Standard'}
                            </span>
                            <span className="text-[10px] font-semibold opacity-60 group-hover:opacity-100 transition-opacity">
                                Change
                            </span>
                            <ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-y-0.5" />
                        </button>
                    </div>
                </div>

                {billing.paymentStatus && (
                    <div className={cn(
                        "px-3 py-1 rounded-full text-xs sm:text-sm font-bold border tracking-normal shrink-0",
                        billing.paymentStatus === 'Paid'
                            ? (isDark ? "bg-emerald-950/40 text-emerald-400 border-emerald-800" : "bg-[#EAF5F0] text-[#245E49] border-[#CFE8DD]")
                            : (billing.paymentStatus === 'PartialPayment' || billing.paymentStatus === 'PartialDue' || (totalPaid > 0 && remainingDue > 0))
                                ? (isDark ? "bg-amber-950/30 text-amber-300 border-amber-900/40" : "bg-[#FFF8EE] text-[#9A6B2F] border-[#F5E2C8]")
                                : (isDark ? "bg-amber-950/30 text-amber-300 border-amber-900/40" : "bg-[#FFF8EE] text-[#9A6B2F] border-[#F5E2C8]")
                    )}>
                        {billing.paymentStatus === 'Paid' 
                            ? 'Paid' 
                            : (billing.paymentStatus === 'PartialPayment' || billing.paymentStatus === 'PartialDue' || (totalPaid > 0 && remainingDue > 0))
                                ? 'Partial Due' 
                                : (!isDraftVisit && remainingDue > 0)
                                    ? 'Full Due'
                                    : billing.paymentStatus}
                    </div>
                )}
            </div>

            {/* SETTLEMENT ALERT (High Visibility) */}
            {isSettlementNeeded && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 duration-300 shrink-0",
                    settlementDiff > 0
                        ? (isDark ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-100" : "bg-emerald-50 border-emerald-200 text-emerald-800") // Refund
                        : (isDark ? "bg-red-950/40 border-red-500/50 text-red-100" : "bg-red-50 border-red-200 text-red-800") // Due
                )}>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-normal opacity-80">
                            {settlementDiff > 0 ? "Refund Due to Patient" : "Additional Payment Due"}
                        </span>
                        <span className="text-xs opacity-70">
                            {settlementDiff > 0 ? "Credit balance found after changes" : "Amount due after audit changes"}
                        </span>
                    </div>
                    <div className="text-xl font-black font-mono">
                        {settlementDiff > 0 ? "+" : ""}{settlementDiff > 0 ? settlementDiff.toLocaleString() : Math.abs(settlementDiff).toLocaleString()}
                    </div>
                </div>
            )}

            <div className={cn("relative space-y-3", ui.container)}>

                {/* 1. TOP REFERRAL & CONCESSION ACTION BAR */}
                {(() => {
                    const grossDisplay = (stagedGross !== undefined)
                        ? stagedGross
                        : (billing?.grossAmount || 0);

                    // Contextual B2B Discount Computation
                    const b2bInfo = extractB2BInfo(snapshot);
                    const effectiveB2BVal = isB2BEditing 
                        ? (Number(localB2BInput) || 0) 
                        : (stagedDiscount?.value !== undefined && stagedDiscount.isB2B 
                            ? Number(stagedDiscount.value) 
                            : (Number(localB2BInput) || b2bInfo.rawVal || 0));

                    let computedB2BDiscountAmt = 0;
                    if (b2bDiscountType === 'PERCENTAGE') {
                        const pct = Math.min(100, Math.max(0, effectiveB2BVal));
                        computedB2BDiscountAmt = Math.round((grossDisplay * (pct / 100)) * 100) / 100;
                    } else {
                        computedB2BDiscountAmt = Math.min(grossDisplay, Math.max(0, effectiveB2BVal));
                    }
                    const computedDoctorBill = Math.max(0, grossDisplay - computedB2BDiscountAmt);

                    const hasDiscountApplied = isPrepaid
                        ? computedB2BDiscountAmt > 0
                        : (stagedDiscount && !stagedDiscount.remove)
                            ? (stagedDiscountAmt > 0)
                            : (Boolean(billing?.appliedDiscount) && (billing?.discountAmount > 0));

                    const discountDisplay = isPrepaid
                        ? computedB2BDiscountAmt
                        : (stagedDiscount && !stagedDiscount.remove)
                            ? (stagedDiscountAmt || 0)
                            : (billing?.discountAmount || 0);

                    const taxDisplay = billing?.taxAmount || 0;

                    const discountReasonText = (stagedDiscount && !stagedDiscount.remove && !stagedDiscount.isB2B)
                        ? (stagedDiscount.reason || stagedDiscount.name || (stagedDiscount.type === 'Percentage' ? `${stagedDiscount.value}%` : `₹${stagedDiscount.value}`))
                        : (billing?.appliedDiscount?.reason || billing?.appliedDiscount?.name || '');

                    // Contextual label: "B2B Discount" for Corporate B2B (Prepaid), "Patient Discount" for Direct/Standard
                    const discountLabel = isPrepaid 
                        ? "B2B Discount" 
                        : (isDirectStandard ? "Patient Discount" : "Discount");

                    return (
                        <>
                            {/* Unified Financials Summary Card (Referral Header + 3-Column Ledger Grid) */}
                            <div className={cn(
                                "p-4 sm:p-5 rounded-2xl border space-y-3.5 shadow-xs transition-all",
                                isDark 
                                    ? "bg-zinc-850/90 border-zinc-750 text-zinc-100" 
                                    : "bg-gradient-to-b from-[#EDF4F9] via-[#E7F0F6] to-[#DEEBF3] border-[#C5D8E6] text-slate-900 shadow-[0_2px_8px_rgba(15,35,60,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]"
                            )}>
                                {/* Top Row: Referral Strip with Integrated Discount Button */}
                                <div className="flex items-center justify-between gap-3 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 shrink-0">Referral:</span>
                                        {snapshot?.billing?.referral?.secondaryPartner ? (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#3D9970] shadow-[0_0_6px_rgba(61,153,112,0.35)] shrink-0" />
                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                    {snapshot.billing.referral.secondaryPartner.displayName}
                                                </span>
                                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#E1F1E8] text-[#245E49] dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-[#BCE2CD] dark:border-emerald-800 shrink-0">
                                                    Secondary (RMP)
                                                </span>
                                                {snapshot?.billing?.referral?.partner && (
                                                    <span className="text-xs text-slate-500 dark:text-zinc-400 truncate hidden xl:inline">
                                                        (Main: {snapshot.billing.referral.partner.displayName})
                                                    </span>
                                                )}
                                            </div>
                                        ) : snapshot?.billing?.referral?.partner ? (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0" />
                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                    {snapshot.billing.referral.partner.displayName}
                                                </span>
                                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 shrink-0">
                                                    Doctor
                                                </span>
                                            </div>
                                        ) : (snapshot?.billing?.referral?.referrerText || '').trim().toUpperCase() === 'SELF' ? (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                    SELF
                                                </span>
                                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                                                    Direct Walk-in
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400 italic">No Referral Partner (Direct Walk-in)</span>
                                        )}
                                    </div>

                                    {/* Concession / Discount Trigger Button */}
                                    {canPerformActions && (
                                        isPrepaid ? (
                                            <button
                                                type="button"
                                                id="btn-edit-b2b-discount"
                                                data-financials-focus="true"
                                                tabIndex={0}
                                                onClick={() => {
                                                    setIsB2BExpanded(prev => !prev);
                                                    setIsB2BEditing(true);
                                                    if (!isB2BExpanded) {
                                                        setTimeout(() => {
                                                            document.getElementById('input-b2b-discount')?.focus();
                                                        }, 50);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Tab') {
                                                        if (!e.shiftKey) {
                                                            if (hasDiscountApplied) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                document.getElementById('btn-remove-b2b-discount')?.focus();
                                                            } else {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                const nextEl = isB2BExpanded
                                                                    ? (document.getElementById('btn-b2b-type-flat') || document.getElementById('input-b2b-discount'))
                                                                    : (document.getElementById('input-b2b-doctor-search') ||
                                                                       document.getElementById('btn-unified-action') ||
                                                                       document.getElementById('btn-confirm-visit'));
                                                                if (nextEl) nextEl.focus();
                                                            }
                                                        } else {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const outsourceBtn = document.getElementById('btn-outsource-test');
                                                            if (outsourceBtn && outsourceBtn.offsetParent !== null) outsourceBtn.focus();
                                                            else {
                                                                const allTestButtons = Array.from(document.querySelectorAll('[data-test-remove-btn="true"]'));
                                                                if (allTestButtons.length > 0) {
                                                                    allTestButtons[allTestButtons.length - 1].focus();
                                                                } else {
                                                                    const testInput = document.getElementById('input-test-search');
                                                                    if (testInput) testInput.focus();
                                                                }
                                                            }
                                                        }
                                                    }
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-2xs shrink-0 synos-focus-btn cursor-pointer",
                                                    isB2BExpanded
                                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-700 dark:border-zinc-600 shadow-xs"
                                                        : (hasDiscountApplied
                                                            ? "bg-[#EBF5EF] dark:bg-emerald-950/30 text-[#245E49] dark:text-emerald-300 border border-[#CCE8D8] dark:border-emerald-800 hover:bg-[#DFF0E6]"
                                                            : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-[#CCDCE8] dark:border-zinc-700 hover:bg-slate-50")
                                                )}
                                                title={hasDiscountApplied ? "Edit B2B Discount" : "+ B2B Discount"}
                                            >
                                                <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                                                <span>{hasDiscountApplied ? "Edit B2B Discount" : "+ B2B Discount"}</span>
                                                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isB2BExpanded && "rotate-180")} />
                                            </button>
                                        ) : (
                                            <button
                                                ref={concessionTriggerRef}
                                                data-concession-trigger="true"
                                                type="button"
                                                disabled={!isInitialIntake}
                                                onClick={() => {
                                                    if (isInitialIntake) {
                                                        setIsDiscountExpanded(prev => !prev);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (!isInitialIntake) return;
                                                    if (e.key === 'Tab') {
                                                        if (!e.shiftKey) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (hasDiscountApplied) {
                                                                const removeBtn = document.getElementById('btn-remove-discount');
                                                                if (removeBtn) {
                                                                    removeBtn.focus();
                                                                    return;
                                                                }
                                                            }
                                                            if (isDiscountExpanded) {
                                                                const flatToggle = document.getElementById('btn-std-type-flat') ||
                                                                                   document.getElementById('input-flat-concession');
                                                                if (flatToggle) {
                                                                    flatToggle.focus();
                                                                    return;
                                                                }
                                                            }
                                                            document.getElementById('btn-settlement-full')?.focus();
                                                        } else {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const outsourceBtn = document.getElementById('btn-outsource-test');
                                                            if (outsourceBtn && outsourceBtn.offsetParent !== null) outsourceBtn.focus();
                                                            else {
                                                                const allTestButtons = Array.from(document.querySelectorAll('[data-test-remove-btn="true"]'));
                                                                if (allTestButtons.length > 0) {
                                                                    allTestButtons[allTestButtons.length - 1].focus();
                                                                } else {
                                                                    const testInput = document.getElementById('input-test-search');
                                                                    if (testInput) testInput.focus();
                                                                }
                                                            }
                                                        }
                                                    }
                                                }}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border shadow-2xs shrink-0 synos-focus-btn",
                                                    !isInitialIntake
                                                        ? "opacity-45 cursor-not-allowed bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-700 select-none"
                                                        : (isDiscountExpanded
                                                            ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-700 dark:border-zinc-600 shadow-xs cursor-pointer"
                                                            : (hasDiscountApplied
                                                                ? "bg-[#EBF5EF] dark:bg-emerald-950/30 text-[#245E49] dark:text-emerald-300 border border-[#CCE8D8] dark:border-emerald-800 hover:bg-[#DFF0E6] cursor-pointer"
                                                                : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-[#CCDCE8] dark:border-zinc-700 hover:bg-slate-50 cursor-pointer"))
                                                )}
                                                title={!isInitialIntake ? "Initial registration discount is locked." : (hasDiscountApplied ? "Edit Discount" : "+ Discount")}
                                            >
                                                <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                                                <span>{hasDiscountApplied ? "Edit Discount" : "+ Discount"}</span>
                                                {isInitialIntake && (
                                                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isDiscountExpanded && "rotate-180")} />
                                                )}
                                            </button>
                                        )
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-200/70 dark:border-zinc-700/60" />

                                {/* 3-Column Financial Metrics with Subtle Vertical Separators */}
                                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-zinc-700/60 items-center">
                                    <div className="pr-3 sm:pr-5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                                            Total Amount
                                        </span>
                                        <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white block mt-1">
                                            ₹{grossDisplay.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="px-3 sm:px-5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                                            {discountLabel}
                                        </span>
                                        <div className="mt-1">
                                            {hasDiscountApplied ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={cn("font-mono font-black text-xl sm:text-2xl", isDark ? "text-emerald-400" : "text-[#1F6E54]")}>
                                                        -₹{discountDisplay.toLocaleString()}
                                                    </span>
                                                    {isPrepaid ? (
                                                        b2bDiscountType === 'PERCENTAGE' && effectiveB2BVal > 0 && (
                                                            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400">
                                                                ({effectiveB2BVal}%)
                                                            </span>
                                                        )
                                                    ) : (
                                                        discountReasonText && (
                                                            <span className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-semibold truncate max-w-[100px]" title={discountReasonText}>
                                                                ({discountReasonText})
                                                            </span>
                                                        )
                                                    )}
                                                    {canPerformActions && totalPaid === 0 && (
                                                        <button
                                                            type="button"
                                                            id={isPrepaid ? "btn-remove-b2b-discount" : "btn-remove-discount"}
                                                            data-remove-discount="true"
                                                            tabIndex={0}
                                                            onClick={isPrepaid ? () => {
                                                                handleSaveB2BDiscount(0, 'FLAT', false);
                                                                setLocalB2BInput('');
                                                                setIsB2BExpanded(false);
                                                            } : handleRemoveDiscount}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Tab') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (e.shiftKey) {
                                                                        if (isPrepaid) {
                                                                            document.getElementById('btn-edit-b2b-discount')?.focus();
                                                                        } else {
                                                                            const trigger = document.querySelector('[data-concession-trigger="true"]');
                                                                            if (trigger) trigger.focus();
                                                                        }
                                                                    } else {
                                                                        if (isPrepaid) {
                                                                            const b2bTarget = isB2BExpanded
                                                                                ? (document.getElementById('btn-b2b-type-flat') || document.getElementById('input-b2b-discount'))
                                                                                : (document.getElementById('input-b2b-doctor-search') ||
                                                                                   document.getElementById('btn-unified-action') ||
                                                                                   document.getElementById('btn-confirm-visit'));
                                                                            if (b2bTarget) b2bTarget.focus();
                                                                        } else {
                                                                            if (isDiscountExpanded) {
                                                                                const drawerTarget = document.getElementById('btn-std-type-flat') ||
                                                                                                     document.getElementById('input-flat-concession') ||
                                                                                                     document.getElementById('btn-minimize-concession');
                                                                                if (drawerTarget) drawerTarget.focus();
                                                                                else document.getElementById('btn-settlement-full')?.focus();
                                                                            } else {
                                                                                document.getElementById('btn-settlement-full')?.focus();
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            disabled={isProcessing}
                                                            className={cn(
                                                                "p-1 rounded-md border transition-all cursor-pointer synos-focus-btn flex items-center justify-center shrink-0",
                                                                isDark 
                                                                    ? "bg-zinc-800 border-zinc-700 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 focus:ring-2 focus:ring-rose-500" 
                                                                    : "bg-white border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-500 hover:text-rose-600 shadow-2xs focus:ring-2 focus:ring-rose-500"
                                                            )}
                                                            title={isPrepaid ? "Remove B2B Discount" : "Remove Discount"}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="font-mono font-bold text-xl sm:text-2xl text-slate-400 dark:text-zinc-500 block mt-1">—</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pl-3 sm:pl-5">
                                        {isPrepaid ? (
                                            <>
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                                                    Doctor Bill
                                                </span>
                                                <span className="font-mono font-black text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400 block mt-1">
                                                    ₹{computedDoctorBill.toLocaleString()}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                                                    GST / Tax
                                                </span>
                                                <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white block mt-1">
                                                    ₹{taxDisplay.toLocaleString()}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. HERO BANNER: Amount to Collect */}
                            <div className="rounded-2xl bg-[#E8F2FA] dark:bg-sky-950/30 border border-[#C5DCF0] dark:border-sky-800/60 p-4 sm:p-5 flex items-center justify-between shadow-[inset_0_1px_0_#FFFFFF]">
                                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                    {amountLabel}
                                </span>
                                <span className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tabular-nums font-mono">
                                    ₹{displayAmountToCollect.toLocaleString()}
                                </span>
                            </div>

                            {/* Net Payable / Revised Net (Only during correction mode with staged differences) */}
                            {isCorrectionIntent && displayAmountToCollect !== totalNet && (
                                <div className="flex justify-between items-center pt-1">
                                    <span className={cn(ui.rowLabel, "text-base font-bold text-slate-800 dark:text-zinc-200")}>
                                        Revised Net Amount
                                    </span>
                                    <span className={cn("font-mono text-2xl font-black text-slate-950 dark:text-white")}>
                                        ₹{(stagedNet !== undefined ? stagedNet : totalNet)?.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* Already Paid at Desk (Only during correction mode) */}
                            {isCorrectionIntent && totalPaid > 0 && (
                                <div className="flex justify-between items-center text-sm sm:text-base pt-1">
                                    <span className={cn(ui.rowLabel, "flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300")}>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Already Paid at Desk</span>
                                    </span>
                                    <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                                        - ₹{totalPaid.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* SECONDARY DISCOUNT & OWNER WRITE-OFF CARD */}
                            {isExistingBilledDueVisit && canPerformActions && (
                                !isSecondaryExpanded ? (
                                    <div className={cn(
                                        "p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between transition-all shadow-[0_2px_8px_rgba(232,122,56,0.04)] animate-in fade-in slide-in-from-top-1 duration-200",
                                        isDark ? "bg-amber-950/20 border-amber-800/40" : "bg-amber-50/70 border-amber-200/90"
                                    )}>
                                        <span className="text-sm font-bold text-amber-950 dark:text-amber-100">
                                            Secondary Discount / Write Off
                                        </span>
                                        <button
                                            type="button"
                                            id="btn-toggle-secondary-concession"
                                            onClick={() => setIsSecondaryExpanded(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/90 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-800 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                        >
                                            <span>+ Secondary Discount / Write Off</span>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "p-4 sm:p-5 rounded-2xl border space-y-4 transition-all shadow-[0_2px_8px_rgba(232,122,56,0.05)] animate-in fade-in slide-in-from-top-2 duration-200",
                                        isDark ? "bg-amber-950/20 border-amber-800/40" : "bg-amber-50/70 border-amber-200/90"
                                    )}>
                                        {/* Header Row: Title & Minimize Button */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">
                                                Secondary Discount / Write Off
                                            </span>
                                            <button
                                                type="button"
                                                id="btn-minimize-secondary-discount"
                                                onClick={() => setIsSecondaryExpanded(false)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-95 synos-focus-btn border border-slate-200/80 dark:border-zinc-700"
                                                title="Minimize Secondary Discount"
                                            >
                                                <span>Minimize</span>
                                                <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform duration-200" />
                                            </button>
                                        </div>

                                        {/* Amount Input Row with % Off / ₹ Flat Toggle (Mirrors Primary Discount Card Exactly) */}
                                        <div className="space-y-3.5 pt-1">
                                            <div className="flex items-center gap-3">
                                                <div className="inline-flex p-1 rounded-xl bg-slate-200/90 dark:bg-zinc-800 border border-slate-300/80 dark:border-zinc-700 shadow-2xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSecondaryDiscountType('PERCENTAGE')}
                                                        className={cn(
                                                            "px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer synos-focus-btn active:scale-95",
                                                            secondaryDiscountType === 'PERCENTAGE'
                                                                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        % Off
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSecondaryDiscountType('FLAT')}
                                                        className={cn(
                                                            "px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer synos-focus-btn active:scale-95",
                                                            secondaryDiscountType === 'FLAT'
                                                                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        ₹ Flat
                                                    </button>
                                                </div>

                                                <div className="relative flex-1">
                                                    <input
                                                        id="input-secondary-discount-val"
                                                        type="number"
                                                        min="0"
                                                        max={secondaryDiscountType === 'PERCENTAGE' ? 100 : remainingDue}
                                                        step={secondaryDiscountType === 'PERCENTAGE' ? '1' : '10'}
                                                        placeholder={secondaryDiscountType === 'PERCENTAGE' ? 'Write-off % (e.g. 50)' : `Write-off ₹ (max ${remainingDue})`}
                                                        value={secondaryDiscountValue}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            const clean = raw.startsWith('0') && raw.length > 1 && !raw.startsWith('0.') ? raw.replace(/^0+/, '') : raw;
                                                            setSecondaryDiscountValue(clean);
                                                        }}
                                                        className={cn("w-full h-12 px-4 rounded-xl text-base font-mono font-bold outline-none border synos-focus-input", ui.input)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Live Preview Banner */}
                                            {secondaryDiscountValue && Number(secondaryDiscountValue) > 0 && (() => {
                                                const secVal = Number(secondaryDiscountValue) || 0;
                                                const deduction = secondaryDiscountType === 'PERCENTAGE'
                                                    ? Math.round(remainingDue * (Math.min(100, secVal) / 100))
                                                    : Math.min(remainingDue, secVal);
                                                const calculatedNetDue = Math.max(0, remainingDue - deduction);
                                                return (
                                                    <div className="flex items-center justify-between text-sm px-4 py-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-900/50 text-amber-950 dark:text-amber-200 font-medium animate-in fade-in">
                                                        <span>
                                                            {secondaryDiscountType === 'PERCENTAGE' ? `${secVal}% off due ₹${remainingDue.toLocaleString()}` : `₹${secVal.toLocaleString()} Flat off due ₹${remainingDue.toLocaleString()}`}
                                                            {' → '}<strong>-₹{deduction.toLocaleString()}</strong>
                                                        </span>
                                                        <span>
                                                            Revised Due: <strong className="font-bold text-emerald-700 dark:text-emerald-400 text-base">₹{calculatedNetDue.toLocaleString()}</strong> {calculatedNetDue === 0 && "(Fully Settled)"}
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            {/* Reason Selection Row + Apply Button (Exact Mirror of Primary Discount) */}
                                            <div className="space-y-2 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">
                                                        Discount Reason / Authority
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowSecondaryReasonDropdown(false);
                                                            if (onOpenModal) onOpenModal('discountReason');
                                                        }}
                                                        className="text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
                                                        title="Add new standard preset reason"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Reason
                                                    </button>
                                                </div>

                                                {/* Native Searchable Dropdown Combobox */}
                                                <div className="flex items-center gap-2.5">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search or Select Reason (e.g. Lab Owner Discretionary Concession)..."
                                                            value={secondaryReason}
                                                            onFocus={() => setShowSecondaryReasonDropdown(true)}
                                                            onChange={(e) => {
                                                                setSecondaryReason(e.target.value);
                                                                setShowSecondaryReasonDropdown(true);
                                                            }}
                                                            onKeyDown={handleSecondaryReasonKeyDown}
                                                            onBlur={() => {
                                                                setTimeout(() => {
                                                                    setShowSecondaryReasonDropdown(false);
                                                                }, 200);
                                                            }}
                                                            style={{ paddingLeft: '2.75rem', paddingRight: '2.25rem' }}
                                                            className={cn(ui.input, "w-full h-12 rounded-xl text-base font-medium outline-none border transition-all")}
                                                        />
                                                        {secondaryReason ? (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setSecondaryReason('');
                                                                    setShowSecondaryReasonDropdown(true);
                                                                }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                                                title="Clear reason"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setShowSecondaryReasonDropdown(prev => !prev);
                                                                }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                                            >
                                                                <ChevronDown className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {/* Suggestions Floating Overlay */}
                                                        {showSecondaryReasonDropdown && (
                                                            <div
                                                                ref={secondaryReasonListRef}
                                                                className={cn(
                                                                    "absolute top-full left-0 right-0 mt-1.5 rounded-xl p-1 shadow-xl z-50 border overflow-y-auto space-y-1 backdrop-blur-md max-h-52",
                                                                    isDark ? "bg-zinc-900/95 border-zinc-700/60 shadow-black/50 text-zinc-200" : "bg-white/95 border-slate-200/90 shadow-slate-900/10 text-slate-900"
                                                                )}
                                                            >
                                                                {filteredSecondaryReasonSuggestions.map((r, idx) => {
                                                                    const isSelected = idx === secondaryReasonSelectedIndex;
                                                                    return (
                                                                        <button
                                                                            key={r.reasonText + idx}
                                                                            type="button"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                setSecondaryReason(r.reasonText);
                                                                                setShowSecondaryReasonDropdown(false);
                                                                            }}
                                                                            className={cn(
                                                                                "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                                                                                isSelected
                                                                                    ? (isDark ? "bg-zinc-800 text-white font-bold" : "bg-amber-100 text-amber-950 font-bold")
                                                                                    : (isDark ? "hover:bg-zinc-800/70" : "hover:bg-amber-50")
                                                                            )}
                                                                        >
                                                                            <span className="truncate text-xs font-semibold">{r.reasonText}</span>
                                                                            {r.category && (
                                                                                <span className={cn(
                                                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ml-2",
                                                                                    isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500"
                                                                                )}>
                                                                                    {r.category}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        id="btn-apply-secondary-discount"
                                                        disabled={!secondaryDiscountValue || Number(secondaryDiscountValue) <= 0 || !secondaryReason?.trim() || isApplyingSecondary || isProcessing}
                                                        onClick={handleApplySecondaryConcession}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                advanceFocusToSettlementOrPayment();
                                                            }
                                                        }}
                                                        className="h-12 px-5 rounded-xl bg-[#E87A38] hover:bg-[#D96B29] text-white text-sm font-bold disabled:opacity-50 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 synos-focus-btn"
                                                    >
                                                        {isApplyingSecondary ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* 4. EXPANDABLE CONCESSION EDITOR (Doctor Standard Mode - 2x2 Grid) */}
                            {isDiscountExpanded && isInitialIntake && canPerformActions && !isPrepaid && (() => {
                                const gross = billing?.grossAmount || stagedGross || 0;
                                const val = Number(customDiscountValue) || 0;
                                let calculatedDiscount = 0;
                                if (customDiscountType === 'PERCENTAGE') {
                                    const pct = Math.min(100, Math.max(0, val));
                                    calculatedDiscount = Math.round((gross * (pct / 100)) * 100) / 100;
                                } else {
                                    calculatedDiscount = Math.min(gross, Math.max(0, val));
                                }
                                const calculatedNet = Math.max(0, gross - calculatedDiscount);

                                return (
                                    <div ref={concessionEditorRef} className={cn(
                                        "p-3.5 sm:p-4 rounded-2xl border space-y-3 shadow-xs transition-all duration-200 animate-in fade-in slide-in-from-top-2",
                                        isDark 
                                            ? "bg-zinc-850/90 border-zinc-750 text-zinc-100" 
                                            : "bg-gradient-to-b from-[#EDF4F9] via-[#E7F0F6] to-[#DEEBF3] border-[#C5D8E6] text-slate-900 shadow-[0_2px_8px_rgba(15,35,60,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]"
                                    )}>
                                        {/* Header: Tag Icon + Title + Mode Switcher + Minimize Button */}
                                        <div className="flex items-center justify-between pb-0.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shrink-0 shadow-2xs">
                                                    <Tag className="w-4 h-4" />
                                                </div>
                                                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                    Doctor Discount
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Preset Code vs Custom % / Flat */}
                                                <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-zinc-800 border border-slate-300/70 dark:border-zinc-700 shadow-2xs">
                                                    <button
                                                        type="button"
                                                        id="btn-discount-mode-preset"
                                                        onClick={() => setDiscountInputMode('catalog')}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab') {
                                                                if (!e.shiftKey) {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    document.getElementById('btn-discount-mode-custom')?.focus();
                                                                } else {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    document.getElementById('btn-minimize-concession')?.focus();
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer synos-focus-btn",
                                                            discountInputMode === 'catalog'
                                                                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        Preset Code
                                                    </button>
                                                    <button
                                                        type="button"
                                                        id="btn-discount-mode-custom"
                                                        onClick={() => setDiscountInputMode('custom')}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab') {
                                                                if (!e.shiftKey) {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    document.getElementById('btn-std-type-flat')?.focus();
                                                                } else {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    document.getElementById('btn-discount-mode-preset')?.focus();
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer synos-focus-btn",
                                                            discountInputMode === 'custom'
                                                                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        Custom % / Flat
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    id="btn-minimize-concession"
                                                    onClick={() => setIsDiscountExpanded(false)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Tab') {
                                                            if (e.shiftKey) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (hasDiscountApplied) {
                                                                    document.getElementById('btn-remove-discount')?.focus();
                                                                } else {
                                                                    const trigger = document.getElementById('btn-discount-header-toggle') || document.querySelector('[data-concession-trigger="true"]');
                                                                    if (trigger) trigger.focus();
                                                                }
                                                            } else {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                document.getElementById('btn-discount-mode-preset')?.focus();
                                                            }
                                                        }
                                                    }}
                                                    className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-700/60 cursor-pointer transition-all synos-focus-btn"
                                                    title="Minimize Discount"
                                                >
                                                    <span>Minimize</span>
                                                    <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                                </button>
                                            </div>
                                        </div>

                                        {discountInputMode === 'catalog' ? (
                                            <select
                                                className={cn("w-full h-12 rounded-xl px-4 outline-none transition-colors disabled:opacity-50 text-base font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer border", ui.input)}
                                                disabled={isProcessing}
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value) handleApplyDiscount(e.target.value);
                                                }}
                                            >
                                                <option value="" disabled className="text-slate-500">
                                                    {billing.appliedDiscount ? "Replace Discount from Master..." : "Select Master Discount Code..."}
                                                </option>
                                                {discountCatalog.map(discount => (
                                                    <option key={discount.code} value={discount.code} className={isDark ? "bg-zinc-900" : "bg-white"}>
                                                        {discount.name} ({discount.code}) — {discount.type === 0 || discount.type === 'Percentage' ? `${discount.value}%` : `₹${discount.value}`}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* 2x2 Grid Layout */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {/* Tile 1 (Top-Left): Full-width Segmented Toggle Pill */}
                                                    <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-800/60 p-1 flex items-stretch h-14 shadow-2xs">
                                                        <button
                                                            type="button"
                                                            id="btn-std-type-flat"
                                                            onClick={() => setCustomDiscountType('FLAT')}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Tab') {
                                                                    if (!e.shiftKey) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        document.getElementById('btn-std-type-percent')?.focus();
                                                                    } else {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        document.getElementById('btn-discount-mode-custom')?.focus();
                                                                    }
                                                                }
                                                            }}
                                                            className={cn(
                                                                "rounded-xl font-black text-base sm:text-lg flex items-center justify-center flex-1 cursor-pointer transition-all synos-focus-btn",
                                                                customDiscountType === 'FLAT'
                                                                    ? "bg-[#DCEBFF] dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-[#0D6EFD] dark:text-blue-400 shadow-2xs"
                                                                    : "text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            Flat (₹)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            id="btn-std-type-percent"
                                                            onClick={() => setCustomDiscountType('PERCENTAGE')}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Tab') {
                                                                    if (!e.shiftKey) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        document.getElementById('input-flat-concession')?.focus();
                                                                    } else {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        document.getElementById('btn-std-type-flat')?.focus();
                                                                    }
                                                                }
                                                            }}
                                                            className={cn(
                                                                "rounded-xl font-black text-base sm:text-lg flex items-center justify-center flex-1 cursor-pointer transition-all synos-focus-btn",
                                                                customDiscountType === 'PERCENTAGE'
                                                                    ? "bg-[#DCEBFF] dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-[#0D6EFD] dark:text-blue-400 shadow-2xs"
                                                                    : "text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            % Off
                                                        </button>
                                                    </div>

                                                    {/* Tile 2 (Top-Right): Full-width Input Box */}
                                                    <div className="h-14 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center px-4 shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                                        <span className="text-xl font-bold text-slate-500 dark:text-zinc-400 select-none">
                                                            {customDiscountType === 'FLAT' ? '₹' : '%'}
                                                        </span>
                                                        <div className="w-[1.5px] h-6 bg-slate-200 dark:bg-zinc-700 mx-3.5 shrink-0" />
                                                        <input
                                                            id="input-flat-concession"
                                                            data-financials-focus="true"
                                                            type="number"
                                                            min="0"
                                                            max={customDiscountType === 'PERCENTAGE' ? 100 : (gross || 100000)}
                                                            value={customDiscountValue}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => {
                                                                const raw = e.target.value;
                                                                const clean = raw.startsWith('0') && raw.length > 1 && !raw.startsWith('0.') ? raw.replace(/^0+/, '') : raw;
                                                                setCustomDiscountValue(clean);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (customDiscountReason && customDiscountReason.trim()) {
                                                                        handleApplyCustomDiscount();
                                                                    } else {
                                                                        document.getElementById('input-discount-reason')?.focus();
                                                                    }
                                                                } else if (e.key === 'Tab') {
                                                                    if (!e.shiftKey) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        document.getElementById('input-discount-reason')?.focus();
                                                                    } else {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        const toggleBtn = document.getElementById('btn-std-type-percent') ||
                                                                                          document.getElementById('btn-std-type-flat') ||
                                                                                          document.getElementById('btn-minimize-concession');
                                                                        if (toggleBtn) toggleBtn.focus();
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full h-full bg-transparent border-0 outline-none font-mono font-black text-2xl text-slate-900 dark:text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none synos-focus-input"
                                                            placeholder="0"
                                                        />
                                                    </div>

                                                    {/* Tile 3 (Bottom-Left): Total Amount */}
                                                    <div className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/30 p-3 sm:p-3.5 flex items-center gap-3.5 shadow-2xs h-16">
                                                        <div className="w-11 h-11 rounded-2xl bg-[#E8F1FC] dark:bg-blue-950/40 text-[#0D6EFD] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 shadow-2xs">
                                                            <FlaskConical className="w-6 h-6 stroke-[2]" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 leading-tight">
                                                                Total Amount
                                                            </span>
                                                            <span className="font-mono font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight leading-tight mt-0.5">
                                                                ₹{gross.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Tile 4 (Bottom-Right): Patient Bill */}
                                                    <div className="rounded-2xl border border-[#CDEED9] dark:border-emerald-800/60 bg-[#F2FAF5] dark:bg-emerald-950/30 p-3 sm:p-3.5 flex items-center gap-3.5 shadow-2xs h-16">
                                                        <div className="w-11 h-11 rounded-2xl bg-[#DDF4E6] dark:bg-emerald-900/40 text-[#00A859] dark:text-emerald-400 border border-[#C6ECD2] dark:border-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                                                            <Stethoscope className="w-6 h-6 stroke-[2]" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs font-bold text-[#008744] dark:text-emerald-300 leading-tight">
                                                                Patient Bill
                                                            </span>
                                                            <span className="font-mono font-black text-2xl sm:text-3xl text-[#00A859] dark:text-emerald-400 tracking-tight leading-tight mt-0.5">
                                                                ₹{calculatedNet.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Discount Reason / Authority */}
                                                <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
                                                            Discount Reason / Authority
                                                        </label>
                                                        <button
                                                            type="button"
                                                            id="btn-add-discount-reason"
                                                            onClick={() => {
                                                                setShowReasonDropdown(false);
                                                                if (onOpenModal) onOpenModal('discountReason');
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Tab') {
                                                                    if (!e.shiftKey) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        document.getElementById('btn-apply-custom-discount')?.focus();
                                                                    } else {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        document.getElementById('input-discount-reason')?.focus();
                                                                    }
                                                                }
                                                            }}
                                                            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors synos-focus-btn"
                                                            title="Add new standard preset reason to master"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Add Reason
                                                        </button>
                                                    </div>

                                                    {/* 70/30 Split Row: Left 70% Reason Dropdown, Right 30% Save Button */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-[70%] shrink-0">
                                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                            <input
                                                                id="input-discount-reason"
                                                                type="text"
                                                                placeholder="Search or Select Reason (e.g. Dr. DVR, Doctor Recommendation)..."
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
                                                                style={{ paddingLeft: '2.5rem', paddingRight: '2.25rem' }}
                                                                className={cn(ui.input, "w-full h-12 rounded-xl text-sm font-medium outline-none border transition-all")}
                                                            />
                                                            {customDiscountReason ? (
                                                                <button
                                                                    type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setCustomDiscountReason('');
                                                                        setShowReasonDropdown(true);
                                                                    }}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                                                    title="Clear reason"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setShowReasonDropdown(prev => !prev);
                                                                    }}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                                                >
                                                                    <ChevronDown className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {/* Native Suggestions Floating Overlay */}
                                                            {showReasonDropdown && (
                                                                <div
                                                                    ref={reasonListRef}
                                                                    className={cn(
                                                                        "absolute top-full left-0 right-0 mt-1.5 rounded-xl p-1 shadow-xl z-50 border overflow-y-auto space-y-1 backdrop-blur-md max-h-52",
                                                                        isDark ? "bg-zinc-900/95 border-zinc-700/60 shadow-black/50 text-zinc-200" : "bg-white/95 border-slate-200/90 shadow-slate-900/10 text-slate-900"
                                                                    )}
                                                                >
                                                                    {filteredReasonSuggestions.length === 0 ? (
                                                                        <div className="px-3 py-2 text-xs text-slate-400 italic">
                                                                            No matching preset. You can still apply as custom note.
                                                                        </div>
                                                                    ) : (
                                                                        filteredReasonSuggestions.map((r, idx) => {
                                                                            const isSelected = idx === reasonSelectedIndex;
                                                                            return (
                                                                                <button
                                                                                    key={r.discountReasonId}
                                                                                    type="button"
                                                                                    onMouseEnter={() => setReasonSelectedIndex(idx)}
                                                                                    onMouseDown={(e) => {
                                                                                        e.preventDefault();
                                                                                        setCustomDiscountReason(r.reasonText);
                                                                                        setShowReasonDropdown(false);
                                                                                        setTimeout(() => {
                                                                                            document.getElementById('btn-apply-custom-discount')?.focus();
                                                                                        }, 40);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "w-full text-left px-3 py-2 rounded-lg transition-all duration-150 text-xs flex items-center justify-between cursor-pointer",
                                                                                        isSelected
                                                                                            ? (isDark 
                                                                                                ? "bg-blue-500/15 border border-blue-400/40 text-white font-bold shadow-xs scale-[0.99]" 
                                                                                                : "bg-blue-50/90 border border-blue-400/50 text-blue-900 font-bold shadow-xs scale-[0.99]")
                                                                                            : (isDark 
                                                                                                ? "hover:bg-zinc-800/70 border border-transparent text-zinc-300 hover:text-white" 
                                                                                                : "hover:bg-slate-50 border border-transparent text-slate-700 hover:text-slate-900")
                                                                                    )}
                                                                                >
                                                                                    <span className="truncate text-xs font-semibold">{r.reasonText}</span>
                                                                                    {r.category && (
                                                                                        <span className={cn(
                                                                                            "text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ml-2",
                                                                                            isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500"
                                                                                        )}>
                                                                                            {r.category}
                                                                                        </span>
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })
                                                                    )}

                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            setShowReasonDropdown(false);
                                                                            if (onOpenModal) onOpenModal('discountReason');
                                                                        }}
                                                                        className={cn(
                                                                            "w-full text-left px-3 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border-t",
                                                                            isDark ? "border-zinc-800 text-synos-primary hover:bg-zinc-800/60" : "border-slate-100 text-synos-primary hover:bg-blue-50/50"
                                                                        )}
                                                                    >
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                        <span>+ Add New Reason...</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Right 30%: Solid Blue Save Button */}
                                                        <div className="w-[30%] shrink-0">
                                                            <button
                                                                type="button"
                                                                tabIndex={0}
                                                                id="btn-apply-custom-discount"
                                                                disabled={!customDiscountValue || Number(customDiscountValue) <= 0 || !customDiscountReason?.trim() || isProcessing}
                                                                onClick={handleApplyCustomDiscount}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Tab') {
                                                                        if (!e.shiftKey) {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            advanceFocusToSettlementOrPayment();
                                                                        } else {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            document.getElementById('btn-add-discount-reason')?.focus();
                                                                        }
                                                                    }
                                                                }}
                                                                className="h-12 w-full rounded-xl bg-[#0D6EFD] hover:bg-blue-600 disabled:opacity-50 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all synos-focus-btn"
                                                            >
                                                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </>
                    );
                })()}

                {/* LIVE RECONCILER CARD (Correction / Edit Mode Only - Only if diff exists) */}
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

                        if (b2bClaimDiff === 0) return null;

                        return (
                            <div className="p-2.5 rounded-xl border bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
                                <span className="font-bold text-indigo-900 dark:text-indigo-200">Doctor Bill Revision:</span>
                                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                                    {b2bClaimDiff > 0 ? `+₹${b2bClaimDiff.toLocaleString()}` : `-₹${Math.abs(b2bClaimDiff).toLocaleString()}`}
                                </span>
                            </div>
                        );
                    }

                    if (Math.abs(settlementDiff) < 0.01) return null;

                    return (
                        <div className={cn(
                            "p-3.5 rounded-xl border space-y-2.5 transition-all shadow-xs animate-in fade-in duration-200",
                            isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-200" : "bg-black/[0.04] border-black/5 text-zinc-900"
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
                                <div className="pt-1 space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">Refund Mode / Instrument</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {['Cash', 'UPI'].map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setPaymentMethod && setPaymentMethod(m)}
                                                className={cn(
                                                    "py-1 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                                                    paymentMethod === m 
                                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                                                        : "bg-white/70 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800"
                                                )}
                                            >
                                                {m === 'Cash' && <IndianRupee className="w-3 h-3" />}
                                                {m === 'UPI' && <Smartphone className="w-3 h-3" />}
                                                <span>{m === 'Cash' ? 'Physical Cash' : 'Digital (UPI)'}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-[11px] p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                                        <span className="font-bold text-xs">{paymentMethod === 'Cash' ? '💵' : '📱'}</span>
                                        <span>
                                            Refund will be disbursed via <strong>{paymentMethod === 'Cash' ? 'Cash from drawer' : 'Digital (UPI)'}</strong> upon confirmation.
                                        </span>
                                    </div>
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
                    const hasDiscountApplied = computedDiscountAmt > 0;

                    return (
                        <div className="space-y-3">
                            {/* B2B DISCOUNT (EXPANDED EDIT STATE - CHATGPT MATCHED 2x2 DESIGN) */}
                            {isB2BExpanded && (
                                <div className={cn(
                                    "p-3.5 sm:p-4 rounded-2xl border space-y-3 shadow-xs transition-all duration-200",
                                    isDark 
                                        ? "bg-zinc-850/90 border-zinc-750 text-zinc-100" 
                                        : "bg-gradient-to-b from-[#EDF4F9] via-[#E7F0F6] to-[#DEEBF3] border-[#C5D8E6] text-slate-900 shadow-[0_2px_8px_rgba(15,35,60,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]"
                                )}>
                                    {/* Header: Tag Icon + Title + Minimize Button */}
                                    <div className="flex items-center justify-between pb-0.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shrink-0 shadow-2xs">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                B2B Discount
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            id="btn-minimize-b2b-discount"
                                            onClick={() => {
                                                setIsB2BExpanded(false);
                                                setIsB2BEditing(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Tab') {
                                                    if (!e.shiftKey) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const flatBtn = document.getElementById('btn-b2b-type-flat') || document.getElementById('input-b2b-discount');
                                                        if (flatBtn) flatBtn.focus();
                                                    } else {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const outsourceBtn = document.getElementById('btn-outsource-test');
                                                        if (outsourceBtn && outsourceBtn.offsetParent !== null) {
                                                            outsourceBtn.focus();
                                                        } else {
                                                            const allTestButtons = Array.from(document.querySelectorAll('[data-test-remove-btn="true"]'));
                                                            if (allTestButtons.length > 0) {
                                                                allTestButtons[allTestButtons.length - 1].focus();
                                                            } else {
                                                                document.getElementById('input-test-search')?.focus();
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                            className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-700/60 cursor-pointer transition-all synos-focus-btn"
                                        >
                                            <span>Minimize</span>
                                            <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                        </button>
                                    </div>

                                    {/* 2x2 Grid Layout */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Tile 1 (Top-Left): Full-width Segmented Toggle Pill */}
                                        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-800/60 p-1 flex items-stretch h-14 shadow-2xs">
                                            <button
                                                type="button"
                                                id="btn-b2b-type-flat"
                                                onClick={() => handleSwitchDiscountType('FLAT')}
                                                className={cn(
                                                    "rounded-xl font-black text-base sm:text-lg flex items-center justify-center flex-1 cursor-pointer transition-all synos-focus-btn",
                                                    b2bDiscountType === 'FLAT'
                                                        ? "bg-[#DCEBFF] dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-[#0D6EFD] dark:text-blue-400 shadow-2xs"
                                                        : "text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                                                )}
                                            >
                                                Flat (₹)
                                            </button>
                                            <button
                                                type="button"
                                                id="btn-b2b-type-percent"
                                                onClick={() => handleSwitchDiscountType('PERCENTAGE')}
                                                className={cn(
                                                    "rounded-xl font-black text-base sm:text-lg flex items-center justify-center flex-1 cursor-pointer transition-all synos-focus-btn",
                                                    b2bDiscountType === 'PERCENTAGE'
                                                        ? "bg-[#DCEBFF] dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-[#0D6EFD] dark:text-blue-400 shadow-2xs"
                                                        : "text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                                                )}
                                            >
                                                % Off
                                            </button>
                                        </div>

                                        {/* Tile 2 (Top-Right): Full-width Input Box + Save Button */}
                                        <div className="flex items-center gap-2.5 h-14">
                                            <div className="flex-1 h-14 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center px-4 shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                                <span className="text-xl font-bold text-slate-500 dark:text-zinc-400 select-none">
                                                    {b2bDiscountType === 'FLAT' ? '₹' : '%'}
                                                </span>
                                                <div className="w-[1.5px] h-6 bg-slate-200 dark:bg-zinc-700 mx-3.5 shrink-0" />
                                                <input
                                                    id="input-b2b-discount"
                                                    data-financials-focus="true"
                                                    type="number"
                                                    min="0"
                                                    max={b2bDiscountType === 'PERCENTAGE' ? 100 : (grossTariff || 100000)}
                                                    value={isB2BEditing ? localB2BInput : (isCorrectionIntent && stagedDiscount?.value !== undefined && stagedDiscount.isB2B ? String(stagedDiscount.value) : localB2BInput)}
                                                    readOnly={!canPerformActions || isProcessing}
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
                                                            handleSaveB2BDiscount(e.target.value, b2bDiscountType, true);
                                                            setIsB2BEditing(false);
                                                            setTimeout(() => {
                                                                document.getElementById('btn-edit-b2b-discount')?.focus();
                                                            }, 50);
                                                        } else if (e.key === 'Tab') {
                                                            if (!e.shiftKey) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                document.getElementById('btn-save-b2b-discount')?.focus();
                                                            } else {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                const toggleBtn = document.getElementById('btn-b2b-type-percent') ||
                                                                                  document.getElementById('btn-b2b-type-flat') ||
                                                                                  document.getElementById('btn-minimize-b2b-discount');
                                                                if (toggleBtn) toggleBtn.focus();
                                                            }
                                                        }
                                                    }}
                                                    className="w-full h-full bg-transparent border-0 outline-none font-mono font-black text-2xl text-slate-900 dark:text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none synos-focus-input"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                tabIndex={0}
                                                id="btn-save-b2b-discount"
                                                onClick={() => handleSaveB2BDiscount(localB2BInput, b2bDiscountType, false)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Tab') {
                                                        if (!e.shiftKey) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const docInput = document.getElementById('input-b2b-doctor-search') ||
                                                                            document.getElementById('btn-unified-action') ||
                                                                            document.getElementById('btn-confirm-visit');
                                                            if (docInput) docInput.focus();
                                                        } else {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            document.getElementById('input-b2b-discount')?.focus();
                                                        }
                                                    }
                                                }}
                                                className="h-14 px-6 sm:px-7 rounded-2xl bg-[#0D6EFD] hover:bg-blue-600 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all synos-focus-btn shrink-0"
                                            >
                                                Save
                                            </button>
                                        </div>

                                        {/* Tile 3 (Bottom-Left): Standard Lab Tariff */}
                                        <div className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/30 p-3 sm:p-3.5 flex items-center gap-3.5 shadow-2xs h-16">
                                            <div className="w-11 h-11 rounded-2xl bg-[#E8F1FC] dark:bg-blue-950/40 text-[#0D6EFD] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 shadow-2xs">
                                                <FlaskConical className="w-6 h-6 stroke-[2]" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 leading-tight">
                                                    Lab Tariff
                                                </span>
                                                <span className="font-mono font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight leading-tight mt-0.5">
                                                    ₹{grossTariff.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Tile 4 (Bottom-Right): Doctor Bill (Net Claim) */}
                                        <div className="rounded-2xl border border-[#CDEED9] dark:border-emerald-800/60 bg-[#F2FAF5] dark:bg-emerald-950/30 p-3 sm:p-3.5 flex items-center gap-3.5 shadow-2xs h-16">
                                            <div className="w-11 h-11 rounded-2xl bg-[#DDF4E6] dark:bg-emerald-900/40 text-[#00A859] dark:text-emerald-400 border border-[#C6ECD2] dark:border-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                                                <Stethoscope className="w-6 h-6 stroke-[2]" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-[#008744] dark:text-emerald-300 leading-tight">
                                                    Doctor Bill
                                                </span>
                                                <span className="font-mono font-black text-2xl sm:text-3xl text-[#00A859] dark:text-emerald-400 tracking-tight leading-tight mt-0.5">
                                                    ₹{computedNetClaim.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CARD 2: BILLED TO DOCTOR / CLINIC ACCOUNT (Standalone Overrule Card) */}
                            {(() => {
                                const primaryDoctor = snapshot?.billing?.referral?.partner || snapshot?.visit?.referralPartner;
                                const overriddenDoctor = snapshot?.billing?.referral?.secondaryPartner || snapshot?.visit?.secondaryReferralPartner;
                                const isSameAsPrimary = Boolean(overriddenDoctor && primaryDoctor && (
                                    (overriddenDoctor.referralPartnerId && (overriddenDoctor.referralPartnerId === primaryDoctor.referralPartnerId || overriddenDoctor.referralPartnerId === primaryDoctor.id)) ||
                                    (overriddenDoctor.id && (overriddenDoctor.id === primaryDoctor.id || overriddenDoctor.id === primaryDoctor.referralPartnerId)) ||
                                    ((overriddenDoctor.displayName || overriddenDoctor.name) && (overriddenDoctor.displayName || overriddenDoctor.name).trim().toLowerCase() === (primaryDoctor.displayName || primaryDoctor.name).trim().toLowerCase())
                                ));
                                const isOverridden = Boolean(overriddenDoctor) && !isSameAsPrimary;

                                return (
                                    <div className={cn(
                                        "p-4 sm:p-5 rounded-2xl border space-y-3.5 transition-all shadow-sm",
                                        isOverridden
                                            ? (isDark ? "bg-amber-950/20 border-amber-500/40" : "bg-amber-50/70 border-amber-200")
                                            : (isDark 
                                                ? "bg-zinc-850/90 border-zinc-750 text-zinc-100" 
                                                : "bg-gradient-to-b from-[#EDF4F9] via-[#E7F0F6] to-[#DEEBF3] border-[#C5D8E6] text-slate-900 shadow-[0_2px_8px_rgba(15,35,60,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]")
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                                    Billed to Doctor Account
                                                </span>
                                                {isOverridden && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold border border-amber-500/30">
                                                        Overruled
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                id="btn-add-b2b-doctor"
                                                onClick={() => {
                                                    setShowB2BDoctorDropdown(false);
                                                    if (onOpenModal) onOpenModal('b2bBillingDoctor');
                                                }}
                                                disabled={!canPerformActions || isProcessing}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 synos-focus-btn"
                                                title="Register & bill a new doctor profile"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Doctor
                                            </button>
                                        </div>

                                        {isOverridden && (
                                            <div 
                                                id="card-overridden-b2b-doctor"
                                                tabIndex={0}
                                                className={cn(
                                                    "flex items-center gap-2 font-semibold p-3 rounded-xl border cursor-pointer synos-focus-card focus:outline-none animate-in fade-in duration-200",
                                                    isDark ? "bg-zinc-800/60 border-zinc-700/60 text-zinc-100" : "bg-white border border-[#D5E2EC] text-slate-900 shadow-[0_1px_3px_rgba(15,35,60,0.04)]"
                                                )}
                                            >
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate tracking-normal text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                                        {overriddenDoctor.displayName || overriddenDoctor.name}
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                                                        Primary Consultant • Receivables ledger will be billed to this doctor
                                                    </div>
                                                </div>
                                                {canPerformActions && (
                                                    <button
                                                        type="button"
                                                        id="btn-remove-overrule-doctor"
                                                        onClick={handleClearB2BOverrideDoctor}
                                                        disabled={isProcessing}
                                                        tabIndex={0}
                                                        className="ml-auto text-zinc-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer synos-focus-btn"
                                                        title="Remove Overrule Doctor"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Overrule Search Input */}
                                        <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                                                    <input
                                                        id="input-b2b-doctor-search"
                                                        type="text"
                                                        placeholder="Search doctor to overrule default account..."
                                                        value={b2bDoctorSearch}
                                                        onFocus={() => setShowB2BDoctorDropdown(true)}
                                                        onChange={(e) => {
                                                            setB2BDoctorSearch(e.target.value);
                                                            setShowB2BDoctorDropdown(true);
                                                        }}
                                                        onKeyDown={handleB2BDoctorKeyDown}
                                                        onBlur={() => {
                                                            setTimeout(() => setShowB2BDoctorDropdown(false), 200);
                                                        }}
                                                        disabled={!canPerformActions || isProcessing}
                                                        className={cn("w-full h-8 pl-8 pr-7 rounded-md text-xs font-medium outline-none border transition-all synos-focus-input", ui.input)}
                                                    />
                                                    {b2bDoctorSearch ? (
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setB2BDoctorSearch('');
                                                                setShowB2BDoctorDropdown(true);
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setShowB2BDoctorDropdown(prev => !prev);
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Suggestions Overlay */}
                                                    {showB2BDoctorDropdown && (
                                                        <div
                                                            ref={b2bDoctorListRef}
                                                            className={cn(
                                                                "absolute top-full left-0 right-0 mt-1.5 rounded-xl p-1 shadow-xl z-50 border overflow-y-auto space-y-1 backdrop-blur-md max-h-52",
                                                                isDark ? "bg-zinc-900/95 border-zinc-700/60 shadow-black/50 text-zinc-200" : "bg-white/95 border-zinc-200/90 shadow-zinc-900/10 text-zinc-900"
                                                            )}
                                                        >
                                                            {filteredB2BDoctors.length === 0 ? (
                                                                <div className="px-3 py-2 text-[11px] text-zinc-400 italic">
                                                                    No matching doctor found. Click "+ Add Doctor" to create one.
                                                                </div>
                                                            ) : (
                                                                filteredB2BDoctors.map((doc, idx) => {
                                                                    const isSelected = idx === b2bDoctorSelectedIndex;
                                                                    return (
                                                                        <button
                                                                            key={doc.referralPartnerId || doc.id}
                                                                            type="button"
                                                                            onMouseEnter={() => setB2BDoctorSelectedIndex(idx)}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                handleApplyB2BOverrideDoctor(doc.referralPartnerId || doc.id);
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
                                                                            <span className="truncate text-xs font-semibold">{doc.name || doc.displayName}</span>
                                                                            <span className={cn(
                                                                                "text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ml-2",
                                                                                isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                                                                            )}>
                                                                                {doc.partnerType || 'Doctor'}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                );
                            })()}
                        </div>
                    );
                })()}



                {/* E. Payment Settlement Mode (Full vs Partial vs Full Due) & Amount Collected */}
                {displayAmountToCollect > 0 && !isPrepaid && !isCorporate && (billing?.paymentStatus === 'PendingPayment' || billing?.paymentStatus === 'PartialPayment') && !isCorrectionIntent && (
                    <div 
                        className="pt-2 animate-in fade-in space-y-3"
                        onFocusCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                        onPointerDownCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                    >
                        <div className="flex items-center justify-between">
                            <label className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">Settlement Terms</label>
                            {effectiveSettlementTerm === 'PARTIAL' && (
                                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border bg-[#FFF8EE] text-[#9A6B2F] dark:bg-amber-950/30 dark:text-amber-300 border-[#F5E2C8] dark:border-amber-900/40">
                                    Partial Due
                                </span>
                            )}
                            {effectiveSettlementTerm === 'FULL_DUE' && (
                                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border bg-[#FFF8EE] text-[#9A6B2F] dark:bg-amber-950/30 dark:text-amber-300 border-[#F5E2C8] dark:border-amber-900/40">
                                    Full Due
                                </span>
                            )}
                        </div>
                        
                        {/* Prominent segmented options: Full Settlement vs Partial vs Full Due */}
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                id="btn-settlement-full"
                                type="button"
                                onClick={() => {
                                    setSettlementTerm?.('FULL');
                                    setIsPartialPayment?.(false);
                                    setCustomPaymentAmount?.('');
                                    setTenderedAmount?.(String(displayAmountToCollect));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        if (e.shiftKey) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (isSecondaryExpanded) {
                                                document.getElementById('btn-apply-secondary-discount')?.focus();
                                            } else if (isExistingBilledDueVisit) {
                                                const secToggle = document.getElementById('btn-toggle-secondary-concession');
                                                if (secToggle) secToggle.focus();
                                                else {
                                                    const outsourceBtn = document.getElementById('btn-outsource-test');
                                                    if (outsourceBtn) outsourceBtn.focus();
                                                }
                                            } else if (isDiscountExpanded) {
                                                document.getElementById('btn-apply-custom-discount')?.focus();
                                            } else if (hasDiscountApplied) {
                                                const removeBtn = document.getElementById('btn-remove-discount');
                                                if (removeBtn) removeBtn.focus();
                                                else {
                                                    const trigger = document.getElementById('btn-discount-header-toggle') || document.querySelector('[data-concession-trigger="true"]');
                                                    if (trigger) trigger.focus();
                                                }
                                            } else {
                                                const trigger = document.getElementById('btn-discount-header-toggle') || document.querySelector('[data-concession-trigger="true"]');
                                                if (trigger) trigger.focus();
                                                else {
                                                    const outsourceBtn = document.getElementById('btn-outsource-test');
                                                    if (outsourceBtn) outsourceBtn.focus();
                                                }
                                            }
                                        } else {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            document.getElementById('btn-settlement-partial')?.focus();
                                        }
                                    }
                                }}
                                className={cn(
                                    "flex-1 h-12 sm:h-13 px-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border synos-focus-btn active:scale-95",
                                    effectiveSettlementTerm === 'FULL'
                                        ? "bg-[#39495E] text-white border-[#2F3D4E] shadow-sm"
                                        : "bg-[#EBF2F7] dark:bg-zinc-850 text-slate-800 dark:text-zinc-200 border-[#C5D8E6] dark:border-zinc-700 hover:bg-[#E2EDF4] shadow-2xs"
                                )}
                            >
                                {effectiveSettlementTerm === 'FULL' ? (
                                    <CircleDot className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-white" strokeWidth={2.5} />
                                ) : (
                                    <Circle className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-slate-500 dark:text-zinc-400" strokeWidth={2} />
                                )}
                                <span className="truncate">Full (₹{displayAmountToCollect.toLocaleString()})</span>
                            </button>

                            <button
                                id="btn-settlement-partial"
                                type="button"
                                onClick={() => {
                                    setSettlementTerm?.('PARTIAL');
                                    setIsPartialPayment?.(true);
                                    const targetAmt = (!customPaymentAmount || Number(customPaymentAmount) === 0)
                                        ? String(Math.round(displayAmountToCollect * 0.5))
                                        : customPaymentAmount;
                                    if (!customPaymentAmount || Number(customPaymentAmount) === 0) {
                                        setCustomPaymentAmount?.(targetAmt);
                                    }
                                    setTenderedAmount?.(targetAmt);
                                    setTimeout(() => {
                                        const inp = document.getElementById('input-partial-amount');
                                        if (inp) {
                                            inp.focus();
                                            inp.select();
                                        }
                                    }, 50);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        if (e.shiftKey) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            document.getElementById('btn-settlement-full')?.focus();
                                        } else {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            document.getElementById('btn-settlement-fulldue')?.focus();
                                        }
                                    }
                                }}
                                className={cn(
                                    "flex-1 h-12 sm:h-13 px-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border synos-focus-btn active:scale-95",
                                    effectiveSettlementTerm === 'PARTIAL'
                                        ? "bg-[#39495E] text-white border-[#2F3D4E] shadow-sm"
                                        : "bg-[#EBF2F7] dark:bg-zinc-850 text-slate-800 dark:text-zinc-200 border-[#C5D8E6] dark:border-zinc-700 hover:bg-[#E2EDF4] shadow-2xs"
                                )}
                            >
                                {effectiveSettlementTerm === 'PARTIAL' ? (
                                    <CircleDot className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-white" strokeWidth={2.5} />
                                ) : (
                                    <Circle className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-slate-500 dark:text-zinc-400" strokeWidth={2} />
                                )}
                                <span>Partial Due</span>
                            </button>

                            <button
                                id="btn-settlement-fulldue"
                                type="button"
                                onClick={() => {
                                    setSettlementTerm?.('FULL_DUE');
                                    setIsPartialPayment?.(true);
                                    setCustomPaymentAmount?.('0');
                                    setTenderedAmount?.('0');
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        if (e.shiftKey) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            document.getElementById('btn-settlement-partial')?.focus();
                                        } else {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (effectiveSettlementTerm === 'PARTIAL') {
                                                const partialInput = document.getElementById('input-partial-amount');
                                                if (partialInput && partialInput.offsetParent !== null) {
                                                    partialInput.focus();
                                                    return;
                                                }
                                            }
                                            if (effectiveSettlementTerm !== 'FULL_DUE') {
                                                const payCash = document.getElementById('btn-payment-cash') ||
                                                                document.querySelector('[data-payment-method="true"]');
                                                if (payCash) {
                                                    payCash.focus();
                                                    return;
                                                }
                                            }
                                            const actionBtn = document.getElementById('btn-delete-draft') ||
                                                              document.getElementById('btn-unified-action');
                                            if (actionBtn) actionBtn.focus();
                                        }
                                    }
                                }}
                                className={cn(
                                    "flex-1 h-12 sm:h-13 px-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border synos-focus-btn active:scale-95",
                                    effectiveSettlementTerm === 'FULL_DUE'
                                        ? "bg-[#39495E] text-white border-[#2F3D4E] shadow-sm"
                                        : "bg-[#EBF2F7] dark:bg-zinc-850 text-slate-800 dark:text-zinc-200 border-[#C5D8E6] dark:border-zinc-700 hover:bg-[#E2EDF4] shadow-2xs"
                                )}
                            >
                                {effectiveSettlementTerm === 'FULL_DUE' ? (
                                    <CircleDot className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-white" strokeWidth={2.5} />
                                ) : (
                                    <Circle className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-slate-500 dark:text-zinc-400" strokeWidth={2} />
                                )}
                                <span>Full Due</span>
                            </button>
                        </div>

                        {/* Partial Payment Amount Input & Quick Chips */}
                        {effectiveSettlementTerm === 'PARTIAL' && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-[#CCDCE8]/80 dark:border-zinc-700/80 shadow-[0_2px_8px_rgba(15,35,60,0.03)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">
                                        Amount Collected Now
                                    </span>
                                    <span className="font-mono text-xl font-black text-slate-950 dark:text-white">
                                        ₹{Number(customPaymentAmount || 0).toLocaleString()}
                                    </span>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">₹</span>
                                    <input
                                        id="input-partial-amount"
                                        type="number"
                                        min="1"
                                        max={displayAmountToCollect}
                                        value={customPaymentAmount ?? ''}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            if (raw === '') {
                                                setCustomPaymentAmount?.('');
                                                setTenderedAmount?.('');
                                                return;
                                            }
                                            const val = Math.min(displayAmountToCollect, Math.max(0, Number(raw)));
                                            setCustomPaymentAmount?.(String(val));
                                            setTenderedAmount?.(String(val));
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab') {
                                                if (e.shiftKey) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    document.getElementById('btn-settlement-fulldue')?.focus();
                                                } else {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const payCash = document.getElementById('btn-payment-cash') ||
                                                                    document.querySelector('[data-payment-method="true"]');
                                                    if (payCash) payCash.focus();
                                                    else {
                                                        const actionBtn = document.getElementById('btn-delete-draft') ||
                                                                          document.getElementById('btn-unified-action');
                                                        if (actionBtn) actionBtn.focus();
                                                    }
                                                }
                                            }
                                        }}
                                        placeholder={`1 - ${displayAmountToCollect}`}
                                        className={cn(
                                            "w-full h-12 !pl-9 !pr-4 rounded-xl text-base font-mono font-bold outline-none border transition-all synos-focus-input",
                                            ui.input
                                        )}
                                    />
                                </div>

                                {/* Quick selection chips */}
                                <div className="flex items-center gap-2">
                                    {[
                                        { label: '₹500', val: 500 },
                                        { label: '₹1,000', val: 1000 },
                                        { label: '50%', val: Math.round(displayAmountToCollect * 0.5) }
                                    ].filter(c => c.val > 0 && c.val < displayAmountToCollect).map((chip, idx) => {
                                        const isSelected = Number(customPaymentAmount) === chip.val;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setCustomPaymentAmount?.(String(chip.val));
                                                    setTenderedAmount?.(String(chip.val));
                                                }}
                                                className={cn(
                                                    "px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border shadow-2xs",
                                                    isSelected
                                                        ? "bg-[#506A85] text-white border-[#506A85] shadow-xs"
                                                        : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-[#CCDCE8] dark:border-zinc-700 hover:bg-slate-50"
                                                )}
                                            >
                                                {chip.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Desk Due Notice */}
                                <div className="flex items-center justify-between text-sm px-4 py-2.5 rounded-xl bg-[#FFF8EE] dark:bg-amber-950/30 border border-[#F5E2C8] dark:border-amber-900/40 text-[#9A6B2F] dark:text-amber-300 font-medium">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-[#9A6B2F] shrink-0" />
                                        <span>Remaining Due at Desk</span>
                                    </div>
                                    <span className="font-mono font-bold text-base text-[#9A6B2F] dark:text-amber-300">
                                        ₹{Math.max(0, displayAmountToCollect - Number(customPaymentAmount || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}


                    </div>
                )}

                {/* E. Payment Method (STAGE 2) - Only show when desk collection is required */}
                {displayAmountToCollect > 0 && effectiveSettlementTerm !== 'FULL_DUE' && (billing?.paymentStatus === 'PendingPayment' || billing?.paymentStatus === 'PartialPayment') && (
                    <div 
                        className="pt-2 animate-in fade-in space-y-2"
                        onFocusCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                        onPointerDownCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                    >
                        <label className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">Payment Method</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Cash', 'UPI', 'Card'].map(method => {
                                const isActive = !isSplitPayment && paymentMethod === method;
                                return (
                                    <button
                                        key={method}
                                        id={`btn-payment-${method.toLowerCase()}`}
                                        data-payment-method="true"
                                        data-active={isActive ? "true" : "false"}
                                        type="button"
                                        onClick={() => {
                                            if (setPaymentMethod) setPaymentMethod(method);
                                            if (setIsSplitPayment) setIsSplitPayment(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab') {
                                                if (e.shiftKey) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (method === 'UPI') {
                                                        document.getElementById('btn-payment-cash')?.focus();
                                                    } else if (method === 'Card') {
                                                        document.getElementById('btn-payment-upi')?.focus();
                                                    } else { // Cash
                                                        if (isPartialPayment && Number(customPaymentAmount) > 0) {
                                                            const partialInput = document.getElementById('input-partial-amount');
                                                            if (partialInput && partialInput.offsetParent !== null) partialInput.focus();
                                                            else document.getElementById('btn-settlement-fulldue')?.focus();
                                                        } else {
                                                            const fulldue = document.getElementById('btn-settlement-fulldue');
                                                            const full = document.getElementById('btn-settlement-full');
                                                            if (fulldue && fulldue.offsetParent !== null) fulldue.focus();
                                                            else if (full && full.offsetParent !== null) full.focus();
                                                        }
                                                    }
                                                } else {
                                                    if (method === 'Cash') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        document.getElementById('btn-payment-upi')?.focus();
                                                    } else if (method === 'UPI') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        document.getElementById('btn-payment-card')?.focus();
                                                    } else if (method === 'Card') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (paymentMethod === 'Cash' || isSplitPayment) {
                                                            const tenderTarget = document.getElementById('btn-toggle-split-cash') ||
                                                                                 document.getElementById('btn-denom-0') ||
                                                                                 document.getElementById('input-cash-tendered') ||
                                                                                 document.getElementById('input-split-cash');
                                                            if (tenderTarget) {
                                                                tenderTarget.focus();
                                                                return;
                                                            }
                                                        }
                                                        const actionBtn = document.getElementById('btn-delete-draft') ||
                                                                          document.getElementById('btn-cancel-visit') ||
                                                                          document.getElementById('btn-unified-action');
                                                        if (actionBtn) actionBtn.focus();
                                                    }
                                                }
                                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (method === 'Cash') {
                                                    setPaymentMethod?.('UPI');
                                                    setIsSplitPayment?.(false);
                                                    document.getElementById('btn-payment-upi')?.focus();
                                                } else if (method === 'UPI') {
                                                    setPaymentMethod?.('Card');
                                                    setIsSplitPayment?.(false);
                                                    document.getElementById('btn-payment-card')?.focus();
                                                }
                                            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (method === 'Card') {
                                                    setPaymentMethod?.('UPI');
                                                    setIsSplitPayment?.(false);
                                                    document.getElementById('btn-payment-upi')?.focus();
                                                } else if (method === 'UPI') {
                                                    setPaymentMethod?.('Cash');
                                                    setIsSplitPayment?.(false);
                                                    document.getElementById('btn-payment-cash')?.focus();
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "flex flex-row items-center justify-center gap-2.5 h-13 sm:h-14 rounded-2xl border text-base sm:text-lg font-black tracking-tight transition-all active:scale-95 cursor-pointer synos-focus-btn shadow-xs",
                                            isActive
                                                ? "bg-[#18202F] text-white border-[#18202F] shadow-sm"
                                                : "bg-white dark:bg-zinc-850 text-slate-800 dark:text-zinc-100 border-[#CBD5E1] dark:border-zinc-700 shadow-2xs hover:bg-slate-50"
                                        )}
                                    >
                                        {method === 'Cash' && <IndianRupee className="w-5 h-5 shrink-0" strokeWidth={2.5} />}
                                        {method === 'UPI' && <Smartphone className="w-5 h-5 shrink-0" strokeWidth={2.5} />}
                                        {method === 'Card' && <CreditCard className="w-5 h-5 shrink-0" strokeWidth={2.5} />}
                                        <span>{method}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* POS Cash Tender & Split Calculator (Native Cashier Module) */}
                        {(paymentMethod === 'Cash' || isSplitPayment) && (
                            <div className="pt-1.5">
                                <PosCashTenderModule
                                    billAmount={
                                        (effectiveSettlementTerm === 'PARTIAL' && Number(customPaymentAmount) > 0)
                                            ? Number(customPaymentAmount)
                                            : displayAmountToCollect
                                    }
                                    tenderedAmount={tenderedAmount}
                                    onTenderChange={(val) => setTenderedAmount && setTenderedAmount(val)}
                                    changeReturnedNow={changeReturnedNow}
                                    onChangeReturnedNowChange={(val) => setChangeReturnedNow && setChangeReturnedNow(val)}
                                    isChangeRetainedAsDue={isChangeRetainedAsDue}
                                    onToggleChangeRetained={() => setIsChangeRetainedAsDue && setIsChangeRetainedAsDue(prev => !prev)}
                                    isSplitPayment={isSplitPayment}
                                    onToggleSplitPayment={() => setIsSplitPayment && setIsSplitPayment(prev => !prev)}
                                    splitCashAmount={splitCashAmount}
                                    onSplitCashChange={(val) => setSplitCashAmount && setSplitCashAmount(val)}
                                    splitUpiAmount={splitUpiAmount}
                                    onSplitUpiChange={(val) => setSplitUpiAmount && setSplitUpiAmount(val)}
                                    isPartialPayment={effectiveSettlementTerm === 'PARTIAL'}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* D. Settlement Status Indicator (Prominent in Visit Summary Mode - Direct / Standard only) */}
                {isLocked && !isPrepaid && (
                    <div className={cn(
                        "p-4 rounded-xl border flex items-center justify-between shadow-xs",
                        isDark ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    )}>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <span className="text-base font-bold block leading-tight">
                                    Payment Settled & Complete
                                </span>
                                <span className="text-sm opacity-80 font-medium mt-0.5 block">
                                    Paid via {billing.paymentMethod || 'Counter Collection'}
                                </span>
                            </div>
                        </div>
                        <span className="font-mono text-base font-bold px-3 py-1 rounded-full border bg-white/70 dark:bg-black/30 border-current/20">
                            ₹{(billing.totalPaid || billing.netAmount || 0).toLocaleString()}
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
                                <AlertCircle className="w-5 h-5 text-zinc-500" />
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
                                    isDark ? "bg-black border-zinc-700 text-white focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900")}
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
                                className="px-4 py-2 rounded-lg type-value bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
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
