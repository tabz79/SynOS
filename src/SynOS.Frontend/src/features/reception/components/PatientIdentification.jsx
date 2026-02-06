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
            active: "bg-synos-primary text-white border-synos-primary",
            inactive: "bg-zinc-800 border-synos-border text-zinc-400"
        },
        headerText: {
            active: "text-synos-primary",
            inactive: "text-zinc-200"
        },
        input: "bg-zinc-900 border-synos-border text-white placeholder:text-zinc-600 focus:border-synos-primary",
        emptyBox: "bg-zinc-800/30 border-zinc-700 text-zinc-400",
        form: "bg-zinc-900 border-synos-border",
        formLabel: "text-zinc-500",
        formInput: "bg-black border-zinc-800 text-white focus:border-synos-primary"
    } : {
        indicator: {
            active: "bg-zinc-900 text-white border-zinc-900",
            inactive: "bg-zinc-100 border-zinc-200 text-zinc-400"
        },
        headerText: {
            active: "text-zinc-900",
            inactive: "text-zinc-500"
        },
        input: "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900",
        emptyBox: "bg-zinc-50 border-zinc-200 text-zinc-500",
        form: "bg-white border-zinc-200 shadow-sm",
        formLabel: "text-zinc-600",
        formInput: "bg-white border-zinc-200 text-zinc-900 focus:border-zinc-900"
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
        // STATELESS: Just tell parent. Parent sets ID -> Fetches Snapshot.
        onSelectPatient(patient);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors",
                    selectedPatient
                        ? ui.indicator.active
                        : ui.indicator.inactive
                )}>
                    1
                </div>
                <h3 className={cn(
                    "font-bold text-sm uppercase tracking-wide transition-colors",
                    selectedPatient ? ui.headerText.active : ui.headerText.inactive
                )}>
                    Patient Identification
                </h3>
            </div>

            {/* LOCKED STATE (Patient Identified in Snapshot) */}
            {/* LOCKED STATE (Patient Identified in Snapshot) */}
            {selectedPatient && (
                <div className="animate-in fade-in slide-in-from-top-2">
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
                <div className="space-y-4 animate-in fade-in">
                    <div>
                        <label className={cn("block text-xs font-bold uppercase mb-1.5 ml-1", ui.formLabel)}>
                            Mobile Number / MRN
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                            <input
                                type="text"
                                shadow-sm
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by Mobile..."
                                className={cn("w-full rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all font-mono", ui.input)}
                                autoFocus
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500 animate-spin" />
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    {matches.length > 0 && (
                        <div className="space-y-2">
                            {matches.map(p => {
                                // Robust ID extraction to handle casing mismatch (id vs Id)
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

                    {/* Always Show Create Option (Enterprise Family Use Case) */}
                    {searchQuery.length > 3 && !isSearching && (
                        <div className={cn(
                            "rounded-lg p-3 flex flex-col items-center gap-2 transition-all",
                            matches.length > 0
                                ? (isDark ? "mt-4 border-t border-zinc-800 pt-4" : "mt-4 border-t border-zinc-100 pt-4")
                                : cn("border border-dashed", ui.emptyBox)
                        )}>
                            {matches.length === 0 ? (
                                <span className="text-sm">No match found.</span>
                            ) : (
                                <span className="text-xs text-center px-4 opacity-70">
                                    Family member sharing this number?
                                </span>
                            )}

                            <button
                                onClick={() => setIsNewPatientMode(true)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-colors",
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
                    <div className="flex items-center justify-between mb-4">
                        <h4 className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-zinc-900")}>
                            <UserPlus className="w-4 h-4 text-emerald-500" />
                            New Patient
                        </h4>
                        <button
                            onClick={() => setIsNewPatientMode(false)}
                            className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
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
    const lastVisitTestCodes = p.lastVisitTestCodes || p.LastVisitTestCodes || p.testCodes || p.TestCodes;

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
        locked: "bg-zinc-900 text-white border-zinc-900 shadow-md cursor-default",
        inactive: "bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 shadow-sm cursor-pointer",
        name: isLocked ? "text-white" : "text-zinc-900 group-hover:text-black",
        badge: isLocked ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600 border border-black/[0.05]",
        mrn: "bg-zinc-50 border-zinc-200 text-zinc-500"
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
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                        isLocked
                            ? "bg-synos-primary text-white shadow-sm"
                            : "bg-synos-primary/20 text-synos-primary"
                    )}>
                        {genderInitial}
                    </div>
                    <div>
                        <div className={cn(
                            "text-sm font-bold truncate pr-2", // Truncate long names
                            cardUi.name
                        )}>
                            {name}
                        </div>

                        {/* Meta Row: Badges + Mobile */}
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                            {/* Age Badge */}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                                cardUi.badge
                            )}>
                                {age ? `${age}Y` : 'N/A'}
                            </span>

                            {/* Gender Badge */}
                            {rawGender && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] uppercase font-mono border",
                                    isLocked
                                        ? "bg-synos-primary/20 border-synos-primary/30 text-synos-primary/80"
                                        : (isDark ? "bg-zinc-800 border-zinc-700 text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-400")
                                )}>
                                    {genderInitial}
                                </span>
                            )}

                            {/* Mobile Number (with separator) */}
                            <span className={cn(
                                "text-xs font-mono ml-0.5 border-l pl-2",
                                isLocked
                                    ? (isDark ? "text-synos-primary/80 border-synos-primary/30" : "text-white/70 border-white/20")
                                    : (isDark ? "text-zinc-500 border-zinc-700" : "text-zinc-400 border-zinc-100")
                            )}>
                                {mobile}
                            </span>

                            {/* MRN Badge (Enterprise Identity) */}
                            <span className={cn(
                                "text-[10px] font-mono ml-1.5 px-1.5 py-0.5 rounded border tracking-wide",
                                isLocked
                                    ? (isDark ? "bg-black/30 text-synos-primary/60 border-synos-primary/20" : "bg-white/10 text-white/50 border-white/20")
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
                            "text-xs underline decoration-zinc-600 underline-offset-2 transition-colors mb-1",
                            isLocked ? "text-zinc-400 hover:text-white" : "text-zinc-500 group-hover:text-synos-primary"
                        )}>
                            {actionLabel}
                        </button>
                    )}

                    {lastVisitDate ? (
                        <div className="text-right">
                            <div className={cn(
                                "text-[10px] uppercase font-medium",
                                isLocked ? "text-synos-primary/60" : "text-zinc-500"
                            )}>Last Visit</div>
                            <div className={cn(
                                "text-xs font-mono",
                                isLocked ? "text-synos-primary/90" : "text-zinc-300"
                            )}>
                                {new Date(lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </div>
                        </div>
                    ) : (
                        <div className={cn(
                            "px-2 py-1 rounded text-[10px] border",
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
                            "px-1.5 py-0.5 rounded text-[10px] font-mono border",
                            isLocked
                                ? "bg-black/40 text-synos-primary/80 border-synos-primary/20"
                                : "bg-zinc-700/50 text-zinc-400 border-white/5"
                        )}>
                            {code}
                        </span>
                    ))}
                    {lastVisitTestCodes.length > 3 && (
                        <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-mono",
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
            {error && <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20 font-medium">{error}</div>}

            <div className="space-y-1">
                <label className={cn("text-[10px] uppercase font-bold", ui.label)}>Full Name *</label>
                <input
                    className={cn("w-full rounded px-2 py-1.5 text-sm outline-none transition-all", ui.input)}
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className={cn("text-[10px] uppercase font-bold", ui.label)}>Mobile *</label>
                    <input
                        className={cn("w-full rounded px-2 py-1.5 text-sm outline-none transition-all", ui.input)}
                        placeholder="987..."
                        value={formData.mobile}
                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <label className={cn("text-[10px] uppercase font-bold", ui.label)}>Age *</label>
                    <input
                        type="number"
                        className={cn("w-full rounded px-2 py-1.5 text-sm outline-none transition-all", ui.input)}
                        placeholder="25"
                        value={formData.age}
                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className={cn("text-[10px] uppercase font-bold", ui.label)}>Gender *</label>
                <div className={cn("flex rounded p-1 border", ui.genderBox)}>
                    {['Male', 'Female', 'Other'].map(g => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={cn(
                                "flex-1 text-[10px] uppercase tracking-wider py-1 rounded transition-all",
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
                    "w-full mt-2 text-white text-xs font-bold py-2 rounded transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95",
                    isDark ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-900 hover:bg-black"
                )}
            >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Register & Select
            </button>
        </form>
    );
}
