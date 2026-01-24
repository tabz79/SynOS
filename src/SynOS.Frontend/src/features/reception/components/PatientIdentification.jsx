import { useEffect, useState } from 'react'
import { Search, UserPlus, UserCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReceptionApi } from '@/api/reception'


export function PatientIdentification({ snapshot, onSelectPatient, onClearPatient }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [matches, setMatches] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Local UI state for "New Patient Form" visibility
    const [isNewPatientMode, setIsNewPatientMode] = useState(false);

    // Derived from Snapshot
    const selectedPatient = snapshot?.patient;

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
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors",
                    selectedPatient
                        ? "bg-synos-primary text-white border-synos-primary"
                        : "bg-zinc-800 border-synos-border"
                )}>
                    1
                </div>
                <h3 className={cn(
                    "font-medium text-sm uppercase tracking-wide transition-colors",
                    selectedPatient ? "text-synos-primary" : "text-zinc-200"
                )}>
                    Patient Identification
                </h3>
            </div>

            {/* LOCKED STATE (Patient Identified in Snapshot) */}
            {selectedPatient && (
                <div className="bg-synos-primary/10 border border-synos-primary/30 p-3 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-synos-primary flex items-center justify-center text-white shadow-sm">
                            <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{selectedPatient.name}</div>
                            <div className="text-xs text-synos-primary/80 font-mono">
                                {selectedPatient.mobile} • {selectedPatient.age}Y / {selectedPatient.gender}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClearPatient}
                        className="text-xs text-zinc-400 hover:text-white underline decoration-zinc-600 underline-offset-2"
                    >
                        Change
                    </button>
                </div>
            )}

            {/* SEARCH STATE (No Patient) */}
            {!selectedPatient && !isNewPatientMode && (
                <div className="space-y-4 animate-in fade-in">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">
                            Mobile Number / MRN
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-synos-primary transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by Mobile..."
                                className="w-full bg-zinc-900 border border-synos-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-synos-primary focus:ring-1 focus:ring-synos-primary transition-all placeholder:text-zinc-600 font-mono"
                                autoFocus
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-synos-primary animate-spin" />
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    {matches.length > 0 && (
                        <div className="space-y-2">
                            {matches.map(p => {
                                // Robust ID extraction to handle casing mismatch (id vs Id)
                                const pId = p.id || p.Id || p.patientId;
                                // Helper for robust property access
                                const name = p.name || p.Name || p.fullName || p.FullName || p.displayName || p.DisplayName || `${p.firstName || p.FirstName || ''} ${p.lastName || p.LastName || ''}`.trim();
                                const mobile = p.mobile || p.Mobile || p.phoneNumber || p.PhoneNumber || p.phone || p.Phone;
                                const age = p.age || p.Age; // If age missing, maybe DOB?
                                const gender = p.gender || p.Gender || p.sex || p.Sex;
                                const lastVisitDate = p.lastVisitDate || p.LastVisitDate;
                                const lastVisitTestCodes = p.lastVisitTestCodes || p.LastVisitTestCodes;

                                return (
                                    <div
                                        key={pId}
                                        onClick={() => handleSelectPatient({ ...p, id: pId })}
                                        className="bg-zinc-800/50 hover:bg-zinc-800 border border-synos-border hover:border-synos-primary/50 p-3 rounded-lg cursor-pointer group transition-all"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-synos-primary/20 flex items-center justify-center text-synos-primary font-bold text-sm">
                                                    {gender === 'Male' ? 'M' : gender === 'Female' ? 'F' : 'P'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-zinc-200 group-hover:text-white flex items-center gap-2">
                                                        {name}
                                                        <span className="px-1.5 py-0.5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 font-mono">{age ? `${age}Y` : 'N/A'}</span>
                                                    </div>
                                                    <div className="text-xs text-zinc-500 font-mono mt-0.5">
                                                        {mobile}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {lastVisitDate ? (
                                                    <>
                                                        <div className="text-[10px] uppercase text-zinc-500 font-medium">Last Visit</div>
                                                        <div className="text-xs text-zinc-300 font-mono">
                                                            {new Date(lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                                                        New
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Test History Badge Strip */}
                                        {lastVisitTestCodes && lastVisitTestCodes.length > 0 && (
                                            <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap gap-1">
                                                {lastVisitTestCodes.slice(0, 3).map(code => (
                                                    <span key={code} className="px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400 text-[10px] font-mono border border-white/5">
                                                        {code}
                                                    </span>
                                                ))}
                                                {lastVisitTestCodes.length > 3 && (
                                                    <span className="px-1.5 py-0.5 text-zinc-500 text-[10px] font-mono">
                                                        +{lastVisitTestCodes.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty / Create New */}
                    {searchQuery.length > 3 && matches.length === 0 && !isSearching && (
                        <div className="bg-zinc-800/30 border border-dashed border-zinc-700 rounded-lg p-3 flex flex-col items-center gap-2">
                            <span className="text-zinc-400 text-sm">No match found.</span>
                            <button
                                onClick={() => setIsNewPatientMode(true)}
                                className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-colors"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Create New Patient
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* NEW PATIENT FORM (Inline) */}
            {isNewPatientMode && (
                <div className="bg-zinc-900 border border-synos-border rounded-lg p-4 animate-in slide-in-from-right-2">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-emerald-500" />
                            New Patient
                        </h4>
                        <button
                            onClick={() => setIsNewPatientMode(false)}
                            className="text-xs text-zinc-500 hover:text-white"
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

function RegisterFormInline({ onSuccess }) {
    const [formData, setFormData] = useState({ name: '', mobile: '', age: '', gender: 'Male' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

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
            {error && <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>}

            <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-500 font-bold">Full Name *</label>
                <input
                    className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-sm text-white focus:border-synos-primary outline-none"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-zinc-500 font-bold">Mobile *</label>
                    <input
                        className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-sm text-white focus:border-synos-primary outline-none"
                        placeholder="987..."
                        value={formData.mobile}
                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-zinc-500 font-bold">Age *</label>
                    <input
                        type="number"
                        className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-sm text-white focus:border-synos-primary outline-none"
                        placeholder="25"
                        value={formData.age}
                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-500 font-bold">Gender *</label>
                <div className="flex bg-black border border-zinc-800 rounded p-1">
                    {['Male', 'Female', 'Other'].map(g => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={cn(
                                "flex-1 text-xs py-1 rounded transition-colors",
                                formData.gender === g ? "bg-zinc-800 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"
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
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
            >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Register & Select
            </button>
        </form>
    );
}
