
import { X, Loader2, ArrowRight, AlertCircle, CheckCircle2, Printer, FileText, Building2, ScrollText, Pencil, Save, History, ChevronDown, ChevronUp, Ban, Check, SlidersHorizontal, RefreshCw, Lock, Trash2, Clock, Edit3 } from 'lucide-react'
import { useReceptionDrawer } from '../hooks/useReceptionPanelUI'
import { PatientIdentification } from './PatientIdentification'
import { RichPatientCard } from '@/components/patient/RichPatientCard'
import { VisitDetails } from './VisitDetails'
import { BillingSummary, extractB2BInfo } from './BillingSummary'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ReceptionApi, fetchReferralPartnersCached, clearReceptionMasterCaches } from '@/api/reception'
import { PatientApi } from '@/api/patient'
import { FinanceApi } from '@/api/finance'
import { SignalRService } from '@/lib/signalr'
import { usePanelEntry } from '@/hooks/useSynOSMotion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
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
    const { user } = useAuth();
    const { isOpen, closePanel, drawerState, openResumeIntent, openCorrectionIntent } = useReceptionDrawer();

    // MOTION CANON: Rigid Body Entry
    const panelRef = useRef(null);
    const payerModeContainerRef = useRef(null);
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
    const isPrepaid = billingMode === 'PrepaidPartner' || isPrepaidIntent;
    const modeSwitchVersionRef = useRef(0);
    // STAGE 2: Payment Method State (Lifted for Footer Access)
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    // POS Cash Tender & Split Payment States
    const [tenderedAmount, setTenderedAmount] = useState('');
    const [changeReturnedNow, setChangeReturnedNow] = useState('');
    const [isChangeRetainedAsDue, setIsChangeRetainedAsDue] = useState(false);
    const [isSplitPayment, setIsSplitPayment] = useState(false);
    const [splitCashAmount, setSplitCashAmount] = useState('');
    const [splitUpiAmount, setSplitUpiAmount] = useState('');
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
    const [referralPartners, setReferralPartners] = useState([]);
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
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [customPaymentAmount, setCustomPaymentAmount] = useState('');
    const [userPayerExpandedState, setUserPayerExpandedState] = useState(true);
    const [isPatientCardCollapsed, setIsPatientCardCollapsed] = useState(false);
    const [isPayerScrolledOut, setIsPayerScrolledOut] = useState(false);
    const rightColRef = useRef(null);
    const [activeHints, setActiveHints] = useState([]);

    // iOS Floating Notification Center Listener
    useEffect(() => {
        const handleHint = (e) => {
            const { id, title, message } = e.detail || {};
            if (!message) return;
            setActiveHints(prev => {
                const filtered = prev.filter(h => h.id !== id);
                return [{ id: id || String(Date.now()), title: title || 'SynOS Hint', message, timestamp: new Date() }, ...filtered].slice(0, 5);
            });
        };
        window.addEventListener('synos:notification-hint', handleHint);
        return () => window.removeEventListener('synos:notification-hint', handleHint);
    }, []);

    // Check on snapshot load if duplicate doctor is already present
    useEffect(() => {
        if (!snapshot) return;
        const primDoc = snapshot?.billing?.referral?.partner || snapshot?.visit?.referralPartner;
        const secDoc = snapshot?.billing?.referral?.secondaryPartner || snapshot?.visit?.secondaryReferralPartner;
        if (primDoc && secDoc) {
            const primId = primDoc.referralPartnerId || primDoc.id;
            const secId = secDoc.referralPartnerId || secDoc.id;
            const primName = (primDoc.displayName || primDoc.name || '').trim().toLowerCase();
            const secName = (secDoc.displayName || secDoc.name || '').trim().toLowerCase();
            if ((primId && secId && String(primId).toLowerCase() === String(secId).toLowerCase()) || (primName && secName && primName === secName)) {
                const isB2B = isPrepaid || billingMode === 'PrepaidPartner';
                window.dispatchEvent(new CustomEvent('synos:notification-hint', {
                    detail: {
                        id: isB2B ? 'dup-b2b-doc' : 'dup-rmp-doc',
                        title: isB2B ? 'Doctor Selection Hint' : 'Referral Doctor Hint',
                        message: isB2B
                            ? 'Same doctor already selected above. In B2B bills, primary doctor gets billed automatically — no need to select again here.'
                            : 'Same doctor already added as primary. RMP is only needed if a second doctor or clinic is involved.'
                    }
                }));
            }
        }
    }, [snapshot, isPrepaid, billingMode]);

    const handleScrollToPayerMode = () => {
        rightColRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        setUserPayerExpandedState(true);
    };

    // In-Panel Post-Processing & Print Dispatch State (Split Screen Mode)
    const [postProcessingSession, setPostProcessingSession] = useState(null);
    const [selectedDocFormat, setSelectedDocFormat] = useState('thermal'); // 'thermal' | 'a4' | 'claim'
    const [selectedPrinter, setSelectedPrinter] = useState(() => {
        return (typeof window !== 'undefined' && localStorage.getItem('synos_receipt_printer_name')) || 'default';
    });
    const [isPrinting, setIsPrinting] = useState(false);
    const [printFeedback, setPrintFeedback] = useState(null);
    const [availablePrinters, setAvailablePrinters] = useState([]);
    const [partnerClaimData, setPartnerClaimData] = useState(null);
    const [isLoadingClaimDoc, setIsLoadingClaimDoc] = useState(false);

    // Fetch system printers if running inside Electron shell
    useEffect(() => {
        async function fetchSystemPrinters() {
            if (window.api && typeof window.api.invoke === 'function') {
                try {
                    const config = await window.api.invoke('get-terminal-printer-config');
                    if (config?.ReceiptPrinterName && !localStorage.getItem('synos_receipt_printer_name')) {
                        setSelectedPrinter(config.ReceiptPrinterName);
                    }
                } catch (e) {}
                try {
                    const list = await window.api.invoke('get-printers');
                    if (Array.isArray(list) && list.length > 0) {
                        setAvailablePrinters(list.map(p => ({
                            id: p.name || p.id,
                            name: p.displayName || p.name,
                            isDefault: Boolean(p.isDefault)
                        })));
                    }
                } catch (e) {}
            }
        }
        fetchSystemPrinters();
    }, []);

    const printerOptions = useMemo(() => {
        const defaultList = [
            { id: 'default', name: 'Default System / OS Dialog' },
            { id: 'Thermal POS-80', name: 'Thermal POS-80 (Receipt Roll)' },
            { id: 'Office Laser A4', name: 'Office Laser Printer (A4)' },
            { id: 'Save as PDF', name: 'Save as PDF' }
        ];
        if (availablePrinters.length > 0) {
            const seen = new Set(defaultList.map(p => p.id));
            const custom = [];
            for (const p of availablePrinters) {
                if (!seen.has(p.id)) {
                    custom.push({ id: p.id, name: `${p.name} ${p.isDefault ? '(Default)' : ''}` });
                    seen.add(p.id);
                }
            }
            return [...defaultList, ...custom];
        }
        return defaultList;
    }, [availablePrinters]);

    const handlePrinterChange = (e) => {
        const val = e.target.value;
        setSelectedPrinter(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem('synos_receipt_printer_name', val);
        }
    };

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // THEME ISOLATION CONTRACT: Style Branching
    const ui = isDark ? {
        panel: "bg-zinc-950 border border-zinc-800 shadow-2xl z-20",
        header: "bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800",
        footer: "bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]",
        title: "text-white",
        subtitle: "text-zinc-400",
        actionBtn: {
            enabled: "bg-synos-primary text-white hover:brightness-105 shadow-md shadow-synos-primary/25 active:scale-[0.99] transition-all",
            disabled: "bg-zinc-800 text-zinc-500 cursor-not-allowed"
        }
    } : {
        // LIGHT MODE: Atmospheric Sky Canvas from Discount Master
        panel: cn(
            "bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)]",
            "border-l border-white/80 shadow-[-20px_0_60px_rgba(15,35,60,0.18)]",
            "z-30"
        ),
        header: "bg-transparent border-b border-slate-200/60 backdrop-blur-md",
        footer: "bg-white/60 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-4px_20px_-10px_rgba(15,35,60,0.05)]",
        title: "text-slate-900",
        subtitle: "text-slate-500",
        actionBtn: {
            enabled: "bg-synos-primary text-white hover:brightness-105 shadow-md shadow-synos-primary/25 active:scale-[0.99] transition-all",
            disabled: "bg-slate-300 text-slate-500 cursor-not-allowed"
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
            setIsPartialPayment(false);
            setCustomPaymentAmount('');
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
            setUserPayerExpandedState(true);
            setIsPatientCardCollapsed(false);
            return;
        }

        // On open, always start with Payer Mode expanded by default
        setUserPayerExpandedState(true);

        if ((isResumeIntent || isCorrectionIntent) && drawerState.visitId) {
            // RESUME/CORRECT: Preset Visit ID, No Patient Selection needed yet (internal)
            setCurrentVisitId(drawerState.visitId);
            // Patient ID will be derived from snapshot
        }
    }, [isOpen, intent, drawerState?.visitId]);

    // Load referral partners for dynamic staged name resolution
    useEffect(() => {
        if (!isOpen) return;
        fetchReferralPartnersCached()
            .then(data => setReferralPartners(data || []))
            .catch(err => console.warn("Failed to load referral partners:", err));
    }, [isOpen]);

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

        // Ensure Payer Mode is fully expanded with its options upon patient selection
        setUserPayerExpandedState(true);
        setIsPatientCardCollapsed(false);

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
        setPostProcessingSession(null);
        setSelectedDocFormat('thermal');
        setPartnerClaimData(null);
        setPrintFeedback(null);
        setError(null);
        setSnapshot(null);
        handleClearPatient();
        closePanel();
        if (onVisitUpdated) onVisitUpdated();
    };

    // UNIFIED FOOTER ACTION HANDLER
    const [isActionSubmitting, setIsActionSubmitting] = useState(false);
    const [taxInvoiceModal, setTaxInvoiceModal] = useState({ isOpen: false, data: null });

    // Cancel Visit State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('Patient unable to wait / Long queue');
    const [cancelNotes, setCancelNotes] = useState('');
    const [cancelRefundMethod, setCancelRefundMethod] = useState('Cash Refund');
    const [immediateRefundInput, setImmediateRefundInput] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Synchronize immediate refund input with total paid when modal opens
    useEffect(() => {
        if (isCancelModalOpen) {
            const paid = Number(snapshot?.billing?.totalPaid || 0);
            setImmediateRefundInput(paid > 0 ? String(paid) : '0');
        }
    }, [isCancelModalOpen, snapshot?.billing?.totalPaid]);

    const handleCancelVisit = async () => {
        const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
        if (!visitId) return;
        if (!cancelReason?.trim()) {
            alert("Please provide a reason for cancelling this visit.");
            return;
        }

        setIsCancelling(true);
        try {
            const totalPaid = Number(snapshot?.billing?.totalPaid || 0);
            const immediateAmt = immediateRefundInput === '' ? totalPaid : Math.min(totalPaid, Math.max(0, Number(immediateRefundInput)));
            await ReceptionApi.cancelVisit(visitId, {
                reason: cancelReason,
                notes: cancelNotes,
                refundMethod: cancelRefundMethod,
                immediateRefundAmount: immediateAmt
            });
            setIsCancelModalOpen(false);
            handleCloseAndReset();
        } catch (err) {
            alert("Cancellation Failed: " + (err.message || 'Unknown error'));
        } finally {
            setIsCancelling(false);
        }
    };

    // Delete / Discard Draft Visit Handler (Draft Visits Only)
    const [isDeletingDraft, setIsDeletingDraft] = useState(false);
    const handleDeleteDraftVisit = async () => {
        const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
        if (!visitId) {
            handleCloseAndReset();
            return;
        }

        if (!window.confirm("Are you sure you want to permanently delete this draft visit? This action cannot be undone.")) {
            return;
        }

        setIsDeletingDraft(true);
        try {
            await ReceptionApi.deleteVisit(visitId);
            window.dispatchEvent(new CustomEvent('synos:visit-deleted', { detail: { visitId } }));
            if (onVisitUpdated) onVisitUpdated(visitId, 'deleted');
            handleCloseAndReset();
        } catch (err) {
            console.error("Failed to delete draft visit:", err);
            alert("Failed to delete draft visit: " + (err.message || 'Unknown error'));
        } finally {
            setIsDeletingDraft(false);
        }
    };

    // Optimistic Test Management: 0ms UI reaction time
    const handleOptimisticAddTest = (test) => {
        setSnapshot(prev => {
            if (!prev || !prev.visit) return prev;
            const existingTests = prev.visit.tests || [];
            const code = test.testCode || test.code;
            if (existingTests.some(t => (t.testCode || t.code) === code)) return prev;

            const tempOrderId = 'opt-' + Date.now();
            const newTest = {
                ...test,
                orderId: tempOrderId,
                OrderId: tempOrderId,
                testCode: code,
                code: code,
                testName: test.testName || test.name,
                name: test.testName || test.name,
                basePrice: test.price || test.basePrice || 0,
                price: test.price || test.basePrice || 0,
                dept: test.dept || test.department || 'GENERAL',
                isOptimistic: true
            };
            const updatedTests = [...existingTests, newTest];
            const newGross = updatedTests.reduce((sum, t) => sum + (Number(t.price || t.basePrice) || 0), 0);
            const existingDiscount = prev.billing?.discountAmount || 0;
            const newNet = Math.max(0, newGross - existingDiscount);

            return {
                ...prev,
                visit: {
                    ...prev.visit,
                    tests: updatedTests
                },
                billing: {
                    ...prev.billing,
                    grossAmount: newGross,
                    netAmount: newNet,
                    totalAmount: newNet
                }
            };
        });
    };

    const handleOptimisticRemoveTest = (testCode, orderId) => {
        setSnapshot(prev => {
            if (!prev || !prev.visit) return prev;
            const existingTests = prev.visit.tests || [];
            const updatedTests = existingTests.filter(t => {
                const matchesCode = (t.testCode || t.code) === testCode;
                const matchesOrder = orderId && (t.orderId === orderId || t.OrderId === orderId);
                return !(matchesOrder || matchesCode);
            });
            const newGross = updatedTests.reduce((sum, t) => sum + (Number(t.price || t.basePrice) || 0), 0);
            const existingDiscount = prev.billing?.discountAmount || 0;
            const newNet = Math.max(0, newGross - existingDiscount);

            return {
                ...prev,
                visit: {
                    ...prev.visit,
                    tests: updatedTests
                },
                billing: {
                    ...prev.billing,
                    grossAmount: newGross,
                    netAmount: newNet,
                    totalAmount: newNet
                }
            };
        });
    };

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

    // Auto-focus Edit Demographics button after adding/selecting/resuming a patient
    useEffect(() => {
        if (!isOpen) return;

        const patientPresent = Boolean(
            displayedPatient?.id || 
            displayedPatient?.patientId || 
            displayedPatient?.fullName || 
            displayedPatient?.name ||
            currentPatientId || 
            snapshot?.patient?.id ||
            snapshot?.patient?.patientId ||
            snapshot?.patient?.fullName ||
            snapshot?.patient?.name
        );
        if (patientPresent) {
            const timer = setTimeout(() => {
                const editBtn = document.getElementById('btn-edit-demographics');
                if (editBtn) {
                    editBtn.focus();
                }
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [
        isOpen, 
        displayedPatient?.id, 
        displayedPatient?.patientId, 
        displayedPatient?.fullName, 
        displayedPatient?.name,
        currentPatientId, 
        snapshot?.patient?.id,
        snapshot?.patient?.patientId,
        snapshot?.patient?.fullName,
        snapshot?.patient?.name
    ]);

    // External triggers for Payer Mode minimize/expand
    useEffect(() => {
        const handleMinimize = () => setUserPayerExpandedState(false);
        const handleExpand = () => setUserPayerExpandedState(true);
        window.addEventListener('synos:minimize-payer-mode', handleMinimize);
        window.addEventListener('synos:expand-payer-mode', handleExpand);
        return () => {
            window.removeEventListener('synos:minimize-payer-mode', handleMinimize);
            window.removeEventListener('synos:expand-payer-mode', handleExpand);
        };
    }, []);

    const handleVisitDetailsUpdated = (vId, action) => {
        if (action === 'deleted') {
            if (onVisitUpdated) onVisitUpdated(vId, 'deleted');
            return;
        }
        loadSnapshot();
        if (onVisitUpdated) onVisitUpdated(vId, action);
    };

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
        const effectivePaid = isPrepaid ? 0 : (b?.totalPaid !== undefined ? Number(b.totalPaid) : 0);
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
            ? (stagedReferralPartnerId ? (referralPartners.find(p => (p.referralPartnerId || p.id) === stagedReferralPartnerId) || visitObj?.referralPartner || b?.referral?.partner) : null)
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

        const effectiveDiscountReason = stagedDiscount?.remove
            ? ""
            : (stagedDiscount?.reason || stagedDiscount?.name || b?.appliedDiscount?.reason || b?.appliedDiscount?.name || "");

        const billerDisplay = visitObj?.billedBy 
            || b?.billedBy 
            || (user?.name ? `${user.name}` : "Staff Desk");

        const rawToken = visitObj?.visitToken || visitObj?.token;
        const isDraftToken = !rawToken || rawToken.startsWith("DRAFT") || rawToken.startsWith("D-");
        const displayToken = isDraftToken ? "" : rawToken;

        return {
            billNumber: displayToken || "INV-REC-001",
            date: new Date().toISOString(),
            status: b?.paymentStatus || (dueVal <= 0 ? 'Paid' : 'PendingPayment'),
            biller: {
                billedBy: billerDisplay,
                discountReason: effectiveDiscountReason
            },
            billerName: billerDisplay,
            discountReason: effectiveDiscountReason,
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
                mrn: p?.mrn || p?.uhid || "WALK-IN",
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
                discountReason: effectiveDiscountReason,
                totalAmount: effectiveNet,
                totalPaid: effectivePaid,
                balanceDue: dueVal
            }
        };
    };

    const buildThermalPayload = (overrideToken, overridePaidAmount) => {
        const visitObj = snapshot?.visit;
        const p = displayedPatient || snapshot?.patient;
        const rawToken = overrideToken || postProcessingSession?.token || visitObj?.visitToken || visitObj?.token;
        const isDraftToken = !rawToken || rawToken.startsWith("DRAFT") || rawToken.startsWith("D-");
        const tokenToPrint = isDraftToken ? (visitObj?.visitToken || "REC-2026") : rawToken;

        const effectiveGross = stagedGross !== undefined ? stagedGross : (snapshot?.billing?.grossAmount || 0);
        const effectiveDiscount = stagedDiscountAmt !== undefined ? stagedDiscountAmt : (snapshot?.billing?.discountAmount || 0);
        const effectiveNet = stagedNet !== undefined ? stagedNet : (snapshot?.billing?.netAmount || 0);
        const effectivePaid = overridePaidAmount !== undefined
            ? overridePaidAmount
            : (postProcessingSession?.paidAmount !== undefined
                ? postProcessingSession.paidAmount
                : (isPrepaid ? 0 : (snapshot?.billing?.totalPaid !== undefined ? Number(snapshot.billing.totalPaid) : effectiveNet)));

        const effectiveDiscountReason = stagedDiscount?.remove
            ? ""
            : (stagedDiscount?.reason || stagedDiscount?.name || snapshot?.billing?.appliedDiscount?.reason || snapshot?.billing?.appliedDiscount?.name || "");

        const billerDisplay = visitObj?.billedBy 
            || snapshot?.billing?.billedBy 
            || (user?.name ? `${user.name}` : "Staff Desk");

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
            ? (stagedReferralPartnerId ? (referralPartners.find(p => (p.referralPartnerId || p.id) === stagedReferralPartnerId) || visitObj?.referralPartner || snapshot?.billing?.referral?.partner) : null)
            : (visitObj?.referralPartner || snapshot?.billing?.referral?.partner);

        const explicitChangeDue = Number(postProcessingSession?.changeDue || snapshot?.billing?.changeDue || 0);
        const excessOverpaid = Math.max(0, Number(effectivePaid || 0) - Number(effectiveNet || 0));
        const finalChangeDue = Math.max(explicitChangeDue, excessOverpaid);

        return {
            visitId: visitObj?.visitId || currentVisitId,
            token: tokenToPrint,
            isPrepaid: isPrepaid || billingMode === 'PrepaidPartner',
            isInsurance: billingMode === 'Insurance',
            changeDue: finalChangeDue,
            tenderedAmount: Number(tenderedAmount || postProcessingSession?.tenderedAmount || 0),
            isChangeRetainedAsDue: Boolean(isChangeRetainedAsDue || postProcessingSession?.isChangeRetainedAsDue || finalChangeDue > 0),
            biller: {
                billedBy: billerDisplay,
                discountReason: effectiveDiscountReason
            },
            billerName: billerDisplay,
            discountReason: effectiveDiscountReason,
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
                discountReason: effectiveDiscountReason,
                netAmount: effectiveNet,
                totalPaid: effectivePaid,
                changeDue: finalChangeDue,
                tenderedAmount: Number(tenderedAmount || postProcessingSession?.tenderedAmount || 0),
                paymentMethod: isPrepaid ? "Corporate B2B Prepaid" : (snapshot?.billing?.paymentMethod || paymentMethod || "Cash")
            },
            orders: effectiveTests.map(t => ({
                testCode: t.testCode,
                testName: t.testName || t.name || t.testCode,
                grossAmount: Number(t.price || t.basePrice || 0),
                discount: 0,
                netAmount: Number(t.price || t.basePrice || 0)
            })),
            referringDoctorName: effectiveRefPartner?.name || effectiveRefPartner?.displayName || "Self"
        };
    };

    const thermalHtml = useMemo(() => {
        try {
            const payload = buildThermalPayload();
            return generateThermalInvoiceHtml(payload);
        } catch (e) {
            console.warn("Failed to generate thermal preview HTML:", e);
            return "<html><body><p>Generating Thermal Slip...</p></body></html>";
        }
    }, [snapshot, stagedGross, stagedDiscountAmt, stagedNet, postProcessingSession, paymentMethod, isPrepaid, billingMode, activeRemainingTests, stagedAddedTests, displayedPatient]);

    // Automatically fetch claim statement when Doc Claim format is active
    useEffect(() => {
        if (selectedDocFormat === 'claim' && !partnerClaimData) {
            const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
            if (visitId) {
                setIsLoadingClaimDoc(true);
                FinanceApi.getPartnerClaimStatement({ visitIds: [visitId] })
                    .then(data => setPartnerClaimData(data))
                    .catch(err => console.warn("Could not load partner claim statement:", err))
                    .finally(() => setIsLoadingClaimDoc(false));
            }
        }
    }, [selectedDocFormat, partnerClaimData, currentVisitId, snapshot]);

    const handleExecutePrint = async () => {
        setIsPrinting(true);
        setPrintFeedback(null);
        try {
            if (selectedDocFormat === 'thermal') {
                const payload = buildThermalPayload();
                const html = generateThermalInvoiceHtml(payload);
                await legacyTriggerPrint(html, selectedPrinter === 'default' ? undefined : selectedPrinter);
                setPrintFeedback({ type: 'success', message: `Dispatched to ${selectedPrinter === 'default' ? 'Receipt Printer' : selectedPrinter}!` });
            } else {
                window.print();
                setPrintFeedback({ type: 'success', message: 'Print job dispatched to printer!' });
            }
        } catch (err) {
            console.error("Print execution failed:", err);
            setPrintFeedback({ type: 'error', message: err.message || 'Printing failed. Check printer connection.' });
        } finally {
            setIsPrinting(false);
            setTimeout(() => setPrintFeedback(null), 3500);
        }
    };

    const handlePrintReceipt = async (overrideToken, overridePaidAmount) => {
        try {
            const payload = buildThermalPayload(overrideToken, overridePaidAmount);
            const html = generateThermalInvoiceHtml(payload);
            await legacyTriggerPrint(html, selectedPrinter === 'default' ? undefined : selectedPrinter);
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
                if (onVisitUpdated) onVisitUpdated();
                await loadSnapshot();
                setPostProcessingSession({
                    visitId: snapshot.visit.visitId,
                    token: res?.token || snapshot.visit.token || snapshot.visit.visitToken,
                    billingMode: 'PrepaidPartner',
                    paidAmount: 0,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                setSelectedDocFormat('thermal');
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
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

                if (onVisitUpdated) onVisitUpdated();
                await loadSnapshot();
                setPostProcessingSession({
                    visitId: snapshot.visit.visitId,
                    token: res?.token || snapshot.visit.token || snapshot.visit.visitToken,
                    billingMode: 'Insurance',
                    paidAmount: coPay,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                setSelectedDocFormat('thermal');
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
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
                if (onVisitUpdated) onVisitUpdated();

                await loadSnapshot();
                setPostProcessingSession({
                    visitId: snapshot.visit.visitId,
                    token: res?.token || snapshot.visit.token || snapshot.visit.visitToken,
                    billingMode: 'Corporate',
                    paidAmount: 0,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                setSelectedDocFormat('thermal');
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
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
                const isFullDueSelected = isPartialPayment && Number(customPaymentAmount) === 0;
                const numCustom = Number(customPaymentAmount);
                const isPartialValid = isPartialPayment && numCustom > 0 && numCustom < remainingDue;
                const effectiveAmount = isFullDueSelected ? 0 : (isPartialValid ? numCustom : remainingDue);
                const methodToUse = isFullDueSelected ? 'Unpaid / Credit' : paymentMethod;

                let paymentPayload;
                let paidAmountDisplay = effectiveAmount;

                if (isSplitPayment && (Number(splitCashAmount) + Number(splitUpiAmount) === effectiveAmount)) {
                    paymentPayload = {
                        VisitId: snapshot.visit.visitId,
                        Amount: effectiveAmount,
                        Method: 'Split (Cash+UPI)',
                        SplitPayments: [
                            { Amount: Number(splitCashAmount), Method: 'Cash' },
                            { Amount: Number(splitUpiAmount), Method: 'UPI' }
                        ],
                        Notes: `Split: Cash ₹${splitCashAmount}, UPI ₹${splitUpiAmount}`
                    };
                    paidAmountDisplay = effectiveAmount;
                } else if (paymentMethod === 'Cash' && isChangeRetainedAsDue && Number(tenderedAmount) > effectiveAmount) {
                    const retNow = Number(changeReturnedNow) || 0;
                    const changeDueVal = Math.max(0, Number(tenderedAmount) - effectiveAmount - retNow);

                    paymentPayload = {
                        VisitId: snapshot.visit.visitId,
                        Amount: Number(tenderedAmount),
                        Method: 'Cash',
                        TenderedAmount: Number(tenderedAmount),
                        ChangeReturned: retNow,
                        ChangeDue: changeDueVal,
                        IsChangeRetainedAsDue: true,
                        AllowOverpayment: true,
                        Notes: `Cash Tendered: ₹${tenderedAmount}, Change Due: ₹${changeDueVal} (Drawer Shortage)`
                    };
                    paidAmountDisplay = Number(tenderedAmount);
                } else {
                    paymentPayload = {
                        VisitId: snapshot.visit.visitId,
                        Amount: effectiveAmount,
                        Method: methodToUse,
                        TenderedAmount: Number(tenderedAmount) || effectiveAmount,
                        ChangeReturned: Math.max(0, (Number(tenderedAmount) || effectiveAmount) - effectiveAmount),
                        ChangeDue: 0
                    };
                    paidAmountDisplay = effectiveAmount;
                }

                const res = await ReceptionApi.collectPayment(paymentPayload);
                if (onVisitUpdated) onVisitUpdated();

                const currentPaid = snapshot?.billing?.totalPaid || 0;
                await loadSnapshot();

                const tenderedAmt = Number(tenderedAmount || 0);
                const retNow = Number(changeReturnedNow || 0);
                const computedChangeDue = Math.max(0, tenderedAmt - effectiveAmount - retNow);
                const retainedDue = isChangeRetainedAsDue ? computedChangeDue : 0;

                setIsPartialPayment(false);
                setCustomPaymentAmount('');
                setTenderedAmount('');
                setChangeReturnedNow('');
                setIsChangeRetainedAsDue(false);
                setIsSplitPayment(false);
                setSplitCashAmount('');
                setSplitUpiAmount('');

                setPostProcessingSession({
                    visitId: snapshot.visit.visitId,
                    token: res?.token || snapshot.visit.token || snapshot.visit.visitToken,
                    billingMode: 'Standard',
                    paidAmount: currentPaid + paidAmountDisplay,
                    changeDue: retainedDue,
                    tenderedAmount: tenderedAmt,
                    isChangeRetainedAsDue: Boolean(retainedDue > 0),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                setSelectedDocFormat('thermal');
            } catch (err) {
                // If invoice was ALREADY in Paid status (e.g. from prior submit), sync smoothly
                if (err.message && err.message.toLowerCase().includes("paid")) {
                    await loadSnapshot();
                    setPostProcessingSession({
                        visitId: snapshot.visit.visitId,
                        token: snapshot?.visit?.token || snapshot?.visit?.visitToken,
                        billingMode: 'Standard',
                        paidAmount: snapshot?.billing?.totalPaid || snapshot?.billing?.netAmount || 0,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    setSelectedDocFormat('thermal');
                } else {
                    setError(err.message);
                }
            } finally {
                setIsLoading(false);
                setIsActionSubmitting(false);
            }
            return;
        }

        // 5. GENERATE BILL / FINISH VISIT
        if (snapshot.billing.paymentStatus === 'Paid' && !isCorrectionIntent) {
            setPostProcessingSession({
                visitId: snapshot.visit.visitId,
                token: snapshot.visit.token || snapshot.visit.visitToken,
                billingMode: billingMode,
                paidAmount: snapshot?.billing?.totalPaid || snapshot?.billing?.netAmount || 0,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            setSelectedDocFormat('thermal');
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

    const handleSaveDemographicsDraft = async () => {
        if (isCorrectionIntent) {
            setStagedDemographics({ ...editDemographicsDraft });
            setIsEditDemographicsOpen(false);
            return;
        }

        const patientId = displayedPatient?.id || snapshot?.patient?.id;
        if (patientId) {
            try {
                await PatientApi.updatePatient(patientId, {
                    firstName: editDemographicsDraft.firstName || '',
                    lastName: editDemographicsDraft.lastName || '',
                    age: editDemographicsDraft.age ? parseInt(editDemographicsDraft.age) : null,
                    gender: editDemographicsDraft.gender || 'Male',
                    currentPhoneNumber: editDemographicsDraft.mobile || ''
                });
                setStagedDemographics({ ...editDemographicsDraft });
                setIsEditDemographicsOpen(false);
                if (loadSnapshot) await loadSnapshot();
            } catch (err) {
                console.error("Failed to update patient demographics", err);
                setStagedDemographics({ ...editDemographicsDraft });
                setIsEditDemographicsOpen(false);
            }
        } else {
            setStagedDemographics({ ...editDemographicsDraft });
            setIsEditDemographicsOpen(false);
        }
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
            setUserPayerExpandedState(null);
            
            await loadSnapshot();
            setPostProcessingSession({
                visitId: vId,
                token: snapshot?.visit?.token || snapshot?.visit?.visitToken,
                billingMode: billingMode,
                paidAmount: isPrepaid ? 0 : (stagedNet !== undefined ? stagedNet : (snapshot?.billing?.totalPaid || 0)),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            setSelectedDocFormat('thermal');
        } catch (err) {
            console.error("Batch edit failed", err);
            alert("Batch edit failed: " + err.message);
        } finally {
            setIsSubmittingBatchEdit(false);
        }
    };

    const hasPatient = !!snapshot?.patient;
    const hasVisit = !!snapshot?.visit;
    
    // Derived Financial Logic
    const totalDue = snapshot?.billing?.netAmount || 0;
    const totalPaid = snapshot?.billing?.totalPaid || 0;
    const remainingDue = Math.max(0, totalDue - totalPaid);
    
    const hasTests = Boolean(
        (snapshot?.visit?.tests && snapshot?.visit?.tests.length > 0) || 
        (snapshot?.billing?.items && snapshot?.billing?.items.length > 0) || 
        (snapshot?.billing?.grossAmount > 0) ||
        (stagedAddedTests && stagedAddedTests.length > 0)
    );

    const hasMovedToVisitDetails = Boolean(
        hasTests || 
        (stagedAddedTests && stagedAddedTests.length > 0) || 
        stagedReferralPartnerId !== undefined || 
        snapshot?.visit?.referralPartnerId || 
        snapshot?.visit?.id || 
        snapshot?.visit?.visitId
    );

    const isZeroNetDue = hasTests && remainingDue === 0;
    const canCheckout = (snapshot?.billing?.paymentStatus === 'PendingPayment' || snapshot?.billing?.paymentStatus === 'PartialPayment') && (remainingDue > 0 || isZeroNetDue);
    const canLockPrepaid = (isPrepaidIntent || billingMode === 'PrepaidPartner') && !snapshot?.billing?.isLocked;
    const isVisitFinalized = snapshot?.billing?.paymentStatus === 'Paid' || (remainingDue <= 0 && totalDue > 0) || Boolean(snapshot?.billing?.isLocked);
    const isPayerModeCollapsed = userPayerExpandedState !== null
        ? !userPayerExpandedState
        : Boolean(isVisitFinalized);
    const isPostProcessingView = Boolean(postProcessingSession) || (isVisitFinalized && !isCorrectionIntent);

    const postNet = stagedNet !== undefined ? stagedNet : (snapshot?.billing?.netAmount || snapshot?.billing?.totalAmount || 0);
    const postPaid = postProcessingSession?.paidAmount !== undefined 
        ? postProcessingSession.paidAmount 
        : (isPrepaid ? 0 : (snapshot?.billing?.totalPaid !== undefined ? Number(snapshot.billing.totalPaid) : (isVisitFinalized ? postNet : 0)));
    const actualBalanceDue = Math.max(0, postNet - postPaid);
    const counterExcessDue = Math.max(0, postPaid - postNet);
    const effectiveChangeDue = Math.max(0, Number(postProcessingSession?.changeDue || snapshot?.billing?.changeDue || 0), counterExcessDue);
    const isFullySettled = actualBalanceDue <= 0.01;
    const isFullDueVisit = postPaid === 0 && actualBalanceDue > 0;

    const isDraftVisit = intent === 'create' || 
                         (!snapshot?.billing?.isLocked && !isVisitFinalized && 
                          (snapshot?.visit?.operationalStatus === 'Draft' || snapshot?.visit?.status === 'Draft' || String(snapshot?.visit?.token || snapshot?.visit?.visitToken || '').toUpperCase().startsWith('D-')));

    const canShowVisitCorrection = Boolean(
        snapshot?.visit?.visitId && 
        !isCorrectionIntent && 
        !isDraftVisit && 
        (isVisitFinalized || snapshot?.billing?.isLocked || snapshot?.visit?.isFinalized)
    );

    // Auto-focus Thermal (80mm) format switcher when entering Visit Summary view
    useEffect(() => {
        if (!isOpen || !isPostProcessingView) return;
        const timer = setTimeout(() => {
            const thermalBtn = document.getElementById('btn-doc-format-thermal');
            if (thermalBtn) {
                thermalBtn.focus();
            }
        }, 80);
        return () => clearTimeout(timer);
    }, [isOpen, isPostProcessingView]);

    const effectivePartner = stagedReferralPartnerId !== undefined
        ? (stagedReferralPartnerId ? (referralPartners.find(p => (p.referralPartnerId || p.id) === stagedReferralPartnerId) || snapshot?.visit?.referralPartner || snapshot?.billing?.referral?.partner) : null)
        : (snapshot?.visit?.referralPartner || snapshot?.billing?.referral?.partner);

    const effectiveSecondaryPartner = stagedSecondaryPartnerId !== undefined
        ? (stagedSecondaryPartnerId ? (referralPartners.find(p => (p.referralPartnerId || p.id) === stagedSecondaryPartnerId) || snapshot?.visit?.secondaryReferralPartner || snapshot?.billing?.referral?.secondaryPartner) : null)
        : (snapshot?.visit?.secondaryReferralPartner || snapshot?.billing?.referral?.secondaryPartner);

    const doctorDisplay = effectivePartner ? (effectivePartner.displayName || effectivePartner.name) : (snapshot?.billing?.referral?.referrerText || snapshot?.visit?.referringDoctorName || "Direct / Self");
    const secondaryDoctorDisplay = effectiveSecondaryPartner ? (effectiveSecondaryPartner.displayName || effectiveSecondaryPartner.name) : null;

    // Responsive Canvas Zoom for A4/Claim Document Preview (Fills Container Width)
    const previewContainerRef = useRef(null);
    const [canvasScale, setCanvasScale] = useState(1.35);

    // Enterprise Dynamic Viewport Scaling Engine (Matches Desktop Benchmark onto Laptop screens)
    const [viewportScale, setViewportScale] = useState(1.0);

    useEffect(() => {
        const calculateViewportScale = () => {
            const vh = window.innerHeight;
            // On desktop monitors (vh >= 900px): native 100% scale (1.0)
            // On laptop screens (vh < 900px, e.g. 500px - 760px):
            // Scale proportionally down so 100% of the content fits without cutoffs
            if (vh < 900) {
                // Baseline design target height is ~920px (standard monitor height)
                const scale = Math.max(0.52, Math.min(1.0, (vh - 36) / 910));
                setViewportScale(Number(scale.toFixed(2)));
            } else {
                setViewportScale(1.0);
            }
        };
        calculateViewportScale();
        window.addEventListener('resize', calculateViewportScale);
        return () => window.removeEventListener('resize', calculateViewportScale);
    }, []);

    useEffect(() => {
        if (!isOpen || !isPostProcessingView) return;
        const calculateScale = () => {
            if (!previewContainerRef.current) return;
            const containerWidth = previewContainerRef.current.clientWidth;
            const containerHeight = previewContainerRef.current.clientHeight;
            // Snug padding clearance
            const targetWidth = Math.max(200, containerWidth - 24);
            const targetHeight = Math.max(200, containerHeight - 32);
            // 210mm x 297mm at 96 DPI is 794px x 1123px
            const scaleW = targetWidth / 794;
            const scaleH = targetHeight / 1123;
            // Auto-fit to contain the entire document on screen without vertical or horizontal cropping
            const scale = Math.max(0.42, Math.min(scaleW, scaleH));
            setCanvasScale(Number(scale.toFixed(2)));
        };
        calculateScale();
        const timer = setTimeout(calculateScale, 60);
        const ro = new ResizeObserver(calculateScale);
        if (previewContainerRef.current) ro.observe(previewContainerRef.current);
        return () => {
            clearTimeout(timer);
            ro.disconnect();
        };
    }, [isOpen, isPostProcessingView, selectedDocFormat]);

    const discountReasonDisplay = stagedDiscount?.remove
        ? ""
        : (stagedDiscount?.reason || stagedDiscount?.name || snapshot?.billing?.appliedDiscount?.reason || snapshot?.billing?.appliedDiscount?.name || snapshot?.billing?.discountReason || snapshot?.billing?.DiscountReason || "");

    // Keyboard shortcuts for in-panel print and close
    useEffect(() => {
        if (!isOpen || !isPostProcessingView) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                // If focus is currently on an interactive button, select, or input, allow that element's own action
                if (['TEXTAREA', 'INPUT', 'SELECT', 'BUTTON'].includes(e.target?.tagName)) {
                    return;
                }
                e.preventDefault();
                handleExecutePrint();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCloseAndReset();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isPostProcessingView, selectedDocFormat, selectedPrinter, thermalHtml]);

    if (!isOpen) return null;

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
            mainActionLabel = "Confirm Corporate B2B Bill (₹0)";
            isActionEnabled = hasTests;
        } else if (canCheckout) {
            if (isZeroNetDue) {
                mainActionLabel = "Confirm & Complete Visit (₹0)";
                isActionEnabled = true;
            } else {
                const isFullDueSelected = isPartialPayment && Number(customPaymentAmount) === 0;
                const numCustom = Number(customPaymentAmount);
                const isPartialValid = isPartialPayment && numCustom > 0 && numCustom < remainingDue;
                const payNowAmount = isPartialValid ? numCustom : remainingDue;
                const balanceRemaining = remainingDue - payNowAmount;

                if (isFullDueSelected) {
                    mainActionLabel = `Confirm Visit (Full Due ₹${remainingDue.toLocaleString()})`;
                } else if (isPartialValid) {
                    mainActionLabel = `Accept Partial (₹${payNowAmount.toLocaleString()}) • Due ₹${balanceRemaining.toLocaleString()}`;
                } else if (isSplitPayment && (Number(splitCashAmount) + Number(splitUpiAmount) === payNowAmount)) {
                    mainActionLabel = `Accept Split Payment (₹${Number(splitCashAmount).toLocaleString()} Cash + ₹${Number(splitUpiAmount).toLocaleString()} UPI)`;
                } else if (paymentMethod === 'Cash' && Number(tenderedAmount) > payNowAmount) {
                    if (isChangeRetainedAsDue) {
                        const retNow = Number(changeReturnedNow) || 0;
                        const changeDueVal = Math.max(0, Number(tenderedAmount) - payNowAmount - retNow);
                        mainActionLabel = `Accept ₹${Number(tenderedAmount).toLocaleString()} Cash • ₹${changeDueVal.toLocaleString()} Change Due to Patient`;
                    } else {
                        const changeToReturn = Number(tenderedAmount) - payNowAmount;
                        mainActionLabel = `Accept ₹${Number(tenderedAmount).toLocaleString()} and Return ₹${changeToReturn.toLocaleString()}`;
                    }
                } else {
                    mainActionLabel = `Accept Payment (₹${payNowAmount.toLocaleString()})`;
                }
                isActionEnabled = true;
            }
        } else {
            mainActionLabel = hasTests ? "Visit Complete (Close)" : "Add Tests to Proceed";
            isActionEnabled = hasTests;
        }
    }

    // Dynamic Title based on Intent
    let panelTitle = "Registration";
    if (isResumeIntent) { panelTitle = isVisitFinalized ? "Visit Finalized & Print Dispatch" : "Resume Visit"; }
    if (isCorrectionIntent) { panelTitle = "Visit Correction"; }
    if (isPostProcessingView) { panelTitle = "Visit Finalized & Print Dispatch"; }

    return (
        <>
            {/* iOS Floating Notification & Audit Rail (Left 15% Viewport) */}
            {(hasPatient || isCorrectionIntent) && (
                <div className="fixed left-3.5 right-[85.5vw] top-[64px] bottom-4 hidden xl:flex flex-col gap-3 z-40 pointer-events-none select-none overflow-y-auto no-scrollbar">
                    {/* Active Hints (Floating iOS style) */}
                    {activeHints.map(hint => (
                        <div 
                            key={hint.id}
                            className="pointer-events-auto rounded-2xl p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_32px_rgba(15,35,60,0.16)] space-y-2 animate-in fade-in slide-in-from-left-4 duration-300 relative group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                        💡
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                                        {hint.title}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveHints(prev => prev.filter(h => h.id !== hint.id))}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
                                    title="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs sm:text-[13px] font-medium text-slate-700 dark:text-zinc-200 leading-relaxed">
                                {hint.message}
                            </p>
                            <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-400 text-right">
                                just now
                            </div>
                        </div>
                    ))}

                    {/* Audit History Stack */}
                    {snapshot?.correctionHistory && snapshot.correctionHistory.length > 0 && (
                        <div className="space-y-2 pointer-events-auto mt-1">
                            <div className="flex items-center justify-between px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                    <History className="w-4 h-4 text-synos-primary" />
                                    Audit History ({snapshot.correctionHistory.length})
                                </span>
                            </div>
                            <div className="space-y-2">
                                {snapshot.correctionHistory.map((h, idx) => (
                                    <div 
                                        key={h.correctionId || idx}
                                        className="rounded-2xl p-3 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_6px_20px_rgba(15,35,60,0.08)] space-y-1.5 transition-all hover:bg-white/95 dark:hover:bg-zinc-900/95"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[9px] shrink-0">
                                                    ✓
                                                </div>
                                                <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                    {h.createdByName || "Staff Desk"}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
                                                {new Date(h.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 leading-snug">
                                            {h.actionType ? String(h.actionType).replace(/([A-Z])/g, ' ').trim() : "Visit Amended"}
                                        </div>
                                        {h.reason && (
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic line-clamp-2">
                                                "{h.reason}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

        <div 
            ref={panelRef} 
            className={cn(
                "flex flex-col h-full overflow-hidden rounded-[24px] transition-[width,transform,opacity] duration-300 ease-out z-30 shadow-2xl", 
                (hasPatient || isCorrectionIntent) 
                    ? "absolute right-0 top-0 bottom-0 w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[85vw]" 
                    : "absolute right-0 top-0 bottom-0 w-[96vw] sm:w-[92vw] md:w-[75vw] lg:w-[50vw] xl:w-[44vw] 2xl:w-[40vw] min-w-[580px] max-w-[880px]",
                ui.panel
            )}
        >
            {/* Top Close Button for 2-Column Workflow (Reclaims 56px vertical space, shifts entire modal up) */}
            {(hasPatient || isCorrectionIntent) && !isPostProcessingView ? (
                <button
                    type="button"
                    tabIndex={0}
                    onClick={handleCloseAndReset}
                    className={cn(
                        "absolute right-4 top-3.5 z-40 p-2 rounded-full transition-all duration-200 active:scale-95 cursor-pointer",
                        isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                    )}
                    title="Close"
                >
                    <X className="w-5 h-5" />
                </button>
            ) : (
                /* Standard Header (Narrow Search/Intake state or PostProcessing Split View) */
                <div className={cn("h-13 sm:h-14 flex items-center justify-between px-5 sm:px-7 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]", ui.header)}>
                    <div className="flex items-center gap-2.5">
                        <h2 className={cn("text-lg sm:text-xl font-bold tracking-normal flex items-baseline gap-2", ui.title)}>
                            {panelTitle}
                            {(snapshot?.visit?.visitToken || snapshot?.visit?.token) && (
                                <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-zinc-700/60">
                                    #{snapshot?.visit?.visitToken || snapshot?.visit?.token}
                                </span>
                            )}
                        </h2>
                        {canShowVisitCorrection && !isPostProcessingView && (
                            <button
                                type="button"
                                id="btn-header-visit-correction"
                                onClick={() => openCorrectionIntent(snapshot.visit.visitId)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                title="Open Visit Correction to amend tests, tariffs, or discounts with full audit"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Visit Correction</span>
                            </button>
                        )}
                        {isPostProcessingView && (
                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                                billingMode === 'PrepaidPartner'
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                    : isFullDueVisit
                                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                        : actualBalanceDue > 0
                                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                            : "bg-[#EDF7F2] text-[#245E49] dark:bg-emerald-950/40 dark:text-emerald-300 border-[#CBE5D7] dark:border-emerald-800"
                            )}>
                                {billingMode === 'PrepaidPartner' ? (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Corporate B2B Registered</span>
                                    </>
                                ) : isFullDueVisit ? (
                                    <>
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Billed (Full Due)</span>
                                    </>
                                ) : actualBalanceDue > 0 ? (
                                    <>
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Billed (Partial Due)</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#245E49]" />
                                        <span>Billed & Settled</span>
                                    </>
                                )}
                            </span>
                        )}
                    </div>
                    <button
                        tabIndex={isPostProcessingView ? -1 : 0}
                        onClick={handleCloseAndReset}
                        className={cn(
                            "p-2 rounded-full transition-all duration-200 active:scale-95 cursor-pointer",
                            isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        )}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* PanelBody - REQUIRED ARCHITECTURE (Locked Chrome / Isolation - No Panel-Level Scroll) */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {isLoading && !snapshot && <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 text-synos-primary animate-spin" /></div>}
                {error && (
                    <div className="mx-4 mt-3 mb-1 bg-slate-100 dark:bg-zinc-800 border-2 border-rose-500/60 dark:border-rose-500/80 rounded-xl p-3 text-slate-900 dark:text-white font-medium text-xs sm:text-sm flex items-center justify-between gap-3 shadow-md animate-in fade-in">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                            </div>
                            <span className="break-words font-semibold text-slate-900 dark:text-white">{error}</span>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setError(null)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
                            title="Dismiss error"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {snapshot && (
                    <>
                        {(!hasPatient && !isCorrectionIntent) ? (
                            /* 1. SEARCH STATE (No Patient Identified Yet) */
                            <div className="relative h-full flex-1 min-h-0">
                                <PatientIdentification
                                    snapshot={{ ...snapshot, patient: displayedPatient }}
                                    onSelectPatient={handleSelectPatient}
                                    onClearPatient={handleClearPatient}
                                    onEditPatient={handleOpenEditDemographics}
                                    isCorrectionIntent={isCorrectionIntent}
                                />
                            </div>
                        ) : isPostProcessingView ? (
                            /* 2. POST-PROCESSING SPLIT VIEW: 50% DOCUMENT PREVIEW & PRINTER / 50% CONSOLIDATION OF VISIT */
                            <div 
                                className="p-3.5 sm:p-5 max-w-full mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-300"
                                style={viewportScale < 1 ? { zoom: viewportScale } : undefined}
                            >
                                {/* Inline Print Stylesheet for In-Panel Document Printing */}
                                <style>{`
                                    @media print {
                                        body * {
                                            visibility: hidden !important;
                                        }
                                        #synos-inpanel-print-canvas, #synos-inpanel-print-canvas * {
                                            visibility: visible !important;
                                        }
                                        #synos-inpanel-print-canvas {
                                            position: absolute !important;
                                            left: 0 !important;
                                            top: 0 !important;
                                            width: 100% !important;
                                            max-width: none !important;
                                            margin: 0 !important;
                                            padding: 0 !important;
                                            transform: none !important;
                                            box-shadow: none !important;
                                            border: none !important;
                                            background: white !important;
                                        }
                                    }
                                `}</style>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 xl:gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
                                    {/* LEFT HALF (50% Width) - Document Preview & Print Controls */}
                                    <div className="flex flex-col h-full min-h-0 overflow-hidden">
                                        <div className={cn(
                                            "rounded-[22px] border p-3 sm:p-3.5 flex flex-col h-full min-h-0 overflow-hidden transition-all",
                                            isDark
                                                ? "bg-zinc-950/80 border-zinc-800 shadow-xl"
                                                : "bg-gradient-to-b from-[#DFEAF3] via-[#D6E4EF] to-[#CCE0EC] border border-[#BACFE0]/80 shadow-[0_14px_40px_rgba(15,35,60,0.08),0_2px_6px_rgba(15,35,60,0.03),inset_0_1px_0_rgba(255,255,255,0.7)]"
                                        )}>
                                            {/* Top Controls Toolbar: Format Switcher & Printer Selector */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#BACFE0]/80 dark:border-zinc-800 shrink-0">
                                                {/* Format Switcher Pills */}
                                                <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-zinc-800/60 p-1 rounded-xl border border-slate-300/60 dark:border-zinc-700/60">
                                                    <button
                                                        id="btn-doc-format-thermal"
                                                        data-summary-nav="true"
                                                        data-initial-focus={isPostProcessingView ? "true" : undefined}
                                                        type="button"
                                                        onClick={() => setSelectedDocFormat('thermal')}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (e.shiftKey) {
                                                                    document.getElementById('btn-summary-done')?.focus();
                                                                } else {
                                                                    document.getElementById('btn-doc-format-a4')?.focus();
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer synos-focus-btn",
                                                            selectedDocFormat === 'thermal'
                                                                ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        <ScrollText className="w-3.5 h-3.5" />
                                                        <span>Thermal (80mm)</span>
                                                    </button>
                                                    <button
                                                        id="btn-doc-format-a4"
                                                        data-summary-nav="true"
                                                        type="button"
                                                        onClick={() => setSelectedDocFormat('a4')}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (e.shiftKey) {
                                                                    document.getElementById('btn-doc-format-thermal')?.focus();
                                                                } else {
                                                                    const claimBtn = document.getElementById('btn-doc-format-claim');
                                                                    if (claimBtn) claimBtn.focus();
                                                                    else document.getElementById('select-summary-printer')?.focus();
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer synos-focus-btn",
                                                            selectedDocFormat === 'a4'
                                                                ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span>{isPrepaid ? 'A4 Slip' : 'A4 Tax Invoice'}</span>
                                                    </button>
                                                    {(isPrepaid || Boolean(snapshot?.visit?.referralPartnerId) || Boolean(stagedReferralPartnerId) || Boolean(snapshot?.billing?.referral?.partner)) && (
                                                        <button
                                                            id="btn-doc-format-claim"
                                                            data-summary-nav="true"
                                                            type="button"
                                                            onClick={() => setSelectedDocFormat('claim')}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Tab') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (e.shiftKey) {
                                                                        document.getElementById('btn-doc-format-a4')?.focus();
                                                                    } else {
                                                                        document.getElementById('select-summary-printer')?.focus();
                                                                    }
                                                                }
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer synos-focus-btn",
                                                                selectedDocFormat === 'claim'
                                                                    ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                                                                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            <span>Doc Claim</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Printer Selector */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                                                        <Printer className="w-3.5 h-3.5 text-synos-primary" />
                                                        <span className="hidden sm:inline">Printer:</span>
                                                    </span>
                                                    <select
                                                        id="select-summary-printer"
                                                        data-summary-nav="true"
                                                        value={selectedPrinter}
                                                        onChange={handlePrinterChange}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (e.shiftKey) {
                                                                    const claimBtn = document.getElementById('btn-doc-format-claim');
                                                                    if (claimBtn) claimBtn.focus();
                                                                    else document.getElementById('btn-doc-format-a4')?.focus();
                                                                } else {
                                                                    document.getElementById('btn-execute-print')?.focus();
                                                                }
                                                            }
                                                        }}
                                                        className="text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-synos-primary shadow-2xs cursor-pointer synos-focus-input"
                                                    >
                                                        {printerOptions.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Live Document Canvas Surface */}
                                            <div 
                                                ref={previewContainerRef}
                                                className="flex-1 min-h-0 my-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-[#EAF1F6]/70 dark:bg-zinc-950/70 p-2 sm:p-2.5 flex justify-center items-start overflow-y-auto relative shadow-inner"
                                            >
                                                {selectedDocFormat === 'thermal' && (
                                                    <div className="w-[320px] sm:w-[340px] max-w-full h-full max-h-[850px] rounded-2xl shadow-2xl overflow-hidden border border-slate-300 dark:border-zinc-700 bg-white flex flex-col mx-auto transition-transform shrink-0">
                                                        <div className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-4 py-2.5 text-xs font-mono border-b border-slate-200 dark:border-zinc-700 flex justify-between items-center shrink-0">
                                                            <span className="font-bold">Thermal POS (80mm)</span>
                                                            <span className="text-[10px] bg-[#EDF7F2] dark:bg-emerald-950/40 text-[#245E49] dark:text-emerald-300 px-2 py-0.5 rounded border border-[#CBE5D7] dark:border-emerald-800 font-bold">1:1 Roll Preview</span>
                                                        </div>
                                                        <iframe
                                                            title="Thermal POS Receipt"
                                                            tabIndex={-1}
                                                            srcDoc={thermalHtml}
                                                            className="w-full flex-1 min-h-0 border-0 mx-auto"
                                                        />
                                                    </div>
                                                )}
                                                {selectedDocFormat === 'a4' && (
                                                    <div className="w-full flex justify-center py-2 overflow-x-hidden">
                                                        <div 
                                                            style={{
                                                                width: `${Math.round(794 * canvasScale)}px`,
                                                                height: `${Math.round(1123 * canvasScale + 30)}px`,
                                                                position: 'relative',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            <div 
                                                                id="synos-inpanel-print-canvas" 
                                                                style={{ 
                                                                    width: '210mm', 
                                                                    minHeight: '297mm',
                                                                    transform: `scale(${canvasScale})`,
                                                                    transformOrigin: 'top left',
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0
                                                                }}
                                                                className="bg-white text-zinc-900 shadow-2xl rounded-sm p-8 sm:p-10 border border-slate-300 dark:border-zinc-700 flex flex-col justify-between shrink-0"
                                                            >
                                                                <DynamicDocumentRenderer
                                                                    slotId={isPrepaid ? 'prepaid_patient_a4_slip' : 'patient_tax_invoice'}
                                                                    data={buildTaxInvoiceData()}
                                                                    readOnly={true}
                                                                />
                                                                <div className="mt-6 pt-2 border-t border-zinc-200 flex items-center justify-between text-[8px] text-zinc-400 select-none">
                                                                    <span>SynOS Enterprise Clinical & Financial OS</span>
                                                                    <span>A4 Statement • Generated: {new Date().toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedDocFormat === 'claim' && (
                                                    <div className="w-full flex justify-center py-2 overflow-x-hidden">
                                                        {isLoadingClaimDoc ? (
                                                            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-500">
                                                                <Loader2 className="w-6 h-6 animate-spin text-synos-primary" />
                                                                <span className="text-xs font-semibold">Generating Doctor Receivable Statement...</span>
                                                            </div>
                                                        ) : (
                                                            <div 
                                                                style={{
                                                                    width: `${Math.round(794 * canvasScale)}px`,
                                                                    height: `${Math.round(1123 * canvasScale + 30)}px`,
                                                                    position: 'relative',
                                                                    flexShrink: 0
                                                                }}
                                                            >
                                                                <div 
                                                                    id="synos-inpanel-print-canvas" 
                                                                    style={{ 
                                                                        width: '210mm', 
                                                                        minHeight: '297mm',
                                                                        transform: `scale(${canvasScale})`,
                                                                        transformOrigin: 'top left',
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: 0
                                                                    }}
                                                                    className="bg-white text-zinc-900 shadow-2xl rounded-sm p-8 sm:p-10 border border-slate-300 dark:border-zinc-700 flex flex-col justify-between shrink-0"
                                                                >
                                                                    <DynamicDocumentRenderer
                                                                        slotId="partner_b2b_invoice"
                                                                        data={partnerClaimData || buildTaxInvoiceData()}
                                                                        readOnly={true}
                                                                    />
                                                                    <div className="mt-6 pt-2 border-t border-zinc-200 flex items-center justify-between text-[8px] text-zinc-400 select-none">
                                                                        <span>SynOS Enterprise Clinical & Financial OS • Doctor Receivable Claim</span>
                                                                        <span>Commercial Statement • Generated: {new Date().toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottom Print Action Bar */}
                                            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200/80 dark:border-zinc-800 shrink-0">
                                                <div className="flex items-center gap-2">
                                                    {printFeedback ? (
                                                        <span className={cn(
                                                            "text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in",
                                                            printFeedback.type === 'success'
                                                                ? "bg-[#EDF7F2] dark:bg-emerald-950/40 text-[#245E49] dark:text-emerald-300 border border-[#CBE5D7] dark:border-emerald-800"
                                                                : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                                                        )}>
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            {printFeedback.message}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-[#3D9970] animate-pulse" />
                                                            Ready to Print • {selectedDocFormat === 'thermal' ? '80mm Roll' : 'A4 Paper'} • {selectedPrinter === 'default' ? 'OS Dialog' : selectedPrinter}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        id="btn-execute-print"
                                                        data-summary-nav="true"
                                                        type="button"
                                                        onClick={handleExecutePrint}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (e.shiftKey) {
                                                                    document.getElementById('select-summary-printer')?.focus();
                                                                } else {
                                                                    document.getElementById('btn-summary-visit-correction')?.focus();
                                                                }
                                                            }
                                                        }}
                                                        disabled={isPrinting}
                                                        className="py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-[#2B7A5D] hover:bg-[#23684F] dark:bg-[#348A6A] text-white shadow-[0_4px_14px_rgba(43,122,93,0.3)] active:scale-[0.99] transition-all cursor-pointer synos-focus-btn"
                                                    >
                                                        {isPrinting ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span>Dispatching...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Printer className="w-4 h-4 text-white" />
                                                                <span>Print {selectedDocFormat === 'thermal' ? 'Thermal Slip' : (selectedDocFormat === 'a4' ? 'A4 Invoice' : 'Doc Claim')}</span>
                                                                <span className="text-[10px] font-mono opacity-80 bg-white/20 px-1.5 py-0.5 rounded">↵ Enter</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT HALF (50% Width) - Visit Consolidation Summary (Three Native Intent Panel Cards) */}
                                    <div className="flex flex-col h-full min-h-0 overflow-hidden">
                                        <div className={cn(
                                            "rounded-[22px] border p-3 sm:p-3.5 flex flex-col h-full min-h-0 overflow-hidden transition-all",
                                            isDark
                                                ? "bg-zinc-950/80 border-zinc-800 shadow-xl"
                                                : "bg-gradient-to-b from-[#DFEAF3] via-[#D6E4EF] to-[#CCE0EC] border border-[#BACFE0]/80 shadow-[0_14px_40px_rgba(15,35,60,0.08),0_2px_6px_rgba(15,35,60,0.03),inset_0_1px_0_rgba(255,255,255,0.7)]"
                                        )}>
                                            {/* Header: Check icon, Title, Payer Mode Badge, Token */}
                                            <div className="flex items-center justify-between pb-2 border-b border-[#BACFE0]/80 dark:border-zinc-800 shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </div>
                                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                                                        Visit Consolidation Summary
                                                    </h3>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Bill / Token Badge */}
                                                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700/80 text-xs font-mono font-medium">
                                                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Token:</span>
                                                        <span className="font-bold">
                                                            {snapshot?.visit?.visitToken || snapshot?.visit?.token || postProcessingSession?.token || currentVisitId}
                                                        </span>
                                                    </div>

                                                    {/* Canonical Payer Mode Pill - Refined, Elegant */}
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                                        billingMode === 'PrepaidPartner'
                                                            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                                            : billingMode === 'Insurance'
                                                                ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                                                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                                    )}>
                                                        <span className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            billingMode === 'PrepaidPartner' ? "bg-indigo-500" : billingMode === 'Insurance' ? "bg-purple-500" : "bg-emerald-500"
                                                        )} />
                                                        <span>Bill Type: {billingMode === 'PrepaidPartner' ? 'Corporate B2B (Prepaid)' : billingMode === 'Insurance' ? 'Insurance / TPA' : 'Direct / Standard'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Scrollable Summary Cards - Three Native Intent Panel Cards */}
                                            <div className="flex-1 min-h-0 my-2 overflow-y-auto space-y-2.5 pr-1">
                                                {/* CARD 1: Patient Identification */}
                                                <div className={cn(
                                                    "rounded-[20px] border transition-all p-3 sm:p-3.5 space-y-2 shrink-0",
                                                    isDark
                                                        ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                                        : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                                                )}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                                                1
                                                            </div>
                                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-normal">
                                                                Patient Identification
                                                            </h3>
                                                        </div>
                                                    </div>

                                                    {/* Recessed Patient Card Pod - Exact Intent Panel Design */}
                                                    <div className="rounded-2xl border border-[#CCDCE8] dark:border-zinc-800 bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] dark:bg-zinc-950/80 p-3.5 sm:p-4 shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)] animate-in fade-in duration-200">
                                                        <RichPatientCard
                                                            patient={displayedPatient}
                                                            isLocked={true}
                                                            actionLabel={null}
                                                            secondaryActionLabel={null}
                                                        />
                                                    </div>
                                                </div>

                                                {/* CARD 2: Visit Details (Doctor Channel & Ordered Investigations) */}
                                                <div className={cn(
                                                    "rounded-[24px] border transition-all p-4 sm:p-5 space-y-4 shrink-0",
                                                    isDark
                                                        ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                                        : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                                                )}>
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                                                2
                                                            </div>
                                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-normal">
                                                                Visit Details
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isFullDueVisit ? (
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold tracking-normal",
                                                                    isDark ? "bg-amber-950/40 border-amber-800 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
                                                                )}>
                                                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>FULL DUE</span>
                                                                </div>
                                                            ) : actualBalanceDue > 0 ? (
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold tracking-normal",
                                                                    isDark ? "bg-amber-950/40 border-amber-800 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"
                                                                )}>
                                                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>PARTIAL DUE</span>
                                                                </div>
                                                            ) : (
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold tracking-normal",
                                                                    isDark ? "bg-zinc-800/80 border-zinc-700 text-zinc-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                                )}>
                                                                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>PAID</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Doctor Context Section */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-normal">
                                                                {billingMode === 'Standard' && "Referring Doctor / Clinic"}
                                                                {billingMode === 'PrepaidPartner' && "Referring Doctor / Partner (Prepaid B2B)"}
                                                                {billingMode === 'Insurance' && "Insurance Details"}
                                                                {billingMode === 'Corporate' && "Corporate B2B Account"}
                                                            </h4>
                                                            <span className={cn(
                                                                "text-xs font-bold tracking-normal px-2.5 py-0.5 rounded-md border",
                                                                billingMode === 'PrepaidPartner' ? "border-amber-500/40 text-amber-500 bg-amber-500/10" :
                                                                billingMode === 'Insurance' ? "border-blue-500/40 text-blue-500 bg-blue-500/10" :
                                                                "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800"
                                                            )}>
                                                                {billingMode === 'PrepaidPartner' ? 'Doctor Bill (B2B)' : billingMode === 'Insurance' ? 'Insurance TPA' : 'Standard'}
                                                            </span>
                                                        </div>

                                                        {/* Single full-width doctor card or side-by-side if secondary partner exists */}
                                                        <div className={cn(
                                                            "items-stretch",
                                                            effectiveSecondaryPartner ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "w-full"
                                                        )}>
                                                            {/* Prescribing Doctor */}
                                                            <div className={cn(
                                                                "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                                                                isDark ? "bg-zinc-800/60 border-zinc-700/60 text-zinc-100" : "bg-white border border-[#D5E2EC] text-slate-900 shadow-[0_1px_3px_rgba(15,35,60,0.04)]"
                                                            )}>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)] shrink-0"></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block leading-tight">
                                                                        Prescribing Doctor
                                                                    </span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="truncate tracking-normal text-sm sm:text-base font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-900/50">
                                                                            {doctorDisplay}
                                                                        </span>
                                                                        {effectivePartner && effectiveSecondaryPartner && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF8EE] text-[#9A6B2F] dark:bg-amber-950/30 dark:text-amber-300 font-bold border border-[#F5E2C8] dark:border-amber-900/40 shrink-0">
                                                                                Commission to RMP
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Second Referral Doctor / RMP - ONLY rendered if secondary partner exists */}
                                                            {effectiveSecondaryPartner && (
                                                                <div className={cn(
                                                                    "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                                                                    isDark ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300" : "bg-[#F4F9F6] border-[#D3E8DD] text-slate-900 shadow-2xs"
                                                                )}>
                                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#3D9970] shadow-[0_0_6px_rgba(61,153,112,0.35)]"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-[11px] font-bold uppercase tracking-wider block leading-tight text-[#2D6A4F] dark:text-emerald-300">
                                                                            RMP Doctor / Referrer
                                                                        </span>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="truncate tracking-normal text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200">
                                                                                {secondaryDoctorDisplay}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Ordered Investigations (Dynamic 2-Col Split >2, Scroll >6) */}
                                                    {(() => {
                                                        const summaryTests = [...activeRemainingTests, ...stagedAddedTests];
                                                        const isSplit = summaryTests.length > 2;
                                                        const shouldScroll = summaryTests.length > 6;
                                                        return (
                                                            <div className="space-y-2">
                                                                <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
                                                                    Ordered Investigations ({summaryTests.length})
                                                                </div>
                                                                <div className={cn(
                                                                    isSplit ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "space-y-2",
                                                                    shouldScroll ? "max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-700" : "overflow-visible"
                                                                )}>
                                                                    {summaryTests.map((t, idx) => (
                                                                        <div 
                                                                            key={idx} 
                                                                            className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] dark:bg-zinc-900 border border-[#CCDCE8] dark:border-zinc-800 shadow-[inset_0_1px_2px_rgba(15,35,60,0.04),0_1px_0_rgba(255,255,255,0.7)] min-w-0"
                                                                        >
                                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                                                                <span className="px-2 py-1 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200/90 dark:border-zinc-700 shadow-[0_1px_2px_rgba(15,35,60,0.06)] font-mono text-xs font-bold shrink-0">
                                                                                    {t.testCode || t.code}
                                                                                </span>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <span className="font-extrabold text-xs sm:text-sm text-slate-950 dark:text-white block tracking-tight truncate">
                                                                                        {t.testName || t.name || t.testCode}
                                                                                    </span>
                                                                                    {(t.department || t.category) && (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                                                                                            {t.department || t.category}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <span className="font-black font-mono text-sm sm:text-base text-slate-900 dark:text-white shrink-0">
                                                                                ₹{Number(t.price || t.basePrice || 0).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* CARD 3: Financials - Unified Consolidated Card */}
                                                <div className={cn(
                                                    "rounded-[24px] border transition-all p-4 sm:p-4.5 space-y-3 shrink-0",
                                                    isDark
                                                        ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                                        : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                                                )}>
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                                                3
                                                            </div>
                                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-normal">
                                                                Financials
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isFullDueVisit ? (
                                                                <div className={cn(
                                                                    "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold",
                                                                    isDark ? "bg-amber-950/40 border-amber-800 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
                                                                )}>
                                                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>FULL DUE</span>
                                                                </div>
                                                            ) : actualBalanceDue > 0 ? (
                                                                <div className={cn(
                                                                    "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold",
                                                                    isDark ? "bg-amber-950/40 border-amber-800 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"
                                                                )}>
                                                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>PARTIAL DUE</span>
                                                                </div>
                                                            ) : (
                                                                <div className={cn(
                                                                    "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold",
                                                                    isDark ? "bg-zinc-800/80 border-zinc-700 text-zinc-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                                )}>
                                                                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>PAID</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Consolidated Financial Metrics Row (4 key numbers side-by-side) */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 block">Gross Tariff</span>
                                                            <span className="font-mono font-bold text-sm sm:text-base text-slate-800 dark:text-zinc-200">
                                                                ₹{(stagedGross !== undefined ? stagedGross : (snapshot?.billing?.grossAmount || 0)).toLocaleString()}
                                                            </span>
                                                        </div>

                                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 block">Concession</span>
                                                            {(stagedDiscountAmt || snapshot?.billing?.discountAmount) ? (
                                                                <div className="flex items-baseline gap-1 mt-0.5">
                                                                    <span className="font-mono font-black text-sm sm:text-base text-rose-600 dark:text-rose-400">
                                                                        -₹{(stagedDiscountAmt !== undefined ? stagedDiscountAmt : (snapshot?.billing?.discountAmount || 0)).toLocaleString()}
                                                                    </span>
                                                                    {discountReasonDisplay && (
                                                                        <span className="text-[11px] font-bold text-rose-600/90 dark:text-rose-400/90 truncate max-w-[110px]" title={discountReasonDisplay}>
                                                                            ({discountReasonDisplay})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium leading-6">₹0</span>
                                                            )}
                                                        </div>

                                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 block">GST / Tax</span>
                                                            <span className="font-mono font-bold text-sm sm:text-base text-slate-800 dark:text-zinc-200">₹0</span>
                                                        </div>

                                                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-zinc-800 dark:to-zinc-900 border border-slate-800 dark:border-zinc-700 shadow-xs">
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 dark:text-zinc-400 block">Net Amount</span>
                                                            <span className="font-mono font-black text-base sm:text-lg text-emerald-300 dark:text-emerald-400 block">
                                                                ₹{(stagedNet !== undefined ? stagedNet : (snapshot?.billing?.netAmount || 0)).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Settlement Pod (Clean and minimal) */}
                                                    <div className="p-3 rounded-xl bg-white/95 dark:bg-zinc-800/90 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs">
                                                        {billingMode === 'PrepaidPartner' ? (
                                                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                                                <span className="font-bold text-slate-700 dark:text-zinc-300">
                                                                    Patient Desk Payment: <strong className="font-mono text-[#245E49] dark:text-emerald-400">₹0 (Prepaid Partner)</strong>
                                                                </span>
                                                                <span className="font-bold text-blue-700 dark:text-blue-300">
                                                                    B2B Receivable: <strong className="font-mono">₹{(stagedNet !== undefined ? stagedNet : (snapshot?.billing?.netAmount || 0)).toLocaleString()}</strong>
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                                                <div className="flex items-center gap-1.5 font-bold text-[#245E49] dark:text-emerald-300">
                                                                    <CheckCircle2 className="w-4 h-4 text-[#2E7D63]" />
                                                                    <span>Desk Collection:</span>
                                                                    <span className="font-mono">
                                                                        ₹{postPaid.toLocaleString()}
                                                                    </span>
                                                                    <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                                                                        {postPaid > 0 ? `via ${paymentMethod}` : `(Unpaid / Credit)`}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                                                                    Balance Due:{" "}
                                                                    {effectiveChangeDue > 0 ? (
                                                                        <span className="font-mono text-rose-600 dark:text-rose-400 font-black">
                                                                            ₹0 <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">(Refund Due ₹{effectiveChangeDue.toLocaleString()})</span>
                                                                        </span>
                                                                    ) : actualBalanceDue <= 0 ? (
                                                                        <strong className="font-mono text-slate-900 dark:text-white">₹0 <span className="text-[#245E49] dark:text-emerald-400 font-bold">(Fully Settled)</span></strong>
                                                                    ) : isFullDueVisit ? (
                                                                        <strong className="font-mono text-rose-600 dark:text-rose-400 text-sm font-black">₹{actualBalanceDue.toLocaleString()} <span className="text-amber-600 dark:text-amber-400 font-bold">(100% Full Due)</span></strong>
                                                                    ) : (
                                                                        <strong className="font-mono text-rose-600 dark:text-rose-400 text-sm font-black">₹{actualBalanceDue.toLocaleString()} <span className="text-amber-600 dark:text-amber-400 font-bold">(Partial Due)</span></strong>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Change Due / Refund Liability Callout (Issue 25 & 27) */}
                                                        {effectiveChangeDue > 0 && (
                                                            <div className="mt-2.5 pt-2 border-t border-rose-500/25 flex items-center justify-between text-xs bg-rose-500/10 p-2 rounded-lg">
                                                                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold">
                                                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                                                    <span>Change / Refund Due to Patient:</span>
                                                                    <span className="font-mono text-sm font-black text-rose-900 dark:text-rose-200">
                                                                        ₹{effectiveChangeDue.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30">
                                                                    Claimable at Counter
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Actions on Right Half */}
                                            <div className="pt-3 flex items-center gap-3 border-t border-[#BACFE0]/80 dark:border-zinc-800 shrink-0">
                                                <button
                                                    id="btn-summary-visit-correction"
                                                    data-summary-nav="true"
                                                    type="button"
                                                    onClick={() => {
                                                        setPostProcessingSession(null);
                                                        openCorrectionIntent(currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Tab') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (e.shiftKey) {
                                                                document.getElementById('btn-execute-print')?.focus();
                                                            } else {
                                                                document.getElementById('btn-summary-done')?.focus();
                                                            }
                                                        }
                                                    }}
                                                    className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0 synos-focus-btn"
                                                    title="Enter Visit Correction to amend tests or alter billing"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 text-synos-primary" />
                                                    <span>Visit Correction</span>
                                                </button>

                                                <button
                                                    id="btn-summary-done"
                                                    data-summary-nav="true"
                                                    type="button"
                                                    onClick={handleCloseAndReset}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Tab') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (e.shiftKey) {
                                                                document.getElementById('btn-summary-visit-correction')?.focus();
                                                            } else {
                                                                document.getElementById('btn-doc-format-thermal')?.focus();
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 py-2.5 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-md active:scale-[0.99] transition-all cursor-pointer synos-focus-btn"
                                                >
                                                    <span>Done & Back to Queue</span>
                                                    <span className="text-[10px] font-mono opacity-70 bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded">Esc</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* 3. IDENTIFIED PATIENT WORKFLOW (Strictly following iOS Target Design) */
                            <div 
                                className="p-3.5 sm:p-5 max-w-full mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-300"
                                style={viewportScale < 1 ? { zoom: viewportScale } : undefined}
                            >
                                {/* 2-COLUMN UNIFIED WORKFLOW (Left 7 cols: Patient Identification -> Visit Details | Right 5 cols: Billing & Payer Mode -> Financials) */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 xl:gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
                                    {/* LEFT COLUMN: 7 Cols */}
                                    <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
                                        {/* Step 1: Patient Identification (Compressed height, tightly hugs content, collapsible) */}
                                        <div className={cn(
                                            "rounded-2xl border transition-all shrink-0",
                                            isPatientCardCollapsed ? "p-2.5 sm:p-3 space-y-0" : "p-3 sm:p-3.5 space-y-2",
                                            isDark
                                                ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                                : "bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border border-white/90 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF]"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                        1
                                                    </div>
                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                                        Patient Identification
                                                    </h3>
                                                    {isPatientCardCollapsed && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 ml-2">
                                                            <span className="font-bold text-slate-900 dark:text-white">{displayedPatient?.fullName || displayedPatient?.name}</span>
                                                            <span>•</span>
                                                            <span>{displayedPatient?.age ? `${displayedPatient.age} Yrs` : ''} {displayedPatient?.gender || ''}</span>
                                                            {displayedPatient?.phone && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="font-mono">{displayedPatient.phone}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {isPatientCardCollapsed ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsPatientCardCollapsed(false)}
                                                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 transition-all cursor-pointer active:scale-95"
                                                            title="Expand Patient Identification"
                                                        >
                                                            <span>Expand</span>
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsPatientCardCollapsed(true)}
                                                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 transition-all cursor-pointer active:scale-95"
                                                            title="Minimize"
                                                        >
                                                            <span>Minimize</span>
                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* The Patient Card (Recessed Pod - Compacted) */}
                                            {!isPatientCardCollapsed && (
                                                <div className="rounded-xl border border-[#CCDCE8] dark:border-zinc-800 bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] dark:bg-zinc-950/80 p-2.5 sm:p-3 shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)] animate-in fade-in duration-200">
                                                    <RichPatientCard
                                                        patient={displayedPatient}
                                                        onAction={handleClearPatient}
                                                        actionLabel={(Boolean(snapshot?.visit?.id || snapshot?.visit?.visitId || snapshot?.billing?.isLocked)) ? null : "Change"}
                                                        secondaryActionLabel="Edit"
                                                        onSecondaryAction={handleOpenEditDemographics}
                                                        isLocked={true}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Step 2: Visit Details (Directly below Patient Identification) */}
                                        <div className="min-h-0">
                                            <VisitDetails
                                                snapshot={snapshot}
                                                visitId={currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id || snapshot?.visit?.VisitId}
                                                onVisitUpdated={handleVisitDetailsUpdated}
                                                onOptimisticAddTest={handleOptimisticAddTest}
                                                onOptimisticRemoveTest={handleOptimisticRemoveTest}
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
                                    </div>

                                    {/* RIGHT COLUMN: 5 Cols (Unified smooth scroll for Billing & Financials) */}
                                    <div 
                                        id="reception-right-column"
                                        ref={rightColRef}
                                        onScroll={(e) => {
                                            const scrollTop = e.currentTarget.scrollTop;
                                            setIsPayerScrolledOut(scrollTop > 20);
                                        }}
                                        className="lg:col-span-5 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1 scroll-smooth"
                                    >
                                        {/* Billing & Payer Mode */}
                                        <div 
                                            ref={payerModeContainerRef}
                                            className={cn(
                                                "rounded-2xl border transition-all flex flex-col justify-between shrink-0",
                                                isPayerModeCollapsed ? "p-3 sm:p-3.5 space-y-2" : "p-3.5 sm:p-4 space-y-2.5",
                                                isDark
                                                    ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                                    : "bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border border-white/90 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF]"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                                        Billing & Payer Mode
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isPayerModeCollapsed ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUserPayerExpandedState(true)}
                                                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/40 transition-all cursor-pointer shadow-2xs active:scale-95"
                                                            title="Change Payer Mode"
                                                        >
                                                            <span>Change</span>
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUserPayerExpandedState(false)}
                                                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-95"
                                                            title="Minimize"
                                                        >
                                                            <span>Minimize</span>
                                                            <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform duration-200" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Column Layout with Auto-Collapse & Expand */}
                                            <MultiPayerSelector
                                                billingMode={billingMode}
                                                onChangeMode={(mode) => {
                                                    handleBillingModeChange(mode);
                                                }}
                                                disabled={snapshot?.billing?.isLocked && !isCorrectionIntent}
                                                isDark={isDark}
                                                layout="column"
                                                showHeader={false}
                                                isCollapsed={isPayerModeCollapsed}
                                                onToggleCollapse={() => setUserPayerExpandedState(prev => !prev)}
                                            />
                                        </div>

                                        {/* Step 3: Financials (BillingSummary) */}
                                        <div className="flex flex-col animate-in fade-in duration-700">
                                            <BillingSummary
                                                snapshot={snapshot}
                                                onVisitUpdated={loadSnapshot}
                                                isCorrectionIntent={isCorrectionIntent}
                                                isPrepaidIntent={isPrepaidIntent}
                                                billingMode={billingMode}
                                                isPayerScrolledOut={isPayerScrolledOut}
                                                onScrollToPayerMode={handleScrollToPayerMode}
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
                                                isPartialPayment={isPartialPayment}
                                                setIsPartialPayment={setIsPartialPayment}
                                                customPaymentAmount={customPaymentAmount}
                                                setCustomPaymentAmount={setCustomPaymentAmount}
                                                referralPartners={referralPartners}
                                                tenderedAmount={tenderedAmount}
                                                setTenderedAmount={setTenderedAmount}
                                                changeReturnedNow={changeReturnedNow}
                                                setChangeReturnedNow={setChangeReturnedNow}
                                                isChangeRetainedAsDue={isChangeRetainedAsDue}
                                                setIsChangeRetainedAsDue={setIsChangeRetainedAsDue}
                                                isSplitPayment={isSplitPayment}
                                                setIsSplitPayment={setIsSplitPayment}
                                                splitCashAmount={splitCashAmount}
                                                setSplitCashAmount={setSplitCashAmount}
                                                splitUpiAmount={splitUpiAmount}
                                                setSplitUpiAmount={setSplitUpiAmount}
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer / Status Bar - UNIFIED BUTTON (Hidden during 50/50 Live Preview) */}
            {!isPostProcessingView && (
                <div className={cn(
                    "py-2.5 px-5 sm:px-7 shrink-0 border-t border-black/[0.06] dark:border-white/[0.06] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md",
                    (hasPatient || isCorrectionIntent) ? "flex items-center justify-between" : "flex justify-center",
                    ui.footer
                )}>
                    {/* Left Section: Contextual Title, Token & Visit Correction Link (Moved from top to reclaim vertical space) */}
                    {(hasPatient || isCorrectionIntent) && (
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{panelTitle}</span>
                                {(snapshot?.visit?.visitToken || snapshot?.visit?.token) && (
                                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-zinc-700/60">
                                        #{snapshot?.visit?.visitToken || snapshot?.visit?.token}
                                    </span>
                                )}
                            </h2>
                            {canShowVisitCorrection && (
                                <>
                                    <button
                                        type="button"
                                        id="btn-footer-visit-correction"
                                        onClick={() => openCorrectionIntent(snapshot.visit.visitId)}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                        title="Open Visit Correction to amend tests, tariffs, or discounts with audit trail"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Visit Correction</span>
                                    </button>
                                    <div className="h-5 w-px bg-slate-300 dark:bg-zinc-700 mx-1 hidden sm:block" />
                                </>
                            )}
                        </div>
                    )}

                    {/* Right Section: Action Controls */}
                    {isCorrectionIntent ? (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setTaxInvoiceModal({ 
                                    isOpen: true, 
                                    slotId: isPrepaid ? 'prepaid_patient_a4_slip' : 'patient_tax_invoice', 
                                    data: buildTaxInvoiceData(), 
                                    title: isPrepaid ? 'Prepaid Patient Slip (A4)' : 'Patient Tax Invoice (A4)' 
                                })}
                                className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-synos-primary/40 text-synos-primary bg-synos-primary/10 hover:bg-synos-primary/20 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1"
                                title={isPrepaid ? "Preview & Print Prepaid Patient Slip (A4)" : "Preview & Print Full A4 Tax Invoice"}
                            >
                                <FileText className="w-4 h-4" /> A4 Receipt
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrintReceipt()}
                                className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                                title="Print Thermal 80mm POS Slip"
                            >
                                <Printer className="w-4 h-4 text-emerald-700 dark:text-emerald-300" /> Thermal
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
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsCancelModalOpen(true)}
                                        className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
                                        title="Cancel this visit and automatically process refunds"
                                    >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Cancel Visit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStagedAddedTests([]);
                                            setStagedRemovedOrderIds([]);
                                            setStagedDiscount(null);
                                            setStagedDemographics(null);
                                            setStagedReferralPartnerId(undefined);
                                            setStagedSecondaryPartnerId(undefined);
                                            openResumeIntent(currentVisitId || drawerState.visitId);
                                        }}
                                        className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-600/40 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
                                        title="Discard staged edits and exit correction mode"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsBatchEditConfirmModalOpen(true)}
                                        className="py-2.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer bg-synos-primary text-white hover:bg-synos-primary/90 focus:outline-none focus:ring-2 focus:ring-synos-primary"
                                    >
                                        <span>Save Changes & Settle</span>
                                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-mono font-bold">
                                            {stagedChangesCount}
                                        </span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsCancelModalOpen(true)}
                                        className="py-2.5 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                                        title="Cancel this visit and issue automated refund"
                                    >
                                        <Ban className="w-4 h-4" />
                                        <span>Cancel Visit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openResumeIntent(currentVisitId || drawerState.visitId)}
                                        className={cn(
                                            "py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-synos-primary focus:ring-offset-1",
                                            ui.actionBtn.enabled
                                        )}
                                    >
                                        Close Editor <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    ) : isVisitFinalized ? (
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setTaxInvoiceModal({ 
                                    isOpen: true, 
                                    slotId: isPrepaid ? 'prepaid_patient_a4_slip' : 'patient_tax_invoice', 
                                    data: buildTaxInvoiceData(), 
                                    title: isPrepaid ? 'Prepaid Patient Slip (A4)' : 'Patient Tax Invoice (A4)' 
                                })}
                                className="py-2.5 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                                title={isPrepaid ? "Preview & Print Prepaid Patient Slip (A4)" : "Preview & Print Full A4 Tax Invoice"}
                            >
                                <FileText className="w-4 h-4" /> A4 Receipt
                            </button>
                            <button
                                type="button"
                                onClick={() => setTaxInvoiceModal({ 
                                    isOpen: true, 
                                    slotId: isPrepaid ? 'patient_thermal_prepaid_slip' : (billingMode === 'Insurance' ? 'insurance_thermal_receipt' : 'patient_thermal_receipt'), 
                                    paperSize: 'thermal80',
                                    data: buildTaxInvoiceData(), 
                                    title: isPrepaid ? 'Prepaid Patient Slip (80mm)' : (billingMode === 'Insurance' ? 'Insurance Thermal Receipt (80mm)' : 'Thermal Slip (80mm)') 
                                })}
                                className="py-2.5 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                                title="Preview & Print Thermal 80mm POS Slip"
                            >
                                <Printer className="w-4 h-4" /> Thermal
                            </button>
                            <button
                                type="button"
                                disabled={isGeneratingClaimDoc}
                                onClick={handlePrintDoctorReceivable}
                                className="py-2.5 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                                title="Print Doctor's Receivable Statement for Safe Keeping & Claims"
                            >
                                {isGeneratingClaimDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                                Doc Claim
                            </button>
                            <button
                                type="button"
                                onClick={() => openCorrectionIntent(currentVisitId || drawerState.visitId)}
                                className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all active:scale-95 shadow-2xs cursor-pointer"
                                title="Enter Full-Fledged Visit Correction Mode to Add/Remove Tests or Alter Billing"
                            >
                                <Pencil className="w-3.5 h-3.5 text-synos-primary" />
                                <span>Visit Correction</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(true)}
                                className="py-2.5 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                                title="Cancel this visit and issue automated refund"
                            >
                                <Ban className="w-4 h-4" />
                                <span>Cancel Visit</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseAndReset}
                                className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-2.5">
                                {snapshot?.visit?.visitId && (() => {
                                    const isDraftVisit = (snapshot?.visit?.status || '').toLowerCase() === 'draft' || 
                                                         (snapshot?.visit?.token || '').toUpperCase().startsWith('D-') || 
                                                         (snapshot?.visit?.visitToken || '').toUpperCase().startsWith('D-') ||
                                                         (snapshot?.visit?.token || '').toUpperCase().startsWith('DRAFT');
                                    return isDraftVisit ? (
                                        <button
                                            type="button"
                                            id="btn-delete-draft"
                                            onClick={handleDeleteDraftVisit}
                                            disabled={isDeletingDraft || isLoading || isActionSubmitting}
                                            className="py-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs synos-focus-btn disabled:opacity-50"
                                            title="Permanently discard and delete this draft visit"
                                        >
                                            {isDeletingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            <span>Delete Draft</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            id="btn-cancel-visit"
                                            onClick={() => setIsCancelModalOpen(true)}
                                            className="py-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs synos-focus-btn"
                                            title="Cancel this visit with reason and process refund"
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            <span>Cancel Visit</span>
                                        </button>
                                    );
                                })()}
                                <button
                                    id="btn-unified-action"
                                    data-action-submit="true"
                                    onClick={handleUnifiedAction}
                                    disabled={!isActionEnabled || isLoading || isActionSubmitting}
                                    className={cn(
                                        "py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm synos-focus-btn min-w-[200px]",
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
                                <p className="text-xs text-amber-500 dark:text-amber-400 font-medium text-right">
                                    * Please select a Referral Partner above (Who collected payment outside?)
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
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
                    clearReceptionMasterCaches();
                    fetchReferralPartnersCached()
                        .then(data => setReferralPartners(data || []))
                        .catch(() => {});
                    await loadSnapshot();
                    setActiveModal(null);
                }}
            />

            {/* Dedicated RMP / B2B Billing Doctor Quick-Add Modal */}
            <AddReferralPartnerModal
                isOpen={activeModal === 'rmp' || activeModal === 'b2bBillingDoctor'}
                onClose={() => setActiveModal(null)}
                initialPaymentModel="PartnerCollects"
                initialPartnerType={activeModal === 'b2bBillingDoctor' ? 'Doctor' : 'RMP'}
                isDark={isDark}
                onSuccess={async (newPartner) => {
                    const partnerId = newPartner.referralPartnerId || newPartner.id;
                    const visitId = currentVisitId || snapshot?.visit?.visitId || snapshot?.visit?.id;
                    if (visitId && partnerId) {
                        try {
                            await ReceptionApi.updateSecondaryReferral(visitId, partnerId);
                        } catch (err) {
                            console.error("Failed to auto-apply billing doctor to visit:", err);
                        }
                    }
                    clearReceptionMasterCaches();
                    fetchReferralPartnersCached()
                        .then(data => setReferralPartners(data || []))
                        .catch(() => {});
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
                                    <label className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300">First Name</label>
                                    <input
                                        type="text"
                                        value={editDemographicsDraft.firstName}
                                        onChange={(e) => setEditDemographicsDraft(prev => ({ ...prev, firstName: e.target.value }))}
                                        className={cn("w-full h-9 px-3 rounded-lg border outline-none font-medium", isDark ? "bg-black border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
                                        placeholder="First Name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300">Last Name</label>
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
                                    <label className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300">Age</label>
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
                                    <label className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300">Age Unit</label>
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
                                    <label className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300">Gender</label>
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
                                <label className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300">Mobile Number</label>
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
                                    <h3 className="font-bold text-base leading-none">Review & Save Changes</h3>
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
                            {/* 0. Referring Doctor Changed Notice (Dynamic Staged Referral Context) */}
                            {(() => {
                                const origPartner = snapshot?.billing?.referral?.partner || snapshot?.visit?.referralPartner;
                                const origName = origPartner?.name || origPartner?.displayName || snapshot?.visit?.referralPartnerName || 'Self / Direct';
                                const origId = origPartner?.id || origPartner?.referralPartnerId || snapshot?.visit?.referralPartnerId;
                                const isChanged = stagedReferralPartnerId !== undefined && stagedReferralPartnerId !== origId;
                                if (!isChanged) return null;

                                let newName = origName;
                                if (stagedReferralPartnerId) {
                                    const match = referralPartners.find(p => (p.referralPartnerId || p.id) === stagedReferralPartnerId);
                                    newName = match ? (match.name || match.displayName) : 'Selected Doctor';
                                } else {
                                    newName = 'Self / Direct (Removed)';
                                }

                                return (
                                    <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-950/30 space-y-1">
                                        <div className="font-bold text-xs sm:text-sm tracking-normal text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                            <span>👨‍⚕️ Referring Doctor Changed</span>
                                        </div>
                                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pt-0.5">
                                            <span className="line-through text-zinc-400 font-normal">{origName}</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                                            <span className="text-indigo-700 dark:text-indigo-300 font-bold">{newName}</span>
                                        </div>
                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 pt-0.5">
                                            * This visit and all bills are now assigned to <strong>{newName}</strong>.
                                        </div>
                                    </div>
                                );
                            })()}
                            {/* 1. Demographics Summary */}
                            {stagedDemographics && (
                                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                                    <div className="font-bold text-xs sm:text-sm tracking-normal text-blue-500 flex items-center gap-1.5">
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
                                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-2">
                                    <div className="font-bold text-xs sm:text-sm tracking-normal text-emerald-600 dark:text-emerald-400">
                                        🧪 Tests Added ({stagedAddedTests.length})
                                    </div>
                                    <div className="space-y-1.5">
                                        {stagedAddedTests.map((t, idx) => {
                                            const specType = t.specimenTypeCode;
                                            const existingSpec = (snapshot?.visit?.specimens || []).find(s => s.specimenTypeCode === specType && s.status !== 'Cancelled');
                                            const isReuse = Boolean(existingSpec);

                                            return (
                                                <div key={idx} className="flex flex-col gap-0.5 p-2 rounded-lg bg-white/60 dark:bg-zinc-800/60 border border-emerald-500/20">
                                                    <div className="flex justify-between font-bold text-xs">
                                                        <span>{t.name || t.testName} ({t.code || t.testCode})</span>
                                                        <span className="font-mono">₹{t.price || t.basePrice || 0}</span>
                                                    </div>
                                                    <div className="text-xs flex items-center gap-1.5 mt-0.5">
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
                                <div className="p-3 rounded-xl border border-red-500/30 bg-red-50/70 dark:bg-red-950/30 space-y-1.5">
                                    <div className="font-bold text-xs sm:text-sm tracking-normal text-red-500">
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
                                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-50/70 dark:bg-purple-950/30 space-y-1 text-purple-700 dark:text-purple-300">
                                    <div className="font-bold text-xs sm:text-sm tracking-normal flex items-center gap-1.5">
                                        <span>📋 Doctor Re-verification Required</span>
                                    </div>
                                    <p className="text-xs leading-relaxed opacity-90">
                                        This visit has previously signed doctor reports. In accordance with clinical safety, the report will be reset and re-queued for the pathologist to review and re-authorize.
                                    </p>
                                </div>
                            )}

                            {/* 5. Financial Settlement Breakdown (Dynamic: Prepaid B2B vs Standard Direct) */}
                            {(() => {
                                if (isPrepaid) {
                                    const b2bInfo = extractB2BInfo(snapshot);
                                    const originalGross = snapshot?.billing?.grossAmount || 0;
                                    const originalB2BAmt = b2bInfo.rawAmount || 0;
                                    const originalB2BClaim = Math.max(0, originalGross - originalB2BAmt);

                                    const currentGross = stagedGross !== undefined ? stagedGross : originalGross;
                                    let currentB2BAmt = 0;
                                    if (stagedDiscountAmt !== undefined) {
                                        currentB2BAmt = stagedDiscountAmt;
                                    } else if (stagedDiscount) {
                                        const val = Number(stagedDiscount.value) || 0;
                                        if (stagedDiscount.type === 'Percentage') {
                                            currentB2BAmt = Math.round((currentGross * (val / 100)) * 100) / 100;
                                        } else {
                                            currentB2BAmt = Math.min(currentGross, val);
                                        }
                                    } else {
                                        currentB2BAmt = originalB2BAmt;
                                    }
                                    const currentB2BClaim = Math.max(0, currentGross - currentB2BAmt);
                                    const b2bClaimDiff = currentB2BClaim - originalB2BClaim;

                                    let currentDoctorName = snapshot?.billing?.referral?.partner?.name || 
                                                            snapshot?.visit?.referralPartner?.name || 
                                                            snapshot?.visit?.secondaryReferralPartner?.name || 
                                                            'Doctor / Partner';
                                    if (stagedReferralPartnerId !== undefined) {
                                        if (stagedReferralPartnerId) {
                                            const match = referralPartners.find(p => (p.referralPartnerId || p.id) === stagedReferralPartnerId);
                                            if (match) currentDoctorName = match.name || match.displayName;
                                        } else {
                                            currentDoctorName = 'Self / Direct (Removed)';
                                        }
                                    }

                                    return (
                                        <div className={cn(
                                            "p-3.5 rounded-xl border space-y-2.5 shadow-sm",
                                            b2bClaimDiff > 0 
                                                ? (isDark ? "bg-amber-950/40 border-amber-500/50" : "bg-amber-50/90 border-amber-300")
                                                : b2bClaimDiff < 0 
                                                    ? (isDark ? "bg-emerald-950/40 border-emerald-500/50" : "bg-emerald-50/90 border-emerald-300")
                                                    : (isDark ? "bg-zinc-800/60 border-zinc-700" : "bg-slate-50 border-slate-300")
                                        )}>
                                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                    Corporate B2B Partner Bill
                                                </span>
                                                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                                                    Billed to Doctor
                                                </span>
                                            </div>

                                            <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                                                Doctor Account: <strong>{currentDoctorName}</strong>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                                <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase">Previous Doctor Bill</div>
                                                    <div className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">₹{originalB2BClaim.toLocaleString()}</div>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase">New Doctor Bill</div>
                                                    <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">₹{currentB2BClaim.toLocaleString()}</div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t border-current/10">
                                                <span>Difference to Doctor:</span>
                                                <span className={cn("font-mono text-base font-bold", 
                                                    b2bClaimDiff > 0 ? "text-amber-600 dark:text-amber-400" : 
                                                    b2bClaimDiff < 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                                                    {b2bClaimDiff > 0 ? `+₹${b2bClaimDiff.toLocaleString()}` : b2bClaimDiff < 0 ? `-₹${Math.abs(b2bClaimDiff).toLocaleString()}` : "₹0"}
                                                </span>
                                            </div>

                                            <div className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 pt-0.5">
                                                {b2bClaimDiff > 0 && (
                                                    <p className="font-semibold text-amber-700 dark:text-amber-300">
                                                        * Doctor bill increases by ₹{b2bClaimDiff.toLocaleString()} (New bill ₹{currentB2BClaim.toLocaleString()} vs Old bill ₹{originalB2BClaim.toLocaleString()}). Added to doctor's monthly account.
                                                    </p>
                                                )}
                                                {b2bClaimDiff < 0 && (
                                                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                                                        * Doctor bill decreases by ₹{Math.abs(b2bClaimDiff).toLocaleString()} (New bill ₹{currentB2BClaim.toLocaleString()} vs Old bill ₹{originalB2BClaim.toLocaleString()}). Credited back to doctor's account.
                                                    </p>
                                                )}
                                                {b2bClaimDiff === 0 && (
                                                    <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                                                        * Doctor bill unchanged at ₹{currentB2BClaim.toLocaleString()}.
                                                    </p>
                                                )}
                                                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-semibold flex items-center gap-1">
                                                    <span>✓ Collect from Patient: <strong className="text-zinc-900 dark:text-zinc-100">₹0 (Billed directly to doctor)</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className={cn(
                                        "p-3.5 rounded-xl border space-y-2 shadow-sm",
                                        settlementDiff < 0 
                                            ? (isDark ? "bg-emerald-950/40 border-emerald-500/50" : "bg-emerald-50 border-emerald-300")
                                            : settlementDiff > 0 
                                                ? (isDark ? "bg-amber-950/40 border-amber-500/50" : "bg-amber-50 border-amber-300")
                                                : (isDark ? "bg-zinc-800/40 border-zinc-700" : "bg-slate-50 border-slate-300")
                                    )}>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="opacity-70 font-medium">Previously Paid by Patient:</span>
                                            <span className="font-mono font-bold">₹{originalPaid.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="opacity-70 font-medium">New Total Bill:</span>
                                            <span className="font-mono font-bold">₹{stagedNet.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-extrabold pt-1.5 border-t border-current/10">
                                            <span>{settlementDiff < 0 ? `Refund to Patient (${paymentMethod}):` : settlementDiff > 0 ? `Collect from Patient (${paymentMethod}):` : "Difference:"}</span>
                                            <span className="font-mono text-base font-bold">
                                                {settlementDiff > 0 ? `+₹${settlementDiff.toLocaleString()}` : settlementDiff < 0 ? `-₹${Math.abs(settlementDiff).toLocaleString()}` : "₹0"}
                                            </span>
                                        </div>
                                        {settlementDiff > 0 && (
                                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                                * Collect ₹{settlementDiff.toLocaleString()} from patient at the counter via {paymentMethod}.
                                            </p>
                                        )}
                                        {settlementDiff < 0 && (
                                            <div className="pt-1.5 space-y-2 border-t border-emerald-500/20">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">Refund Instrument:</span>
                                                    <div className="flex gap-1.5">
                                                        {['Cash', 'UPI'].map(m => (
                                                            <button
                                                                key={m}
                                                                type="button"
                                                                onClick={() => setPaymentMethod(m)}
                                                                className={cn(
                                                                    "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                                                                    paymentMethod === m
                                                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                                                        : "bg-white/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-white"
                                                                )}
                                                            >
                                                                {m === 'Cash' ? 'Physical Cash' : 'Digital / UPI'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                    * {paymentMethod === 'Cash' 
                                                        ? `Give ₹${Math.abs(settlementDiff).toLocaleString()} refund cash to patient from cash drawer.` 
                                                        : `Disburse ₹${Math.abs(settlementDiff).toLocaleString()} refund via Digital / UPI to patient.`}
                                                </p>
                                            </div>
                                        )}
                                        {settlementDiff === 0 && (
                                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                * No additional payment needed from patient.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 6. Reason for Change */}
                            <div className="space-y-1 pt-1">
                                <label className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300 block">
                                    Reason for Change <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={batchEditReason}
                                    onChange={(e) => setBatchEditReason(e.target.value)}
                                    placeholder="e.g. Doctor changed, added tests, corrected discount, fixed name typo..."
                                    className={cn(
                                        "w-full p-2.5 rounded-xl border outline-none text-xs leading-relaxed font-medium shadow-xs",
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
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
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
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* CANCEL VISIT & REFUND CONFIRMATION MODAL */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 animate-in zoom-in-95 duration-200",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                    )}>
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                    <Ban className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Cancel Patient Visit</h3>
                                    <p className="text-xs text-zinc-500">Token: <span className="font-mono font-bold text-zinc-700 dark:text-zinc-200">{snapshot?.visit?.token || snapshot?.visit?.visitToken || 'WAIT'}</span></p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Patient & Financial Card */}
                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-500">Patient:</span>
                                <span className="font-bold">{displayedPatient?.name || displayedPatient?.fullName || 'Direct Patient'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-500">Net Bill Total:</span>
                                <span className="font-mono font-bold">₹{Number(snapshot?.billing?.netAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-zinc-200 dark:border-zinc-700">
                                <span className="font-bold text-rose-600 dark:text-rose-400">Total Paid Amount:</span>
                                <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                                    ₹{Number(snapshot?.billing?.totalPaid || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Split Refund & Payout Controls (When Paid > 0) */}
                        {Number(snapshot?.billing?.totalPaid || 0) > 0 && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                                        Immediate Refund Payout (₹)
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setImmediateRefundInput(String(Number(snapshot?.billing?.totalPaid || 0)))}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-800 dark:text-amber-300 border border-amber-500/30 cursor-pointer"
                                        >
                                            Full
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setImmediateRefundInput('0')}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-800 dark:text-rose-300 border border-rose-500/30 cursor-pointer"
                                        >
                                            Refund Later
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max={Number(snapshot?.billing?.totalPaid || 0)}
                                            value={immediateRefundInput}
                                            onChange={(e) => setImmediateRefundInput(e.target.value)}
                                            className={cn(
                                                "w-full pl-7 pr-3 py-1.5 text-xs font-bold rounded-lg border outline-none font-mono",
                                                isDark ? "bg-zinc-950 border-amber-500/40 text-white focus:border-amber-400" : "bg-white border-amber-300 text-slate-900 focus:border-amber-500"
                                            )}
                                        />
                                    </div>
                                    <select
                                        value={cancelRefundMethod}
                                        onChange={(e) => setCancelRefundMethod(e.target.value)}
                                        className={cn(
                                            "px-2.5 py-1.5 text-xs font-semibold rounded-lg border outline-none",
                                            isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-white border-zinc-300 text-slate-900"
                                        )}
                                    >
                                        <option value="Cash Refund">Cash Drawer</option>
                                        <option value="UPI Refund">UPI / Online</option>
                                    </select>
                                </div>

                                {Number(snapshot?.billing?.totalPaid || 0) > Number(immediateRefundInput || 0) && (
                                    <div className="text-[11px] font-medium text-amber-800 dark:text-amber-200 flex items-center justify-between pt-1 border-t border-amber-500/20">
                                        <span>Pending Refund Due (Refund Later):</span>
                                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                            ₹{(Number(snapshot?.billing?.totalPaid || 0) - Number(immediateRefundInput || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reason Selection */}
                        <div className="space-y-2">
                            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal">
                                Cancellation Reason (Mandatory)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Patient unable to wait / Long queue',
                                    'Patient prefers outside facility',
                                    'Doctor consultation cancelled',
                                    'Duplicate registration',
                                    'Financial constraint',
                                    'Personal emergency'
                                ].map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCancelReason(preset)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
                                            cancelReason === preset
                                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                                        )}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Or enter custom reason..."
                                className={cn(
                                    "w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium mt-1",
                                    isDark ? "bg-black border-zinc-700 text-white focus:border-rose-500" : "bg-white border-zinc-300 text-zinc-900 focus:border-rose-500"
                                )}
                            />
                        </div>

                        {/* Optional Notes */}
                        <div className="space-y-1">
                            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal">
                                Administrative Notes (Optional)
                            </label>
                            <textarea
                                value={cancelNotes}
                                onChange={(e) => setCancelNotes(e.target.value)}
                                placeholder="Additional audit notes or remarks..."
                                className={cn(
                                    "w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium min-h-[50px] resize-none",
                                    isDark ? "bg-black border-zinc-700 text-white focus:border-zinc-500" : "bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900"
                                )}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <button
                                type="button"
                                disabled={isCancelling}
                                onClick={() => setIsCancelModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Keep Visit
                            </button>
                            <button
                                type="button"
                                disabled={isCancelling || !cancelReason.trim()}
                                onClick={handleCancelVisit}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                <span>
                                    {Number(snapshot?.billing?.totalPaid || 0) > 0 
                                        ? (Number(immediateRefundInput || 0) === 0 
                                            ? `Cancel & Queue Full Refund Later (₹${Number(snapshot?.billing?.totalPaid || 0).toLocaleString()})`
                                            : (Number(immediateRefundInput || 0) < Number(snapshot?.billing?.totalPaid || 0)
                                                ? `Pay ₹${Number(immediateRefundInput || 0).toLocaleString()} & Queue ₹${(Number(snapshot?.billing?.totalPaid || 0) - Number(immediateRefundInput || 0)).toLocaleString()} Later`
                                                : `Cancel & Refund ₹${Number(snapshot?.billing?.totalPaid || 0).toLocaleString()}`))
                                        : "Confirm Cancellation"}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
        </>
    )
}
