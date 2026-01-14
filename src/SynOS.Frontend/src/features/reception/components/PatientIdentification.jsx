import { useEffect, useState } from 'react'
import { Search, UserPlus, UserCheck, AlertCircle } from 'lucide-react'
import { useReceptionPanelUI } from '../hooks/useReceptionPanelUI'
import { cn } from '@/lib/utils'
// Placeholder for API hook - will be replaced by real wiring
// import { usePatientSearch } from '@/api/patients' 

export function PatientIdentification() {
    const {
        searchQuery, setSearchQuery,
        selectedPatient, setSelectedPatient,
        isNewPatientMode, enableNewPatientMode,
        newPatientDraft, updateNewPatientDraft
    } = useReceptionPanelUI();

    // Debounce simulation for UI dev (Replace with useQuery)
    const [matches, setMatches] = useState([]);

    // MOCK: Simulate API response behavior
    useEffect(() => {
        if (searchQuery.length > 9) {
            // Simulate "Found" for specific number
            if (searchQuery === "9876543210") {
                setMatches([{ id: "p1", name: "Rahul Deshmukh", mobile: "9876543210", age: 42, gender: "Male" }]);
            } else {
                setMatches([]);
            }
        } else {
            setMatches([]);
        }
    }, [searchQuery]);


    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-synos-border">
                    1
                </div>
                <h3 className="font-medium text-sm text-zinc-200 uppercase tracking-wide">Patient Identification</h3>
            </div>

            {/* A. Search / Input */}
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
                        placeholder="Search by Mobile (e.g. 9876543210)"
                        className="w-full bg-zinc-900 border border-synos-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-synos-primary focus:ring-1 focus:ring-synos-primary transition-all placeholder:text-zinc-600 font-mono"
                        autoFocus
                    />
                </div>
            </div>

            {/* B. Discovery State (Adaptive) */}
            {searchQuery.length > 3 && !selectedPatient && !isNewPatientMode && matches.length === 0 && (
                <div className="bg-zinc-800/30 border border-dashed border-zinc-700 rounded-lg p-3 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-zinc-400 text-sm">No patient found with this number.</span>
                    <button
                        onClick={enableNewPatientMode}
                        className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-colors"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Create New Patient
                    </button>
                </div>
            )}

            {/* C. Found Patient State */}
            {matches.length > 0 && !selectedPatient && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                    {matches.map(p => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedPatient(p)}
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

            {/* D. Selected Patient Summary (Locked) */}
            {selectedPatient && (
                <div className="bg-synos-primary/10 border border-synos-primary/30 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-synos-primary flex items-center justify-center text-white shadow-sm">
                            <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{selectedPatient.name}</div>
                            <div className="text-xs text-synos-primary/80 font-mono">Existing Patient • {selectedPatient.mobile}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedPatient(null)}
                        className="text-xs text-zinc-400 hover:text-white underline decoration-zinc-600 underline-offset-2"
                    >
                        Change
                    </button>
                </div>
            )}

            {/* E. New Patient Form (Conditional) */}
            {isNewPatientMode && (
                <div className="bg-zinc-900 border border-synos-border p-4 rounded-lg space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                        <span className="text-xs font-bold text-synos-primary uppercase tracking-wider flex items-center gap-2">
                            <UserPlus className="w-3.5 h-3.5" />
                            New Patient Entry
                        </span>
                        <button onClick={() => useReceptionPanelUI.setState({ isNewPatientMode: false })} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs text-zinc-500 mb-1 block">Full Name</label>
                            <input
                                type="text"
                                value={newPatientDraft.firstName} // Naive implementation, would split logic
                                onChange={(e) => updateNewPatientDraft({ firstName: e.target.value })}
                                className="w-full bg-zinc-950 border border-synos-border rounded px-3 py-1.5 text-sm text-white focus:border-synos-primary outline-none"
                                placeholder="Patient Name"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Gender</label>
                            <select
                                className="w-full bg-zinc-950 border border-synos-border rounded px-3 py-1.5 text-sm text-white focus:border-synos-primary outline-none appearance-none"
                                value={newPatientDraft.gender}
                                onChange={(e) => updateNewPatientDraft({ gender: e.target.value })}
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Age</label>
                            <input
                                type="number"
                                className="w-full bg-zinc-950 border border-synos-border rounded px-3 py-1.5 text-sm white focus:border-synos-primary outline-none"
                                value={newPatientDraft.age}
                                onChange={(e) => updateNewPatientDraft({ age: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
