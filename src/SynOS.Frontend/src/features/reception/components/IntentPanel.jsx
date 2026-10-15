
import { X, Loader2, ArrowRight, AlertCircle, CheckCircle2, Printer, FileText } from 'lucide-react'
import { useReceptionDrawer } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { VisitDetails } from './VisitDetails'
import { BillingSummary } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'
import { usePanelEntry } from '@/hooks/useSynOSMotion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useTheme } from '@/context/ThemeContext'
import { generateThermalInvoiceHtml, legacyTriggerPrint } from '@/utils/thermalPrinter'
import { CommercialDocumentViewer } from '@/features/finance/components/documents/CommercialDocumentViewer'
import { 
    MultiPayerSelector, 
    AddInsuranceCompanyModal, 
    AddCorporateAccountModal, 
    AddReferralPartnerModal 
} from './MultiPayerPanels'

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

    // Lifted State for Prepaid Intent (Shared between VisitDetails and Footer)
    const [isPrepaidIntent, setIsPrepaidIntent] = useState(false);
    // Lifted State for Multi-Payer Billing Mode: 'Standard' | 'PrepaidPartner' | 'Insurance' | 'Corporate'
    const [billingMode, setBillingMode] = useState('Standard');
    // STAGE 2: Payment Method State (Lifted for Footer Access)
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    // Scoped Quick-Add Modal State: null | 'referral' | 'insurance' | 'corporate'
    const [activeModal, setActiveModal] = useState(null);

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
            setCurrentPatientId(null);
            setCurrentVisitId(null);
            setIsPrepaidIntent(false);
            setBillingMode('Standard');
            setPaymentMethod('Cash'); // Reset to default
            setActiveModal(null);
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

            // Sync multi-payer billing mode from snapshot
            const bt = data?.visit?.billingType;
            if (bt === 1 || bt === 'PrepaidPartner' || data?.visit?.paymentCollectionModel === 'PartnerCollects') {
                setBillingMode('PrepaidPartner');
                setIsPrepaidIntent(true);
            } else if (bt === 2 || bt === 'Insurance') {
                setBillingMode('Insurance');
                setIsPrepaidIntent(false);
            } else if (bt === 3 || bt === 'Corporate') {
                setBillingMode('Corporate');
                setIsPrepaidIntent(false);
            } else if (bt === 0 || bt === 'Standard') {
                setBillingMode('Standard');
                setIsPrepaidIntent(false);
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
        setBillingMode('Standard');
        setPaymentMethod('Cash');
    };

    const handleBillingModeChange = async (newMode) => {
        setBillingMode(newMode);
        setIsPrepaidIntent(newMode === 'PrepaidPartner');
        const vId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
        if (vId && !snapshot?.billing?.isLocked) {
            try {
                await ReceptionApi.updateBillingContext({
                    visitId: vId,
                    billingType: newMode
                });
                if (newMode === 'PrepaidPartner') {
                    await ReceptionApi.updatePaymentCollectionModel(vId, 'PartnerCollects');
                } else {
                    await ReceptionApi.updatePaymentCollectionModel(vId, 'LabCollects');
                }
                loadSnapshot();
            } catch (err) {
                console.error("Failed to switch billing mode:", err);
            }
        }
    };

    const handleCloseAndReset = () => {
        setError(null);
        setSnapshot(null);
        handleClearPatient();
        closePanel();
        if (onVisitUpdated) onVisitUpdated();
    };

    // UNIFIED FOOTER ACTION HANDLER
    const [isActionSubmitting, setIsActionSubmitting] = useState(false);
    const [taxInvoiceModal, setTaxInvoiceModal] = useState({ isOpen: false, data: null });

    const buildTaxInvoiceData = () => {
        const visitObj = snapshot?.visit;
        const p = snapshot?.patient;
        const b = snapshot?.billing;
        const dueVal = remainingDue !== undefined ? remainingDue : Math.max(0, (b?.netAmount || 0) - (b?.totalPaid || 0));
        return {
            billNumber: visitObj?.visitToken || visitObj?.token || "INV-REC-001",
            date: new Date().toISOString(),
            status: b?.paymentStatus || (dueVal <= 0 ? 'Paid' : 'PendingPayment'),
            patient: {
                name: p?.fullName || p?.name || "Direct Patient",
                uhid: p?.mrn || p?.uhid || "WALK-IN",
                ageGender: p?.age ? `${p.age} / ${p?.gender || 'M'}` : "Adult",
                phone: p?.phone || p?.mobile || "N/A",
                referringDoctor: visitObj?.referralPartner?.name || b?.referral?.partner?.displayName || "Self / Direct"
            },
            items: (visitObj?.tests || []).map((t, idx) => ({
                index: idx + 1,
                name: t.testName || t.name || t.testCode,
                code: t.testCode,
                department: t.department || 'Pathology',
                price: Number(t.price || 0),
                discount: 0,
                amount: Number(t.price || 0)
            })),
            financial: {
                grossSubtotal: b?.grossAmount || b?.netAmount || 0,
                discountAmount: b?.discountAmount || 0,
                totalAmount: b?.netAmount || 0,
                totalPaid: (b?.totalPaid || 0) + (dueVal <= 0 ? 0 : 0),
                balanceDue: dueVal
            }
        };
    };

    const handlePrintReceipt = async (overrideToken) => {
        const visitObj = snapshot?.visit;
        if (!visitObj) return;
        try {
            const tokenToPrint = overrideToken || visitObj?.visitToken || visitObj?.token || "WAIT";
            const printPayload = {
                visitId: visitObj?.visitId || currentVisitId,
                token: tokenToPrint,
                patient: {
                    name: snapshot?.patient?.fullName || snapshot?.patient?.name || "Patient",
                    sex: snapshot?.patient?.gender || "M",
                    age: snapshot?.patient?.age || "",
                    mrn: snapshot?.patient?.mrn || ""
                },
                billing: {
                    ...snapshot?.billing,
                    netAmount: snapshot?.billing?.netAmount || 0,
                    totalPaid: (snapshot?.billing?.totalPaid || 0) + remainingDue,
                    paymentMethod: snapshot?.billing?.paymentMethod || paymentMethod || "Cash"
                },
                orders: (visitObj?.tests || []).map(t => ({
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
        if ((billingMode === 'PrepaidPartner' || isPrepaidIntent) && !snapshot.billing.isLocked) {
            const hasReferralIdentity = snapshot.billing.referral?.partner || snapshot.billing?.referral?.draft;

            if (!hasReferralIdentity) {
                setError("For Prepaid visits, you MUST select a Referral Partner or add a Draft (Who collected payment outside?).");
                return;
            }

            setIsLoading(true);
            setIsActionSubmitting(true);
            try {
                const res = await ReceptionApi.markVisitAsPrepaid(snapshot.visit.visitId);
                // Auto-print thermal receipt slip for prepaid visit
                handlePrintReceipt(res?.token).catch(err => console.error("Thermal print error:", err));
                handleCloseAndReset();
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            } finally {
                setIsActionSubmitting(false);
            }
            return;
        }

        // 2. AUTHORIZE INSURANCE CASHLESS CLAIM
        if (billingMode === 'Insurance' && !snapshot.billing.isLocked) {
            const v = snapshot.visit;
            if (!v?.insuranceCompanyId) {
                setError("Please select an Insurance Company / TPA Provider.");
                return;
            }
            const policyNum = (v?.policyNumber || '').trim();
            if (!policyNum) {
                setError("Please specify the Policy / Member ID for this cashless insurance claim.");
                return;
            }

            setIsLoading(true);
            setIsActionSubmitting(true);
            try {
                // Ensure latest insurance context is committed before authorizing
                await ReceptionApi.updateBillingContext({
                    visitId: snapshot.visit.visitId,
                    billingType: 'Insurance',
                    insuranceCompanyId: v.insuranceCompanyId,
                    policyNumber: policyNum,
                    preAuthApprovalNumber: v?.preAuthApprovalNumber?.trim() || null,
                    insuranceCoPayAmount: v?.insuranceCoPayAmount || 0
                });

                const res = await ReceptionApi.markVisitAsInsurance(snapshot.visit.visitId);

                // Collect Patient Co-Pay if defined
                const coPay = v?.insuranceCoPayAmount || 0;
                if (coPay > 0) {
                    await ReceptionApi.collectPayment(snapshot.visit.visitId, coPay, paymentMethod).catch(err => console.warn("Co-Pay collection:", err));
                }

                // Auto-print thermal receipt slip
                handlePrintReceipt(res?.token).catch(err => console.error("Thermal print error:", err));
                handleCloseAndReset();
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            } finally {
                setIsActionSubmitting(false);
            }
            return;
        }

        // 3. AUTHORIZE CORPORATE B2B BILLING
        if (billingMode === 'Corporate' && !snapshot.billing.isLocked) {
            const v = snapshot.visit;
            if (!v?.corporateAccountId) {
                setError("Please select a Corporate Client / Organization.");
                return;
            }
            const empId = (v?.employeeId || '').trim();
            if (!empId) {
                setError("Please specify the Employee ID / Staff Number for this corporate visit.");
                return;
            }

            setIsLoading(true);
            setIsActionSubmitting(true);
            try {
                // Ensure latest corporate context is committed before authorizing
                await ReceptionApi.updateBillingContext({
                    visitId: snapshot.visit.visitId,
                    billingType: 'Corporate',
                    corporateAccountId: v.corporateAccountId,
                    employeeId: empId
                });

                const res = await ReceptionApi.markVisitAsCorporate(snapshot.visit.visitId);

                // Auto-print thermal receipt slip
                handlePrintReceipt(res?.token).catch(err => console.error("Thermal print error:", err));
                handleCloseAndReset();
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            } finally {
                setIsActionSubmitting(false);
            }
            return;
        }

        // 4. CHECKOUT (ACCEPT PAYMENT - STANDARD DIRECT)
        if (canCheckout && !snapshot.billing.isLocked) {
            setIsLoading(true);
            setIsActionSubmitting(true);
            setError(null);
            try {
                const res = await ReceptionApi.collectPayment(snapshot.visit.visitId, remainingDue, paymentMethod);

                // Auto-print thermal receipt slip
                handlePrintReceipt(res?.token).catch(err => console.error("Thermal print error:", err));

                // Instantly reset and close panel - zero extra clicks or modals
                handleCloseAndReset();
            } catch (err) {
                // If invoice was ALREADY in Paid status (e.g. from prior submit), sync smoothly
                if (err.message && err.message.toLowerCase().includes("paid")) {
                    handlePrintReceipt().catch(err => console.error("Thermal print error:", err));
                    handleCloseAndReset();
                } else {
                    setError(err.message);
                }
                setIsLoading(false);
            } finally {
                setIsActionSubmitting(false);
            }
            return;
        }

        // 5. GENERATE BILL / FINISH VISIT
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
    const canLockPrepaid = (isPrepaidIntent || billingMode === 'PrepaidPartner') && !snapshot?.billing?.isLocked;
    const isVisitFinalized = snapshot?.billing?.paymentStatus === 'Paid' || (remainingDue <= 0 && totalDue > 0);

    const hasTests = Boolean(
        (snapshot?.visit?.tests && snapshot?.visit?.tests.length > 0) || 
        (snapshot?.billing?.items && snapshot?.billing?.items.length > 0) || 
        (snapshot?.billing?.grossAmount > 0)
    );

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
        } else if (billingMode === 'Insurance') {
            const coPay = snapshot?.visit?.insuranceCoPayAmount || 0;
            mainActionLabel = coPay > 0
                ? `Collect Co-Pay (₹${coPay}) & Authorize Claim`
                : "Authorize Cashless Claim (₹0)";
            isActionEnabled = hasTests;
        } else if (billingMode === 'Corporate') {
            mainActionLabel = "Authorize Corporate B2B Bill (₹0)";
            isActionEnabled = hasTests;
        } else if (canLockPrepaid) {
            mainActionLabel = "Prepaid Checkout (₹0)";
            isActionEnabled = hasTests;
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
                hasPatient ? "absolute right-0 top-0 bottom-0 w-[96vw] sm:w-[92vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] 2xl:w-[75vw] max-w-[1520px]" : "absolute right-0 top-0 bottom-0 w-[90vw] sm:w-[480px] max-w-[520px]",
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
                            <div className="px-3 xl:px-4 pb-3 xl:pb-4 mt-3 xl:mt-4 space-y-3.5 xl:space-y-4 animate-in fade-in duration-300">
                                {/* Full-width 4-mode segmented toggle bar separated from payer box */}
                                <div className={cn(
                                    "p-3 rounded-2xl border transition-all shadow-xs",
                                    isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-black/5"
                                )}>
                                    <MultiPayerSelector
                                        billingMode={billingMode}
                                        onChangeMode={handleBillingModeChange}
                                        disabled={snapshot?.billing?.isLocked && !isCorrectionIntent}
                                        isDark={isDark}
                                    />
                                </div>

                                {/* 2-Column Grid for Visit Details & Billing Summary */}
                                <div className={cn(
                                    hasPatient ? "grid grid-cols-2 gap-4 xl:gap-6 items-start" : "flex flex-col gap-4",
                                    (snapshot?.patient || isCorrectionIntent) ? "" : "flex-1 min-h-0 overflow-y-auto"
                                )}>
                                    <div className={hasPatient ? "flex flex-col gap-6" : ""}>
                                        <VisitDetails
                                            snapshot={snapshot}
                                            visitId={currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id || snapshot?.visit?.VisitId}
                                            onVisitUpdated={loadSnapshot}
                                            setIsPrepaidIntent={setIsPrepaidIntent}
                                            isCorrectionIntent={isCorrectionIntent}
                                            billingMode={billingMode}
                                            onOpenModal={setActiveModal}
                                        />
                                    </div>

                                    <div className={cn("animate-in fade-in duration-700", hasPatient ? "flex flex-col gap-6" : "")}>
                                        <BillingSummary
                                            snapshot={snapshot}
                                            onVisitUpdated={loadSnapshot}
                                            isCorrectionIntent={isCorrectionIntent} // Pass down Intent
                                            isPrepaidIntent={isPrepaidIntent} // Pass down Prepaid Status
                                            billingMode={billingMode}
                                            paymentMethod={paymentMethod}
                                            setPaymentMethod={setPaymentMethod}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer / Status Bar - UNIFIED BUTTON */}
            <div className={cn("p-4 flex justify-center shrink-0", ui.footer)}>
                {isCorrectionIntent ? (
                    <div className="flex items-center gap-2.5 w-full max-w-lg mx-auto">
                        <button
                            type="button"
                            onClick={() => setTaxInvoiceModal({ isOpen: true, slotId: 'patient_tax_invoice', data: buildTaxInvoiceData(), title: 'Patient Tax Invoice (A4)' })}
                            className="py-3 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-synos-primary/40 text-synos-primary bg-synos-primary/10 hover:bg-synos-primary/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1"
                            title="Preview & Print Full A4 Tax Invoice"
                        >
                            <FileText className="w-4 h-4" /> Print A4 Receipt
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePrintReceipt()}
                            className="py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                            title="Print Thermal 80mm POS Slip"
                        >
                            <Printer className="w-4 h-4" /> Thermal Slip
                        </button>
                        <button
                            type="button"
                            onClick={handleCloseAndReset}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1",
                                ui.actionBtn.enabled
                            )}
                        >
                            Finish Correction <CheckCircle2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    hasVisit && (
                        <div className="flex flex-col gap-1.5 w-full max-w-md mx-auto">
                            <div className="flex items-center gap-3 w-full">
                                {isVisitFinalized && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setTaxInvoiceModal({ isOpen: true, slotId: 'patient_tax_invoice', data: buildTaxInvoiceData(), title: 'Patient Tax Invoice (A4)' })}
                                            className="py-3 px-3.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border border-synos-primary/40 text-synos-primary bg-synos-primary/10 hover:bg-synos-primary/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1"
                                            title="Preview & Print Full A4 Tax Invoice"
                                        >
                                            <FileText className="w-4 h-4" /> Print A4 Receipt
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrintReceipt}
                                            className="py-3 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                                            title="Print Thermal 80mm POS Slip"
                                        >
                                            <Printer className="w-4 h-4" /> Thermal Slip
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handleUnifiedAction}
                                    disabled={!isActionEnabled || isLoading || isActionSubmitting}
                                    className={cn(
                                        "flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1",
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
                            {canLockPrepaid && !(snapshot?.billing?.referral?.partner || snapshot?.billing?.referral?.draft) && (
                                <p className="text-xs text-amber-500 dark:text-amber-400 font-medium text-center">
                                    * Please select a Referral Partner above (Who collected payment outside?)
                                </p>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Commercial Patient Tax Invoice Viewer */}
            {taxInvoiceModal.isOpen && taxInvoiceModal.data && (
                <CommercialDocumentViewer
                    isOpen={taxInvoiceModal.isOpen}
                    onClose={() => setTaxInvoiceModal({ isOpen: false, data: null })}
                    title={taxInvoiceModal.title || `Patient Tax Invoice - ${taxInvoiceModal.data?.patient?.name || ''}`}
                    defaultLetterheadMode="digital"
                    paperSize={taxInvoiceModal.paperSize || "a4"}
                >
                    <DynamicDocumentRenderer slotId={taxInvoiceModal.slotId || "patient_tax_invoice"} data={taxInvoiceModal.data} />
                </CommercialDocumentViewer>
            )}

            {/* Scoped In-Panel Quick-Add Modals (Strictly clipped within IntentPanel silhouette) */}
            <AddReferralPartnerModal
                isOpen={activeModal === 'referral'}
                onClose={() => setActiveModal(null)}
                initialPaymentModel={billingMode === 'PrepaidPartner' ? 'PartnerCollects' : 'LabCollects'}
                isDark={isDark}
                onSuccess={async (newPartner) => {
                    const partnerId = newPartner.referralPartnerId || newPartner.id;
                    const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
                    if (visitId && partnerId) {
                        try {
                            await ReceptionApi.applyReferralToVisit(visitId, partnerId);
                        } catch (err) {
                            console.error("Failed to auto-apply referral partner to visit:", err);
                        }
                    }
                    await loadSnapshot();
                    setActiveModal(null);
                }}
            />

            <AddInsuranceCompanyModal
                isOpen={activeModal === 'insurance'}
                onClose={() => setActiveModal(null)}
                isDark={isDark}
                onSuccess={async (newInsurer) => {
                    const companyId = newInsurer.id || newInsurer.insuranceCompanyId;
                    const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
                    if (visitId && companyId) {
                        try {
                            await ReceptionApi.updateBillingContext(visitId, { insuranceCompanyId: companyId });
                        } catch (err) {
                            console.error("Failed to auto-link insurance company to visit:", err);
                        }
                    }
                    await loadSnapshot();
                    setActiveModal(null);
                }}
            />

            <AddCorporateAccountModal
                isOpen={activeModal === 'corporate'}
                onClose={() => setActiveModal(null)}
                isDark={isDark}
                onSuccess={async (newCorp) => {
                    const accountId = newCorp.id || newCorp.corporateAccountId;
                    const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
                    if (visitId && accountId) {
                        try {
                            await ReceptionApi.updateBillingContext(visitId, { corporateAccountId: accountId });
                        } catch (err) {
                            console.error("Failed to auto-link corporate account to visit:", err);
                        }
                    }
                    await loadSnapshot();
                    setActiveModal(null);
                }}
            />
        </div >
    )
}
