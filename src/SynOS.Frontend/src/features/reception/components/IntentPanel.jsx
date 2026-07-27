
import { X, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { useReceptionDrawer } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { VisitDetails } from './VisitDetails'
import { BillingSummary } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'
import { usePanelEntry, useFlipGroup } from '@/hooks/useSynOSMotion' // Ensure imports are correct if splitting lines or adding new ones
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useTheme } from '@/context/ThemeContext'

export function IntentPanel() {
    // Keep closing logic local/UI-only for now, or move to snapshot if "open/closed" is backend state (unlikely)
    // We still use the UI hook ONLY for the panel visibility toggle if that's purely UI state.
    // If "User is working on intake" is backend state, this should also be driven by snapshot presence!
    // For Phase 6, let's treat "Open/Closed" as UI, but "Content" as Snapshot.
    const { isOpen, closePanel, drawerState } = useReceptionDrawer();

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

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // THEME ISOLATION CONTRACT: Style Branching
    // THEME ISOLATION CONTRACT: Style Branching
    const ui = isDark ? {
        // DARK MODE: Solid Zinc, No Blur (Performance)
        panel: "bg-zinc-900 border-l border-white/10 shadow-2xl z-20",
        header: "bg-zinc-900 border-b border-white/5",
        footer: "bg-zinc-900 border-t border-white/5",
        title: "text-white",
        subtitle: "text-zinc-500",
        actionBtn: {
            enabled: "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5",
            disabled: "bg-zinc-800 text-zinc-500"
        }
    } : {
        // LIGHT MODE: REAL FAKE FROST (System Bar Match)
        // No Blur = No Performance Hit.
        // KNIFE-EDGE STYLE: Sharp borders, deep shadow, no blur.
        panel: cn(
            "bg-[linear-gradient(to_bottom,#F5FCFF_0%,#E6F2F5_50%,#D7E1E4_100%)]",
            "border-l border-white shadow-[-20px_0_50px_rgba(0,0,0,0.3)]", // Knife Edge: Solid White Border + Deep Shadow
            "border-t border-white/80", // Top Rim Light
            "z-20"
        ),
        // Header: EXACT MATCH with ActivityStream.jsx (Line 172)
        header: "bg-[linear-gradient(to_bottom,rgba(248,253,255,0.98)_0%,rgba(238,245,248,0.98)_50%,rgba(228,235,238,0.98)_100%)] border-b border-black/[0.06]",
        // Footer: Matches bottom of panel gradient for anchor
        footer: "bg-[#D7E1E4] border-t border-black/[0.06] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]",
        title: "text-zinc-900",
        subtitle: "text-zinc-500",
        actionBtn: {
            enabled: "bg-zinc-900 text-white hover:bg-black shadow-lg shadow-black/20 transition-transform active:scale-95",
            disabled: "bg-zinc-100 text-zinc-400 border border-black/[0.05]"
        }
    };

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
        if (!snapshot) setIsLoading(true);
        try {
            // In Resume/Correct Mode, we primarily query by VisitId
            // In Create Mode, we query by PatientId first (after selection)
            const data = await ReceptionApi.getIntakeSnapshot(currentPatientId, currentVisitId);
            
            setSnapshot(prev => {
                const mergedVisit = data?.visit || prev?.visit || {
                    visitId: currentVisitId || null,
                    paymentCollectionModel: 'LabCollects',
                    tests: []
                };
                const mergedPatient = data?.patient || prev?.patient;
                return {
                    ...data,
                    patient: mergedPatient,
                    visit: mergedVisit,
                    billing: data?.billing || prev?.billing || { netAmount: 0, totalPaid: 0, paymentStatus: 'PendingPayment' },
                    uiState: data?.uiState || prev?.uiState || { canRegisterPatient: true }
                };
            });

            // Sync IDs from verified snapshot
            if (data?.visit?.id && data.visit.id !== currentVisitId) setCurrentVisitId(data.visit.id);
            if (data?.visit?.visitId && data.visit.visitId !== currentVisitId) setCurrentVisitId(data.visit.visitId);
            if (data?.patient?.patientId && data.patient.patientId !== currentPatientId) setCurrentPatientId(data.patient.patientId);

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

        // Initial Load
        loadSnapshot();

        // Subscription for Real-time Deltas
        const handleUpdate = (newSnapshot) => {
            if (!newSnapshot) return;

            // Verify relevance (Simple check)
            // If in resume/correct mode, only update if visitId matches
            const newVisitId = newSnapshot?.visit?.visitId || newSnapshot?.visit?.id;
            if ((isResumeIntent || isCorrectionIntent) && newVisitId && newVisitId !== currentVisitId) {
                console.log("IntentPanel: Ignoring update for different visit", { current: currentVisitId, received: newVisitId });
                return;
            }

            setSnapshot(newSnapshot);
            
            // OPTIMIZATION: Only update currentVisitId if it was null (e.g. first load from patientId)
            // to avoid re-triggering the parent effect unnecessarily.
            if (newVisitId && !currentVisitId) {
                setCurrentVisitId(newVisitId);
            }
        };

        SignalRService.onIntakeSnapshotUpdated(handleUpdate);
        
        return () => {
            // SignalR Service handles internal off() calls, but we should be clean
            // Actually, SignalRService.onIntakeSnapshotUpdated calls conn.off() inside.
        };
    }, [isOpen, currentPatientId, currentVisitId]); 
    // Removed isResumeIntent/isCorrectionIntent from deps as they are derived from intent/drawerState which are already tracked via currentVisitId change.

    // HANDLERS
    // HANDLERS
    const handleSelectPatient = async (patient) => {
        if (!patient?.id) return;

        // INSTANT OPTIMISTIC SELECTION (< 1 ms): Render Visit Details immediately without full-screen spinner
        const patientName = patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        const optimisticPatient = {
            patientId: patient.id,
            mrn: patient.mrn || patient.MRN || patient.patientId,
            fullName: patientName || "Patient",
            gender: patient.gender || 'M',
            age: patient.age,
            mobile: patient.phone || patient.mobile || patient.currentPhoneNumber,
            dateOfBirth: patient.dateOfBirth
        };

        setSnapshot(prev => ({
            ...prev,
            patient: optimisticPatient,
            visit: prev?.visit || {
                visitId: null,
                paymentCollectionModel: 'LabCollects',
                tests: []
            },
            uiState: { canRegisterPatient: true }
        }));

        setCurrentPatientId(patient.id);

        try {
            const payload = {
                patientId: patient.id,
                dept: "Pathology",
                testCodes: [],
                paymentCollectionModel: null,
                referralPartnerId: null
            };

            const { visitId } = await ReceptionApi.startVisit(payload);
            setCurrentVisitId(visitId);
        } catch (err) {
            console.error("Immediate Visit Creation Failed", err);
            setError("Failed to initialize visit: " + err.message);
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

            setIsLoading(true);
            try {
                await ReceptionApi.markVisitAsPrepaid(snapshot.visit.visitId);
                
                // CLEAR PANEL STATE
                handleClearPatient(); 
                closePanel(); 
            } catch (err) {
                alert(err.message);
                setIsLoading(false);
            }
            return;
        }

        // 2. CHECKOUT (ACCEPT PAYMENT)
        if (canCheckout && !snapshot.billing.isLocked) {
            setIsLoading(true);
            try {
                await ReceptionApi.collectPayment(snapshot.visit.visitId, remainingDue, paymentMethod);

                handleClearPatient();
                closePanel();
            } catch (err) {
                alert(err.message);
                setIsLoading(false);
            }
            return;
        }

        // 3. GENERATE BILL
        if (snapshot.billing.paymentStatus === 'Paid' && !isCorrectionIntent) {
            handleClearPatient();
            closePanel();
        }
    };

    if (!isOpen) return null;

    const hasPatient = !!snapshot?.patient;
    const hasVisit = !!snapshot?.visit;
    
    // Derived Financial Logic
    const totalDue = snapshot?.billing?.netAmount || 0;
    const totalPaid = snapshot?.billing?.totalPaid || 0;
    const remainingDue = Math.max(0, totalDue - totalPaid);
    
    const canCheckout = (snapshot?.billing?.paymentStatus === 'PendingPayment' || snapshot?.billing?.paymentStatus === 'PartialPayment') && remainingDue > 0;
    const canLockPrepaid = isPrepaidIntent && !snapshot?.billing?.isLocked;
    const isVisitFinalized = snapshot?.billing?.paymentStatus === 'Paid' || (remainingDue <= 0 && totalDue > 0);

    // Determine Button Label & State
    let mainActionLabel = "Identify Patient & Start Visit";
    let isActionEnabled = false;

    if (!hasVisit && hasPatient) {
        mainActionLabel = "Add Tests to Proceed";
        isActionEnabled = false;
    } else if (hasVisit) {
        if (isVisitFinalized && !isCorrectionIntent) {
            mainActionLabel = "Visit Complete (Close)";
            isActionEnabled = true;
        } else if (canLockPrepaid) {
            mainActionLabel = "Prepaid Checkout";
            isActionEnabled = Boolean(snapshot?.billing?.referral?.partner || snapshot?.billing?.referral?.draft);
        } else if (canCheckout) {
            mainActionLabel = `Accept Payment (₹${remainingDue})`;
            isActionEnabled = true;
        } else {
            mainActionLabel = "Add Tests to Proceed";
            isActionEnabled = false;
        }
    }

    // Dynamic Title based on Intent
    let panelTitle = "Registration";
    if (isResumeIntent) { panelTitle = "Resume Visit"; }
    if (isCorrectionIntent) { panelTitle = "Visit Correction"; }

    return (
        <div 
            ref={panelRef} 
            className={cn(
                "flex flex-col h-full overflow-hidden rounded-2xl transition-[width,transform,opacity] duration-300 ease-out shadow-2xl z-30", 
                hasPatient ? "absolute right-0 top-0 bottom-0 w-[94vw] sm:w-[88vw] md:w-[78vw] lg:w-[68vw] xl:w-[56vw] max-w-[1020px]" : "absolute right-0 top-0 bottom-0 w-[90vw] sm:w-[480px] max-w-[520px]",
                ui.panel
            )}
        >
            {/* Header */}
            <div className={cn("h-14 xl:h-16 flex items-center justify-between px-4 shrink-0", ui.header)}>
                <div>
                    <h2 className={cn("text-lg xl:text-xl font-bold tracking-tight flex items-baseline gap-2", ui.title)}>
                        {panelTitle}
                    </h2>
                </div>
                <button
                    onClick={closePanel}
                    className={cn(
                        "p-2 -mr-2 rounded-full transition-all duration-200 active:scale-95",
                        isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                    )}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* PanelBody - REQUIRED ARCHITECTURE (Locked Chrome / Isolation) */}
            <div className={cn("flex-1 min-h-0 flex flex-col", (snapshot?.patient || isCorrectionIntent) ? "overflow-y-auto" : "overflow-hidden")}>
                {isLoading && !snapshot && <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 text-synos-primary animate-spin" /></div>}
                {error && <div className="m-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm flex gap-3"><X className="w-4 h-4 mt-0.5" />{error}</div>}

                {snapshot && (
                    <>
                        {/* 1. Patient Identification (Internal Padding Managed) */}
                        <PatientIdentification
                            snapshot={snapshot}
                            onSelectPatient={handleSelectPatient}
                            onClearPatient={handleClearPatient}
                        />

                        {/* Block-Level Isolation for Visit Details (Scrollable) */}
                        {(hasPatient || isCorrectionIntent) && (
                            <div className={cn(
                                "px-3 xl:px-4 pb-3 xl:pb-4 mt-3 xl:mt-6 animate-in fade-in duration-300",
                                hasPatient ? "grid grid-cols-2 gap-3 xl:gap-6" : "flex flex-col gap-3 xl:gap-6",
                                (snapshot?.patient || isCorrectionIntent) ? "" : "flex-1 min-h-0 overflow-y-auto"
                            )}>
                                <div className={hasPatient ? "flex flex-col gap-6" : ""}>
                                    <VisitDetails
                                        snapshot={snapshot}
                                        visitId={currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id || snapshot?.visit?.VisitId}
                                        onVisitUpdated={loadSnapshot}
                                        isPrepaidIntent={isPrepaidIntent} // PASSING DOWN
                                        setIsPrepaidIntent={setIsPrepaidIntent} // PASSING DOWN
                                        isCorrectionIntent={isCorrectionIntent} // PHASE 3: CORRECTION INTENT
                                    />
                                </div>

                                <div className={cn("animate-in fade-in duration-700", hasPatient ? "flex flex-col gap-6" : "")}>
                                    <BillingSummary
                                        snapshot={snapshot}
                                        onVisitUpdated={loadSnapshot}
                                        isCorrectionIntent={isCorrectionIntent} // Pass down Intent
                                        isPrepaidIntent={isPrepaidIntent} // Pass down Prepaid Status
                                        paymentMethod={paymentMethod}
                                        setPaymentMethod={setPaymentMethod}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer / Status Bar - UNIFIED BUTTON */}
            <div className={cn("p-4 flex justify-center shrink-0", ui.footer)}>
                {isCorrectionIntent ? (
                    <button
                        onClick={closePanel}
                        className={cn(
                            "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 mx-auto",
                            hasPatient ? "max-w-md" : "w-full",
                            ui.actionBtn.enabled
                        )}
                    >
                        Finish Correction <AlertCircle className="w-4 h-4" />
                    </button>
                ) : (
                    hasVisit && (
                        <button
                            onClick={handleUnifiedAction}
                            disabled={!isActionEnabled || isLoading}
                            className={cn(
                                "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mx-auto",
                                hasPatient ? "max-w-md" : "w-full",
                                isActionEnabled
                                    ? ui.actionBtn.enabled
                                    : ui.actionBtn.disabled
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
        </div >
    )
}
