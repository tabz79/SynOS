
import { X, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { useReceptionPanelUI } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { VisitDetails } from './VisitDetails'
import { BillingSummary } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'

export function IntentPanel() {
    // Keep closing logic local/UI-only for now, or move to snapshot if "open/closed" is backend state (unlikely)
    // We still use the UI hook ONLY for the panel visibility toggle if that's purely UI state.
    // If "User is working on intake" is backend state, this should also be driven by snapshot presence!
    // For Phase 6, let's treat "Open/Closed" as UI, but "Content" as Snapshot.
    const { isOpen, closePanel } = useReceptionPanelUI();

    const [snapshot, setSnapshot] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for Patient ID (Fix-1)
    const [currentPatientId, setCurrentPatientId] = useState(null);

    // Initial Fetch & Subscription
    useEffect(() => {
        if (!isOpen) return;

        const loadSnapshot = async () => {
            setIsLoading(true);
            try {
                // Pass patientId if we have it? 
                // Fix-1 just says fix the crash. 
                // We'll keep the basic call for now, or update it if the previous "getSnapshot" change was already done.
                // Assuming "reception.js" might have been updated in my "Option B" attempt partially?
                // I will pass `currentPatientId` if the API supports it, otherwise default.
                const data = await ReceptionApi.getIntakeSnapshot(currentPatientId);
                console.log("Intake Snapshot Loaded:", data);
                setSnapshot(data);
            } catch (err) {
                console.error("Failed to load intake snapshot:", err);
                setError("Failed to load session. Please try closing and reopening.");
            } finally {
                setIsLoading(false);
            }
        };

        loadSnapshot();

        const handleUpdate = (newSnapshot) => {
            console.log("Snapshot Update:", newSnapshot);
            setSnapshot(newSnapshot);
        };
        SignalRService.onIntakeSnapshotUpdated(handleUpdate);
    }, [isOpen, currentPatientId]); // Refetch on patient change

    // Fix-1 HANDLERS
    const handleSelectPatient = (patient) => {
        setCurrentPatientId(patient.id);
    };

    const handleClearPatient = () => {
        setCurrentPatientId(null);
    };

    if (!isOpen) return null;

    // Derived UI State from Snapshot (Pure Projection)
    const hasPatient = !!snapshot?.patient;
    const hasVisit = !!snapshot?.visit;
    // UI Hints from snapshot (fallback to safe defaults if missing in early dev)
    const canCommit = snapshot?.uiHints?.canGenerateBill ?? false;

    return (
        <div className="flex flex-col h-full bg-zinc-900 border border-synos-border border-l-0 rounded-r-xl overflow-hidden animate-in slide-in-from-right-10 duration-300 shadow-2xl relative z-20">
            {/* Header */}
            <div className="h-14 border-b border-synos-border flex items-center justify-between px-4 bg-zinc-950">
                <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">New Walk-In <span className="text-zinc-500 font-normal">— Cockpit</span></h2>
                    <div className="text-xs text-zinc-500">
                        {isLoading ? "Syncing with Backend..." : "Live Operational Mode"}
                    </div>
                </div>
                <button
                    onClick={closePanel}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-zinc-700">
                {isLoading && !snapshot && (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-8 h-8 text-synos-primary animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                        <div className="text-red-500 mt-0.5"><X className="w-4 h-4" /></div>
                        <div className="text-sm text-red-200">{error}</div>
                    </div>
                )}

                {snapshot && (
                    <>
                        {/* Section 1: Patient Identity */}
                        {/* Always visible, state determines mode (Search vs Locked) */}
                        <PatientIdentification
                            snapshot={snapshot}
                            onSelectPatient={handleSelectPatient}
                            onClearPatient={handleClearPatient}
                        />

                        {/* Section 2: Visit & Tests */}

                        {/* Section 2: Visit & Tests */}
                        {/* Only visible if Patient is identified */}
                        {hasPatient && (
                            <div className="animate-in slide-in-from-bottom-5 duration-500 fade-in">
                                <VisitDetails snapshot={snapshot} />
                            </div>
                        )}

                        {/* Section 3: Billing */}
                        {/* Only visible if Visit is initialized (or just show empty state?) */}
                        {/* Prompt says: "Visit present -> Show Billing". */}
                        {hasVisit && (
                            <div className="animate-in slide-in-from-bottom-5 duration-700 fade-in">
                                <BillingSummary snapshot={snapshot} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer / Status Bar - Driven by UI Hints */}
            <div className="p-4 border-t border-synos-border bg-zinc-950 space-y-3">
                {snapshot && (
                    <button
                        onClick={async () => {
                            if (!canCommit) return;
                            try {
                                // COMMAND: Commit
                                // We could add a local loading state here if needed, 
                                // but we rely on snapshot updates or global loading usually.
                                // For better UX, let's disable self while waiting.
                                const btn = document.activeElement;
                                if (btn) btn.disabled = true;

                                await ReceptionApi.commitIntake();
                                // Success - Panel might close or show "Success" state based on next snapshot.
                                // If snapshot dictates "Session Closed", the panel effect should handle it 
                                // or we might get a specific event. 
                                // For now, assume snapshot updates to a "Receipt" state or similar.
                            } catch (error) {
                                console.error("Commit failed", error);
                                if (btn) btn.disabled = false;
                            }
                        }}
                        disabled={!canCommit}
                        className={cn(
                            "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all",
                            canCommit
                                ? "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10"
                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                    >
                        {canCommit ? (
                            <>Generate Bill & Print <ArrowRight className="w-4 h-4" /></>
                        ) : (
                            <span className="flex items-center gap-2">
                                {snapshot.visit ? "Add Tests to Proceed" : "Identify Patient to Proceed"}
                            </span>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
