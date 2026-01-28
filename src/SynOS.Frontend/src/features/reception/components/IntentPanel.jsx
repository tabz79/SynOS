
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
    // We still use the UI hook ONLY for the panel visibility toggle if that's purely UI state.
    // If "User is working on intake" is backend state, this should also be driven by snapshot presence!
    // For Phase 6, let's treat "Open/Closed" as UI, but "Content" as Snapshot.
    const { isOpen, closePanel, drawerState } = useReceptionPanelUI();

    const isViewMode = drawerState?.mode === 'view';

    // Lifted State for Prepaid Intent (Shared between VisitDetails and Footer)
    const [isPrepaidIntent, setIsPrepaidIntent] = useState(false);

    // RESTORED: Core Internal State
    const [snapshot, setSnapshot] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for Patient ID & Visit ID
    const [currentPatientId, setCurrentPatientId] = useState(null);
    const [currentVisitId, setCurrentVisitId] = useState(null);

    // Effect: Handle Drawer Mode Changes (Reset or Preset ID)
    useEffect(() => {
        if (!isOpen) {
            // Reset local state when closed
            setSnapshot(null);
            setCurrentPatientId(null);
            setCurrentVisitId(null);
            setIsPrepaidIntent(false);
            return;
        }

        if (isViewMode && drawerState.visitId) {
            // VIEW MODE: Preset Visit ID, No Patient Selection needed yet (internal)
            setCurrentVisitId(drawerState.visitId);
            // Patient ID will be derived from snapshot
        }
    }, [isOpen, drawerState?.mode, drawerState?.visitId]);

    const loadSnapshot = async () => {
        setIsLoading(true);
        try {
            // In View Mode, we primarily query by VisitId
            // In Create Mode, we might query by PatientId first
            const data = await ReceptionApi.getIntakeSnapshot(currentPatientId, currentVisitId);
            setSnapshot(data);

            // Sync IDs from verified snapshot
            if (data?.visit?.id) setCurrentVisitId(data.visit.id);
            if (data?.visit?.visitId) setCurrentVisitId(data.visit.visitId);
            if (data?.patient?.patientId) setCurrentPatientId(data.patient.patientId);

            // Sync intent from backend if locked
            if (data?.billing?.isLocked && data?.visit?.paymentCollectionModel === 'PartnerCollects') {
                setIsPrepaidIntent(true);
            }
        } catch (err) {
            console.error("Failed to load intake snapshot:", err);
            setError("Failed to load session. Please try closing and reopening.");
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Fetch & Subscription
    useEffect(() => {
        if (!isOpen) return;

        // Wait for IDs to settle if they are being set by Mode effect
        if (isViewMode && !currentVisitId) return;

        loadSnapshot();
        const handleUpdate = (newSnapshot) => {
            // Verify relevance (Simple check)
            // If in view mode, only update if visitId matches
            if (isViewMode && newSnapshot?.visit?.visitId !== currentVisitId) return;

            setSnapshot(newSnapshot);
            if (newSnapshot?.visit?.visitId) setCurrentVisitId(newSnapshot.visit.visitId);
        };
        SignalRService.onIntakeSnapshotUpdated(handleUpdate);
    }, [isOpen, currentPatientId, currentVisitId, isViewMode]);

    // HANDLERS
    const handleSelectPatient = async (patient) => {
        if (!patient?.id) return;

        setCurrentPatientId(patient.id);
        setIsLoading(true);

        try {
            // IMMEDIATE VISIT CREATION (Enterprise Grade)
            // Backend idempotent check ensures single draft.
            // No payment model required at this stage.
            const payload = {
                patientId: patient.id,
                dept: "Pathology",
                testCodes: [],
                paymentCollectionModel: null, // "Undecided" aligned with backend Option A
                referralPartnerId: null
            };

            const { visitId } = await ReceptionApi.startVisit(payload);
            setCurrentVisitId(visitId);
            // Snapshot will refresh automatically via signalR or effect dependency
        } catch (err) {
            console.error("Immediate Visit Creation Failed", err);
            setError("Failed to initialize visit: " + err.message);
            // Revert selection on failure? 
            // Better to keep patient selected but show error so user can retry or see what happened.
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearPatient = () => {
        setCurrentPatientId(null);
        setCurrentVisitId(null);
        setIsPrepaidIntent(false); // Reset intent
    };

    // UNIFIED FOOTER ACTION HANDLER
    const handleUnifiedAction = async () => {
        if (!snapshot?.billing) return;

        // 1. CONFIRM & LOCK PREPAID
        if (isPrepaidIntent && !snapshot.billing.isLocked) {
            if (!snapshot.billing.referral?.partner) {
                alert("For Prepaid visits, you MUST select a Referral Partner.");
                return;
            }
            if (!confirm("CONFIRM PREPAID VISIT?\n\nThis will mark the visit as PAID and LOCK editing.")) return;

            setIsLoading(true);
            try {
                await ReceptionApi.markVisitAsPrepaid(snapshot.visit.visitId);
                // Success handled by snapshot update or close?
                // User wants "Sliding window changes" (Reset).
                // Let's reset!
                handleClearPatient(); // Clears panel state
                closePanel(); // Closes panel
                alert("Visit Finalized (Prepaid).");
            } catch (err) {
                alert(err.message);
                setIsLoading(false);
            }
            return;
        }

        // 2. CHECKOUT (ACCEPT PAYMENT)
        if (snapshot.billing.paymentStatus === 'PendingPayment' && !snapshot.billing.isLocked) {
            setIsLoading(true);
            try {
                // Default Cash for now as per previous UI
                await ReceptionApi.collectPayment(snapshot.visit.visitId, snapshot.billing.netAmount, 'Cash');
                handleClearPatient();
                closePanel();
                alert("Payment Collected & Visit Finalized.");
            } catch (err) {
                alert(err.message);
                setIsLoading(false);
            }
            return;
        }

        // 3. GENERATE BILL (Wait, if paid?)
        // If already paid (e.g. earlier flow), this might just be "Close"
        if (snapshot.billing.paymentStatus === 'Paid') {
            handleClearPatient();
            closePanel();
        }
    };

    if (!isOpen) return null;

    const hasPatient = !!snapshot?.patient;
    const hasVisit = !!snapshot?.visit;
    // Footer Logic Calculation
    const canCheckout = snapshot?.billing?.paymentStatus === 'PendingPayment' && snapshot?.billing?.netAmount > 0;
    const canLockPrepaid = isPrepaidIntent && !snapshot?.billing?.isLocked;
    const isVisitFinalized = snapshot?.billing?.paymentStatus === 'Paid';

    // Determine Button Label & State
    let mainActionLabel = "Identify Patient & Start Visit";
    let isActionEnabled = false;

    if (!hasVisit && hasPatient) {
        // LOADING STATE HANDLED BY `isLoading`
        mainActionLabel = "Initializing Visit...";
        isActionEnabled = false;
    } else if (hasVisit) {
        if (isVisitFinalized) {
            mainActionLabel = "Visit Complete (Close)";
            isActionEnabled = true;
        } else if (canLockPrepaid) {
            mainActionLabel = "Confirm & Lock (Prepaid)";
            isActionEnabled = Boolean(snapshot?.billing?.referral?.partner);
        } else if (canCheckout) {
            mainActionLabel = `Accept Payment (₹${snapshot.billing.netAmount})`;
            isActionEnabled = true;
        } else {
            mainActionLabel = "Add Tests to Proceed";
            isActionEnabled = false; // "Grayed out" until totals > 0
        }
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900 border border-synos-border border-l-0 rounded-r-xl overflow-hidden animate-in slide-in-from-right-10 duration-300 shadow-2xl relative z-20">
            {/* Header */}
            <div className="h-14 border-b border-synos-border flex items-center justify-between px-4 bg-zinc-950">
                <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                        {isViewMode ? 'Visit Details' : 'New Walk-In'}
                        <span className="text-zinc-500 font-normal"> — {isViewMode ? 'Read Only' : 'Cockpit'}</span>
                    </h2>
                    <div className="text-xs text-zinc-500">
                        {isLoading ? "Syncing..." : isViewMode ? "Viewing Historical Record" : "Live Operational Mode"}
                    </div>
                </div>
                <button onClick={closePanel} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-zinc-700">
                {isLoading && !snapshot && <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 text-synos-primary animate-spin" /></div>}
                {error && <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm flex gap-3"><X className="w-4 h-4 mt-0.5" />{error}</div>}

                {snapshot && (
                    <>
                        {/* 1. Patient Identification (CREATE MODE ONLY) */}
                        {!isViewMode && (
                            <PatientIdentification
                                snapshot={snapshot}
                                onSelectPatient={handleSelectPatient}
                                onClearPatient={handleClearPatient}
                            />
                        )}

                        {hasVisit && (
                            <div className="animate-in slide-in-from-bottom-5 duration-500 fade-in">
                                <VisitDetails
                                    snapshot={snapshot}
                                    visitId={snapshot.visit.visitId || snapshot.visit.id}
                                    onVisitUpdated={loadSnapshot}
                                    isPrepaidIntent={isPrepaidIntent} // PASSING DOWN
                                    setIsPrepaidIntent={setIsPrepaidIntent} // PASSING DOWN
                                />
                            </div>
                        )}

                        {hasVisit && (
                            <div className="animate-in slide-in-from-bottom-5 duration-700 fade-in">
                                <BillingSummary snapshot={snapshot} onVisitUpdated={loadSnapshot} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer / Status Bar - UNIFIED BUTTON (CREATE MODE ONLY) */}
            {!isViewMode && (
                <div className="p-4 border-t border-synos-border bg-zinc-950 space-y-3">
                    {hasVisit && (
                        <button
                            onClick={handleUnifiedAction}
                            disabled={!isActionEnabled || isLoading}
                            className={cn(
                                "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all",
                                isActionEnabled
                                    ? "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10"
                                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    {mainActionLabel} <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
