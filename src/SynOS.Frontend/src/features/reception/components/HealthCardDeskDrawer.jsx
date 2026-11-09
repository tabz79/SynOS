import React, { useState, useEffect } from 'react';
import { 
    X, 
    CreditCard, 
    Search, 
    UserPlus, 
    Users, 
    Check, 
    AlertCircle, 
    Calendar, 
    ChevronRight, 
    ChevronDown, 
    Loader2, 
    ShieldCheck, 
    Sparkles, 
    IndianRupee, 
    Printer, 
    UserCheck,
    Clock,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { HealthCardApi } from '@/api/healthCards';

export function HealthCardDeskDrawer({ isOpen, onClose, onCardIssued, embedded = false }) {
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

    // Issue New Card State
    const [selectedPlanId, setSelectedPlanId] = useState('');
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

    const handleIssueCardSubmit = async (e) => {
        e.preventDefault();
        if (!primarySubscriber.name.trim() || !primarySubscriber.phone.trim()) {
            setStatusMessage({ type: 'error', text: 'Primary subscriber name and phone number are required.' });
            return;
        }

        setIsSubmittingCard(true);
        setStatusMessage(null);
        try {
            const payload = {
                planId: selectedPlan.planId,
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
            setStatusMessage({ type: 'success', text: `Health Card ${created.cardNumber} issued successfully!` });
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
        } catch (err) {
            alert(err.message || 'Failed to enroll member');
        } finally {
            setIsEnrolling(false);
        }
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
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 no-scrollbar">
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
                                className="w-full h-11 pl-10 pr-4 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-2xs transition-all"
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
                            <div className="space-y-3">
                                {cards.map(card => {
                                    const isCapacityFull = card.availableSlots === 0;
                                    const isPending = card.status === 'PendingPayment';
                                    return (
                                        <div 
                                            key={card.cardId}
                                            className="p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 space-y-3 shadow-2xs hover:border-slate-300 transition-all"
                                        >
                                            {/* Top Row: Card # & Status */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                                                        {card.cardNumber}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                                        card.isExpired 
                                                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                            : isPending
                                                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                    )}>
                                                        {card.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-zinc-300">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                    <span>{card.configuredDiscountValue}{card.configuredDiscountType === 'Percentage' ? '%' : '₹'} Off</span>
                                                </div>
                                            </div>

                                            {/* Subscriber Info */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-slate-400 block text-[11px] font-bold">Subscriber</span>
                                                    <span className="font-bold text-slate-800 dark:text-zinc-100">{card.primaryPatientName}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[11px] font-bold">Phone</span>
                                                    <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">{card.primaryPhoneNumber}</span>
                                                </div>
                                            </div>

                                            {/* Plan & Capacity */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700 dark:text-zinc-200">{card.planName}</span>
                                                    <span className="font-bold px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        {card.enrolledMembersCount} / {card.maxMembers} Members
                                                    </span>
                                                </div>

                                                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                    Valid till: <strong className="text-slate-700 dark:text-zinc-200">{new Date(card.validUntil).toLocaleDateString()}</strong>
                                                </span>
                                            </div>

                                            {/* Covered Family Members */}
                                            {card.beneficiaries && card.beneficiaries.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {card.beneficiaries.map(ben => (
                                                        <span 
                                                            key={ben.beneficiaryId}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium"
                                                        >
                                                            <UserCheck className="w-3 h-3 text-emerald-600" />
                                                            <strong>{ben.displayName}</strong>
                                                            <span className="text-[10px] text-slate-400">({ben.relationship})</span>
                                                            {ben.isSlotLocked && (
                                                                <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" title="Locked after test billing" />
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Action Bar */}
                                            {!isCapacityFull && !card.isExpired && !isPending && (
                                                <div className="pt-1 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCardForEnroll(card)}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-800 shadow-2xs"
                                                    >
                                                        <UserPlus className="w-3.5 h-3.5" />
                                                        <span>Enroll Family Member ({card.availableSlots} open)</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL: ENROLL FAMILY MEMBER */}
                {selectedCardForEnroll && (
                    <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-800 space-y-3 shadow-md animate-in fade-in">
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
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={enrollFormData.name}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Full Name"
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Relationship</label>
                                    <select
                                        value={enrollFormData.relationship}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, relationship: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
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
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Age (Years)</label>
                                    <input
                                        type="number"
                                        value={enrollFormData.age}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, age: e.target.value }))}
                                        placeholder="Age"
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Gender</label>
                                    <select
                                        value={enrollFormData.gender}
                                        onChange={(e) => setEnrollFormData(prev => ({ ...prev, gender: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
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
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isEnrolling}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    <span>Confirm Enrollment</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB 2: ISSUE NEW CARD */}
                {activeTab === 'issue' && (
                    <form onSubmit={handleIssueCardSubmit} className="space-y-4">
                        {/* Status Message */}
                        {statusMessage && (
                            <div className={cn(
                                "p-3 rounded-xl border text-xs font-bold flex items-center gap-2",
                                statusMessage.type === 'success'
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                            )}>
                                {statusMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                                <span>{statusMessage.text}</span>
                            </div>
                        )}

                        {/* Step 1: Select Plan Tier (2x2 Cards) */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                                    1
                                </div>
                                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                    Select Plan Tier
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
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
                                                "p-3 rounded-2xl border text-left transition-all cursor-pointer relative",
                                                isSelected
                                                    ? "bg-[#DCEBFF] dark:bg-blue-950/70 border-2 border-[#0D6EFD] dark:border-blue-500 shadow-xs"
                                                    : "bg-white/80 dark:bg-zinc-900/80 border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 shadow-2xs"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className={cn(
                                                    "font-bold text-xs sm:text-sm truncate",
                                                    isSelected ? "text-blue-900 dark:text-blue-200" : "text-slate-800 dark:text-zinc-200"
                                                )}>
                                                    {p.planName}
                                                </span>
                                                <span className={cn(
                                                    "font-mono font-black text-xs sm:text-sm shrink-0",
                                                    isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-white"
                                                )}>
                                                    ₹{p.price.toLocaleString()}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step 2: Discount & Validity Customization */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                                    2
                                </div>
                                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                    Discount & Validity
                                </span>
                            </div>
                            <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">Discount Type</span>
                                    <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('Percentage')}
                                            className={cn(
                                                "px-3 py-1 rounded-lg transition-all cursor-pointer font-bold",
                                                discountType === 'Percentage'
                                                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold"
                                                    : "text-slate-500 hover:text-slate-800"
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
                                                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold"
                                                    : "text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            Flat Concession (₹)
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 items-center">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                            Discount Value
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                max={discountType === 'Percentage' ? 100 : 10000}
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                className="w-full h-10 px-3 pr-8 rounded-xl text-sm font-mono font-bold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                                            className="w-full h-10 px-3 rounded-xl text-xs font-bold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
                                        >
                                            <option value={365}>1 Year (365 Days)</option>
                                            <option value={180}>6 Months (180 Days)</option>
                                            <option value={730}>2 Years (730 Days)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Primary Subscriber */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                                    3
                                </div>
                                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                    Primary Subscriber
                                </span>
                            </div>
                            <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-2xs space-y-2.5">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={primarySubscriber.name}
                                            onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Ramesh Kumar"
                                            className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                                            className="w-full h-10 px-3 rounded-xl text-xs font-mono font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Age (Years)</label>
                                        <input
                                            type="number"
                                            value={primarySubscriber.age}
                                            onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, age: e.target.value }))}
                                            placeholder="e.g. 42"
                                            className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Gender</label>
                                        <select
                                            value={primarySubscriber.gender}
                                            onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, gender: e.target.value }))}
                                            className="w-full h-10 px-3 rounded-xl text-xs font-semibold border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 4: Family Members Quota */}
                        {additionalFamilySlotsNeeded > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                                        4
                                    </div>
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                        Family Members ({additionalFamilySlotsNeeded} Slot{additionalFamilySlotsNeeded > 1 ? 's' : ''})
                                    </span>
                                </div>
                                <div className="space-y-2.5">
                                    {familyMembers.map((member, idx) => (
                                        <div 
                                            key={idx}
                                            className="p-3 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-2xs space-y-2"
                                        >
                                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                                                Member #{idx + 2}
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
                                                        placeholder="Full Name"
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

                        {/* Bottom Actions Footer */}
                        <div className="shrink-0 pt-3 border-t border-slate-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Total:</span>
                                    <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                                        ₹{selectedPlan.price.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-xs font-bold">
                                    {['Cash', 'UPI', 'Card'].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setPaymentMode(m)}
                                            className={cn(
                                                "px-3 py-1 rounded-lg transition-all cursor-pointer font-bold",
                                                paymentMode === m
                                                    ? "bg-[#0D6EFD] text-white shadow-xs"
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
                                disabled={isSubmittingCard}
                                className="w-full h-12 rounded-2xl text-sm sm:text-base font-bold bg-[#0D6EFD] hover:bg-blue-600 text-white shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmittingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                <span>Activate Card & Collect ₹{selectedPlan.price.toLocaleString()}</span>
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
