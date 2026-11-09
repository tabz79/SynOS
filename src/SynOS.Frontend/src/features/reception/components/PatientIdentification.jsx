import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, UserPlus, Phone, Fingerprint, ArrowRight, User, AlertCircle, Zap, Check, CreditCard, Lock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReceptionApi } from '@/api/reception'
import { HealthCardApi } from '@/api/healthCards'
import { useTheme } from '@/context/ThemeContext'
import { RichPatientCard, calculateDetailedAge } from '@/components/patient/RichPatientCard'


export function PatientIdentification({ 
    snapshot, 
    onSelectPatient, 
    onClearPatient, 
    onEditPatient, 
    isCorrectionIntent 
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [matches, setMatches] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMatchIndex, setSelectedMatchIndex] = useState(-1);
    const resultsContainerRef = useRef(null);

    // Reset highlighted match when matches change
    useEffect(() => {
        setSelectedMatchIndex(-1);
    }, [matches]);

    // Keep active highlighted match smoothly in view
    useEffect(() => {
        if (selectedMatchIndex >= 0 && resultsContainerRef.current) {
            const el = resultsContainerRef.current.children[selectedMatchIndex];
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedMatchIndex]);

    // Local UI state for "New Patient Form" visibility
    const [isNewPatientMode, setIsNewPatientMode] = useState(false);
    const [startWithNoMobile, setStartWithNoMobile] = useState(false);

    // Derived from Snapshot
    const selectedPatient = snapshot?.patient;

    const [healthCardEligibility, setHealthCardEligibility] = useState(null);
    const [isQuickEnrolling, setIsQuickEnrolling] = useState(false);

    const checkHealthCard = async (patient) => {
        if (!patient) {
            setHealthCardEligibility(null);
            return;
        }
        const pId = patient.id || patient.Id || patient.patientId;
        const phone = patient.mobile || patient.Mobile || patient.phoneNumber || patient.currentPhoneNumber || patient.CurrentPhoneNumber;
        try {
            const res = await HealthCardApi.checkEligibility(pId, phone);
            setHealthCardEligibility(res);
            window.dispatchEvent(new CustomEvent('synos:healthcard-eligibility', { detail: res }));
        } catch (e) {
            console.error('HealthCard check failed', e);
        }
    };

    useEffect(() => {
        checkHealthCard(selectedPatient);
    }, [selectedPatient]);

    const handleQuickEnrollBeneficiary = async () => {
        if (!healthCardEligibility?.card?.cardId || !selectedPatient) return;
        setIsQuickEnrolling(true);
        try {
            const pId = selectedPatient.id || selectedPatient.Id || selectedPatient.patientId;
            await HealthCardApi.enrollBeneficiary(healthCardEligibility.card.cardId, {
                existingPatientId: pId,
                relationship: 'Family'
            });
            await checkHealthCard(selectedPatient);
        } catch (err) {
            alert(err.message || 'Failed to enroll');
        } finally {
            setIsQuickEnrolling(false);
        }
    };

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        indicator: {
            active: "bg-slate-600 text-white border-transparent",
            inactive: "bg-zinc-800 text-zinc-400 border-zinc-700"
        },
        headerText: {
            active: "text-xl font-bold text-white tracking-normal",
            inactive: "text-xl font-bold text-zinc-400 tracking-normal"
        },
        section: "p-5 sm:p-6 rounded-[28px] bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4",
        input: "bg-zinc-950 border border-zinc-800 text-base font-medium tracking-normal text-white placeholder:text-zinc-500 focus:border-synos-primary transition-all",
        emptyBox: "bg-zinc-800/30 border-zinc-700 text-sm text-zinc-400",
        form: "bg-zinc-900 border-zinc-800",
        formLabel: "text-sm font-semibold tracking-normal text-zinc-300",
        formInput: "bg-zinc-950 border-zinc-800 text-sm focus:border-synos-primary tracking-normal"
    } : {
        indicator: {
            active: "bg-[#5A6E85] text-white border-transparent shadow-xs",
            inactive: "bg-slate-200 text-slate-600 border-transparent shadow-none"
        },
        headerText: {
            active: "text-xl font-bold text-slate-900 tracking-normal",
            inactive: "text-xl font-bold text-slate-900 tracking-normal"
        },
        section: "p-5 sm:p-6 rounded-[28px] bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border border-white/90 shadow-[0_14px_40px_rgba(15,35,60,0.08),0_2px_6px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF] space-y-4",
        input: "bg-white border border-[#CCDCE8] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-base font-medium tracking-normal text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
        emptyBox: "border-dashed border-slate-300 text-sm text-slate-500",
        form: "ring-0 space-y-4",
        formLabel: "text-sm font-semibold tracking-normal text-slate-700",
        formInput: "bg-white border-slate-200 text-sm focus:border-blue-500 tracking-normal"
    };

    // Search Effect (Debounced)
    useEffect(() => {
        if (searchQuery.length < 3) {
            setMatches([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Real API Search (Canonical Backend Fix Active)
                const results = await ReceptionApi.searchPatients(searchQuery);
                setMatches(results || []);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectPatient = (patient) => {
        onSelectPatient(patient);
    };

    return (
        <div className={cn("flex flex-col space-y-4", !selectedPatient ? "h-full" : "w-full")}>

            {/* LOCKED STATE (Patient Identified) */}
            {selectedPatient && (
                <div className="animate-in fade-in slide-in-from-top-2 pt-2 xl:pt-4 px-3 xl:px-4 space-y-2 xl:space-y-4">
                    {/* ... (Existing Locked View) ... */}
                    {/* NOTE: This uses RichPatientCard which handles its own locked state style */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            1
                        </div>
                        <h3 className={cn(ui.headerText.active)}>
                            Patient Identification
                        </h3>
                    </div>
                    <RichPatientCard
                        patient={selectedPatient}
                        onAction={onClearPatient}
                        actionLabel={(Boolean(snapshot?.visit?.id || snapshot?.visit?.visitId || snapshot?.billing?.isLocked)) ? null : "Change"}
                        secondaryActionLabel={isCorrectionIntent ? "Edit" : null}
                        onSecondaryAction={onEditPatient}
                        isLocked={true}
                    />

                    {/* Health Card Membership Banner */}
                    {selectedPatient && healthCardEligibility && healthCardEligibility.hasActiveCard && (
                        <div className="pt-1 animate-in fade-in duration-200">
                            {healthCardEligibility.isPatientEnrolledBeneficiary ? (
                                (healthCardEligibility.isPendingPayment || healthCardEligibility.card?.status === 'PendingPayment') ? (
                                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700/80 flex items-center justify-between shadow-2xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-sm">
                                                💳
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                                                        Health Card • Pending Settlement
                                                    </span>
                                                    <span className="font-mono text-xs font-black text-amber-800 dark:text-amber-300 bg-white/80 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                                                        {healthCardEligibility.card?.cardNumber}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                                    Card fee added to current bill • Activates automatically upon bill settlement
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500 text-white shadow-xs shrink-0">
                                            Pending Payment
                                        </span>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between shadow-2xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-sm">
                                                💎
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200">
                                                        Active Health Card Member
                                                    </span>
                                                    <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-400 bg-white/80 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-700">
                                                        {healthCardEligibility.card?.cardNumber}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                                                    {healthCardEligibility.card?.configuredDiscountValue}{healthCardEligibility.card?.configuredDiscountType === 'Percentage' ? '%' : '₹'} Flat Discount active • Valid till {new Date(healthCardEligibility.card?.validUntil).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-xs shrink-0">
                                            {healthCardEligibility.card?.configuredDiscountValue}% Applied
                                        </span>
                                    </div>
                                )
                            ) : healthCardEligibility.hasOpenSlots ? (
                                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs text-sm">
                                            👨‍👩‍👧
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                                                    Family Card Found ({healthCardEligibility.card?.cardNumber})
                                                </span>
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                                                    {healthCardEligibility.availableSlots} Slot(s) Open
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                                Patient not enrolled yet. Click to enroll as family beneficiary & grant discount.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleQuickEnrollBeneficiary}
                                        disabled={isQuickEnrolling}
                                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-transform active:scale-95"
                                    >
                                        {isQuickEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                                        <span>Enroll into Card</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs text-slate-700 dark:text-zinc-300">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span>Card #{healthCardEligibility.card?.cardNumber} is at full capacity ({healthCardEligibility.card?.maxMembers}/{healthCardEligibility.card?.maxMembers} members: {healthCardEligibility.card?.beneficiaries?.map(b => b.displayName).join(', ')}). Standard tariff applies.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* SEARCH STATE (No Patient) */}
            {!selectedPatient && !isNewPatientMode && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden animate-in fade-in">

                    {/* BLOCK A: PATIENT IDENTIFICATION HEADER (Static) */}
                    <div className="shrink-0 p-4 sm:p-6 pb-0">
                        <div className={cn(ui.section)}>
                            {/* Header */}
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                    1
                                </div>
                                <h3 className={cn(ui.headerText.inactive)}>
                                    Patient Identification
                                </h3>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">
                                    Mobile Number / MRN
                                </label>
                                <div className="relative group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                                    <input
                                        id="input-patient-search"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (matches.length > 0) {
                                                    setSelectedMatchIndex(prev => (prev < matches.length - 1 ? prev + 1 : 0));
                                                }
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (matches.length > 0) {
                                                    setSelectedMatchIndex(prev => (prev > 0 ? prev - 1 : matches.length - 1));
                                                }
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (selectedMatchIndex >= 0 && selectedMatchIndex < matches.length) {
                                                    const chosen = matches[selectedMatchIndex];
                                                    handleSelectPatient({ ...chosen, id: chosen.id || chosen.Id || chosen.patientId });
                                                } else if (matches.length === 1) {
                                                    const chosen = matches[0];
                                                    handleSelectPatient({ ...chosen, id: chosen.id || chosen.Id || chosen.patientId });
                                                }
                                            } else if (e.key === 'Tab') {
                                                if (!e.shiftKey && matches.length > 0) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const targetIdx = selectedMatchIndex >= 0 ? selectedMatchIndex : 0;
                                                    setSelectedMatchIndex(targetIdx);
                                                    const targetP = matches[targetIdx];
                                                    const pId = targetP.id || targetP.Id || targetP.patientId;
                                                    const selectBtn = document.getElementById(`btn-select-patient-${pId}`);
                                                    if (selectBtn) {
                                                        selectBtn.focus();
                                                    }
                                                }
                                            }
                                        }}
                                        placeholder="Search by Mobile..."
                                        className={cn(
                                            "w-full h-11 rounded-xl !pl-10 !pr-10 py-2.5 text-base font-medium tracking-normal focus:outline-none transition-all synos-focus-input",
                                            ui.input
                                        )}
                                        autoFocus
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsNewPatientMode(true);
                                            setStartWithNoMobile(true);
                                        }}
                                        className="text-xs font-semibold text-slate-500 hover:text-synos-primary dark:text-zinc-400 dark:hover:text-synos-primary transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                                        <span>No mobile number? Register Walk-in</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BLOCK B: SEARCH RESULTS (The ONLY Scrolling Region) */}
                    <div ref={resultsContainerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-4 sm:p-6 pt-3 space-y-3">
                        {matches.length > 0 && (
                            <>
                                {matches.map((p, idx) => {
                                    const pId = p.id || p.Id || p.patientId;
                                    const isHighlighted = idx === selectedMatchIndex;
                                    return (
                                        <div
                                            key={pId}
                                            className="rounded-2xl transition-all duration-150"
                                        >
                                            <RichPatientCard
                                                patient={p}
                                                onAction={() => handleSelectPatient({ ...p, id: pId })}
                                                actionLabel="Select"
                                                patientIndex={idx}
                                                isHighlighted={isHighlighted}
                                                onHighlight={(highlightIdx) => setSelectedMatchIndex(highlightIdx)}
                                            />
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* PART 1: CONTENT CARD FOOTER (Scrolls with list) */}
                        {searchQuery.length > 2 && !isSearching && (
                            <div className={cn(
                                "rounded-lg p-6 flex flex-col items-center gap-2 transition-all mt-2",
                                matches.length > 0
                                    ? (isDark ? "border-t border-zinc-800 pt-8" : "border-t border-zinc-100 pt-8")
                                    : cn("border border-dashed", ui.emptyBox)
                            )}>
                                {matches.length === 0 ? (
                                    <span className="type-body">No match found.</span>
                                ) : (
                                    <span className="type-label text-center px-4 opacity-70">
                                        Family member sharing this number?
                                    </span>
                                )}

                                <button
                                    id="btn-new-patient"
                                    onClick={() => setIsNewPatientMode(true)}
                                    onFocus={() => setSelectedMatchIndex(-1)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                                            const allButtons = Array.from(document.querySelectorAll('[data-patient-select-btn="true"]'));
                                            if (allButtons.length > 0) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const lastBtn = allButtons[allButtons.length - 1];
                                                lastBtn.focus();
                                                setSelectedMatchIndex(allButtons.length - 1);
                                            }
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-1.5 rounded-md type-label shadow-sm transition-colors synos-focus-btn",
                                        matches.length > 0
                                            ? (isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200 border")
                                            : (isDark ? "bg-zinc-100 hover:bg-white text-zinc-900" : "bg-zinc-900 hover:bg-black text-white")
                                    )}
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    {matches.length > 0 ? "Add Family Member" : "Create New Patient"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NEW PATIENT FORM (Inline) */}
            {isNewPatientMode && (
                <div className={cn("rounded-2xl p-4 sm:p-5 animate-in slide-in-from-right-2 border shadow-lg overflow-y-auto max-h-[calc(100vh-140px)]", ui.form)}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            1
                        </div>
                        <h3 className={cn(ui.headerText.inactive)}>
                            Patient Identification
                        </h3>
                    </div>

                    <div className="flex items-center justify-between mb-4 mt-2">
                        <h4 className={cn("type-value flex items-center gap-2", isDark ? "text-white" : "text-zinc-900")}>
                            <UserPlus className="w-4 h-4 text-emerald-500" />
                            New Patient
                        </h4>
                        <button
                            onClick={() => setIsNewPatientMode(false)}
                            className="type-label hover:text-zinc-900 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>

                    <RegisterFormInline
                        initialMobile={searchQuery}
                        initialNoMobile={startWithNoMobile}
                        onSuccess={(result, data) => {
                            // Ensure MRN, health card and other metadata from backend are preserved
                            onSelectPatient({ ...data, ...result, id: result.patientId }, data); 
                            setIsNewPatientMode(false);
                            setStartWithNoMobile(false);
                        }}
                        onCancel={() => {
                            setIsNewPatientMode(false);
                            setStartWithNoMobile(false);
                        }}
                    />
                </div>
            )}
        </div>
    )
}


const DEFAULT_HEALTH_CARD_PLANS = [
    { planId: "c0000000-0000-0000-0000-000000000001", planCode: "HC-INDIVIDUAL", planName: "Individual Care (1 Person)", price: 500, maxMembers: 1, defaultDiscountPercentage: 30 },
    { planId: "c0000000-0000-0000-0000-000000000002", planCode: "HC-COUPLE-2", planName: "Couple Care (2 Persons)", price: 1000, maxMembers: 2, defaultDiscountPercentage: 30 },
    { planId: "c0000000-0000-0000-0000-000000000003", planCode: "HC-FAMILY-3", planName: "Family of 3", price: 1500, maxMembers: 3, defaultDiscountPercentage: 30 },
    { planId: "c0000000-0000-0000-0000-000000000004", planCode: "HC-FAMILY-4", planName: "Family of 4", price: 2000, maxMembers: 4, defaultDiscountPercentage: 30 }
];

function RegisterFormInline({ onSuccess, onCancel, initialMobile = '', initialNoMobile = false }) {
    const [formData, setFormData] = useState({ name: '', mobile: initialMobile, gender: 'Male' });
    const [hasNoMobile, setHasNoMobile] = useState(Boolean(initialNoMobile));
    const [noMobileReason, setNoMobileReason] = useState('Elderly / Senior');
    const [entryMode, setEntryMode] = useState("dob"); // "dob" or "age"
    const [dob, setDob] = useState("");
    const [age, setAge] = useState("");
    const [ageUnit, setAgeUnit] = useState("Years"); // "Years", "Months", "Days"
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Health Card Instant Subscription State (Pre-populated with default plans for 0ms lag)
    const [issueHealthCard, setIssueHealthCard] = useState(false);
    const [healthCardPlans, setHealthCardPlans] = useState(DEFAULT_HEALTH_CARD_PLANS);
    const [selectedPlanId, setSelectedPlanId] = useState(DEFAULT_HEALTH_CARD_PLANS[0].planId);
    const [hcDiscountType, setHcDiscountType] = useState('Percentage'); // 'Percentage' | 'Flat'
    const [hcDiscountValue, setHcDiscountValue] = useState('30');
    const [hcPaymentMode, setHcPaymentMode] = useState('Cash'); // Cash, UPI, Card

    // Fuzzy matching state for duplicate MRN prevention
    const [fuzzyMatches, setFuzzyMatches] = useState([]);
    const [isSearchingFuzzy, setIsSearchingFuzzy] = useState(false);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Fetch Health Card plans
    useEffect(() => {
        HealthCardApi.getPlans().then(plans => {
            if (plans && plans.length > 0) {
                setHealthCardPlans(plans);
                setSelectedPlanId(prev => (plans.some(p => p.planId === prev) ? prev : plans[0].planId));
            }
        }).catch(err => console.error('Failed to load health card plans', err));
    }, []);

    const handleSelectPlan = (plan) => {
        setSelectedPlanId(plan.planId);
        if (hcDiscountType === 'Percentage') {
            setHcDiscountValue(String(plan.defaultDiscountPercentage || 30));
        }
    };

    const reasons = [
        'Elderly / Senior',
        'Emergency Walk-in',
        'Minor / Child',
        'Refused / No Phone'
    ];

    const ui = isDark ? {
        container: "bg-zinc-900/50 border-zinc-800",
        label: "type-label text-zinc-400",
        input: "bg-black border-zinc-800 text-white focus:border-synos-primary type-body",
        genderBox: "bg-black border-zinc-800",
        genderBtn: {
            active: "bg-zinc-800 text-white font-medium shadow-sm",
            inactive: "text-zinc-500 hover:text-zinc-300"
        }
    } : {
        container: "p-4 rounded-xl bg-black/[0.02] border border-black/5 shadow-inner space-y-4",
        label: "type-label mb-1.5 block",
        input: "bg-white/85 border-white/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] type-body focus:ring-1 focus:ring-black/5 transition-all placeholder:text-zinc-400 disabled:opacity-50",
        genderBox: "bg-black/5 p-1 rounded-lg border border-black/5",
        genderBtn: {
            active: "bg-white text-zinc-900 font-bold shadow-sm ring-1 ring-black/5",
            inactive: "text-zinc-500 hover:text-zinc-900 font-medium"
        }
    };

    // Live Fuzzy Match Effect: Searches for potential existing patients in DB
    useEffect(() => {
        const cleanName = (formData.name || '').trim();
        if (cleanName.length < 2) {
            setFuzzyMatches([]);
            return;
        }

        let calcAge = null;
        if (entryMode === "age" && age) {
            calcAge = parseInt(age, 10);
        } else if (entryMode === "dob" && dob) {
            const birthYear = new Date(dob).getFullYear();
            calcAge = new Date().getFullYear() - birthYear;
        }

        const timer = setTimeout(async () => {
            setIsSearchingFuzzy(true);
            try {
                const results = await ReceptionApi.fuzzyMatchPatients({
                    name: cleanName,
                    gender: formData.gender,
                    age: calcAge && !isNaN(calcAge) ? calcAge : undefined,
                    dob: entryMode === "dob" && dob ? dob : undefined
                });
                setFuzzyMatches(results || []);
            } catch (err) {
                console.error("Fuzzy search error", err);
            } finally {
                setIsSearchingFuzzy(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [formData.name, formData.gender, age, dob, entryMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanName = (formData.name || '').trim();
        const cleanMobile = (formData.mobile || '').trim();

        if (!cleanName) {
            setError("Full Name is required");
            return;
        }

        if (cleanName.length > 100) {
            setError("Name cannot exceed 100 characters");
            return;
        }

        if (!hasNoMobile) {
            if (!cleanMobile) {
                setError("Mobile number is required, or check 'No Mobile Number'");
                return;
            }

            // Phone validation: 10-15 digits
            const phoneRegex = /^[0-9]{10,15}$/;
            if (!phoneRegex.test(cleanMobile)) {
                setError("Mobile number must be a valid 10 to 15 digit number");
                return;
            }
        }

        let finalDob = null;
        let isDateOfBirthKnown = true;
        let finalAge = null;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        if (entryMode === "dob") {
            if (!dob) {
                setError("Date of Birth is required");
                return;
            }
            if (dob > todayStr) {
                setError("Date of Birth cannot be in the future");
                return;
            }
            const birthYear = new Date(dob).getFullYear();
            if (birthYear < today.getFullYear() - 130) {
                setError("Date of Birth cannot be older than 130 years");
                return;
            }
            finalDob = dob;
            isDateOfBirthKnown = true;
            
            // simple year difference for fallback
            const diffYears = today.getFullYear() - birthYear;
            finalAge = diffYears >= 0 ? diffYears : 0;
        } else {
            if (!age || isNaN(parseInt(age, 10))) {
                setError("Age is required");
                return;
            }
            const num = parseInt(age, 10);
            if (num < 0 || num > 130) {
                setError("Age must be between 0 and 130");
                return;
            }
            isDateOfBirthKnown = false;
            const d = new Date();
            if (ageUnit === "Years") {
                d.setFullYear(d.getFullYear() - num);
                finalAge = num;
            } else if (ageUnit === "Months") {
                d.setMonth(d.getMonth() - num);
                finalAge = 0;
            } else if (ageUnit === "Days") {
                d.setDate(d.getDate() - num);
                finalAge = 0;
            }
            finalDob = d.toISOString().split('T')[0];
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const apiPayload = {
                ...formData,
                mobile: hasNoMobile ? '' : cleanMobile,
                hasNoMobile,
                noMobileReason: hasNoMobile ? noMobileReason : null,
                dob: finalDob,
                isDateOfBirthKnown,
                age: finalAge
            };
            const result = await ReceptionApi.registerPatient(apiPayload);
            if (result && result.patientId) {
                let cardRes = null;
                const chosenPlan = healthCardPlans.find(p => p.planId === selectedPlanId) || 
                                   DEFAULT_HEALTH_CARD_PLANS.find(p => p.planId === selectedPlanId) || 
                                   DEFAULT_HEALTH_CARD_PLANS[0];

                if (issueHealthCard && selectedPlanId) {
                    try {
                        cardRes = await HealthCardApi.issueCard({
                            planId: chosenPlan.planId,
                            primaryPatientId: result.patientId,
                            pricePaid: chosenPlan.price || 1000,
                            paymentMode: hcPaymentMode,
                            discountType: hcDiscountType,
                            discountValue: parseFloat(hcDiscountValue) || 30,
                            validityDays: 365,
                            isPendingPayment: true
                        });
                        window.dispatchEvent(new CustomEvent('synos:healthcard-issued', { detail: cardRes }));
                    } catch (cardErr) {
                        console.error('Health card issuance failed during registration', cardErr);
                    }
                }
                onSuccess(result, { 
                    ...formData, 
                    currentPhoneNumber: hasNoMobile ? '' : cleanMobile,
                    dob: finalDob, 
                    isDateOfBirthKnown, 
                    age: finalAge,
                    mrn: result.mrn,
                    healthCardToBill: issueHealthCard ? {
                        planId: chosenPlan.planId,
                        planCode: chosenPlan.planCode,
                        planName: chosenPlan.planName,
                        price: chosenPlan.price,
                        discountType: hcDiscountType,
                        discountValue: parseFloat(hcDiscountValue) || 30,
                        card: cardRes
                    } : null
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={cn("animate-in fade-in zoom-in-95 duration-200", ui.container)}>
            {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="space-y-4">
                {/* 1. NAME */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className={ui.label}>Full Name <span className="text-red-400">*</span></label>
                        {isSearchingFuzzy && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin text-synos-primary" />
                                Checking duplicates...
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            maxLength={100}
                            className={cn("w-full h-10 rounded-lg pl-9 pr-4 py-2 outline-none", ui.input)}
                            placeholder="e.g. Rahul Sharma"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                        />
                    </div>
                </div>

                {/* 2. ROW: MOBILE + ENTRY MODE */}
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={ui.label}>
                                Mobile {!hasNoMobile && <span className="text-red-400">*</span>}
                            </label>
                            <input
                                type="tel"
                                maxLength={15}
                                disabled={hasNoMobile}
                                className={cn(
                                    "w-full h-10 rounded-lg px-3 py-2 outline-none transition-all",
                                    ui.input,
                                    hasNoMobile && "opacity-60 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                )}
                                placeholder={hasNoMobile ? "No Mobile (Physical Pickup)" : "987..."}
                                value={hasNoMobile ? "" : formData.mobile}
                                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={ui.label}>Entry Method <span className="text-red-400">*</span></label>
                            <div className={cn("flex", ui.genderBox)}>
                                {[
                                    { key: "dob", label: "DOB" },
                                    { key: "age", label: "Age" }
                                ].map(mode => (
                                    <button
                                        key={mode.key}
                                        type="button"
                                        onClick={() => setEntryMode(mode.key)}
                                        className={cn(
                                            "flex-1 text-xs py-1.5 rounded-md transition-all duration-200",
                                            entryMode === mode.key ? ui.genderBtn.active : ui.genderBtn.inactive
                                        )}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* NO MOBILE TOGGLE & AUDIT REASON */}
                    <div className="pt-0.5">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={hasNoMobile}
                                onChange={e => setHasNoMobile(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-synos-primary focus:ring-synos-primary accent-synos-primary cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                No Mobile Number (Physical Hardcopy Pickup Only)
                            </span>
                        </label>

                        {hasNoMobile && (
                            <div className="mt-2.5 p-3 rounded-xl bg-slate-100/80 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 space-y-2.5 animate-in fade-in duration-150">
                                <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                    </div>
                                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 leading-snug">
                                        Reports will <strong className="text-slate-900 dark:text-white font-semibold">NOT</strong> be dispatched via WhatsApp. Physical hardcopy report pickup at front desk only.
                                    </p>
                                </div>
                                <div className="flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/70 dark:border-zinc-700/60">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-zinc-400 mr-1">Reason:</span>
                                    {reasons.map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setNoMobileReason(r)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                                noMobileReason === r
                                                    ? "bg-synos-primary text-white shadow-xs font-bold"
                                                    : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-750"
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. ROW: DOB or AGE INPUT */}
                {entryMode === "dob" ? (
                    <div className="grid grid-cols-2 gap-4 items-end animate-in fade-in duration-200">
                        <div>
                            <label className={ui.label}>Date of Birth <span className="text-red-400">*</span></label>
                            <input
                                type="date"
                                className={cn("w-full h-10 rounded-lg px-3 py-2 outline-none", ui.input)}
                                value={dob}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => setDob(e.target.value)}
                            />
                        </div>
                        <div className="h-10 flex items-center pl-2">
                            {dob ? (
                                <div className="text-xs text-zinc-500 font-medium">
                                    Calculated Age: <span className="text-synos-primary font-bold">{calculateDetailedAge(dob).text}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-zinc-400 italic">Enter DOB to calculate age</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                        <div>
                            <label className={ui.label}>Age <span className="text-red-400">*</span></label>
                            <input
                                type="number"
                                min="0"
                                className={cn("w-full h-10 rounded-lg px-3 py-2 outline-none", ui.input)}
                                placeholder="Age"
                                value={age}
                                onChange={e => setAge(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={ui.label}>Age Unit <span className="text-red-400">*</span></label>
                            <select
                                className={cn("w-full h-10 rounded-lg px-3 py-2 outline-none border", ui.input)}
                                value={ageUnit}
                                onChange={e => setAgeUnit(e.target.value)}
                            >
                                <option value="Years">Years</option>
                                <option value="Months">Months</option>
                                <option value="Days">Days</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* 4. GENDER SEGMENTED CONTROL */}
                <div>
                    <label className={ui.label}>Gender <span className="text-red-400">*</span></label>
                    <div className={cn("flex", ui.genderBox)}>
                        {['Male', 'Female', 'Other'].map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setFormData({ ...formData, gender: g })}
                                className={cn(
                                    "flex-1 text-xs py-1.5 rounded-md transition-all duration-200",
                                    formData.gender === g ? ui.genderBtn.active : ui.genderBtn.inactive
                                )}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 5. OPTIONAL HEALTH CARD MEMBERSHIP ISSUANCE */}
                <div className="pt-1">
                    <div className={cn(
                        "rounded-xl border transition-all p-3 space-y-3",
                        issueHealthCard 
                            ? (isDark ? "bg-blue-950/20 border-blue-850" : "bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-blue-200/80 shadow-xs")
                            : (isDark ? "bg-zinc-800/20 border-zinc-800" : "bg-black/[0.015] border-black/5 hover:border-black/10")
                    )}>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={issueHealthCard}
                                    onChange={e => setIssueHealthCard(e.target.checked)}
                                    className="w-4 h-4 rounded border-blue-400 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                    Issue Health Card Subscription (Instant Membership)
                                </span>
                            </label>
                            <span className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                                issueHealthCard 
                                    ? "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60" 
                                    : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800"
                            )}>
                                {issueHealthCard ? "Active Add-on" : "Optional"}
                            </span>
                        </div>

                        {issueHealthCard && (
                            <div className="space-y-3 pt-2 border-t border-blue-100 dark:border-blue-900/40 animate-in fade-in duration-200">
                                {/* TIER SELECTION (2x2 Grid Layout) */}
                                <div>
                                    <label className={cn("text-[11px] font-bold block mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                                        Select Subscription Tier
                                    </label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {healthCardPlans.map(plan => {
                                            const isSelected = selectedPlanId === plan.planId;
                                            return (
                                                <button
                                                    key={plan.planId}
                                                    type="button"
                                                    onClick={() => handleSelectPlan(plan)}
                                                    className={cn(
                                                        "p-3 rounded-xl text-left transition-all border cursor-pointer relative",
                                                        isSelected
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30"
                                                            : (isDark ? "bg-zinc-850 hover:bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800")
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-xs font-bold truncate pr-1">{plan.planName}</div>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                                    </div>
                                                    <div className={cn("text-sm font-black font-mono mt-1", isSelected ? "text-white" : "text-blue-600 dark:text-blue-400")}>
                                                        ₹{plan.price.toLocaleString()}
                                                    </div>
                                                    <div className={cn("text-[11px] mt-0.5", isSelected ? "text-blue-100" : "text-zinc-500")}>
                                                        {plan.maxMembers} Member{plan.maxMembers > 1 ? 's' : ''} • 365 Days
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* DUAL-POINT FREEDOM DISCOUNT EDITING */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>
                                                Card Discount Rate
                                            </label>
                                            <span className="text-[10px] text-zinc-500">Dual-Point Freedom</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex rounded-lg border border-slate-200 dark:border-zinc-700 p-0.5 bg-slate-100 dark:bg-zinc-800 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setHcDiscountType('Percentage')}
                                                    className={cn(
                                                        "px-2 py-1 text-xs rounded font-bold transition-all",
                                                        hcDiscountType === 'Percentage' ? "bg-white dark:bg-zinc-700 text-blue-600 shadow-2xs" : "text-zinc-500"
                                                    )}
                                                >
                                                    %
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setHcDiscountType('Flat')}
                                                    className={cn(
                                                        "px-2 py-1 text-xs rounded font-bold transition-all",
                                                        hcDiscountType === 'Flat' ? "bg-white dark:bg-zinc-700 text-blue-600 shadow-2xs" : "text-zinc-500"
                                                    )}
                                                >
                                                    ₹ Flat
                                                </button>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                max={hcDiscountType === 'Percentage' ? 100 : 10000}
                                                value={hcDiscountValue}
                                                onChange={e => setHcDiscountValue(e.target.value)}
                                                className={cn("h-8 rounded-lg px-2 text-xs font-bold outline-none flex-1 border", ui.input)}
                                                placeholder={hcDiscountType === 'Percentage' ? 'e.g. 30' : 'e.g. 200'}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-300" : "text-slate-700")}>
                                            Card Payment Mode (Cashier POS)
                                        </label>
                                        <div className="flex items-center gap-1">
                                            {['Cash', 'UPI', 'Card'].map(mode => (
                                                <button
                                                    key={mode}
                                                    type="button"
                                                    onClick={() => setHcPaymentMode(mode)}
                                                    className={cn(
                                                        "flex-1 py-1 text-xs font-bold rounded-lg border transition-all",
                                                        hcPaymentMode === mode
                                                            ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xs"
                                                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                                    * Valid for 1 Year (365 days). Handled in Cash Drawer as Health Card Sale. Can also be overridden at billing time.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* INSTANT FUZZY MATCH BANNER (ANTI-SPAM DUPLICATE PREVENTION) */}
            {fuzzyMatches.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                        <span className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                            Found {fuzzyMatches.length} Matching Walk-in Patient{fuzzyMatches.length > 1 ? 's' : ''} in System
                        </span>
                        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                            1-Click Select
                        </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {fuzzyMatches.map(m => (
                            <div
                                key={m.mrn || m.patientId}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/90 dark:bg-zinc-800/90 border border-amber-200/60 dark:border-zinc-700 shadow-2xs"
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-zinc-900 dark:text-white truncate">{m.name}</span>
                                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">({m.age} Yrs, {m.gender})</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                                        <span className="font-mono font-bold bg-slate-100 dark:bg-zinc-700 px-1.5 py-0.2 rounded text-zinc-700 dark:text-zinc-300">
                                            MRN: {m.mrn}
                                        </span>
                                        {m.currentPhoneNumber ? (
                                            <span>Phone: {m.currentPhoneNumber}</span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400 font-semibold">Walk-in (No Phone)</span>
                                        )}
                                        {m.lastVisitDate && (
                                            <span>• Last: {new Date(m.lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSuccess({ patientId: m.patientId, mrn: m.mrn }, { ...m, id: m.patientId });
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-synos-primary hover:bg-synos-primary/90 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                                >
                                    <Zap className="w-3 h-3 fill-current" />
                                    <span>Use Patient</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIONS (Sticky Footer: Always visible and accessible on small screens) */}
            <div className="sticky bottom-0 bg-white/95 dark:bg-zinc-900/95 pt-3 pb-2 backdrop-blur-md border-t border-slate-200/80 dark:border-zinc-800 -mx-4 px-4 -mb-4 rounded-b-xl z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex items-center gap-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-2 rounded-lg border border-transparent hover:bg-black/5 text-zinc-500 text-xs font-medium transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                        "flex-[2] text-white text-sm font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 cursor-pointer",
                        isDark
                            ? "bg-emerald-600 hover:bg-emerald-500"
                            : "bg-gradient-to-r from-zinc-800 to-zinc-950 hover:to-black border-t border-white/20"
                    )}
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Register & Select
                </button>
            </div>
        </form>
    );
}
