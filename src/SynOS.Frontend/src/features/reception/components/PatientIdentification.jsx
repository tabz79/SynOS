import { useState, useEffect } from 'react'
import { Search, X, Loader2, UserPlus, Phone, Fingerprint, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReceptionApi } from '@/api/reception'
import { useTheme } from '@/context/ThemeContext'


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
            active: "bg-zinc-900 type-value border-zinc-900",
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
                // Real API Search
                // Note: reception.js has searchPatients
                const results = await ReceptionApi.searchPatients(searchQuery);
                setMatches(results || []);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectPatient = (patient) => {
        onSelectPatient(patient);
    };

    return (
        <div className="space-y-4">

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
                <div className="space-y-4 animate-in fade-in px-4 pt-4">

                    {/* SECTION 1: SEARCH CONTEXT (Verified Recess) */}
                    <div className={cn(ui.section, "sticky top-0 z-20 transition-all")}>
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

                    {/* SECTION 2: RESULTS (Verified Recess) */}
                    {matches.length > 0 && (
                        <div className={cn(ui.section, "space-y-1")}>
                            {/* Header for Results? Optional. */}
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
                        </div>
                    )}

                    {/* SECTION 3: CREATE NEW (Verified Recess if needed, or leave as ghost) */}
                    {/* For now, keep as ghost unless results exist */}
                    {searchQuery.length > 3 && !isSearching && (
                        <div className={cn(

                            "rounded-lg p-6 flex flex-col items-center gap-2 transition-all",
                            matches.length > 0
                                ? (isDark ? "border-t border-zinc-800 pt-4" : "border-t border-zinc-100 pt-4")
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
                        onSuccess={(pid, data) => {
                            onSelectPatient({ ...data, id: pid, mobile: data.mobile }); // Ensure mobile mapping
                            setIsNewPatientMode(false);
                        }}
                    />
                </div>
            )}
        </div>
    )
}

const RichPatientCard = ({ patient, onAction, actionLabel, isLocked }) => {
    // Robust extraction
    const p = patient;
    let name = p.name || p.Name || p.fullName || p.FullName || p.displayName || p.DisplayName || `${p.firstName || p.FirstName || ''} ${p.lastName || p.LastName || ''}`.trim();
    const mobile = p.mobile || p.Mobile || p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || p.currentPhoneNumber || p.CurrentPhoneNumber;
    const mrn = p.mrn || p.MRN || "—";
    const age = p.age || p.Age;

    // Normalize Gender (Handle: Male, male, M, m, etc)
    const rawGender = p.gender || p.Gender || p.sex || p.Sex || '';
    const genderInitial = rawGender ? rawGender.charAt(0).toUpperCase() : 'P';
    const genderLabel = rawGender ? rawGender : '-';

    const lastVisitDate = p.lastVisitDate || p.LastVisitDate;
    const lastVisitTestCodes = p.lastVisitTestCodes || p.LastVisitTestCodes || p.testCodes || p.TestCodes || p.tests || p.Tests || (p.lastVisit && (p.lastVisit.testCodes || p.lastVisit.TestCodes));

    // Cleaner Name Logic: If name ends with " Patient", strip it IF cleaner look desired
    if (name && name.endsWith(' Patient')) {
        name = name.replace(' Patient', '');
    }

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const cardUi = isDark ? {
        locked: "bg-synos-primary/10 border border-synos-primary/30 cursor-default",
        inactive: "bg-zinc-800/50 hover:bg-zinc-800 border border-synos-border hover:border-synos-primary/50 cursor-pointer",
        name: isLocked ? "text-white" : "text-zinc-200 group-hover:text-white",
        badge: isLocked ? "bg-synos-primary/20 border-synos-primary/30 text-synos-primary" : "bg-zinc-700 text-zinc-300",
        mrn: "bg-zinc-900 border-zinc-800 text-zinc-600"
    } : {
        // LIGHT MODE: SINGLE SLAB LIST ITEM
        // Locked = Active Selection (Etched)
        locked: "bg-black/[0.04] border border-black/5 shadow-inner rounded-lg cursor-default",
        // Inactive = List Item (No BG, just hover)
        inactive: "hover:bg-black/[0.02] border-b border-white/20 cursor-pointer transition-colors rounded-none px-2",
        name: isLocked ? "type-value text-black font-semibold" : "type-value group-hover:text-black",
        badge: isLocked ? "bg-white border-zinc-200 text-black shadow-sm" : "bg-white/50 border-zinc-200/50 text-zinc-600",
        mrn: "bg-white/50 border-zinc-200/50 text-black font-medium"
    };

    return (
        <div
            onClick={onAction}
            className={cn(
                "p-3 rounded-lg flex flex-col gap-3 transition-all group",
                isLocked ? cardUi.locked : cardUi.inactive
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center type-value",
                        isLocked
                            ? "bg-synos-primary text-white shadow-sm"
                            : "bg-synos-primary/20 text-synos-primary"
                    )}>
                        {genderInitial}
                    </div>
                    <div>
                        <div className={cn(
                            "truncate pr-2 type-value", // Truncate long names
                            cardUi.name
                        )}>
                            {name}
                        </div>

                        {/* Meta Row: Badges + Mobile */}
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                            {/* Age Badge */}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-full type-meta",
                                cardUi.badge
                            )}>
                                {age ? `${age}Y` : 'N/A'}
                            </span>

                            {/* Gender Badge */}
                            {rawGender && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full uppercase border type-meta",
                                    isLocked
                                        ? "bg-synos-primary/20 border-synos-primary/30 text-synos-primary/80"
                                        : (isDark ? "bg-zinc-800 border-zinc-700 text-zinc-500" : "bg-white/80 border-zinc-300 text-zinc-900")
                                )}>
                                    {genderInitial}
                                </span>
                            )}

                            {/* Mobile Number (with separator) */}
                            <span className={cn(
                                "ml-0.5 border-l pl-2 type-code",
                                isLocked
                                    ? (isDark ? "text-synos-primary/80 border-synos-primary/30" : "text-[#0369A1] border-[#0EA5E9]/20")
                                    : (isDark ? "text-zinc-500 border-zinc-700" : "text-zinc-800 border-zinc-300")
                            )}>
                                {mobile}
                            </span>

                            {/* MRN Badge (Enterprise Identity) */}
                            <span className={cn(
                                "ml-1.5 px-1.5 py-0.5 rounded border tracking-wide type-code",
                                isLocked
                                    ? (isDark ? "bg-black/30 text-synos-primary/60 border-synos-primary/20" : "bg-white/40 text-[#075985] border-[#0EA5E9]/20") // Fixed: Dark Blue text + distinct badge
                                    : cardUi.mrn
                            )}>
                                MRN: {mrn}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {actionLabel && (
                        <button className={cn(
                            "underline decoration-zinc-400 underline-offset-2 transition-colors mb-1 type-label",
                            isLocked ? "text-zinc-400 hover:text-white" : "text-[#0369A1] hover:text-synos-primary" // Un-muted Blue
                        )}>
                            {actionLabel}
                        </button>
                    )}

                    {lastVisitDate ? (
                        <div className="text-right">
                            <div className={cn(
                                "type-section-header",
                                isLocked ? "text-synos-primary/60" : "text-zinc-500"
                            )}>Last Visit</div>
                            <div className={cn(
                                "type-code",
                                isLocked ? "text-synos-primary/90" : "text-zinc-900" // Un-muted from 300
                            )}>
                                {new Date(lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </div>
                        </div>
                    ) : (
                        <div className={cn(
                            "px-2 py-1 rounded border type-section-header",
                            isLocked
                                ? "bg-synos-primary/20 text-synos-primary border-synos-primary/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                            New
                        </div>
                    )}
                </div>
            </div>

            {/* Test History Badge Strip */}
            {lastVisitTestCodes && lastVisitTestCodes.length > 0 && (
                <div className={cn(
                    "pt-2 border-t flex flex-wrap gap-1",
                    isLocked ? "border-synos-primary/20" : "border-white/5"
                )}>
                    {lastVisitTestCodes.slice(0, 3).map(code => (
                        <span key={code} className={cn(
                            "px-1.5 py-0.5 rounded border type-code",
                            isLocked
                                ? "bg-black/40 text-synos-primary/80 border-synos-primary/20"
                                : (isDark ? "bg-zinc-700/50 text-zinc-400 border-white/5" : "bg-zinc-200 text-zinc-900 border-zinc-300 shadow-sm")
                        )}>
                            {code}
                        </span>
                    ))}
                    {lastVisitTestCodes.length > 3 && (
                        <span className={cn(
                            "px-1.5 py-0.5 type-code",
                            isLocked ? "text-synos-primary/60" : "text-zinc-500"
                        )}>
                            +{lastVisitTestCodes.length - 3} more
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

function RegisterFormInline({ onSuccess }) {
    const [formData, setFormData] = useState({ name: '', mobile: '', age: '', gender: 'Male' });
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        label: "text-zinc-500",
        input: "bg-black border-zinc-800 text-white focus:border-synos-primary",
        genderBox: "bg-black border-zinc-800",
        genderBtn: {
            active: "bg-zinc-800 text-white font-medium",
            inactive: "text-zinc-500 hover:text-zinc-300"
        }
    } : {
        label: "text-zinc-600",
        input: "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900",
        genderBox: "bg-zinc-100 border-zinc-200",
        genderBtn: {
            active: "bg-white text-zinc-900 font-bold shadow-sm",
            inactive: "text-zinc-500 hover:text-zinc-900"
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.mobile || !formData.age) {
            setError("All fields marked * are required");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await ReceptionApi.registerPatient(formData);
            if (result && result.patientId) {
                onSuccess(result.patientId, formData);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="type-body text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>}

            <div className="space-y-1">
                <label className={cn(ui.label, ui.formLabel)}>Full Name *</label>
                <input
                    className={cn("w-full h-10 rounded px-3 py-2 outline-none transition-all", ui.input)}
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className={cn(ui.label, ui.formLabel)}>Mobile *</label>
                    <input
                        className={cn("w-full h-10 rounded px-3 py-2 outline-none transition-all", ui.input)}
                        placeholder="987..."
                        value={formData.mobile}
                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <label className={cn(ui.label, ui.formLabel)}>Age *</label>
                    <input
                        type="number"
                        className={cn("w-full h-10 rounded px-3 py-2 outline-none transition-all", ui.input)}
                        placeholder="25"
                        value={formData.age}
                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className={cn(ui.label, ui.formLabel)}>Gender *</label>
                <div className={cn("flex rounded p-1 border", ui.genderBox)}>
                    {['Male', 'Female', 'Other'].map(g => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={cn(
                                "flex-1 type-section-header py-1 rounded transition-all",
                                formData.gender === g ? ui.genderBtn.active : ui.genderBtn.inactive
                            )}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                    "w-full mt-2 text-white type-label py-2 rounded transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95",
                    isDark ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-900 hover:bg-black"
                )}
            >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Register & Select
            </button>
        </form>
    );
}
