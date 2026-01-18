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
                            {matches.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelectPatient(p)}
                                    className="bg-zinc-800/50 hover:bg-zinc-800 border border-synos-border hover:border-synos-primary/50 p-3 rounded-lg cursor-pointer flex items-center justify-between group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-synos-primary/20 flex items-center justify-center text-synos-primary">
                                            <UserCheck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200 group-hover:text-white">{p.name}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{p.mobile} • {p.age}Y / {p.gender}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-zinc-500 group-hover:text-synos-primary font-mono">Select &rarr;</span>
                                </div>
                            ))}
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

            {/* NEW PATIENT FORM (Placeholder for Phase 6 Register Command) */}
            {isNewPatientMode && !selectedPatient && (
                <div className="bg-zinc-900 border border-synos-border p-4 rounded-lg space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                        <span className="text-xs font-bold text-synos-primary uppercase tracking-wider flex items-center gap-2">
                            <UserPlus className="w-3.5 h-3.5" />
                            New Patient Entry
                        </span>
                        <button onClick={() => setIsNewPatientMode(false)} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
                    </div>
                    <div className="text-center text-zinc-500 text-sm py-4">
                        [Stub: Register Patient Command Form would go here]
                        <br />
                        <button
                            className="mt-2 text-synos-primary hover:underline"
                            onClick={() => {
                                // Mock Register for flow
                                handleSelectPatient({ id: "new-p1", name: "New Patient Input", mobile: searchQuery, age: 30, gender: "F" });
                            }}
                        >
                            Simulate Register &rarr;
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
