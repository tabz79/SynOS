
import { X, Loader2, ArrowRight, AlertCircle, CheckCircle2, Printer, FileText, Building2, ScrollText, Pencil, Save } from 'lucide-react'
import { useReceptionDrawer } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { VisitDetails } from './VisitDetails'
import { BillingSummary, extractB2BInfo } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ReceptionApi } from '@/api/reception'
import { FinanceApi } from '@/api/finance'
import { SignalRService } from '@/lib/signalr'
import { usePanelEntry } from '@/hooks/useSynOSMotion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useTheme } from '@/context/ThemeContext'
import { generateThermalInvoiceHtml, legacyTriggerPrint } from '@/utils/thermalPrinter'
import { CommercialDocumentViewer } from '@/features/finance/components/documents/CommercialDocumentViewer'
import { DynamicDocumentRenderer, clearDocumentCache } from '@/features/finance/components/documents/DynamicDocumentRenderer'
import { 
    MultiPayerSelector, 
    AddInsuranceCompanyModal, 
    AddCorporateAccountModal, 
    AddReferralPartnerModal,
    AddDiscountReasonModal
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
    const modeSwitchVersionRef = useRef(0);
    // STAGE 2: Payment Method State (Lifted for Footer Access)
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    // Scoped Quick-Add Modal State: null | 'referral' | 'insurance' | 'corporate' | 'discountReason'
    const [activeModal, setActiveModal] = useState(null);
    const [createdDiscountReason, setCreatedDiscountReason] = useState(null);

    // RESTORED: Core Internal State
    const [snapshot, setSnapshot] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for Patient ID & Visit ID
    const [currentPatientId, setCurrentPatientId] = useState(null);
    const [currentVisitId, setCurrentVisitId] = useState(null);

    // STAGED BATCH EDIT STATE (Enterprise Full-Fledged Edit Mode)
    const [stagedAddedTests, setStagedAddedTests] = useState([]);
    const [stagedRemovedOrderIds, setStagedRemovedOrderIds] = useState([]);
    const [stagedDiscount, setStagedDiscount] = useState(null);
    const [stagedDemographics, setStagedDemographics] = useState(null);
    const [stagedReferralPartnerId, setStagedReferralPartnerId] = useState(undefined);
    const [stagedSecondaryPartnerId, setStagedSecondaryPartnerId] = useState(undefined);
    const [isEditDemographicsOpen, setIsEditDemographicsOpen] = useState(false);
    const [editDemographicsDraft, setEditDemographicsDraft] = useState({
        firstName: '',
        lastName: '',
        age: '',
        ageUnit: 'Years',
        gender: 'Male',
        mobile: ''
    });
    const [isBatchEditConfirmModalOpen, setIsBatchEditConfirmModalOpen] = useState(false);
    const [batchEditReason, setBatchEditReason] = useState('');
    const [isSubmittingBatchEdit, setIsSubmittingBatchEdit] = useState(false);

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
            setStagedAddedTests([]);
            setStagedRemovedOrderIds([]);
            setStagedDiscount(null);
            setStagedDemographics(null);
            setStagedReferralPartnerId(undefined);
            setStagedSecondaryPartnerId(undefined);
            setIsEditDemographicsOpen(false);
            setIsBatchEditConfirmModalOpen(false);
            setBatchEditReason('');
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
        const snapshotVersion = modeSwitchVersionRef.current;
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

            // Sync multi-payer billing mode from snapshot ONLY if a mode switch hasn't occurred in the meantime
            if (snapshotVersion === modeSwitchVersionRef.current) {
                const bt = data?.visit?.billingType;
                if (bt === 1 || bt === 'PrepaidPartner' || data?.visit?.paymentCollectionModel === 'PartnerCollects') {
                    setBillingMode('PrepaidPartner');
                    setIsPrepaidIntent(true);
                } else if (bt === 2 || bt === 'Insurance' || bt === 3 || bt === 'Corporate') {
                    setBillingMode('Insurance');
                    setIsPrepaidIntent(false);
                } else if (bt === 0 || bt === 'Standard') {
                    setBillingMode('Standard');
                    setIsPrepaidIntent(false);
                }
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
        if (billingMode === newMode) return;
        const thisVersion = ++modeSwitchVersionRef.current;
        setBillingMode(newMode);
        setIsPrepaidIntent(newMode === 'PrepaidPartner');

        const vId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
        if (vId && (!snapshot?.billing?.isLocked || isCorrectionIntent)) {
            try {
                // If switching to Direct / Standard or Prepaid, strip any institutional packages from basket
                if (newMode !== 'Insurance' && newMode !== 'Corporate') {
                    const existingTests = snapshot?.visit?.tests || [];
                    const institutionalPkgs = existingTests.filter(t => {
                        const c = (t.code || t.testCode || '').toUpperCase();
                        return c.startsWith('PKG-') || t.isPackage === true;
                    });
                    for (const pkg of institutionalPkgs) {
                        try {
                            await ReceptionApi.removeTestFromVisit(vId, pkg.code || pkg.testCode);
                        } catch (e) {
                            console.warn("Failed to strip package from visit on mode change:", e);
                        }
                    }
                }

                // Single unified API call (SetBillingContextAsync atomically updates PaymentCollectionModel too)
                await ReceptionApi.updateBillingContext({
                    visitId: vId,
                    billingType: newMode
                });

                // Drop stale responses if user clicked another mode while this request was flying
                if (thisVersion !== modeSwitchVersionRef.current) return;

                await loadSnapshot();
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

    // Derived Modified Patient Identity
    const displayedPatient = useMemo(() => {
        if (!snapshot?.patient) return null;
        if (!stagedDemographics) return snapshot.patient;
        const fn = stagedDemographics.firstName ?? snapshot.patient.firstName;
        const ln = stagedDemographics.lastName ?? snapshot.patient.lastName;
        return {
            ...snapshot.patient,
            firstName: fn,
            lastName: ln,
            name: `${fn || ''} ${ln || ''}`.trim(),
            displayName: `${fn || ''} ${ln || ''}`.trim(),
            age: stagedDemographics.age !== undefined && stagedDemographics.age !== '' ? Number(stagedDemographics.age) : snapshot.patient.age,
            gender: stagedDemographics.gender ?? snapshot.patient.gender,
            mobile: stagedDemographics.mobile ?? snapshot.patient.mobile,
            currentPhoneNumber: stagedDemographics.mobile ?? snapshot.patient.currentPhoneNumber,
            isModified: true
        };
    }, [snapshot?.patient, stagedDemographics]);

    // Staged Financial & Test Basket Calculations
    const originalTests = snapshot?.visit?.tests || [];
    const activeRemainingTests = originalTests.filter(t => 
        !t.parentOrderId && 
        !(t.price === 0 && !t.isProfile && originalTests.some(p => p.isProfile)) &&
        !stagedRemovedOrderIds.includes(t.orderId || t.OrderId || t.TestId || t.testId)
    );

    const baseGross = activeRemainingTests.reduce((sum, t) => sum + (Number(t.basePrice || t.price || t.Price) || 0), 0);
    const addedGross = stagedAddedTests.reduce((sum, t) => sum + (Number(t.basePrice || t.price || t.Price) || 0), 0);
    const stagedGross = baseGross + addedGross;

    const isPrepaid = billingMode === 'PrepaidPartner' || isPrepaidIntent;

    let stagedDiscountAmt = 0;
    if (stagedDiscount?.remove) {
        stagedDiscountAmt = 0;
    } else if (stagedDiscount) {
        const val = Number(stagedDiscount.value) || 0;
        if (stagedDiscount.type === 'Percentage') {
            stagedDiscountAmt = Math.round((stagedGross * (val / 100)) * 100) / 100;
        } else {
            stagedDiscountAmt = Math.min(stagedGross, val);
        }
    } else if (isPrepaid) {
        const b2bInfo = extractB2BInfo(snapshot);
        if (b2bInfo.rawType === 'PERCENTAGE') {
            stagedDiscountAmt = Math.round((stagedGross * (b2bInfo.rawVal / 100)) * 100) / 100;
        } else {
            stagedDiscountAmt = Math.min(stagedGross, b2bInfo.rawAmount || b2bInfo.rawVal || 0);
        }
    } else {
        stagedDiscountAmt = snapshot?.billing?.appliedDiscount ? (Number(snapshot?.billing?.discountAmount) || 0) : 0;
    }

    const stagedNet = Math.max(0, stagedGross - stagedDiscountAmt);
    const originalPaid = isPrepaid ? 0 : Number(snapshot?.billing?.totalPaid ?? snapshot?.billing?.netAmount ?? 0);
    const settlementDiff = isPrepaid ? 0 : (stagedNet - originalPaid);

    const stagedChangesCount = 
        stagedAddedTests.length + 
        stagedRemovedOrderIds.length + 
        (stagedDiscount ? 1 : 0) + 
        (stagedDemographics ? 1 : 0) +
        (stagedReferralPartnerId !== undefined ? 1 : 0) +
        (stagedSecondaryPartnerId !== undefined ? 1 : 0);

    const buildTaxInvoiceData = () => {
        const visitObj = snapshot?.visit;
        const p = displayedPatient || snapshot?.patient;
        const b = snapshot?.billing;

        const effectiveGross = stagedGross !== undefined ? stagedGross : (b?.grossAmount || b?.netAmount || 0);
        const effectiveDiscount = stagedDiscountAmt !== undefined ? stagedDiscountAmt : (b?.discountAmount || 0);
        const effectiveNet = stagedNet !== undefined ? stagedNet : (b?.netAmount || 0);
        const effectivePaid = isPrepaid ? 0 : (b?.totalPaid || effectiveNet);
        const dueVal = isPrepaid ? 0 : Math.max(0, effectiveNet - effectivePaid);

        const isCorporate = billingMode === 'Corporate' || visitObj?.billingType === 'Corporate' || Boolean(visitObj?.corporateAccountId);
        const isInsurance = billingMode === 'Insurance' || visitObj?.billingType === 'Insurance' || Boolean(visitObj?.insuranceCompanyId);
        const isPartner = isPrepaid || Boolean(visitObj?.referralPartnerId) || stagedReferralPartnerId !== undefined;

        const corpName = visitObj?.corporateAccount?.companyName || visitObj?.corporateAccount?.name || (isCorporate ? 'Corporate Client' : '');
        const corpCode = visitObj?.corporateAccount?.corporateCode || '';
        const empId = visitObj?.employeeId || '';

        const insName = visitObj?.insuranceCompany?.name || (isInsurance ? 'Insurance Provider' : '');
        const insTpa = visitObj?.insuranceCompany?.tpaName || '';
        const policyNo = visitObj?.policyNumber || '';
        const preAuth = visitObj?.preAuthApprovalNumber || '';
        const coPay = visitObj?.insuranceCoPayAmount || 0;

        const effectiveRefPartner = stagedReferralPartnerId !== undefined
            ? (stagedReferralPartnerId ? (visitObj?.referralPartner || b?.referral?.partner) : null)
            : (visitObj?.referralPartner || b?.referral?.partner);

        const refName = effectiveRefPartner?.name || effectiveRefPartner?.displayName || (isPartner ? 'Referral Partner' : 'Self / Direct');
        const refClinic = effectiveRefPartner?.clinicName || '';
        const refCode = effectiveRefPartner?.code || '';

        // Dynamic On-the-Fly Test Basket
        const effectiveTests = [
            ...activeRemainingTests,
            ...stagedAddedTests.map(t => ({
                ...t,
                testCode: t.testCode || t.code,
                name: t.testName || t.name || t.testCode,
                price: Number(t.basePrice || t.price || t.Price) || 0
            }))
        ];

        const hasOutsourced = effectiveTests.some(t => t.isOutsourced || Boolean(t.referenceLabName));
        const outsourcedLabs = effectiveTests.filter(t => t.isOutsourced && t.referenceLabName).map(t => t.referenceLabName);

        return {
            billNumber: visitObj?.visitToken || visitObj?.token || "INV-REC-001",
            date: new Date().toISOString(),
            status: b?.paymentStatus || (dueVal <= 0 ? 'Paid' : 'PendingPayment'),
            billingContext: {
                billingType: billingMode || visitObj?.billingType || 'Standard',
                isCorporate,
                corporateName: corpName,
                corporateCode: corpCode,
                employeeId: empId,
                isInsurance,
                insuranceCompanyName: insName,
                insuranceTpaName: insTpa,
                policyNumber: policyNo,
                preAuthApprovalNumber: preAuth,
                insuranceCoPayAmount: coPay,
                isReferred: isPartner,
                referralPartnerName: refName,
                referralPartnerClinic: refClinic,
                referralPartnerCode: refCode,
                hasOutsourcedTests: hasOutsourced,
                outsourcedLabNames: outsourcedLabs
            },
            patient: {
                name: p?.fullName || p?.name || "Direct Patient",
                uhid: p?.mrn || p?.uhid || "WALK-IN",
                ageGender: p?.age ? `${p.age} ${p?.ageUnit || 'Yrs'} / ${p?.gender || 'M'}` : "Adult",
                phone: p?.phone || p?.mobile || p?.currentPhoneNumber || "N/A",
                referringDoctor: refName,
                corporateName: corpName,
                corporateCode: corpCode,
                employeeId: empId,
                insuranceCompanyName: insName,
                insuranceTpaName: insTpa,
                policyNumber: policyNo,
                preAuthNumber: preAuth,
                billingMode: billingMode || visitObj?.billingType || 'Standard'
            },
            items: effectiveTests.map((t, idx) => ({
                index: idx + 1,
                name: t.testName || t.name || t.testCode,
                code: t.testCode,
                department: t.department || 'Pathology',
                price: Number(t.price || t.basePrice || 0),
                discount: 0,
                amount: Number(t.price || t.basePrice || 0),
                isOutsourced: Boolean(t.isOutsourced),
                referenceLabName: t.referenceLabName || ''
            })),
            financial: {
                grossSubtotal: effectiveGross,
                discountAmount: effectiveDiscount,
                totalAmount: effectiveNet,
                totalPaid: effectivePaid,
                balanceDue: dueVal
            }
        };
    };

    const handlePrintReceipt = async (overrideToken) => {
        const visitObj = snapshot?.visit;
        if (!visitObj) return;
        try {
            const tokenToPrint = overrideToken || visitObj?.visitToken || visitObj?.token || "WAIT";
            const p = displayedPatient || snapshot?.patient;

            const effectiveGross = stagedGross !== undefined ? stagedGross : (snapshot?.billing?.grossAmount || 0);
            const effectiveDiscount = stagedDiscountAmt !== undefined ? stagedDiscountAmt : (snapshot?.billing?.discountAmount || 0);
            const effectiveNet = stagedNet !== undefined ? stagedNet : (snapshot?.billing?.netAmount || 0);
            const effectivePaid = isPrepaid ? 0 : (snapshot?.billing?.totalPaid || effectiveNet);

            const effectiveTests = [
                ...activeRemainingTests,
                ...stagedAddedTests.map(t => ({
                    ...t,
                    testCode: t.testCode || t.code,
                    name: t.testName || t.name || t.testCode,
                    price: Number(t.basePrice || t.price || t.Price) || 0
                }))
            ];

            const effectiveRefPartner = stagedReferralPartnerId !== undefined
                ? (stagedReferralPartnerId ? (visitObj?.referralPartner || snapshot?.billing?.referral?.partner) : null)
                : (visitObj?.referralPartner || snapshot?.billing?.referral?.partner);

            const printPayload = {
                visitId: visitObj?.visitId || currentVisitId,
                token: tokenToPrint,
                patient: {
                    name: p?.fullName || p?.name || "Patient",
                    sex: p?.gender || "M",
                    age: p?.age || "",
                    mrn: p?.mrn || ""
                },
                billing: {
                    ...snapshot?.billing,
                    grossAmount: effectiveGross,
                    discountAmount: effectiveDiscount,
                    netAmount: effectiveNet,
                    totalPaid: effectivePaid,
                    paymentMethod: isPrepaid ? "Corporate B2B Prepaid" : (snapshot?.billing?.paymentMethod || paymentMethod || "Cash")
                },
                orders: effectiveTests.map(t => ({
                    testCode: t.testCode,
                    testName: t.testName || t.name || t.testCode,
                    grossAmount: Number(t.price || t.basePrice || 0),
                    discount: 0,
                    netAmount: Number(t.price || t.basePrice || 0)
                })),
                referringDoctorName: effectiveRefPartner?.name || effectiveRefPartner?.displayName || "Self",
                labName: "Diagnostic Laboratory",
                branch: { name: "Main Lab" }
            };
            const html = generateThermalInvoiceHtml(printPayload);
            await legacyTriggerPrint(html);
        } catch (err) {
            console.error("Failed to print receipt:", err);
        }
    };

    const [isGeneratingClaimDoc, setIsGeneratingClaimDoc] = useState(false);

    const handlePrintDoctorReceivable = async () => {
        const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
        if (!visitId) return;

        setIsGeneratingClaimDoc(true);
        try {
            clearDocumentCache();
            const claimData = await FinanceApi.getPartnerClaimStatement({
                visitIds: [visitId]
            });
            setTaxInvoiceModal({
                isOpen: true,
                slotId: 'partner_b2b_invoice',
                data: claimData,
                title: `Doctor's Receivable Claim - ${claimData?.partner?.name || 'Partner'}`
            });
        } catch (err) {
            console.error("Failed to load doctor receivable claim statement:", err);
            alert("Could not load Doctor's Receivable Claim Statement: " + (err.message || 'Make sure a referral partner/RMP is selected.'));
        } finally {
            setIsGeneratingClaimDoc(false);
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
            if (!v?.insuranceCompanyId && !v?.corporateAccountId) {
                setError("Please select an Insurance or Corporate Company.");
                return;
            }
            const policyNum = (v?.policyNumber || '').trim() || null;

            setIsLoading(true);
            setIsActionSubmitting(true);
            try {
                // Ensure latest insurance context is committed before authorizing
                await ReceptionApi.updateBillingContext({
                    visitId: snapshot.visit.visitId,
                    billingType: 'Insurance',
                    insuranceCompanyId: v?.insuranceCompanyId || null,
                    corporateAccountId: v?.corporateAccountId || null,
                    policyNumber: policyNum,
                    employeeId: v?.employeeId || policyNum,
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

    // STAGED BATCH EDIT HANDLERS (Enterprise Full-Fledged Edit Mode)
    const handleAddStagedTest = (test) => {
        const code = test.testCode || test.code;
        if (stagedAddedTests.some(t => (t.testCode || t.code)?.toLowerCase() === code?.toLowerCase())) {
            return;
        }
        setStagedAddedTests(prev => [...prev, test]);
    };

    const handleRemoveStagedAddedTest = (index) => {
        setStagedAddedTests(prev => prev.filter((_, i) => i !== index));
    };

    const handleToggleRemoveOrderId = (orderId, testCode) => {
        if (!orderId) return;
        setStagedRemovedOrderIds(prev => {
            if (prev.includes(orderId)) {
                return prev.filter(id => id !== orderId);
            } else {
                return [...prev, orderId];
            }
        });
    };

    const handleOpenEditDemographics = () => {
        const p = snapshot?.patient;
        setEditDemographicsDraft({
            firstName: stagedDemographics?.firstName ?? p?.firstName ?? '',
            lastName: stagedDemographics?.lastName ?? p?.lastName ?? '',
            age: stagedDemographics?.age ?? p?.age ?? '',
            ageUnit: stagedDemographics?.ageUnit ?? 'Years',
            gender: stagedDemographics?.gender ?? p?.gender ?? 'Male',
            mobile: stagedDemographics?.mobile ?? p?.mobile ?? p?.currentPhoneNumber ?? ''
        });
        setIsEditDemographicsOpen(true);
    };

    const handleSaveDemographicsDraft = () => {
        setStagedDemographics({ ...editDemographicsDraft });
        setIsEditDemographicsOpen(false);
    };

    const handleConfirmBatchEdit = async () => {
        if (!batchEditReason || !batchEditReason.trim()) {
            alert("A reason is mandatory for auditing visit modifications.");
            return;
        }
        setIsSubmittingBatchEdit(true);
        try {
            const vId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
            const payload = {
                firstName: stagedDemographics?.firstName,
                lastName: stagedDemographics?.lastName,
                age: stagedDemographics?.age ? Number(stagedDemographics.age) : null,
                ageUnit: stagedDemographics?.ageUnit || "Years",
                gender: stagedDemographics?.gender,
                mobile: stagedDemographics?.mobile,
                updateReferralPartner: stagedReferralPartnerId !== undefined,
                referralPartnerId: stagedReferralPartnerId !== undefined ? stagedReferralPartnerId : (snapshot?.visit?.referralPartnerId || null),
                updateSecondaryPartner: stagedSecondaryPartnerId !== undefined,
                secondaryPartnerId: stagedSecondaryPartnerId !== undefined ? stagedSecondaryPartnerId : (snapshot?.visit?.secondaryReferralPartnerId || null),
                billingMode: billingMode,
                addTestCodes: stagedAddedTests.map(t => t.testCode || t.code),
                removeOrderIds: stagedRemovedOrderIds,
                updateDiscount: stagedDiscount !== null,
                discountType: stagedDiscount?.type,
                discountValue: stagedDiscount?.remove ? 0 : stagedDiscount?.value,
                discountReason: stagedDiscount?.reason,
                b2bDiscountAmount: isPrepaid ? stagedDiscountAmt : null,
                b2bDiscountType: isPrepaid ? (stagedDiscount?.type || 'Flat') : null,
                b2bDiscountValue: isPrepaid ? (stagedDiscount?.value ?? (Number(snapshot?.visit?.b2bDiscountValue) || 0)) : null,
                settlementDifference: settlementDiff,
                paymentMethod: paymentMethod,
                reason: batchEditReason.trim()
            };

            const result = await ReceptionApi.batchEditVisit(vId, payload);
            
            // Success Feedback
            setStagedAddedTests([]);
            setStagedRemovedOrderIds([]);
            setStagedDiscount(null);
            setStagedDemographics(null);
            setStagedReferralPartnerId(undefined);
            setStagedSecondaryPartnerId(undefined);
            setIsBatchEditConfirmModalOpen(false);
            setBatchEditReason('');
            
            await loadSnapshot();
            alert(result.message || "Visit successfully updated and settled!");
        } catch (err) {
            console.error("Batch edit failed", err);
            alert("Batch edit failed: " + err.message);
        } finally {
            setIsSubmittingBatchEdit(false);
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
                hasPatient ? "absolute right-0 top-0 bottom-0 w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[84vw] max-w-[1780px]" : "absolute right-0 top-0 bottom-0 w-[90vw] sm:w-[480px] max-w-[520px]",
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
                        <div className="relative">
                            <PatientIdentification
                                snapshot={{ ...snapshot, patient: displayedPatient }}
                                onSelectPatient={handleSelectPatient}
                                onClearPatient={handleClearPatient}
                                onEditPatient={handleOpenEditDemographics}
                                isCorrectionIntent={isCorrectionIntent}
                            />
                        </div>

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

                                {/* 2-Column Grid for Visit Details & Billing Summary (58% / 42% Ratio) */}
                                <div className={cn(
                                    hasPatient ? "grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start" : "flex flex-col gap-4",
                                    (snapshot?.patient || isCorrectionIntent) ? "" : "flex-1 min-h-0 overflow-y-auto"
                                )}>
                                    <div className={hasPatient ? "lg:col-span-7 flex flex-col gap-5" : ""}>
                                        <VisitDetails
                                            snapshot={snapshot}
                                            visitId={currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id || snapshot?.visit?.VisitId}
                                            onVisitUpdated={loadSnapshot}
                                            setIsPrepaidIntent={setIsPrepaidIntent}
                                            isCorrectionIntent={isCorrectionIntent}
                                            billingMode={billingMode}
                                            onOpenModal={setActiveModal}
                                            stagedAddedTests={stagedAddedTests}
                                            onAddStagedTest={handleAddStagedTest}
                                            stagedRemovedOrderIds={stagedRemovedOrderIds}
                                            onToggleRemoveOrderId={handleToggleRemoveOrderId}
                                            onRemoveStagedAddedTest={handleRemoveStagedAddedTest}
                                            stagedReferralPartnerId={stagedReferralPartnerId}
                                            stagedSecondaryPartnerId={stagedSecondaryPartnerId}
                                            onStageReferral={(pId) => setStagedReferralPartnerId(pId)}
                                            onStageSecondaryReferral={(sId) => setStagedSecondaryPartnerId(sId)}
                                        />
                                    </div>

                                    <div className={cn("animate-in fade-in duration-700", hasPatient ? "lg:col-span-5 flex flex-col gap-5 sticky top-2" : "")}>
                                        <BillingSummary
                                            snapshot={snapshot}
                                            onVisitUpdated={loadSnapshot}
                                            isCorrectionIntent={isCorrectionIntent}
                                            isPrepaidIntent={isPrepaidIntent}
                                            billingMode={billingMode}
                                            paymentMethod={paymentMethod}
                                            setPaymentMethod={setPaymentMethod}
                                            onOpenModal={setActiveModal}
                                            createdDiscountReason={createdDiscountReason}
                                            stagedDiscount={stagedDiscount}
                                            onStageDiscount={setStagedDiscount}
                                            stagedGross={stagedGross}
                                            stagedDiscountAmt={stagedDiscountAmt}
                                            stagedNet={stagedNet}
                                            settlementDiff={settlementDiff}
                                            originalPaid={originalPaid}
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
                    <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                        <button
                            type="button"
                            onClick={() => setTaxInvoiceModal({ isOpen: true, slotId: 'patient_tax_invoice', data: buildTaxInvoiceData(), title: 'Patient Tax Invoice (A4)' })}
                            className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-synos-primary/40 text-synos-primary bg-synos-primary/10 hover:bg-synos-primary/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1"
                            title="Preview & Print Full A4 Tax Invoice"
                        >
                            <FileText className="w-4 h-4" /> A4 Receipt
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePrintReceipt()}
                            className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                            title="Print Thermal 80mm POS Slip"
                        >
                            <Printer className="w-4 h-4" /> Thermal
                        </button>
                        <button
                            type="button"
                            disabled={isGeneratingClaimDoc}
                            onClick={handlePrintDoctorReceivable}
                            className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-500/40 text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                            title="Print Doctor's Receivable Statement for Safe Keeping & Claims"
                        >
                            {isGeneratingClaimDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                            Doc Claim
                        </button>

                        {/* UNIFIED PRIMARY ACTION BUTTON */}
                        {stagedChangesCount > 0 ? (
                            <button
                                type="button"
                                onClick={() => setIsBatchEditConfirmModalOpen(true)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer bg-synos-primary text-white hover:bg-synos-primary/90 focus:outline-none focus:ring-2 focus:ring-synos-primary"
                            >
                                <span>Save Changes & Settle</span>
                                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-mono font-bold">
                                    {stagedChangesCount}
                                </span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleCloseAndReset}
                                className={cn(
                                    "flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1",
                                    ui.actionBtn.enabled
                                )}
                            >
                                Close Editor <CheckCircle2 className="w-4 h-4" />
                            </button>
                        )}
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
                                            className="py-2.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border border-synos-primary/40 text-synos-primary bg-synos-primary/10 hover:bg-synos-primary/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1"
                                            title="Preview & Print Full A4 Tax Invoice"
                                        >
                                            <FileText className="w-3.5 h-3.5" /> A4
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrintReceipt}
                                            className="py-2.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                                            title="Print Thermal 80mm POS Slip"
                                        >
                                            <Printer className="w-3.5 h-3.5" /> POS
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isGeneratingClaimDoc}
                                            onClick={handlePrintDoctorReceivable}
                                            className="py-2.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border border-indigo-500/40 text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                            title="Print Doctor's Receivable Claim Statement for Safe Keeping"
                                        >
                                            {isGeneratingClaimDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                                            Doc Claim
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
                    <DynamicDocumentRenderer 
                        slotId={taxInvoiceModal.slotId || "patient_tax_invoice"} 
                        data={taxInvoiceModal.data} 
                        forceRefresh={true}
                    />
                </CommercialDocumentViewer>
            )}

            {/* Scoped In-Panel Quick-Add Modals (Strictly clipped within IntentPanel silhouette) */}
            <AddReferralPartnerModal
                isOpen={activeModal === 'referral'}
                onClose={() => setActiveModal(null)}
                initialPaymentModel={billingMode === 'PrepaidPartner' ? 'PartnerCollects' : 'LabCollects'}
                initialPartnerType="Doctor"
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

            {/* Dedicated RMP Quick-Add Modal */}
            <AddReferralPartnerModal
                isOpen={activeModal === 'rmp'}
                onClose={() => setActiveModal(null)}
                initialPaymentModel="PartnerCollects"
                initialPartnerType="RMP"
                isDark={isDark}
                onSuccess={async (newPartner) => {
                    const partnerId = newPartner.referralPartnerId || newPartner.id;
                    const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
                    if (visitId && partnerId) {
                        try {
                            await ReceptionApi.updateSecondaryReferral(visitId, partnerId);
                        } catch (err) {
                            console.error("Failed to auto-apply RMP to visit:", err);
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

            <AddDiscountReasonModal
                isOpen={activeModal === 'discountReason'}
                onClose={() => setActiveModal(null)}
                isDark={isDark}
                onSuccess={(newReason) => {
                    setCreatedDiscountReason(newReason);
                    setActiveModal(null);
                }}
            />

            {/* EDIT PATIENT DEMOGRAPHICS MODAL (Enterprise Edit Mode) */}
            {isEditDemographicsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 border",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                    )}>
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-synos-primary" />
                                <h3 className="font-bold text-base">Edit Patient Demographics</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditDemographicsOpen(false)}
                                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">First Name</label>
                                    <input
                                        type="text"
                                        value={editDemographicsDraft.firstName}
                                        onChange={(e) => setEditDemographicsDraft(prev => ({ ...prev, firstName: e.target.value }))}
                                        className={cn("w-full h-9 px-3 rounded-lg border outline-none font-medium", isDark ? "bg-black border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
                                        placeholder="First Name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">Last Name</label>
                                    <input
                                        type="text"
                                        value={editDemographicsDraft.lastName}
                                        onChange={(e) => setEditDemographicsDraft(prev => ({ ...prev, lastName: e.target.value }))}
                                        className={cn("w-full h-9 px-3 rounded-lg border outline-none font-medium", isDark ? "bg-black border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
                                        placeholder="Last Name"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1 space-y-1">
                                    <label className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">Age</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="130"
                                        value={editDemographicsDraft.age}
                                        onChange={(e) => setEditDemographicsDraft(prev => ({ ...prev, age: e.target.value }))}
                                        className={cn("w-full h-9 px-3 rounded-lg border outline-none font-mono font-bold", isDark ? "bg-black border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
                                        placeholder="Age"
                                    />
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <label className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">Age Unit</label>
                                    <select
                                        value={editDemographicsDraft.ageUnit}
                                        onChange={(e) => setEditDemographicsDraft(prev => ({ ...prev, ageUnit: e.target.value }))}
                                        className={cn("w-full h-9 px-2 rounded-lg border outline-none font-medium cursor-pointer", isDark ? "bg-black border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
                                    >
                                        <option value="Years">Years</option>
                                        <option value="Months">Months</option>
                                        <option value="Days">Days</option>
                                    </select>
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <label className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">Gender</label>
                                    <select
                                        value={editDemographicsDraft.gender}
                                        onChange={(e) => setEditDemographicsDraft(prev => ({ ...prev, gender: e.target.value }))}
                                        className={cn("w-full h-9 px-2 rounded-lg border outline-none font-medium cursor-pointer", isDark ? "bg-black border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">Mobile Number</label>
                                <input
                                    type="tel"
                                    value={editDemographicsDraft.mobile}
                                    onChange={(e) => setEditDemographicsDraft(prev => ({ ...prev, mobile: e.target.value }))}
                                    className={cn("w-full h-9 px-3 rounded-lg border outline-none font-mono font-medium", isDark ? "bg-black border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
                                    placeholder="10-digit mobile"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setIsEditDemographicsOpen(false)}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveDemographicsDraft}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-synos-primary text-white hover:bg-synos-primary/90 transition-all shadow-xs cursor-pointer"
                            >
                                Save Demographics
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UNIFIED BATCH EDIT CONFIRMATION MODAL */}
            {isBatchEditConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className={cn(
                        "w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 border max-h-[90vh] flex flex-col",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                    )}>
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-synos-primary/10 text-synos-primary flex items-center justify-center font-bold">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base leading-none">Confirm Visit Edits & Settlement</h3>
                                    <p className="text-xs text-zinc-500 mt-1 font-mono">Token: {snapshot?.visit?.token || 'N/A'}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBatchEditConfirmModalOpen(false)}
                                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable Summary Body */}
                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
                            {/* 1. Demographics Summary */}
                            {stagedDemographics && (
                                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                                    <div className="font-bold text-[11px] uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                                        <span>👤 Patient Demographics Updated</span>
                                    </div>
                                    <div className="text-xs space-y-0.5 pt-1 font-medium text-zinc-700 dark:text-zinc-300">
                                        <div>Name: <strong>{stagedDemographics.firstName} {stagedDemographics.lastName}</strong></div>
                                        <div>Age/Gender: <strong>{stagedDemographics.age} {stagedDemographics.ageUnit} / {stagedDemographics.gender}</strong></div>
                                        <div>Phone: <strong>{stagedDemographics.mobile}</strong></div>
                                    </div>
                                </div>
                            )}

                            {/* 2. Added Tests & Specimen Container Analysis */}
                            {stagedAddedTests.length > 0 && (
                                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                                    <div className="font-bold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        🧪 Tests Added ({stagedAddedTests.length})
                                    </div>
                                    <div className="space-y-1.5">
                                        {stagedAddedTests.map((t, idx) => {
                                            const specType = t.specimenTypeCode;
                                            const existingSpec = (snapshot?.visit?.specimens || []).find(s => s.specimenTypeCode === specType && s.status !== 'Cancelled');
                                            const isReuse = Boolean(existingSpec);

                                            return (
                                                <div key={idx} className="flex flex-col gap-0.5 p-2 rounded-lg bg-white/60 dark:bg-zinc-800/60 border border-emerald-500/20">
                                                    <div className="flex justify-between font-bold">
                                                        <span>{t.name || t.testName} ({t.code || t.testCode})</span>
                                                        <span className="font-mono">₹{t.price || t.basePrice || 0}</span>
                                                    </div>
                                                    <div className="text-[11px] flex items-center gap-1.5 mt-0.5">
                                                        {isReuse ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                                ✓ Reusing collected {existingSpec.tubeName || specType || "Specimen"} container (No new pricking)
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                                ⚠️ Phlebotomy alert: New {specType || "sample"} tube queued for collection
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 3. Removed Tests */}
                            {stagedRemovedOrderIds.length > 0 && (
                                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 space-y-1.5">
                                    <div className="font-bold text-[11px] uppercase tracking-wider text-red-500">
                                        🗑️ Tests Cancelled ({stagedRemovedOrderIds.length})
                                    </div>
                                    <div className="space-y-1">
                                        {stagedRemovedOrderIds.map((oId, idx) => {
                                            const order = (snapshot?.visit?.tests || []).find(t => (t.orderId || t.OrderId || t.TestId || t.testId) === oId);
                                            return (
                                                <div key={idx} className="flex justify-between text-xs p-1.5 rounded bg-white/50 dark:bg-zinc-800/50">
                                                    <span className="line-through text-zinc-600 dark:text-zinc-400">{order?.testName || order?.name || 'Test Order'} ({order?.testCode || order?.code})</span>
                                                    <span className="font-mono text-red-500">- ₹{order?.basePrice || order?.price || 0}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 4. Clinical Report Re-Signing Notice */}
                            {snapshot?.visit?.reports?.some(r => r.status === 'Signed' || r.status === 'ManualVerified') && (
                                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1 text-purple-700 dark:text-purple-300">
                                    <div className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                        <span>📋 Doctor Re-verification Required</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90">
                                        This visit has previously signed doctor reports. In accordance with clinical safety, the report will be reset and re-queued for the pathologist to review and re-authorize.
                                    </p>
                                </div>
                            )}

                            {/* 5. Financial Settlement Breakdown */}
                            <div className={cn(
                                "p-3.5 rounded-xl border space-y-2",
                                settlementDiff < 0 
                                    ? (isDark ? "bg-emerald-950/40 border-emerald-500/50" : "bg-emerald-50 border-emerald-300")
                                    : settlementDiff > 0 
                                        ? (isDark ? "bg-amber-950/40 border-amber-500/50" : "bg-amber-50 border-amber-300")
                                        : (isDark ? "bg-zinc-800/40 border-zinc-700" : "bg-zinc-100 border-zinc-200")
                            )}>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="opacity-70">Previously Paid:</span>
                                    <span className="font-mono font-bold">₹{originalPaid.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="opacity-70">Revised Net Total:</span>
                                    <span className="font-mono font-bold">₹{stagedNet.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-extrabold pt-1.5 border-t border-current/10">
                                    <span>{settlementDiff < 0 ? "Cash Refund to Disburse:" : settlementDiff > 0 ? `Balance Due (${paymentMethod}):` : "Financial Difference:"}</span>
                                    <span className="font-mono text-base">₹{Math.abs(settlementDiff).toLocaleString()}</span>
                                </div>
                                {settlementDiff < 0 && (
                                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 italic">
                                        * Hand over ₹{Math.abs(settlementDiff).toLocaleString()} in Cash from the counter cash register.
                                    </p>
                                )}
                            </div>

                            {/* 6. Mandatory Operational Reason */}
                            <div className="space-y-1 pt-1">
                                <label className="font-bold uppercase tracking-wider text-[10px] text-zinc-500 block">
                                    Mandatory Audit Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={batchEditReason}
                                    onChange={(e) => setBatchEditReason(e.target.value)}
                                    placeholder="e.g. Doctor added LFT test on prescription revision, corrected patient age typo..."
                                    className={cn(
                                        "w-full p-2.5 rounded-xl border outline-none text-xs leading-relaxed",
                                        isDark ? "bg-black border-zinc-700 text-white focus:border-synos-primary" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-synos-primary"
                                    )}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                            <button
                                type="button"
                                disabled={isSubmittingBatchEdit}
                                onClick={() => setIsBatchEditConfirmModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSubmittingBatchEdit || !batchEditReason.trim()}
                                onClick={handleConfirmBatchEdit}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-synos-primary text-white hover:bg-synos-primary/90 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                                {isSubmittingBatchEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>Confirm & Settle Edits</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
