import { useState, useEffect } from 'react'
import { Search, X, Plus, Loader2, Lock } from 'lucide-react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'

export function VisitDetails({ snapshot, visitId }) {
    // Local UI State for Search Interaction ONLY
    const [filter, setFilter] = useState("");
    const [catalog, setCatalog] = useState([]); // Master list for search suggestions
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Command spinner

    // 1. PURE RENDER SOURCE: Snapshot
    const visit = snapshot?.visit;
    const tests = visit?.tests || [];
    const isReadOnly = snapshot?.uiHints?.isReadOnly || false;
    const readOnlyReason = snapshot?.uiHints?.readOnlyReason;

    // Load Catalog once for search (This is essentially "static data" or "cache", not business state)
    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const data = await ReceptionApi.getTestCatalog();
                setCatalog(data || []);
            } catch (err) {
                console.error("Failed to load catalog for search", err);
            }
        };
        loadCatalog();
    }, []);

    // Filter Logic for Search (UI Only)
    const suggestions = filter.length < 2 ? [] : catalog.filter(t =>
        (t.name.toLowerCase().includes(filter.toLowerCase()) ||
            t.code.toLowerCase().includes(filter.toLowerCase())) &&
        !tests.some(existing => existing.code === t.code) // Don't suggest already added
    );

    // COMMAND: Add Test
    const handleAddTest = async (test) => {
        if (isReadOnly || !visitId) return;
        setIsProcessing(true);
        setFilter(""); // Clear UI input immediately
        try {
            await ReceptionApi.addTestToVisit(visitId, test.code);
            // No local mutation. Wait for snapshot.
        } catch (err) {
            console.error("Failed to add test", err);
        } finally {
            setIsProcessing(false);
        }
    };

    // COMMAND: Remove Test
    const handleRemoveTest = async (testCode) => {
        if (isReadOnly || !visitId) return;
        setIsProcessing(true);
        try {
            await ReceptionApi.removeTestFromVisit(visitId, testCode);
            // No local mutation. Wait for snapshot.
        } catch (err) {
            console.error("Failed to remove test", err);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!visit) return null; // Safety: Should be controlled by parent, but good to have.

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 mt-6">
                <div className="flex items-center gap-2 text-zinc-400">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-synos-border">
                        2
                    </div>
                    <h3 className="font-medium text-sm text-zinc-200 uppercase tracking-wide">Visit Details</h3>
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-synos-primary" />}
                </div>
                {isReadOnly && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/50 border border-zinc-700">
                        <Lock className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                            {readOnlyReason || "LOCKED"}
                        </span>
                    </div>
                )}
            </div>

            {/* Test Selection (Locked Only if ReadOnly) */}
            <div className="space-y-3">
                {!isReadOnly && (
                    <div className="relative z-10">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Add Test Code or Name..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            disabled={isProcessing}
                            className="w-full bg-zinc-900 border border-synos-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-synos-primary transition-colors placeholder:text-zinc-600 font-mono disabled:opacity-50"
                        />

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-synos-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {suggestions.map(test => (
                                    <button
                                        key={test.code}
                                        onClick={() => handleAddTest(test)}
                                        className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center justify-between group transition-colors"
                                    >
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200">{test.name}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{test.code}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-synos-emerald">₹{test.price}</span>
                                            <Plus className="w-4 h-4 text-zinc-500 group-hover:text-synos-primary" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Tests List (Pure Render from Snapshot) */}
                <div className="space-y-2">
                    {tests.length === 0 && !isReadOnly && (
                        <div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-600">
                            No tests added yet
                        </div>
                    )}

                    {tests.map(test => (
                        <div key={test.code} className="bg-synos-surface border border-synos-border rounded-lg p-3 flex items-center justify-between group animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 font-mono border border-zinc-700/50">
                                    {test.code}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white leading-tight">{test.name}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{test.dept || test.category}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-mono text-synos-emerald font-medium">₹{test.price}</div>
                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleRemoveTest(test.code)}
                                        disabled={isProcessing}
                                        className="text-zinc-500 hover:text-red-400 p-1 hover:bg-red-400/10 rounded transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Referral / Other Metadata from Snapshot (Simplification: Just show if present) */}
            {visit.referralDoctor && (
                <div className="mt-4 pt-4 border-t border-dashed border-zinc-800">
                    <div className="text-xs text-zinc-500 mb-1">Ref By</div>
                    <div className="text-sm text-zinc-300 font-medium">{visit.referralDoctor}</div>
                </div>
            )}
        </div>
    )
}
