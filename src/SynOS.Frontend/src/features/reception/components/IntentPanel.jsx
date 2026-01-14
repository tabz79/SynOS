import { X, Loader2, ArrowRight } from 'lucide-react'
import { useReceptionPanelUI } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { VisitDetails } from './VisitDetails'
import { BillingSummary } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState } from 'react'

import { ReceptionApi } from '@/api/reception'

export function IntentPanel() {
    const {
        isOpen, closePanel,
        selectedPatient, isNewPatientMode, newPatientDraft,
        selectedTestCodes
    } = useReceptionPanelUI();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Determines if "Commit" is enabled
    const isValid = (selectedPatient || isNewPatientMode) && selectedTestCodes.length > 0;

    const handleCommit = async () => {
        if (!isValid) return;

        setIsSubmitting(true);
        setError(null);

        // Construct Payload matching ReceptionStartVisitRequest.cs
        const payload = {
            patientId: selectedPatient?.id,
            // If new patient, we will handle in wrapper or here?
            // Let's passed the draft data and let the API helper handle the complexity for now or just error if new.
            // For this specific step, I will map what we have.

            testCodes: selectedTestCodes,
            dept: "OPD", // Default
            // discount, taxation calculated by backend
        };

        if (isNewPatientMode) {
            // Temporary Logic until Backend Orchestration Endpoint exists
            payload.newPatientDetails = newPatientDraft;
            // Note: This matches no known DTO field, but signals intent.
        }

        try {
            // Double check: If isNewPatientMode, we technically lack a PatientID.
            // I will try to call the API.
            const result = await ReceptionApi.startVisit(payload);
            console.log("Visit Created:", result);
            // Success
            closePanel();
            // TODO: Trigger Queue Refresh (handled via reacting to backend state later or explicit invalidate)
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="flex flex-col h-full bg-zinc-900 border border-synos-border border-l-0 rounded-r-xl overflow-hidden animate-in slide-in-from-right-10 duration-300 shadow-2xl relative z-20">
            {/* Header */}
            <div className="h-14 border-b border-synos-border flex items-center justify-between px-4 bg-zinc-950">
                <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">New Walk-In <span className="text-zinc-500 font-normal">— Create Visit</span></h2>
                    <div className="text-xs text-zinc-500">Identify patient &rarr; add tests &rarr; generate bill</div>
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
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                        <div className="text-red-500 mt-0.5"><X className="w-4 h-4" /></div>
                        <div className="text-sm text-red-200">
                            <div className="font-bold">Submission Failed</div>
                            <div className="text-xs opacity-90">{error}</div>
                        </div>
                    </div>
                )}
                <PatientIdentification />
                <VisitDetails />
                <BillingSummary />
            </div>

            {/* Footer / Commit */}
            <div className="p-4 border-t border-synos-border bg-zinc-950 space-y-3">
                <button
                    onClick={handleCommit}
                    disabled={!isValid || isSubmitting}
                    className={cn(
                        "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all",
                        isValid
                            ? "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>Create Visit & Generate Bill <ArrowRight className="w-4 h-4" /></>
                    )}
                </button>
                <div className="text-center">
                    <button onClick={closePanel} className="text-xs text-zinc-500 hover:text-zinc-300">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
