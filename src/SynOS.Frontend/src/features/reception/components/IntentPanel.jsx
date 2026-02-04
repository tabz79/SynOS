
import { X, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { useReceptionPanelUI } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { VisitDetails } from './VisitDetails'
import { BillingSummary } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'
import { usePanelEntry, useFlipGroup } from '@/hooks/useSynOSMotion' // Ensure imports are correct if splitting lines or adding new ones
import { useFocusTrap } from '@/hooks/useFocusTrap' // NEW

export function IntentPanel() {
    // Keep closing logic local/UI-only for now, or move to snapshot if "open/closed" is backend state (unlikely)
    // We still use the UI hook ONLY for the panel visibility toggle if that's purely UI state.
    // If "User is working on intake" is backend state, this should also be driven by snapshot presence!
    // For Phase 6, let's treat "Open/Closed" as UI, but "Content" as Snapshot.
    const { isOpen, closePanel, drawerState } = useReceptionPanelUI();

    // MOTION CANON: Rigid Body Entry
    const panelRef = useRef(null);
    usePanelEntry(panelRef, isOpen);

    // FOCUS CANON: Iron Dome Trap
    useFocusTrap(panelRef, isOpen, closePanel);

    // Intent Derivation
    const intent = drawerState?.intent; // 'create' | 'resume' | 'correction'
    const isCorrectionIntent = intent === 'correction';
    const isResumeIntent = intent === 'resume';
    const isCreateIntent = intent === 'create';

    // Lifted State for Prepaid Intent (Shared between VisitDetails and Footer)
    const [isPrepaidIntent, setIsPrepaidIntent] = useState(false);
    // STAGE 2: Payment Method State (Lifted for Footer Access)
    const [paymentMethod, setPaymentMethod] = useState('Cash');

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
            setCurrentVisitId(null);
            setIsPrepaidIntent(false);
            setPaymentMethod('Cash'); // Reset to default
            return;
        }

        if ((isResumeIntent || isCorrectionIntent) && drawerState.visitId) {
            // RESUME/CORRECT: Preset Visit ID, No Patient Selection needed yet (internal)
            setCurrentVisitId(drawerState.visitId);
            // Patient ID will be derived from snapshot
        }
    }, [isOpen, intent, drawerState?.visitId]);

    const loadSnapshot = async () => {
        setIsLoading(true);
        try {
            // In Resume/Correct Mode, we primarily query by VisitId
            // In Create Mode, we query by PatientId first (after selection)
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
        if ((isResumeIntent || isCorrectionIntent) && !currentVisitId) return;

        loadSnapshot();
        const handleUpdate = (newSnapshot) => {
            // Verify relevance (Simple check)
            // If in resume/correct mode, only update if visitId matches
            if ((isResumeIntent || isCorrectionIntent) && newSnapshot?.visit?.visitId !== currentVisitId) return;

            setSnapshot(newSnapshot);
            if (newSnapshot?.visit?.visitId) setCurrentVisitId(newSnapshot.visit.visitId);
        };
        SignalRService.onIntakeSnapshotUpdated(handleUpdate);
    }, [isOpen, currentPatientId, currentVisitId, isResumeIntent, isCorrectionIntent]);

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
        setCurrentVisitId(null);
        setIsPrepaidIntent(false); // Reset intent
        setPaymentMethod('Cash');
    };

    // UNIFIED FOOTER ACTION HANDLER
    const handleUnifiedAction = async () => {
        if (!snapshot?.billing) return;

        // 1. CONFIRM & LOCK PREPAID
        if (isPrepaidIntent && !snapshot.billing.isLocked) {
            // RELAXED RULE: Partner OR Draft
            const hasReferralIdentity = snapshot.billing.referral?.partner || snapshot.billing?.referral?.draft;

            if (!hasReferralIdentity) {
                alert("For Prepaid visits, you MUST select a Referral Partner or add a Draft.");
                return;
            }

            // REMOVED: Extra Dialog as per User Request (Enterprise Speed)
            setIsLoading(true);
            try {
                await ReceptionApi.markVisitAsPrepaid(snapshot.visit.visitId);
                // Success handled by snapshot update or close?
                // User wants "Sliding window changes" (Reset).
                // Let's reset!
                handleClearPatient(); // Clears panel state
                closePanel(); // Closes panel
                // REMOVED: Alert "Visit Finalized"
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
                // Default Cash for now as per previous UI -> STAGE 2: Dynamic Method
                await ReceptionApi.collectPayment(snapshot.visit.visitId, snapshot.billing.netAmount, paymentMethod);
                handleClearPatient();
                closePanel();
                // REMOVED: Alert "Payment Collected"
            } catch (err) {
                alert(err.message);
                setIsLoading(false);
            }
            return;
        }

        // 3. GENERATE BILL (Wait, if paid?)
        // If already paid (e.g. earlier flow), this might just be "Close"
        if (snapshot.billing.paymentStatus === 'Paid' && !isCorrectionIntent) {
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
        if (isVisitFinalized && !isCorrectionIntent) {
            mainActionLabel = "Visit Complete (Close)";
            isActionEnabled = true;
        } else if (canLockPrepaid) {
            mainActionLabel = "Prepaid Checkout";
            // RELAXED RULE: Partner OR Draft
            isActionEnabled = Boolean(snapshot?.billing?.referral?.partner || snapshot?.billing?.referral?.draft);
        } else if (canCheckout) {
            mainActionLabel = `Accept Payment (₹${snapshot.billing.netAmount})`;
            isActionEnabled = true;
        } else {
            mainActionLabel = "Add Tests to Proceed";
            isActionEnabled = false; // "Grayed out" until totals > 0
        }
    }

    // Dynamic Title based on Intent
    let panelTitle = "Registration";
    let panelSubtitle = "Cockpit";
    if (isResumeIntent) { panelTitle = "Resume Visit"; panelSubtitle = "Draft Mode"; }
    if (isCorrectionIntent) { panelTitle = "Correct Visit"; panelSubtitle = "Audit Logged"; }

    return (
        <div ref={panelRef} className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative z-20 ring-1 ring-white/5">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/5 backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-baseline gap-2">
                        {panelTitle}
                        <span className="text-synos-muted text-sm font-normal uppercase tracking-widest opacity-60">— {panelSubtitle}</span>
                    </h2>
                    <div className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {isLoading ? "Syncing..." : isCorrectionIntent ? "Audit Mode Active" : "Live Operational Mode"}
                    </div>
                </div>
                <button
                    onClick={closePanel}
                    className="p-2 -mr-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all duration-200 active:scale-95"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-zinc-700">
                {isLoading && !snapshot && <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 text-synos-primary animate-spin" /></div>}
                {error && <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm flex gap-3"><X className="w-4 h-4 mt-0.5" />{error}</div>}

                {snapshot && (
                    <>
                        {/* 1. Patient Identification (Always Visible for Context) */}
                        <PatientIdentification
                            snapshot={snapshot}
                            onSelectPatient={handleSelectPatient}
                            onClearPatient={handleClearPatient}
                        />

                        {hasVisit && (
                            <div className="animate-in fade-in duration-500">
                                <VisitDetails
                                    snapshot={snapshot}
                                    visitId={snapshot.visit.visitId || snapshot.visit.id}
                                    onVisitUpdated={loadSnapshot}
                                    isPrepaidIntent={isPrepaidIntent} // PASSING DOWN
                                    setIsPrepaidIntent={setIsPrepaidIntent} // PASSING DOWN
                                    isCorrectionIntent={isCorrectionIntent} // PHASE 3: CORRECTION INTENT
                                />
                            </div>
                        )}

                        {hasVisit && (
                            <div className="animate-in fade-in duration-700">
                                <BillingSummary
                                    snapshot={snapshot}
                                    onVisitUpdated={loadSnapshot}
                                    isCorrectionIntent={isCorrectionIntent} // Pass down Intent
                                    isPrepaidIntent={isPrepaidIntent} // Pass down Prepaid Status
                                    paymentMethod={paymentMethod}
                                    setPaymentMethod={setPaymentMethod}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer / Status Bar - UNIFIED BUTTON */}
            <div className="p-4 border-t border-synos-border bg-white/5 space-y-3">
                {isCorrectionIntent ? (
                    <button
                        onClick={closePanel}
                        className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                    >
                        Finish Correction <AlertCircle className="w-4 h-4" />
                    </button>
                ) : (
                    hasVisit && (
                        <button
                            onClick={handleUnifiedAction}
                            disabled={!isActionEnabled || isLoading}
                            className={cn(
                                "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
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
                    )
                )}
            </div>
        </div>
    )
}
