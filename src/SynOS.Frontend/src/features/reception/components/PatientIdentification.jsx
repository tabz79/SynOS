import { useState, useEffect } from 'react'
import { Search, X, Loader2, UserPlus, Phone, Fingerprint, ArrowRight, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReceptionApi } from '@/api/reception'
import { useTheme } from '@/context/ThemeContext'
import { RichPatientCard, calculateDetailedAge } from '@/components/patient/RichPatientCard'


export function PatientIdentification({ snapshot, onSelectPatient, onClearPatient }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [matches, setMatches] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Local UI state for "New Patient Form" visibility
    const [isNewPatientMode, setIsNewPatientMode] = useState(false);

    // Derived from Snapshot
    const selectedPatient = snapshot?.patient;

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        indicator: {
            active: "bg-synos-primary type-value border-synos-primary",
            inactive: "bg-zinc-800 border-synos-border type-label"
        },
        headerText: {
            active: "type-value",
            inactive: "type-value"
        },
        input: "bg-zinc-900 border-synos-border type-code focus:border-synos-primary",
        emptyBox: "bg-zinc-800/30 border-zinc-700 type-body",
        form: "bg-zinc-900 border-synos-border",
        formLabel: "type-section-header",
        formInput: "bg-black border-zinc-800 type-body focus:border-synos-primary"
    } : {
        indicator: {
            active: "bg-white type-value border-zinc-200 shadow-sm",
            inactive: "type-label border-black/10 shadow-none bg-white/20"
        },
        headerText: {
            active: "type-value",
            inactive: "type-value opacity-60"
        },
        // UNIFIED RECESSED SECTION
        section: "p-4 rounded-lg bg-black/[0.04] border border-black/5 shadow-inner space-y-3",
        // ETCHED INPUT
        input: "bg-white/85 border-white/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] type-code focus:ring-1 focus:ring-black/5 transition-all",
        emptyBox: "border-dashed border-black/20 type-body opacity-60",
        form: "ring-0 space-y-4",
        formLabel: "type-section-header opacity-70",
        formInput: "bg-white/85 border-white/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] type-body focus:border-black"
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
                <div className="animate-in fade-in slide-in-from-top-2 pt-4 px-4 space-y-4">
                    {/* ... (Existing Locked View) ... */}
                    {/* NOTE: This uses RichPatientCard which handles its own locked state style */}
                    <div className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border", ui.indicator.active)}>1</div>
                        <h3 className={cn("tracking-tight", ui.headerText.active)}>Patient Identification</h3>
                    </div>
                    <RichPatientCard
                        patient={selectedPatient}
                        onAction={onClearPatient}
                        actionLabel="Change"
                        isLocked={true}
                    />
                </div>
            )}

            {/* SEARCH STATE (No Patient) */}
            {!selectedPatient && !isNewPatientMode && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden animate-in fade-in">

                    {/* BLOCK A: PATIENT IDENTIFICATION HEADER (Static) */}
                    <div className="shrink-0 p-4 pb-0">
                        <div className={cn(ui.section)}>
                            {/* Header */}
                            <div className="flex items-center gap-2">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors", ui.indicator.inactive)}>1</div>
                                <h3 className={cn("tracking-tight", ui.headerText.inactive)}>Patient Identification</h3>
                            </div>

                            <div className="space-y-1">
                                <label className={cn("block type-section-header ml-1 transition-colors",
                                    isDark ? "text-zinc-500" : "text-zinc-500")}
                                >
                                    Mobile Number / MRN
                                </label>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-900 transition-colors" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by Mobile..."
                                        className={cn(
                                            "w-full h-10 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 transition-all type-code",
                                            isDark
                                                ? "bg-black border-zinc-700 focus:ring-synos-primary"
                                                : ui.input // Use Etched Input Style
                                        )}
                                        autoFocus
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500 animate-spin" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BLOCK B: SEARCH RESULTS (The ONLY Scrolling Region) */}
                    {/* BLOCK B: SEARCH RESULTS (The ONLY Scrolling Region) */}
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-4 pt-3 space-y-3">
                        {matches.length > 0 && (
                            <>
                                {matches.map(p => {
                                    const pId = p.id || p.Id || p.patientId;
                                    return (
                                        <RichPatientCard
                                            key={pId}
                                            patient={p}
                                            onAction={() => handleSelectPatient({ ...p, id: pId })}
                                            actionLabel="Select"
                                        />
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
                                    onClick={() => setIsNewPatientMode(true)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-1.5 rounded-md type-label shadow-sm transition-colors",
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
                    <div className="flex items-center gap-2 mb-4">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border", ui.indicator.inactive)}>1</div>
                        <h3 className={cn("uppercase tracking-wide", ui.headerText.inactive)}>Patient Identification</h3>
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
                        onSuccess={(result, data) => {
                            // Ensure MRN and other metadata from backend are preserved
                            onSelectPatient({ ...data, ...result, id: result.patientId }); 
                            setIsNewPatientMode(false);
                        }}
                    />
                </div>
            )}
        </div>
    )
}


function RegisterFormInline({ onSuccess, onCancel, initialMobile = '' }) {
    const [formData, setFormData] = useState({ name: '', mobile: initialMobile, gender: 'Male' });
    const [entryMode, setEntryMode] = useState("dob"); // "dob" or "age"
    const [dob, setDob] = useState("");
    const [age, setAge] = useState("");
    const [ageUnit, setAgeUnit] = useState("Years"); // "Years", "Months", "Days"
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.mobile) {
            setError("Name and Mobile are required");
            return;
        }

        let finalDob = null;
        let isDateOfBirthKnown = true;
        let finalAge = null;

        if (entryMode === "dob") {
            if (!dob) {
                setError("Date of Birth is required");
                return;
            }
            finalDob = dob;
            isDateOfBirthKnown = true;
            
            // simple year difference for fallback
            const diffYears = new Date().getFullYear() - new Date(dob).getFullYear();
            finalAge = diffYears >= 0 ? diffYears : 0;
        } else {
            if (!age || isNaN(parseInt(age, 10))) {
                setError("Age is required");
                return;
            }
            isDateOfBirthKnown = false;
            const num = parseInt(age, 10);
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
                dob: finalDob,
                isDateOfBirthKnown,
                age: finalAge
            };
            const result = await ReceptionApi.registerPatient(apiPayload);
            if (result && result.patientId) {
                onSuccess(result, { ...formData, dob: finalDob, isDateOfBirthKnown, age: finalAge });
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
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {/* 1. NAME */}
                <div>
                    <label className={ui.label}>Full Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input
                            className={cn("w-full h-10 rounded-lg pl-9 pr-4 py-2 outline-none", ui.input)}
                            placeholder="e.g. Rahul Sharma"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                        />
                    </div>
                </div>

                {/* 2. ROW: MOBILE + ENTRY MODE */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={ui.label}>Mobile <span className="text-red-400">*</span></label>
                        <input
                            className={cn("w-full h-10 rounded-lg px-3 py-2 outline-none", ui.input)}
                            placeholder="987..."
                            value={formData.mobile}
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
                        "flex-[2] text-white text-sm font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95",
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
