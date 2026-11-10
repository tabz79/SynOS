import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    X, 
    CreditCard, 
    Search, 
    UserPlus, 
    Users, 
    Check, 
    AlertCircle, 
    Calendar, 
    Loader2, 
    ShieldCheck, 
    Sparkles, 
    UserCheck,
    Lock,
    Phone,
    User,
    ArrowRight,
    CheckCircle2,
    RotateCcw,
    Edit2,
    Trash2,
    FileText,
    Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { HealthCardApi } from '@/api/healthCards';
import { ReceptionApi } from '@/api/reception';
import { calculateDetailedAge } from '@/components/patient/RichPatientCard';

export function HealthCardDeskDrawer({ isOpen, onClose, onCardIssued, embedded = false }) {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'issue'
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [plans, setPlans] = useState([]);
    const [selectedCardForEnroll, setSelectedCardForEnroll] = useState(null);
    const [enrollFormData, setEnrollFormData] = useState({ name: '', age: '', gender: 'Female', relationship: 'Spouse' });
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // Edit Health Card State
    const [selectedCardForEdit, setSelectedCardForEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({ discountType: 'Percentage', discountValue: 30, validityDays: 365, status: 'Active' });
    const [isUpdatingCard, setIsUpdatingCard] = useState(false);

    // Cancel Health Card State
    const [selectedCardForCancel, setSelectedCardForCancel] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancellingCard, setIsCancellingCard] = useState(false);

    // ==========================================
    // Issue New Card State: Subscriber First
    // ==========================================
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [patientMatches, setPatientMatches] = useState([]);
    const [isSearchingPatients, setIsSearchingPatients] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null); // Identified Primary Subscriber
    const [isRegisteringNew, setIsRegisteringNew] = useState(false);

    const [primarySubscriber, setPrimarySubscriber] = useState({ name: '', phone: '', age: '', gender: 'Male' });
    const [discountType, setDiscountType] = useState('Percentage');
    const [discountValue, setDiscountValue] = useState(30);
    const [validityDays, setValidityDays] = useState(365);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [familyMembers, setFamilyMembers] = useState([]);
    const [isSubmittingCard, setIsSubmittingCard] = useState(false);
    const [issuedSuccessCard, setIssuedSuccessCard] = useState(null);

    // Load Plans and Directory
    useEffect(() => {
        if (!isOpen) return;
        loadPlans();
        loadCards();
    }, [isOpen]);

    const loadPlans = async () => {
        try {
            const data = await HealthCardApi.getPlans();
            setPlans(data || []);
            if (data && data.length > 0 && !selectedPlanId) {
                const defaultPlan = data.find(p => p.maxMembers === 2) || data[0];
                setSelectedPlanId(defaultPlan.planId);
                setDiscountValue(defaultPlan.defaultDiscountPercentage || 30);
            }
        } catch (err) {
            console.error('Failed to load plans', err);
        }
    };

    const loadCards = async () => {
        setIsLoading(true);
        try {
            const data = await HealthCardApi.getCards(searchQuery);
            setCards(data || []);
        } catch (err) {
            console.error('Failed to load cards', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            loadCards();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Live Debounced Patient Search (for Step 1: Subscriber Identification)
    useEffect(() => {
        if (!patientSearchQuery || patientSearchQuery.trim().length < 3) {
            setPatientMatches([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingPatients(true);
            try {
                const results = await ReceptionApi.searchPatients(patientSearchQuery.trim());
                setPatientMatches(results || []);
            } catch (err) {
                console.error("Patient search failed", err);
                setPatientMatches([]);
            } finally {
                setIsSearchingPatients(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [patientSearchQuery]);

    const selectedPlan = plans.find(p => p.planId === selectedPlanId) || plans[0] || { price: 1000, maxMembers: 2 };
    const maxCapacity = selectedPlan?.maxMembers || 1;
    const additionalFamilySlotsNeeded = Math.max(0, maxCapacity - 1);

    // Sync family member array when plan changes
    useEffect(() => {
        setFamilyMembers(prev => {
            const arr = [...prev];
            while (arr.length < additionalFamilySlotsNeeded) {
                arr.push({ name: '', age: '', gender: 'Female', relationship: 'Spouse' });
            }
            return arr.slice(0, additionalFamilySlotsNeeded);
        });
    }, [additionalFamilySlotsNeeded]);

    // Handler: Pick registered patient from search candidates
    const handleSelectPatient = (patient) => {
        const pId = patient.id || patient.Id || patient.patientId;
        const name = patient.displayName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || 'Subscriber';
        const phone = patient.currentPhoneNumber || patient.phone || '';
        const gender = patient.gender || 'Male';
        const ageText = patient.age ? `${patient.age} Yrs` : (patient.dateOfBirth ? calculateDetailedAge(patient.dateOfBirth).text : '');

        setSelectedPatient({
            id: pId,
            patientId: pId,
            mrn: patient.mrn || patient.MRN || '',
            name,
            phone,
            gender,
            age: ageText,
            raw: patient
        });
        setPrimarySubscriber({
            name,
            phone,
            age: patient.age ? String(patient.age) : '',
            gender
        });
        setIsRegisteringNew(false);
        setPatientSearchQuery('');
        setPatientMatches([]);
        setStatusMessage(null);
    };

    // Handler: Open new patient registration inline form
    const handleStartNewPatient = (initialPhone = '') => {
        setSelectedPatient(null);
        setIsRegisteringNew(true);
        setPrimarySubscriber(prev => ({
            ...prev,
            name: '',
            phone: initialPhone || patientSearchQuery || '',
            age: '',
            gender: 'Male'
        }));
        setStatusMessage(null);
    };

    // Handler: Confirm inline new patient details
    const handleConfirmNewPatient = (e) => {
        if (e) e.preventDefault();
        if (!primarySubscriber.name.trim() || !primarySubscriber.phone.trim()) {
            setStatusMessage({ type: 'error', text: 'Full Name and Mobile Number are required to register patient.' });
            return;
        }

        setSelectedPatient({
            id: null,
            patientId: null,
            mrn: 'NEW REGISTRATION',
            name: primarySubscriber.name.trim(),
            phone: primarySubscriber.phone.trim(),
            gender: primarySubscriber.gender,
            age: primarySubscriber.age ? `${primarySubscriber.age} Yrs` : '',
            isNew: true
        });
        setIsRegisteringNew(false);
        setStatusMessage(null);
    };

    // Handler: Clear / Change selected subscriber
    const handleClearSubscriber = () => {
        setSelectedPatient(null);
        setIsRegisteringNew(false);
        setPrimarySubscriber({ name: '', phone: '', age: '', gender: 'Male' });
        setPatientSearchQuery('');
        setPatientMatches([]);
    };

    const handleIssueCardSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPatient) {
            setStatusMessage({ type: 'error', text: 'Please identify or register the Primary Subscriber first.' });
            return;
        }

        if (!primarySubscriber.name.trim() || !primarySubscriber.phone.trim()) {
            setStatusMessage({ type: 'error', text: 'Primary subscriber name and phone number are required.' });
            return;
        }

        setIsSubmittingCard(true);
        setStatusMessage(null);
        try {
            const payload = {
                planId: selectedPlan.planId,
                primaryPatientId: selectedPatient.patientId || null,
                primaryFullName: primarySubscriber.name.trim(),
                primaryPhoneNumber: primarySubscriber.phone.trim(),
                primaryGender: primarySubscriber.gender,
                primaryAge: primarySubscriber.age ? Number(primarySubscriber.age) : null,
                pricePaid: selectedPlan.price,
                paymentMode: paymentMode,
                discountType: discountType,
                discountValue: Number(discountValue) || 30,
                validityDays: Number(validityDays) || 365,
                beneficiaries: familyMembers
                    .filter(m => m.name && m.name.trim())
                    .map(m => ({
                        fullName: m.name.trim(),
                        age: m.age ? Number(m.age) : null,
                        gender: m.gender || 'Female',
                        relationship: m.relationship || 'Family'
                    }))
            };

            const created = await HealthCardApi.issueCard(payload);
            setIssuedSuccessCard(created);
            setStatusMessage({ type: 'success', text: `Health Card ${created.cardNumber} activated successfully!` });
            loadCards();
            if (onCardIssued) onCardIssued(created);
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Failed to issue card' });
        } finally {
            setIsSubmittingCard(false);
        }
    };

    const handleEnrollSubmit = async (e) => {
        e.preventDefault();
        if (!enrollFormData.name.trim()) return;
        setIsEnrolling(true);
        try {
            await HealthCardApi.enrollBeneficiary(selectedCardForEnroll.cardId, {
                fullName: enrollFormData.name.trim(),
                age: enrollFormData.age ? Number(enrollFormData.age) : null,
                gender: enrollFormData.gender,
                relationship: enrollFormData.relationship
            });
            setSelectedCardForEnroll(null);
            setEnrollFormData({ name: '', age: '', gender: 'Female', relationship: 'Spouse' });
            loadCards();
            setStatusMessage({ type: 'success', text: 'Family member enrolled successfully!' });
        } catch (err) {
            alert(err.message || 'Failed to enroll member');
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleOpenEdit = (card) => {
        setSelectedCardForEdit(card);
        setEditFormData({
            discountType: card.configuredDiscountType || 'Percentage',
            discountValue: card.configuredDiscountValue || 30,
            validityDays: 365,
            status: card.status || 'Active'
        });
    };

    const handleUpdateCardSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCardForEdit) return;
        setIsUpdatingCard(true);
        try {
            await HealthCardApi.updateCard(selectedCardForEdit.cardId, {
                discountType: editFormData.discountType,
                discountValue: Number(editFormData.discountValue),
                validityDays: Number(editFormData.validityDays),
                status: editFormData.status
            });
            setSelectedCardForEdit(null);
            loadCards();
            setStatusMessage({ type: 'success', text: `Health Card ${selectedCardForEdit.cardNumber} updated successfully!` });
        } catch (err) {
            alert(err.message || 'Failed to update health card');
        } finally {
            setIsUpdatingCard(false);
        }
    };

    const handleCancelCardSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCardForCancel) return;
        setIsCancellingCard(true);
        try {
            await HealthCardApi.cancelCard(selectedCardForCancel.cardId, cancelReason);
            setSelectedCardForCancel(null);
            setCancelReason('');
            loadCards();
            setStatusMessage({ type: 'success', text: `Health Card ${selectedCardForCancel.cardNumber} has been cancelled.` });
        } catch (err) {
            alert(err.message || 'Failed to cancel health card');
        } finally {
            setIsCancellingCard(false);
        }
    };

    const handleRemoveBeneficiary = async (cardId, beneficiaryId, name) => {
        if (!window.confirm(`Are you sure you want to remove ${name || 'this family member'} from the health card? The open slot will become available again.`)) {
            return;
        }
        try {
            await HealthCardApi.removeBeneficiary(cardId, beneficiaryId);
            loadCards();
            setStatusMessage({ type: 'success', text: 'Family member removed. Open slot restored.' });
        } catch (err) {
            alert(err.message || 'Failed to remove family member');
        }
    };

    const handleViewPatientFile = (patientId) => {
        if (!patientId) return;
        onClose?.();
        navigate(`/patients/${patientId}?tab=membership`);
    };

    if (!isOpen) return null;

    const innerContent = (
        <div className="flex flex-col h-full overflow-hidden w-full select-none">
            {/* Header */}
            <div className="h-14 px-5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                        <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            Health Card Desk
                        </h2>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Direct OS
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="px-5 pt-3 shrink-0">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-zinc-800/80 rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => { setActiveTab('directory'); setIssuedSuccessCard(null); setStatusMessage(null); }}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                            activeTab === 'directory'
                                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold"
                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>All Health Cards ({cards.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('issue'); setSelectedCardForEnroll(null); }}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                            activeTab === 'issue'
                                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold"
                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Issue New Card</span>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-8 no-scrollbar">
                {/* TAB 1: DIRECTORY */}
                {activeTab === 'directory' && (
                    <div className="space-y-3">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by Card Number, Mobile, or Patient Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-2xs transition-all"
                            />
                        </div>

                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                <span className="text-xs font-semibold">Loading membership records...</span>
                            </div>
                        ) : cards.length === 0 ? (
                            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 p-6 space-y-3 bg-white/40 dark:bg-zinc-900/40">
                                <CreditCard className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto" />
                                <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">No health cards found</p>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('issue')}
                                    className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer"
                                >
                                    + Issue First Health Card
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {cards.map(card => {
                                    const isCapacityFull = card.availableSlots === 0;
                                    const isPending = card.status === 'PendingPayment';
                                    return (
                                        <div 
                                            key={card.cardId}
                                            className={cn(
                                                "rounded-[20px] border transition-all p-4 sm:p-4.5 space-y-3.5",
                                                isDark
                                                    ? "bg-zinc-900/90 border-zinc-800 shadow-lg"
                                                    : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_4px_16px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                                            )}
                                        >
                                            {/* Header Row: Avatar, Name, Card #, Status, Benefit Badge */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-200/80 dark:border-blue-800/80">
                                                        <CreditCard className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                                                                {card.primaryPatientName}
                                                            </h4>
                                                            <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                                                {card.cardNumber}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            <span className="font-mono">{card.primaryPhoneNumber}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>{card.configuredDiscountValue}{card.configuredDiscountType === 'Percentage' ? '%' : '₹'} Benefit</span>
                                                    </div>

                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1",
                                                        card.isExpired 
                                                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                            : isPending
                                                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", card.isExpired ? "bg-rose-500" : isPending ? "bg-amber-500" : "bg-emerald-500 animate-pulse")} />
                                                        {card.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Clinical Meta Pod (Plan, Capacity, Validity) */}
                                            <div className="rounded-xl p-3 border border-[#CCDCE8]/70 dark:border-zinc-800 bg-[#E8F1F7]/60 dark:bg-zinc-950/60 flex items-center justify-between text-xs font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 dark:text-zinc-200">{card.planName}</span>
                                                    <span className="font-bold px-2 py-0.5 rounded-md text-[10px] bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        {card.enrolledMembersCount} / {card.maxMembers} Members
                                                    </span>
                                                </div>

                                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>Valid till: <strong className="text-slate-800 dark:text-zinc-200">{new Date(card.validUntil).toLocaleDateString()}</strong></span>
                                                </span>
                                            </div>

                                            {/* Covered Family Members */}
                                            {card.beneficiaries && card.beneficiaries.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                                                        Covered Beneficiaries:
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {card.beneficiaries.map(ben => (
                                                            <span 
                                                                key={ben.beneficiaryId}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium shadow-2xs"
                                                            >
                                                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                                <strong className="text-slate-800 dark:text-zinc-200">{ben.displayName}</strong>
                                                                <span className="text-[10px] text-slate-400">({ben.relationship})</span>
                                                                {ben.isSlotLocked && (
                                                                    <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" title="Locked after test billing" />
                                                                )}
                                                                {ben.relationship !== 'Self' && (
                                                                    <button
                                                                        type="button"
                                                                        title="Remove member"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveBeneficiary(card.cardId, ben.beneficiaryId, ben.displayName);
                                                                        }}
                                                                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors ml-1"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Bar (Full Management Suite) */}
                                            <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    {card.primaryPatientId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewPatientFile(card.primaryPatientId)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:border-blue-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                            <span>View Patient File</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(card)}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:border-blue-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                                        <span>Edit Settings</span>
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {!isCapacityFull && !card.isExpired && !isPending && card.status === 'Active' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCardForEnroll(card)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                            <span>+ Enroll Member ({card.availableSlots} Open)</span>
                                                        </button>
                                                    )}
                                                    {card.status !== 'Cancelled' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setSelectedCardForCancel(card); setCancelReason(''); }}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 transition-all flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Ban className="w-3.5 h-3.5" />
                                                            <span>Cancel Card</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL: EDIT CARD SETTINGS */}
                {selectedCardForEdit && (
                    <div className="p-4 rounded-[20px] border bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] dark:bg-zinc-900 border-blue-200 dark:border-blue-800 space-y-3.5 shadow-xl animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-blue-600" />
                                Edit Settings: {selectedCardForEdit.cardNumber} ({selectedCardForEdit.primaryPatientName})
                            </h4>
                            <button type="button" onClick={() => setSelectedCardForEdit(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCardSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Discount Concession Mode</label>
                                    <div className="flex rounded-xl border border-slate-300 dark:border-zinc-700 p-0.5 bg-slate-100 dark:bg-zinc-800">
                                        <button
                                            type="button"
                                            onClick={() => setEditFormData(prev => ({ ...prev, discountType: 'Percentage' }))}
                                            className={cn(
                                                "flex-1 py-1 text-[11px] font-bold rounded-lg transition-all",
                                                editFormData.discountType === 'Percentage' ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 dark:text-zinc-400"
                                            )}
                                        >
                                            % Percentage
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditFormData(prev => ({ ...prev, discountType: 'Flat' }))}
                                            className={cn(
                                                "flex-1 py-1 text-[11px] font-bold rounded-lg transition-all",
                                                editFormData.discountType === 'Flat' ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 dark:text-zinc-400"
                                            )}
                                        >
                                            ₹ Flat
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                        Concession Value ({editFormData.discountType === 'Percentage' ? '%' : '₹'})
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={editFormData.discountType === 'Percentage' ? 100 : 50000}
                                        value={editFormData.discountValue}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Card Status</label>
                                    <select
                                        value={editFormData.status}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Extend Validity</label>
                                    <select
                                        value={editFormData.validityDays}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, validityDays: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                    >
                                        <option value={180}>6 Months (180 Days)</option>
                                        <option value={365}>1 Year (365 Days)</option>
                                        <option value={730}>2 Years (730 Days)</option>
                                        <option value={1095}>3 Years (1095 Days)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCardForEdit(null)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingCard}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    {isUpdatingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* MODAL: CANCEL / REVOKE CARD */}
                {selectedCardForCancel && (
                    <div className="p-4 rounded-[20px] border bg-gradient-to-b from-[#FFFFFF] via-[#FFF5F5] to-[#FFEBEB] dark:bg-zinc-900 border-rose-300 dark:border-rose-800 space-y-3.5 shadow-xl animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-2">
                                <Ban className="w-4 h-4 text-rose-600" />
                                Revoke Health Card: {selectedCardForCancel.cardNumber}
                            </h4>
                            <button type="button" onClick={() => setSelectedCardForCancel(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                            Are you sure you want to cancel the subscription for <strong>{selectedCardForCancel.primaryPatientName}</strong>? All associated beneficiaries will lose health card discount privileges.
                        </p>
                        <form onSubmit={handleCancelCardSubmit} className="space-y-3">
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Reason for Cancellation (Optional)</label>
                                <input
                                    type="text"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="e.g. Patient requested refund, duplicate issue, etc."
                                    className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-rose-500 shadow-2xs"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCardForCancel(null)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCancellingCard}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    {isCancellingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                    <span>Confirm Revocation</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* MODAL: ENROLL FAMILY MEMBER */}
                {selectedCardForEnroll && (
                    <div className="p-4 rounded-[20px] border bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] dark:bg-zinc-900 border-blue-200 dark:border-blue-800 space-y-3.5 shadow-xl animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-blue-600" />
                                Enroll Member into {selectedCardForEnroll.cardNumber}
                            </h4>
                            <button type="button" onClick={() => setSelectedCardForEnroll(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleEnrollSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={enrollFormData.name}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Full Name"
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Relationship</label>
                                    <select
                                        value={enrollFormData.relationship}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, relationship: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                    >
                                        <option value="Spouse">Spouse</option>
                                        <option value="Daughter">Daughter</option>
                                        <option value="Son">Son</option>
                                        <option value="Mother">Mother</option>
                                        <option value="Father">Father</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Age (Years)</label>
                                    <input
                                        type="number"
                                        value={enrollFormData.age}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, age: e.target.value }))}
                                        placeholder="Age"
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Gender</label>
                                    <select
                                        value={enrollFormData.gender}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, gender: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                    >
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCardForEnroll(null)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isEnrolling}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    <span>Confirm Enrollment</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB 2: ISSUE NEW CARD (Subscriber First Workflow) */}
                {activeTab === 'issue' && (
                    <form onSubmit={handleIssueCardSubmit} className="space-y-4">
                        {/* Status Message */}
                        {statusMessage && (
                            <div className={cn(
                                "p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-xs",
                                statusMessage.type === 'success'
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                            )}>
                                {statusMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                <span>{statusMessage.text}</span>
                            </div>
                        )}

                        {/* STEP 1: PRIMARY SUBSCRIBER IDENTIFICATION (SynOS Facelift Card) */}
                        <div className={cn(
                            "rounded-[20px] border transition-all p-4 space-y-3.5",
                            isDark
                                ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                        1
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                                        Primary Subscriber Identification
                                    </h3>
                                </div>

                                {selectedPatient && (
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        Subscriber Identified
                                    </span>
                                )}
                            </div>

                            {/* STATE A: PATIENT IS SELECTED (Canonical Recessed Pod) */}
                            {selectedPatient ? (
                                <div className="rounded-2xl border border-[#CCDCE8] dark:border-zinc-800 bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] dark:bg-zinc-950/80 p-3.5 sm:p-4 shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)] flex items-center justify-between gap-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-base text-slate-900 dark:text-white truncate">
                                                    {selectedPatient.name}
                                                </span>
                                                <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 bg-white/90 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                                    {selectedPatient.healthCardNumber || (selectedPatient.mrn ? `${selectedPatient.mrn}-HC` : 'NEW REG')}
                                                </span>
                                                {selectedPatient.isNew && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        New Patient
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-zinc-400 mt-1 font-medium flex-wrap">
                                                <span>📞 {selectedPatient.phone}</span>
                                                {selectedPatient.age && <span>🎂 {selectedPatient.age}</span>}
                                                <span>⚧ {selectedPatient.gender}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleClearSubscriber}
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-white border border-slate-300 dark:border-zinc-700 shadow-2xs cursor-pointer shrink-0 transition-colors"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : isRegisteringNew ? (
                                /* STATE B: REGISTER NEW PATIENT INLINE FORM */
                                <div className="p-4 rounded-2xl border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-950/80 shadow-xs space-y-3.5 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                                            Register New Patient as Subscriber
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsRegisteringNew(false)}
                                            className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                                        >
                                            Back to Search
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={primarySubscriber.name}
                                                onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="e.g. Ramesh Kumar"
                                                className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Mobile Number *</label>
                                            <input
                                                type="tel"
                                                required
                                                value={primarySubscriber.phone}
                                                onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, phone: e.target.value }))}
                                                placeholder="10-digit mobile"
                                                className="w-full h-10 px-3 rounded-xl text-xs font-mono font-semibold border bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Age (Years)</label>
                                            <input
                                                type="number"
                                                value={primarySubscriber.age}
                                                onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, age: e.target.value }))}
                                                placeholder="e.g. 42"
                                                className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Gender</label>
                                            <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold h-10 items-center">
                                                {['Male', 'Female', 'Other'].map(g => (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => setPrimarySubscriber(prev => ({ ...prev, gender: g }))}
                                                        className={cn(
                                                            "flex-1 h-8 rounded-lg transition-all cursor-pointer font-bold",
                                                            primarySubscriber.gender === g
                                                                ? "bg-[#0D6EFD] text-white shadow-xs font-extrabold"
                                                                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                                                        )}
                                                    >
                                                        {g}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsRegisteringNew(false)}
                                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmNewPatient}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Confirm & Select Subscriber</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* STATE C: SEARCH SUBSCRIBER (Mobile / MRN / Name) */
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-blue-600 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search registered patients by Mobile, MRN, or Name..."
                                            value={patientSearchQuery}
                                            onChange={(e) => setPatientSearchQuery(e.target.value)}
                                            className="w-full h-11 pl-10 pr-10 rounded-xl text-xs sm:text-sm font-semibold border bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-2xs transition-all"
                                            autoFocus
                                        />
                                        {isSearchingPatients && (
                                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                                        )}
                                    </div>

                                    {/* Action Link: Register Brand New Directly */}
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                                            Type 10-digit mobile number or search existing database.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleStartNewPatient('')}
                                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>+ Register Brand New Patient</span>
                                        </button>
                                    </div>

                                    {/* Candidate Search Matches */}
                                    {patientMatches.length > 0 && (
                                        <div className="space-y-2 pt-1">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block px-1">
                                                Matching Registered Patients ({patientMatches.length}):
                                            </span>
                                            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
                                                {patientMatches.map(p => {
                                                    const pId = p.id || p.Id || p.patientId;
                                                    const name = p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name;
                                                    const phone = p.currentPhoneNumber || p.phone;
                                                    const mrn = p.mrn || p.MRN;
                                                    return (
                                                        <div 
                                                            key={pId}
                                                            className="p-3 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shadow-2xs hover:border-blue-400 transition-all"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                    <User className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <strong className="text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                                            {name}
                                                                        </strong>
                                                                        {mrn && (
                                                                            p.hasActiveHealthCard || p.healthCardNumber ? (
                                                                                <span className="font-mono text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                                                                    <CreditCard className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                                                                    <span>{p.healthCardNumber || `${mrn}-HC`}</span>
                                                                                </span>
                                                                            ) : (
                                                                                <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                                                                                    {mrn}
                                                                                </span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                                                                        <span>📞 {phone}</span>
                                                                        {p.gender && <span>⚧ {p.gender}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleSelectPatient(p)}
                                                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white flex items-center gap-1 shadow-xs cursor-pointer shrink-0 transition-colors"
                                                            >
                                                                <span>Select</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="pt-1 text-center border-t border-slate-100 dark:border-zinc-800">
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartNewPatient(patientSearchQuery)}
                                                    className="text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-blue-600 transition-colors"
                                                >
                                                    Not the patient you're looking for? <u>Register as New Patient</u>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* No Match State */}
                                    {patientSearchQuery.trim().length >= 3 && !isSearchingPatients && patientMatches.length === 0 && (
                                        <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 text-center space-y-2">
                                            <p className="text-xs text-slate-600 dark:text-zinc-400 font-semibold">
                                                No registered patient matches "<span className="font-bold text-slate-800 dark:text-zinc-200">{patientSearchQuery}</span>".
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleStartNewPatient(patientSearchQuery)}
                                                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                                <span>Register New Patient with this Number</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* STEP 2: SELECT HEALTH CARD PLAN TIER (2x2 Cards) */}
                        <div className={cn(
                            "rounded-[20px] border transition-all p-4 space-y-3.5",
                            isDark
                                ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                        )}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                    2
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                                    Select Health Card Plan Tier
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {plans.map(p => {
                                    const isSelected = p.planId === selectedPlanId;
                                    return (
                                        <button
                                            key={p.planId}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPlanId(p.planId);
                                                setDiscountValue(p.defaultDiscountPercentage || 30);
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer relative flex flex-col justify-between min-h-[88px] shadow-xs",
                                                isSelected
                                                    ? "bg-[#DCEBFF] dark:bg-blue-950/70 border-2 border-[#0D6EFD] dark:border-blue-500 shadow-blue-500/10"
                                                    : "bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/90 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className={cn(
                                                    "font-bold text-xs sm:text-sm leading-snug",
                                                    isSelected ? "text-blue-950 dark:text-blue-100 font-extrabold" : "text-slate-800 dark:text-zinc-200"
                                                )}>
                                                    {p.planName}
                                                </span>
                                                {isSelected && (
                                                    <div className="w-4 h-4 rounded-full bg-[#0D6EFD] text-white flex items-center justify-center shrink-0">
                                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                                                <span className={cn(
                                                    "text-[11px] font-semibold",
                                                    isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-zinc-400"
                                                )}>
                                                    {p.maxMembers} {p.maxMembers === 1 ? 'Member' : 'Members'}
                                                </span>
                                                <span className={cn(
                                                    "font-mono font-black text-sm sm:text-base",
                                                    isSelected ? "text-[#0D6EFD] dark:text-blue-400" : "text-slate-900 dark:text-white"
                                                )}>
                                                    ₹{p.price.toLocaleString()}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* STEP 3: FAMILY MEMBERS QUOTA (Only if plan capacity > 1) */}
                        {additionalFamilySlotsNeeded > 0 && (
                            <div className={cn(
                                "rounded-[20px] border transition-all p-4 space-y-3.5",
                                isDark
                                    ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                    : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                            3
                                        </div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                                            Family Members ({additionalFamilySlotsNeeded} Slot{additionalFamilySlotsNeeded > 1 ? 's' : ''})
                                        </h3>
                                    </div>
                                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                                        Optional: Can be enrolled now or during visits
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {familyMembers.map((member, idx) => (
                                        <div 
                                            key={idx}
                                            className="p-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700/90 bg-white dark:bg-zinc-900 shadow-xs space-y-2"
                                        >
                                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                                                Family Member Slot #{idx + 2}
                                            </span>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2">
                                                    <input
                                                        type="text"
                                                        value={member.name}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setFamilyMembers(prev => {
                                                                const arr = [...prev];
                                                                arr[idx].name = val;
                                                                return arr;
                                                            });
                                                        }}
                                                        placeholder="Member Full Name"
                                                        className="w-full h-9 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                                    />
                                                </div>
                                                <div>
                                                    <select
                                                        value={member.relationship}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setFamilyMembers(prev => {
                                                                const arr = [...prev];
                                                                arr[idx].relationship = val;
                                                                return arr;
                                                            });
                                                        }}
                                                        className="w-full h-9 px-2.5 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                                    >
                                                        <option value="Spouse">Spouse</option>
                                                        <option value="Daughter">Daughter</option>
                                                        <option value="Son">Son</option>
                                                        <option value="Mother">Mother</option>
                                                        <option value="Father">Father</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 4: DISCOUNT CONCESSION & VALIDITY */}
                        <div className={cn(
                            "rounded-[20px] border transition-all p-4 space-y-3.5",
                            isDark
                                ? "bg-zinc-900/90 border-zinc-800 shadow-xl"
                                : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                        )}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                    {additionalFamilySlotsNeeded > 0 ? 4 : 3}
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-normal">
                                    Desk Discount Freedom & Validity
                                </h3>
                            </div>

                            <div className="p-4 rounded-2xl border border-slate-300 dark:border-zinc-700/90 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">Discount Concession Mode</span>
                                    <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('Percentage')}
                                            className={cn(
                                                "px-3 py-1 rounded-lg transition-all cursor-pointer font-bold",
                                                discountType === 'Percentage'
                                                    ? "bg-[#0D6EFD] text-white shadow-xs font-extrabold"
                                                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-800"
                                            )}
                                        >
                                            % Percentage
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('Flat')}
                                            className={cn(
                                                "px-3 py-1 rounded-lg transition-all cursor-pointer font-bold",
                                                discountType === 'Flat'
                                                    ? "bg-[#0D6EFD] text-white shadow-xs font-extrabold"
                                                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-800"
                                            )}
                                        >
                                            Flat Concession (₹)
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 items-center">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                            Discount Rate
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                max={discountType === 'Percentage' ? 100 : 10000}
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                className="w-full h-10 px-3 pr-8 rounded-xl text-sm font-mono font-bold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs pointer-events-none">
                                                {discountType === 'Percentage' ? '%' : '₹'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                            Validity Period
                                        </label>
                                        <select
                                            value={validityDays}
                                            onChange={(e) => setValidityDays(Number(e.target.value))}
                                            className="w-full h-10 px-3 rounded-xl text-xs font-bold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                        >
                                            <option value={365}>1 Year (365 Days) - Standard</option>
                                            <option value={180}>6 Months (180 Days)</option>
                                            <option value={730}>2 Years (730 Days)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STEP 5: COUNTER SETTLEMENT & ACTIVATION CARD */}
                        <div className={cn(
                            "rounded-[20px] border transition-all p-4 space-y-3.5 shadow-sm",
                            isDark
                                ? "bg-zinc-900/90 border-zinc-800"
                                : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FBFE] to-[#F1F6FA] border border-white/95 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.04),inset_0_1px_0_#FFFFFF]"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Subscription Due:</span>
                                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                                        ₹{selectedPlan.price.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
                                    {['Cash', 'UPI', 'Card'].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setPaymentMode(m)}
                                            className={cn(
                                                "px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold",
                                                paymentMode === m
                                                    ? "bg-[#0D6EFD] text-white shadow-xs font-extrabold"
                                                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                            )}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingCard || !selectedPatient}
                                className={cn(
                                    "w-full h-12 rounded-xl text-sm sm:text-base font-bold text-white shadow-md transition-all flex items-center justify-center gap-2",
                                    !selectedPatient 
                                        ? "bg-slate-300 dark:bg-zinc-800 text-slate-500 cursor-not-allowed" 
                                        : "bg-[#0D6EFD] hover:bg-blue-600 active:scale-[0.99] cursor-pointer"
                                )}
                            >
                                {isSubmittingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                <span>
                                    {!selectedPatient ? "Select / Register Subscriber First" : `Activate Card & Collect ₹${selectedPlan.price.toLocaleString()}`}
                                </span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );

    if (embedded) {
        return innerContent;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-2xl h-full flex flex-col shadow-2xl transition-all duration-300 animate-in slide-in-from-right",
                isDark ? "bg-zinc-900 border-l border-zinc-800 text-white" : "bg-[#F4F8FA] border-l border-slate-200 text-slate-900"
            )}>
                {innerContent}
            </div>
        </div>
    );
}