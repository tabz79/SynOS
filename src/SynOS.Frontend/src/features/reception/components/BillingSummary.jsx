import { useState, useEffect, useRef, useMemo } from 'react'
import { Tag, X, Loader2, IndianRupee, Lock, AlertCircle, Smartphone, CreditCard, Plus, ShieldCheck, Search, ChevronDown, CheckCircle2 } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

// Safe extractor for B2B discount state handling case variations (b2b, b2B, B2B)
export const extractB2BInfo = (snap) => {
    const v = snap?.visit || {};
    const b = snap?.billing || {};
    const fallbackDiscount = Number(b.discountAmount) || 0;
    const rawVal = v.b2bDiscountValue ?? v.b2BDiscountValue ?? v.B2BDiscountValue ?? b.b2bDiscountAmount ?? b.b2BDiscountAmount ?? b.B2BDiscountAmount ?? fallbackDiscount;
    const rawType = (v.b2bDiscountType ?? v.b2BDiscountType ?? v.B2BDiscountType ?? 'Flat') === 'Percentage' ? 'PERCENTAGE' : 'FLAT';
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
    referralPartners = []
}) {
    // Local UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [discountCatalog, setDiscountCatalog] = useState([]);

    // Custom Discount State (Percentage vs Flat) - Default to 'FLAT' for standard Indian clinical concessions
    const [discountInputMode, setDiscountInputMode] = useState('custom'); // 'custom' | 'catalog'
    const [customDiscountType, setCustomDiscountType] = useState('FLAT'); // 'FLAT' | 'PERCENTAGE'
    const [customDiscountValue, setCustomDiscountValue] = useState('');
    const [customDiscountReason, setCustomDiscountReason] = useState('');
    const [isDiscountExpanded, setIsDiscountExpanded] = useState(false);
    const concessionEditorRef = useRef(null);
    const concessionTriggerRef = useRef(null);

    // Auto-minimize Concession / Discount when user moves to or interacts with other sections
    useEffect(() => {
        if (!isDiscountExpanded) return;

        const handlePointerDown = (e) => {
            if (
                concessionEditorRef.current && 
                !concessionEditorRef.current.contains(e.target) &&
                concessionTriggerRef.current && 
                !concessionTriggerRef.current.contains(e.target)
            ) {
                const isPortal = e.target.closest && (
                    e.target.closest('[role="dialog"]') || 
                    e.target.closest('[role="listbox"]') ||
                    e.target.closest('.suggestion-portal')
                );
                if (!isPortal) {
                    setIsDiscountExpanded(false);
                }
            }
        };

        const handleFocusIn = (e) => {
            if (
                concessionEditorRef.current && 
                !concessionEditorRef.current.contains(e.target) &&
                concessionTriggerRef.current && 
                !concessionTriggerRef.current.contains(e.target)
            ) {
                const isPortal = e.target.closest && (
                    e.target.closest('[role="dialog"]') || 
                    e.target.closest('[role="listbox"]') ||
                    e.target.closest('.suggestion-portal')
                );
                if (!isPortal) {
                    setIsDiscountExpanded(false);
                }
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('focusin', handleFocusIn);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, [isDiscountExpanded]);

    // Preset Discount Reasons State
    const [discountReasons, setDiscountReasons] = useState([]);
    const [showReasonDropdown, setShowReasonDropdown] = useState(false);
    const [reasonSelectedIndex, setReasonSelectedIndex] = useState(-1);
    const reasonListRef = useRef(null);

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

    useEffect(() => {
        if (!isB2BEditing) {
            if (isCorrectionIntent && stagedDiscount && stagedDiscount.isB2B) {
                setLocalB2BInput(stagedDiscount.value !== undefined ? String(stagedDiscount.value) : '');
                setB2BDiscountType(stagedDiscount.type === 'Percentage' ? 'PERCENTAGE' : 'FLAT');
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
        headerText: "text-xl font-bold text-white tracking-normal",
        container: "rounded-[24px] bg-zinc-900/90 border border-zinc-800 shadow-xl p-6 sm:p-7 space-y-4",
        rowLabel: "text-base font-medium text-zinc-400",
        rowValue: "text-base font-mono font-bold text-zinc-100",
        netLabel: "text-base font-bold text-white",
        netValue: "text-xl font-bold text-white font-mono",
        input: "bg-zinc-950/70 border-zinc-800 text-base focus:border-synos-primary rounded-xl h-12 px-4 tracking-normal",
        method: {
            active: "bg-zinc-100 text-zinc-900 border-white shadow-md",
            inactive: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
        }
    } : {
        indicator: "bg-slate-500 text-white border-transparent shadow-xs",
        headerText: "text-xl font-bold text-slate-900 tracking-normal",
        container: "rounded-[24px] bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border border-white/90 shadow-[0_12px_36px_rgba(15,35,60,0.07),0_2px_6px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF] p-6 sm:p-7 space-y-4",
        rowLabel: "text-base font-medium text-slate-600",
        rowValue: "text-base font-mono font-bold text-slate-900",
        netLabel: "text-base font-bold text-slate-900",
        netValue: "text-xl font-bold text-slate-900 font-mono",
        input: "bg-white/90 border border-[#D5E2EC] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-base focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all rounded-xl h-12 px-4 tracking-normal",
        method: {
            active: "bg-slate-900 text-white border-slate-900 shadow-sm",
            inactive: "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-[0_1px_2px_rgba(15,35,60,0.04)]"
        }
    };

    // 2. READ-ONLY Flags (Strictly from Snapshot)
    // Phase 6.4.4: Governance Rule - If Locked OR ReadOnly -> UI is Dead.
    const isLocked = billing?.isLocked || false;
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

    // Strict Guard: If no billing object, render nothing (or skeleton).
    if (!billing) return null;

    const handleReasonKeyDown = (e) => {
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
            }
        } else if (e.key === 'Escape') {
            setShowReasonDropdown(false);
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
            alert("Please select an authorized reason preset before applying a discount.");
            return;
        }
        if (!canPerformActions || !visitId) return;

        // CORRECTION INTENT (Staged Batch Edit)
        if (isCorrectionIntent && onStageDiscount) {
            onStageDiscount({
                mode: 'custom',
                type: customDiscountType === 'PERCENTAGE' ? 'Percentage' : 'Flat',
                value: val,
                reason: customDiscountReason.trim()
            });
            setIsDiscountExpanded(false);
            return;
        }

        setIsProcessing(true);
        try {
            await ReceptionApi.applyDiscountToVisit(visitId, {
                mode: customDiscountType,
                customValue: val,
                reason: customDiscountReason.trim()
            });
            setIsDiscountExpanded(false);
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to apply custom discount", err);
            alert("Failed to apply custom discount: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Save B2B Partner Concession Rate (Prepaid)
    const handleSaveB2BDiscount = async (overrideValue, overrideType) => {
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
            if (onVisitUpdated) onVisitUpdated();
        } catch (err) {
            console.error("Failed to update B2B discount rate", err);
            alert("Failed to update B2B discount rate: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Remove Discount
    const handleRemoveDiscount = async () => {
        if (!canPerformActions || !visitId) return;

        // CORRECTION INTENT (Staged Batch Edit)
        if (isCorrectionIntent) {
            if (onStageDiscount) {
                onStageDiscount({ mode: 'remove', remove: true });
                setCustomDiscountReason('');
                setCustomDiscountValue('');
                return;
            }
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
            setCustomDiscountReason('');
            setCustomDiscountValue('');
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

    // MULTI-PAYER DISPLAY LOGIC
    const isPrepaid = isPrepaidIntent || billingMode === 'PrepaidPartner' || billing?.paymentModel === 'PartnerCollects';
    const isInsurance = billingMode === 'Insurance';
    const isCorporate = billingMode === 'Corporate';

    // Settlement Logic
    const totalPaid = isPrepaid ? 0 : (originalPaid || billing.totalPaid || 0);
    const netAmount = stagedNet !== undefined ? stagedNet : (billing.netAmount || 0);
    const effectiveDiff = settlementDiff !== undefined ? settlementDiff : (netAmount - totalPaid);
    const isSettlementNeeded = isCorrectionIntent && totalPaid > 0 && Math.abs(effectiveDiff) > 0.01;

    const totalNet = stagedNet !== undefined ? stagedNet : (billing?.netAmount || billing?.totalAmount || 0);
    const remainingDue = Math.max(0, totalNet - totalPaid);

    let displayAmountToCollect = remainingDue;
    let amountLabel = billing?.paymentStatus === 'Paid' ? "Total Bill Amount" : (totalPaid > 0 ? "Remaining Due to Collect" : "Amount to Collect");

    if (isPrepaid) {
        displayAmountToCollect = 0;
        amountLabel = "Amount to Collect (Prepaid Partner)";
    } else if (isCorporate) {
        displayAmountToCollect = 0;
        amountLabel = "Billed to Corporate (₹0 at desk)";
    } else if (isInsurance) {
        displayAmountToCollect = snapshot?.visit?.insuranceCoPayAmount || 0;
        amountLabel = displayAmountToCollect > 0 ? "Patient Co-Pay to Collect" : "Cashless Claim (₹0 at desk)";
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-3 h-full">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-xs", ui.indicator)}>
                        3
                    </div>
                    <h3 className={ui.headerText}>Financials</h3>
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-synos-primary" />}
                </div>
                {billing.paymentStatus && (
                    <div className={cn(
                        "px-3 py-1 rounded-full text-xs sm:text-sm font-bold border tracking-normal shrink-0",
                        billing.paymentStatus === 'Paid'
                            ? (isDark ? "bg-emerald-950/40 text-emerald-400 border-emerald-800" : "bg-[#EAF5F0] text-[#245E49] border-[#CFE8DD]")
                            : billing.paymentStatus === 'PartialPayment'
                                ? (isDark ? "bg-amber-950/30 text-amber-300 border-amber-900/40" : "bg-[#FFF8EE] text-[#9A6B2F] border-[#F5E2C8]")
                                : (isDark ? "bg-amber-950/30 text-amber-300 border-amber-900/40" : "bg-[#FFF8EE] text-[#9A6B2F] border-[#F5E2C8]")
                    )}>
                        {billing.paymentStatus === 'PartialPayment' ? 'Partial Due' : billing.paymentStatus}
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

            <div className={cn("relative flex-1 min-h-0 overflow-y-auto pr-1.5 sm:pr-2", ui.container)}>

                {/* 1. TOP REFERRAL & CONCESSION ACTION BAR */}
                {(() => {
                    const hasDiscountApplied = isCorrectionIntent 
                        ? (Boolean(stagedDiscount) && !stagedDiscount.remove)
                        : (Boolean(billing.appliedDiscount) && (billing.discountAmount > 0));

                    const discountDisplay = isCorrectionIntent && stagedDiscount
                        ? (stagedDiscountAmt || 0)
                        : (billing.discountAmount || 0);

                    const grossDisplay = isCorrectionIntent && stagedGross !== undefined
                        ? stagedGross
                        : (billing.grossAmount || 0);

                    const taxDisplay = billing.taxAmount || 0;

                    const discountReasonText = isCorrectionIntent && stagedDiscount
                        ? (stagedDiscount.reason || stagedDiscount.name || (stagedDiscount.type === 'Percentage' ? `${stagedDiscount.value}%` : `₹${stagedDiscount.value}`))
                        : (billing.appliedDiscount?.reason || billing.appliedDiscount?.name || '');

                    return (
                        <>
                            {/* Referral Strip with Integrated Concession Toggle */}
                            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/75 dark:bg-zinc-800/60 border border-[#CCDCE8]/80 dark:border-zinc-700/70 shadow-[0_1px_3px_rgba(15,35,60,0.03)]">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 shrink-0">Referral:</span>
                                    {snapshot?.billing?.referral?.secondaryPartner ? (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#3D9970] shadow-[0_0_6px_rgba(61,153,112,0.35)] shrink-0" />
                                            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                                {snapshot.billing.referral.secondaryPartner.displayName}
                                            </span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#E1F1E8] text-[#245E49] dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-[#BCE2CD] dark:border-emerald-800 shrink-0">
                                                Secondary (RMP)
                                            </span>
                                            {snapshot?.billing?.referral?.partner && (
                                                <span className="text-xs text-slate-500 dark:text-zinc-400 truncate hidden sm:inline">
                                                    (Main: {snapshot.billing.referral.partner.displayName})
                                                </span>
                                            )}
                                        </div>
                                    ) : snapshot?.billing?.referral?.partner ? (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0" />
                                            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                                {snapshot.billing.referral.partner.displayName}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 shrink-0">
                                                Doctor
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 italic">No Referral Partner (Direct Walk-in)</span>
                                    )}
                                </div>

                                {/* Concession / Discount Trigger Button */}
                                {canPerformActions && !isPrepaid && (
                                    <button
                                        ref={concessionTriggerRef}
                                        type="button"
                                        onClick={() => setIsDiscountExpanded(prev => !prev)}
                                        className={cn(
                                            "px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs shrink-0",
                                            isDiscountExpanded
                                                ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-700 dark:border-zinc-600 shadow-xs"
                                                : (hasDiscountApplied
                                                    ? "bg-[#EBF5EF] dark:bg-emerald-950/30 text-[#245E49] dark:text-emerald-300 border border-[#CCE8D8] dark:border-emerald-800 hover:bg-[#DFF0E6]"
                                                    : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-[#CCDCE8] dark:border-zinc-700 hover:bg-slate-50")
                                        )}
                                    >
                                        <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                                        <span>{hasDiscountApplied ? "Edit Concession" : "+ Concession"}</span>
                                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isDiscountExpanded && "rotate-180")} />
                                    </button>
                                )}
                            </div>

                            {/* 2. MATHEMATICAL LEDGER ROWS (Clean vertical accounting alignment) */}
                            <div className="space-y-3 text-base pt-1">
                                {/* Gross */}
                                <div className="flex justify-between items-center">
                                    <span className={ui.rowLabel}>Total Amount</span>
                                    <span className={ui.rowValue}>
                                        ₹{grossDisplay.toLocaleString()}
                                    </span>
                                </div>

                                {/* Discount Applied */}
                                <div className="flex justify-between items-center">
                                    <span className={ui.rowLabel}>Discount</span>
                                    {hasDiscountApplied ? (
                                        <div className="flex items-center gap-2">
                                            <span className={cn("font-mono font-bold flex items-center gap-1.5", isDark ? "text-emerald-400" : "text-[#1F6E54]")}>
                                                - ₹{discountDisplay.toLocaleString()}
                                                {discountReasonText && (
                                                    <span className="text-sm opacity-80 font-semibold">({discountReasonText})</span>
                                                )}
                                            </span>
                                            {canPerformActions && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveDiscount}
                                                    disabled={isProcessing}
                                                    className={cn("p-1 rounded-full transition-colors cursor-pointer",
                                                        isDark ? "hover:bg-zinc-800 text-zinc-500 hover:text-red-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-600")}
                                                    title="Remove Discount"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-slate-400 dark:text-zinc-500">No discount applied</span>
                                    )}
                                </div>

                                {/* Tax */}
                                <div className="flex justify-between items-center text-base">
                                    <span className={ui.rowLabel}>GST / Tax</span>
                                    <span className={ui.rowValue}>₹{taxDisplay.toLocaleString()}</span>
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

                            {/* Net Payable / Revised Net */}
                            {displayAmountToCollect !== totalNet && (
                                <div className="flex justify-between items-center pt-1">
                                    <span className={cn(ui.rowLabel, "text-base font-bold text-slate-800 dark:text-zinc-200")}>
                                        {isCorrectionIntent ? "Revised Net Amount" : "Net Bill Total"}
                                    </span>
                                    <span className={cn("font-mono text-2xl font-black text-slate-950 dark:text-white")}>
                                        ₹{(isCorrectionIntent && stagedNet !== undefined ? stagedNet : totalNet)?.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* Already Paid at Desk */}
                            {totalPaid > 0 && (
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

                            {/* Remaining Due to Collect */}
                            {totalPaid > 0 && remainingDue > 0 && (
                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                        Remaining Due to Collect
                                    </span>
                                    <span className="font-mono font-black text-base text-rose-600 dark:text-rose-400 flex items-center">
                                        <IndianRupee className="w-4 h-4 mr-0.5" />
                                        {remainingDue.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* 4. EXPANDABLE CONCESSION EDITOR (Smoothly unfolds directly in native styling) */}
                            {isDiscountExpanded && canPerformActions && !isPrepaid && (
                                <div ref={concessionEditorRef} className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-[#CCDCE8]/80 dark:border-zinc-700/80 shadow-[0_2px_8px_rgba(15,35,60,0.03)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Discount Mode Toggle */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">
                                            Concession / Discount
                                        </span>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Preset Code</span>
                                            <button
                                                type="button"
                                                onClick={() => setDiscountInputMode(prev => prev === 'custom' ? 'catalog' : 'custom')}
                                                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-sm shadow-2xs hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <span>{discountInputMode === 'custom' ? 'Custom % / Flat' : 'Master Preset'}</span>
                                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                                        <div className="space-y-3.5 pt-1">
                                            <div className="flex items-center gap-3">
                                                <div className="inline-flex p-1 rounded-xl bg-[#DFEAF3] dark:bg-zinc-800 border border-slate-200/60">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCustomDiscountType('PERCENTAGE')}
                                                        className={cn(
                                                            "px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer",
                                                            customDiscountType === 'PERCENTAGE'
                                                                ? "bg-[#506A85] text-white shadow-xs"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        % Off
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCustomDiscountType('FLAT')}
                                                        className={cn(
                                                            "px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer",
                                                            customDiscountType === 'FLAT'
                                                                ? "bg-[#506A85] text-white shadow-xs"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        ₹ Flat
                                                    </button>
                                                </div>

                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={customDiscountType === 'PERCENTAGE' ? 100 : (billing.grossAmount || 100000)}
                                                        step={customDiscountType === 'PERCENTAGE' ? '1' : '10'}
                                                        placeholder={customDiscountType === 'PERCENTAGE' ? 'Discount % (e.g. 15)' : 'Discount ₹ (e.g. 100)'}
                                                        value={customDiscountValue}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            const clean = raw.startsWith('0') && raw.length > 1 && !raw.startsWith('0.') ? raw.replace(/^0+/, '') : raw;
                                                            setCustomDiscountValue(clean);
                                                        }}
                                                        className={cn("w-full h-12 px-4 rounded-xl text-base font-mono font-bold outline-none border", ui.input)}
                                                    />
                                                </div>
                                            </div>

                                            {customDiscountValue && Number(customDiscountValue) > 0 && (() => {
                                                const gross = billing.grossAmount || 0;
                                                const val = Number(customDiscountValue) || 0;
                                                const calculatedDiscount = customDiscountType === 'PERCENTAGE'
                                                    ? Math.round((gross * (val / 100)) * 100) / 100
                                                    : Math.min(gross, val);
                                                const calculatedNet = Math.max(0, gross - calculatedDiscount);
                                                return (
                                                    <div className="flex items-center justify-between text-sm px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-300 font-medium animate-in fade-in">
                                                        <span>
                                                            {customDiscountType === 'PERCENTAGE' ? `${val}% off ₹${gross.toLocaleString()}` : `₹${val.toLocaleString()} Flat off ₹${gross.toLocaleString()}`}
                                                            {' → '}<strong>-₹{calculatedDiscount.toLocaleString()}</strong>
                                                        </span>
                                                        <span>
                                                            Net Bill: <strong className="font-bold text-emerald-600 dark:text-emerald-400 text-base">₹{calculatedNet.toLocaleString()}</strong>
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            <div className="space-y-2 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">
                                                        Discount Reason / Authority
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowReasonDropdown(false);
                                                            if (onOpenModal) onOpenModal('discountReason');
                                                        }}
                                                        className="text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
                                                        title="Add new standard preset reason to master"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Reason
                                                    </button>
                                                </div>

                                                {/* Native System Searchable Dropdown Combobox */}
                                                <div className="flex items-center gap-2.5">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search or Select Reason (e.g. Dr. DVR)..."
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
                                                            style={{ paddingLeft: '2.75rem', paddingRight: '2.25rem' }}
                                                            className={cn(ui.input, "w-full h-12 rounded-xl text-base font-medium outline-none border transition-all")}
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

                                                                {/* Quick + Add New Reason action at bottom of menu */}
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

                                                    <button
                                                        type="button"
                                                        disabled={!customDiscountValue || !customDiscountReason?.trim() || isProcessing}
                                                        onClick={handleApplyCustomDiscount}
                                                        className="h-12 px-5 rounded-xl bg-[#506A85] hover:bg-[#435970] text-white text-sm font-bold disabled:opacity-50 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                                                    >
                                                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* LIVE RECONCILER CARD (Correction / Edit Mode Only) */}
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

                        return (
                            <div className={cn(
                                "p-3.5 rounded-xl border space-y-2.5 transition-all shadow-xs animate-in fade-in duration-200",
                                isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-200" : "bg-black/[0.04] border-black/5 text-zinc-900"
                            )}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                        Doctor / Partner Bill
                                    </span>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                                        Billed to Doctor
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-black/5 dark:border-white/5">
                                    <div>
                                        <span className="opacity-70 text-[11px] block">Previous Doctor Bill:</span>
                                        <span className="font-mono font-bold text-sm">₹{originalB2BClaim.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="opacity-70 text-[11px] block">New Doctor Bill:</span>
                                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">₹{currentB2BClaim.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-black/5 dark:border-white/5 font-bold text-xs">
                                    <span>Difference to Doctor:</span>
                                    <span className={cn("font-mono text-base font-extrabold", b2bClaimDiff > 0 ? "text-indigo-600 dark:text-indigo-400" : b2bClaimDiff < 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                                        {b2bClaimDiff > 0 ? `+₹${b2bClaimDiff.toLocaleString()}` : b2bClaimDiff < 0 ? `-₹${Math.abs(b2bClaimDiff).toLocaleString()}` : "₹0 (No Change)"}
                                    </span>
                                </div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                                    {b2bClaimDiff > 0 
                                        ? `* Doctor bill increases by ₹${b2bClaimDiff.toLocaleString()} (New: ₹${currentB2BClaim.toLocaleString()} vs Old: ₹${originalB2BClaim.toLocaleString()}). Lab will bill this to doctor.`
                                        : b2bClaimDiff < 0 
                                            ? `* Doctor bill decreases by ₹${Math.abs(b2bClaimDiff).toLocaleString()} (Credited to doctor's monthly account).`
                                            : `* Doctor bill unchanged at ₹${currentB2BClaim.toLocaleString()}.`}
                                </div>

                                <div className="text-[11px] p-2 rounded-lg bg-black/[0.03] dark:bg-zinc-800/40 border border-black/5 dark:border-zinc-700/50 flex items-center justify-between">
                                    <span className="text-zinc-600 dark:text-zinc-400">Collect from Patient:</span>
                                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">₹0 (Billed directly to doctor)</span>
                                </div>
                            </div>
                        );
                    }

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
                                <div className="text-[11px] p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                                    <span className="font-bold text-xs">💵</span>
                                    <span>Refund will be disbursed strictly in <strong>Cash from register</strong> upon confirmation.</span>
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

                    return (
                        <div className={cn(
                            "p-3 rounded-xl border space-y-2.5",
                            isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-200 shadow-xs" : "bg-black/[0.04] border-black/5 text-zinc-900 shadow-xs"
                        )}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                                    Doctor Discount & Rate
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border border-slate-200 dark:border-zinc-700">
                                    Doctor Tariff
                                </span>
                            </div>

                            <div className="text-xs space-y-2">
                                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                                    <span>Standard Lab MRP:</span>
                                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                        ₹{grossTariff.toLocaleString()}
                                    </span>
                                </div>

                                {/* Mode Toggle & Input */}
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                            Discount Type:
                                        </span>
                                        <div className="flex items-center rounded-lg p-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-bold">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setB2BDiscountType('FLAT');
                                                    setIsB2BEditing(true);
                                                    if (isCorrectionIntent && onStageDiscount) {
                                                        onStageDiscount({
                                                            type: 'Flat',
                                                            value: Number(localB2BInput) || 0,
                                                            reason: 'B2B Partner Concession',
                                                            isB2B: true
                                                        });
                                                    }
                                                }}
                                                className={cn(
                                                    "px-2 py-0.5 rounded transition-all cursor-pointer",
                                                    b2bDiscountType === 'FLAT'
                                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                                )}
                                            >
                                                Flat (₹)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setB2BDiscountType('PERCENTAGE');
                                                    setIsB2BEditing(true);
                                                    if (isCorrectionIntent && onStageDiscount) {
                                                        onStageDiscount({
                                                            type: 'Percentage',
                                                            value: Number(localB2BInput) || 0,
                                                            reason: 'B2B Partner Concession',
                                                            isB2B: true
                                                        });
                                                    }
                                                }}
                                                className={cn(
                                                    "px-2 py-0.5 rounded transition-all cursor-pointer",
                                                    b2bDiscountType === 'PERCENTAGE'
                                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                                )}
                                            >
                                                % Off
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                                            {b2bDiscountType === 'PERCENTAGE' ? 'Discount Percentage:' : 'Flat Concession:'}
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-zinc-400">
                                                {b2bDiscountType === 'FLAT' ? '₹' : '%'}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                max={b2bDiscountType === 'PERCENTAGE' ? 100 : (grossTariff || 100000)}
                                                value={isB2BEditing ? localB2BInput : (isCorrectionIntent && stagedDiscount?.value !== undefined && stagedDiscount.isB2B ? String(stagedDiscount.value) : localB2BInput)}
                                                disabled={!canPerformActions || isProcessing}
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
                                                        handleSaveB2BDiscount(e.target.value, b2bDiscountType);
                                                    }
                                                }}
                                                className={cn(
                                                    "w-20 h-7 px-2 text-right text-xs font-mono font-bold rounded border outline-none",
                                                    isDark ? "bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-synos-primary" : "bg-white border-zinc-300 text-zinc-900 focus:border-synos-primary shadow-xs"
                                                )}
                                                placeholder="0"
                                            />
                                            {isB2BEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveB2BDiscount(localB2BInput, b2bDiscountType)}
                                                    className="px-2.5 py-1 bg-synos-primary text-white rounded text-[10px] font-bold hover:bg-synos-primary/90 cursor-pointer shadow-xs active:scale-95"
                                                >
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {b2bDiscountType === 'PERCENTAGE' && rawVal > 0 && (
                                        <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                                            <span>Calculated {rawVal}% Discount:</span>
                                            <span className="font-mono font-medium">₹{computedDiscountAmt.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                {/* BILLED TO DOCTOR (Corporate B2B Billing Entity Override) */}
                                {(() => {
                                    const primaryDoctor = snapshot?.billing?.referral?.partner || snapshot?.visit?.referralPartner;
                                    const overriddenDoctor = snapshot?.billing?.referral?.secondaryPartner || snapshot?.visit?.secondaryReferralPartner;
                                    const isOverridden = Boolean(overriddenDoctor);

                                    return (
                                        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <span>Billed to Doctor</span>
                                                    {isOverridden && (
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                                                            Overruled
                                                        </span>
                                                    )}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowB2BDoctorDropdown(false);
                                                        if (onOpenModal) onOpenModal('b2bBillingDoctor');
                                                    }}
                                                    disabled={!canPerformActions || isProcessing}
                                                    className="text-[10px] font-bold text-synos-primary hover:text-synos-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
                                                    title="Register & bill a new doctor profile"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Doctor
                                                </button>
                                            </div>

                                            {isOverridden ? (
                                                <div className={cn(
                                                    "flex items-center justify-between gap-2 p-2 rounded-lg border text-xs font-semibold",
                                                    isDark ? "bg-zinc-800/60 border-zinc-700 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900 shadow-xs"
                                                )}>
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                                                        <div className="truncate">
                                                            <div className="font-bold text-xs truncate">
                                                                {overriddenDoctor.displayName || overriddenDoctor.name}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-400 font-normal truncate">
                                                                Receivables & ledger will be billed to this doctor
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {canPerformActions && (
                                                        <button
                                                            type="button"
                                                            onClick={handleClearB2BOverrideDoctor}
                                                            disabled={isProcessing}
                                                            className="p-1 text-zinc-400 hover:text-rose-500 rounded cursor-pointer transition-colors shrink-0"
                                                            title="Revert billing back to prescribing doctor"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder={primaryDoctor?.displayName || primaryDoctor?.name ? `Default: ${primaryDoctor.displayName || primaryDoctor.name} (or search to overrule)...` : "Search Doctor to Bill..."}
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
                                                        className={cn("w-full h-8 pl-8 pr-7 rounded-md text-xs font-medium outline-none border transition-all", ui.input)}
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
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-zinc-800 font-bold">
                                    <span className="text-zinc-800 dark:text-zinc-200">Final Doctor Bill:</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">
                                        ₹{computedNetClaim.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {b2bInfo.enteredBy && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-black/5 dark:border-white/5 pt-1">
                                    Recorded by: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{b2bInfo.enteredBy}</span>
                                    {b2bInfo.enteredAt && ` on ${new Date(b2bInfo.enteredAt).toLocaleDateString()}`}
                                </div>
                            )}
                        </div>
                    );
                })()}



                {/* E. Payment Settlement Mode (Full vs Partial) & Amount Collected */}
                {displayAmountToCollect > 0 && !isPrepaid && !isCorporate && (billing?.paymentStatus === 'PendingPayment' || billing?.paymentStatus === 'PartialPayment') && !isCorrectionIntent && (
                    <div 
                        className="pt-2 animate-in fade-in space-y-3"
                        onFocusCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                        onPointerDownCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                    >
                        <div className="flex items-center justify-between">
                            <label className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">Settlement Terms</label>
                            {isPartialPayment && (
                                <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#FFF8EE] text-[#9A6B2F] dark:bg-amber-950/30 dark:text-amber-300 font-bold border border-[#F5E2C8] dark:border-amber-900/40 uppercase tracking-wider">
                                    Partial Due
                                </span>
                            )}
                        </div>
                        
                        {/* Segmented control: Full Settlement vs Partial */}
                        <div className="inline-flex w-full p-1 rounded-xl bg-[#DFEAF3] dark:bg-zinc-800 border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsPartialPayment?.(false);
                                    setCustomPaymentAmount?.('');
                                }}
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                    !isPartialPayment
                                        ? "bg-[#506A85] text-white shadow-xs"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Full (₹{displayAmountToCollect.toLocaleString()})</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsPartialPayment?.(true);
                                    if (!customPaymentAmount) {
                                        setCustomPaymentAmount?.(String(Math.round(displayAmountToCollect * 0.5)));
                                    }
                                }}
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                    isPartialPayment
                                        ? "bg-[#506A85] text-white shadow-xs"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <AlertCircle className="w-4 h-4" />
                                <span>Partial Due</span>
                            </button>
                        </div>

                        {/* Partial Payment Amount Input & Quick Chips (Native SynOS Modal / Card Styling) */}
                        {isPartialPayment && (
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
                                        type="number"
                                        min="1"
                                        max={displayAmountToCollect}
                                        value={customPaymentAmount || ''}
                                        onChange={(e) => {
                                            const val = Math.min(displayAmountToCollect, Math.max(0, Number(e.target.value)));
                                            setCustomPaymentAmount?.(e.target.value === '' ? '' : String(val));
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        placeholder={`1 - ${displayAmountToCollect}`}
                                        className={cn(
                                            "w-full h-12 !pl-9 !pr-4 rounded-xl text-base font-mono font-bold outline-none border transition-all",
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
                                                onClick={() => setCustomPaymentAmount?.(String(chip.val))}
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
                {displayAmountToCollect > 0 && (billing?.paymentStatus === 'PendingPayment' || billing?.paymentStatus === 'PartialPayment') && (
                    <div 
                        className="pt-2 animate-in fade-in space-y-2"
                        onFocusCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                        onPointerDownCapture={() => { if (isDiscountExpanded) setIsDiscountExpanded(false); }}
                    >
                        <label className="text-base font-bold text-slate-800 dark:text-zinc-200 tracking-normal">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Cash', 'UPI', 'Card'].map(method => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => setPaymentMethod && setPaymentMethod(method)}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-2.5 rounded-xl border text-sm font-bold tracking-normal transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1 cursor-pointer",
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

                {/* D. Settlement Status Indicator (Prominent in Visit Summary Mode) */}
                {isLocked && (
                    <div className={cn(
                        "p-4 rounded-xl border flex items-center justify-between shadow-xs",
                        billing.paymentModel === 'PartnerCollects' || isPrepaid
                            ? (isDark ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300" : "bg-indigo-50/80 border-indigo-200 text-indigo-900")
                            : (isDark ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50/80 border-emerald-200 text-emerald-900")
                    )}>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className={cn("w-5 h-5 shrink-0", billing.paymentModel === 'PartnerCollects' || isPrepaid ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400")} />
                            <div>
                                <span className="text-base font-bold block leading-tight">
                                    {billing.paymentModel === 'PartnerCollects' || isPrepaid
                                        ? "Billed to Doctor Account"
                                        : "Payment Settled & Complete"}
                                </span>
                                <span className="text-sm opacity-80 font-medium mt-0.5 block">
                                    {billing.paymentModel === 'PartnerCollects' || isPrepaid
                                        ? "Doctor will settle via monthly account"
                                        : `Paid via ${billing.paymentMethod || 'Counter Collection'}`}
                                </span>
                            </div>
                        </div>
                        <span className="font-mono text-base font-bold px-3 py-1 rounded-full border bg-white/70 dark:bg-black/30 border-current/20">
                            {billing.paymentModel === 'PartnerCollects' || isPrepaid
                                ? "Doctor B2B"
                                : `₹${(billing.totalPaid || billing.netAmount || 0).toLocaleString()}`}
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
