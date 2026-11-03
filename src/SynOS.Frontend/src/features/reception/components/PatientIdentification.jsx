import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, UserPlus, Phone, Fingerprint, ArrowRight, User, AlertCircle, Zap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReceptionApi } from '@/api/reception'
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
                <div className={cn("rounded-lg p-4 animate-in slide-in-from-right-2 border", ui.form)}>
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
                            // Ensure MRN and other metadata from backend are preserved
                            onSelectPatient({ ...data, ...result, id: result.patientId }); 
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

    // Fuzzy matching state for duplicate MRN prevention
    const [fuzzyMatches, setFuzzyMatches] = useState([]);
    const [isSearchingFuzzy, setIsSearchingFuzzy] = useState(false);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

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
                onSuccess(result, { 
                    ...formData, 
                    currentPhoneNumber: hasNoMobile ? '' : cleanMobile,
                    dob: finalDob, 
                    isDateOfBirthKnown, 
                    age: finalAge,
                    mrn: result.mrn 
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
                                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                            />
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                No Mobile Number (Physical Hardcopy Pickup Only)
                            </span>
                        </label>

                        {hasNoMobile && (
                            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2 animate-in fade-in duration-150">
                                <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Reports will <strong>NOT</strong> be dispatched via WhatsApp. Physical hardcopy report pickup at front desk only.</span>
                                </p>
                                <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                                    <span className="text-[10px] uppercase font-bold text-amber-700/80 dark:text-amber-400">Reason:</span>
                                    {reasons.map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setNoMobileReason(r)}
                                            className={cn(
                                                "px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer",
                                                noMobileReason === r
                                                    ? "bg-amber-600 text-white shadow-xs font-bold"
                                                    : "bg-white/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-amber-200 dark:border-zinc-700 hover:bg-amber-100 dark:hover:bg-zinc-700"
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

            {/* ACTIONS */}
            <div className="pt-2 flex items-center gap-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-2 rounded-lg border border-transparent hover:bg-black/5 text-zinc-500 text-xs font-medium transition-colors"
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
