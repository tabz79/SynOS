
import { X, Loader2, ArrowRight, AlertCircle, CheckCircle2, Printer } from 'lucide-react'
import { useReceptionDrawer } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { VisitDetails } from './VisitDetails'
import { BillingSummary } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'
import { usePanelEntry, useFlipGroup } from '@/hooks/useSynOSMotion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useTheme } from '@/context/ThemeContext'
import { generateThermalInvoiceHtml, legacyTriggerPrint } from '@/utils/thermalPrinter'

export function IntentPanel({ onVisitUpdated }) {
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
            setError(null);
            setPaymentReceipt(null);
            setCurrentPatientId(null);
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
        setIsPrepaidIntent(false); // Reset intent
        setPaymentMethod('Cash');
    };

    const handleCloseAndReset = () => {
        setError(null);
        setPaymentReceipt(null);
        setSnapshot(null);
        handleClearPatient();
        closePanel();
        if (onVisitUpdated) onVisitUpdated();
    };

    // UNIFIED FOOTER ACTION HANDLER
    const [isActionSubmitting, setIsActionSubmitting] = useState(false);
    const [paymentReceipt, setPaymentReceipt] = useState(null);

    const handlePrintReceipt = async () => {
        const visitObj = snapshot?.visit;
        if (!visitObj && !paymentReceipt) return;
        try {
            const printPayload = {
                visitId: visitObj?.visitId || paymentReceipt?.visitId || currentVisitId,
                token: visitObj?.visitToken || visitObj?.token || paymentReceipt?.token || "WAIT",
                patient: {
                    name: snapshot?.patient?.fullName || snapshot?.patient?.name || paymentReceipt?.patientName || "Patient",
                    sex: snapshot?.patient?.gender || "M",
                    age: snapshot?.patient?.age || "",
                    mrn: snapshot?.patient?.mrn || paymentReceipt?.mrn || ""
                },
                billing: {
                    ...snapshot?.billing,
                    netAmount: snapshot?.billing?.netAmount || paymentReceipt?.amount || 0,
                    totalPaid: snapshot?.billing?.totalPaid || paymentReceipt?.amount || snapshot?.billing?.netAmount || 0,
                    paymentMethod: snapshot?.billing?.paymentMethod || paymentReceipt?.method || paymentMethod || "Cash"
                },
                orders: (visitObj?.tests || paymentReceipt?.tests || []).map(t => ({
                    testCode: t.testCode,
                    testName: t.testName || t.name || t.testCode,
                    grossAmount: t.price || 0,
                    discount: 0,
                    netAmount: t.price || 0
                })),
                referringDoctorName: visitObj?.referralPartner?.name || snapshot?.billing?.referral?.partner?.displayName || "Self",
                labName: "Diagnostic Laboratory",
                branch: { name: "Main Lab" }
            };
            const html = generateThermalInvoiceHtml(printPayload);
            await legacyTriggerPrint(html);
        } catch (err) {
            console.error("Failed to print receipt:", err);
        }
    };

    const handleUnifiedAction = async () => {
        if (!snapshot?.billing || isActionSubmitting) return;

        // 1. CONFIRM & LOCK PREPAID
        if (isPrepaidIntent && !snapshot.billing.isLocked) {
            const hasReferralIdentity = snapshot.billing.referral?.partner || snapshot.billing?.referral?.draft;

            if (!hasReferralIdentity) {
                setError("For Prepaid visits, you MUST select a Referral Partner or add a Draft.");
                return;
            }

            setIsLoading(true);
            setIsActionSubmitting(true);
            try {
                await ReceptionApi.markVisitAsPrepaid(snapshot.visit.visitId);
                handleCloseAndReset();
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            } finally {
                setIsActionSubmitting(false);
            }
            return;
        }

        // 2. CHECKOUT (ACCEPT PAYMENT)
        if (canCheckout && !snapshot.billing.isLocked) {
            setIsLoading(true);
            setIsActionSubmitting(true);
            setError(null);
            try {
                const res = await ReceptionApi.collectPayment(snapshot.visit.visitId, remainingDue, paymentMethod);

                const receiptNo = res?.lastPayment?.receiptNo || res?.receiptNo || `RCP-${Date.now().toString().slice(-8)}`;
                setPaymentReceipt({
                    receiptNo,
                    amount: remainingDue,
                    method: paymentMethod,
                    token: snapshot.visit.visitToken || snapshot.visit.token || "WAIT",
                    patientName: snapshot.patient?.fullName || snapshot.patient?.name || "Patient",
                    mrn: snapshot.patient?.mrn,
                    tests: snapshot.visit.tests || [],
                    visitId: snapshot.visit.visitId
                });

                // Optimistically update snapshot state to Paid
                setSnapshot(prev => prev ? ({
                    ...prev,
                    billing: {
                        ...prev.billing,
                        paymentStatus: 'Paid',
                        totalPaid: (prev.billing?.totalPaid || 0) + remainingDue,
                        isLocked: true
                    }
                }) : null);

                if (onVisitUpdated) onVisitUpdated();
            } catch (err) {
                // If invoice was ALREADY in Paid status (e.g. from prior submit), sync smoothly
                if (err.message && err.message.toLowerCase().includes("paid")) {
                    await loadSnapshot();
                    if (onVisitUpdated) onVisitUpdated();
                } else {
                    setError(err.message);
                }
                setIsLoading(false);
            } finally {
                setIsActionSubmitting(false);
            }
            return;
        }

        // 3. GENERATE BILL / FINISH VISIT
        if (snapshot.billing.paymentStatus === 'Paid' && !isCorrectionIntent) {
            handleCloseAndReset();
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
                    onClick={handleCloseAndReset}
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
                {error && (
                    <div className="m-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm flex items-center justify-between gap-3 animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{error}</span>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setError(null)}
                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

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

            {/* Receipt Confirmation Modal Overlay */}
            {paymentReceipt && (
                <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-5">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                            <CheckCircle2 className="w-9 h-9" />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Payment Collected Successfully!</h3>
                            <p className="text-zinc-400 text-xs mt-1">Visit finalized and ready for clinical operations</p>
                        </div>

                        <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-left space-y-2.5 text-xs">
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-zinc-400">Receipt No</span>
                                <span className="text-emerald-400 font-mono font-bold text-sm">{paymentReceipt.receiptNo}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-zinc-400">Amount Paid</span>
                                <span className="text-white font-bold text-sm">₹{paymentReceipt.amount?.toLocaleString()} <span className="text-zinc-400 text-xs font-normal">({paymentReceipt.method})</span></span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-zinc-400">Patient</span>
                                <span className="text-zinc-200 font-medium">{paymentReceipt.patientName} {paymentReceipt.mrn ? `(${paymentReceipt.mrn})` : ''}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-zinc-400">Token ID</span>
                                <span className="text-cyan-400 font-mono font-bold text-sm">{paymentReceipt.token}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handlePrintReceipt}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10 transition-all active:scale-95 shadow-sm"
                            >
                                <Printer className="w-4 h-4" /> Print Receipt
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseAndReset}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                            >
                                Complete <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer / Status Bar - UNIFIED BUTTON */}
            <div className={cn("p-4 flex justify-center shrink-0", ui.footer)}>
                {isCorrectionIntent ? (
                    <div className="flex items-center gap-3 w-full max-w-md mx-auto">
                        <button
                            type="button"
                            onClick={handlePrintReceipt}
                            className="flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-sm"
                        >
                            <Printer className="w-4 h-4" /> Print Receipt
                        </button>
                        <button
                            type="button"
                            onClick={handleCloseAndReset}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95",
                                ui.actionBtn.enabled
                            )}
                        >
                            Finish Correction <CheckCircle2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    hasVisit && (
                        <div className="flex items-center gap-3 w-full max-w-md mx-auto">
                            {isVisitFinalized && (
                                <button
                                    type="button"
                                    onClick={handlePrintReceipt}
                                    className="py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-sm shrink-0"
                                >
                                    <Printer className="w-4 h-4" /> Receipt
                                </button>
                            )}
                            <button
                                onClick={handleUnifiedAction}
                                disabled={!isActionEnabled || isLoading || isActionSubmitting}
                                className={cn(
                                    "flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                                    (isActionEnabled && !isActionSubmitting)
                                        ? ui.actionBtn.enabled
                                        : ui.actionBtn.disabled
                                )}
                            >
                                {(isLoading || isActionSubmitting) ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>
                                        {mainActionLabel} <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    )
                )}
            </div>
        </div >
    )
}
