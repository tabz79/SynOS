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

export function HealthCardDeskDrawer({ isOpen, onClose, onCardIssued }) {
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

    const selectedPlan = plans.find(p => p.planId === selectedPlanId) || plans[0];
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-2xl h-full flex flex-col shadow-2xl transition-all duration-300 animate-in slide-in-from-right",
                isDark ? "bg-zinc-900 border-l border-zinc-800 text-white" : "bg-[#F4F8FA] border-l border-slate-200 text-slate-900"
            )}>
                {/* Header */}
                <div className={cn(
                    "p-5 border-b flex items-center justify-between shrink-0",
                    isDark ? "border-zinc-800 bg-zinc-900/90" : "border-slate-200 bg-white"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-sm">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black tracking-tight">Health Card Membership Desk</h2>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    OS Portal
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                                Manage subscriptions, enroll family members, and issue flat-discount cards
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-zinc-800 px-5 pt-2 shrink-0 bg-white dark:bg-zinc-900">
                    <button
                        onClick={() => { setActiveTab('directory'); setIssuedSuccessCard(null); setStatusMessage(null); }}
                        className={cn(
                            "pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
                            activeTab === 'directory'
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400"
                        )}
                    >
                        <Users className="w-4 h-4" />
                        <span>All Health Cards ({cards.length})</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('issue'); setSelectedCardForEnroll(null); }}
                        className={cn(
                            "pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
                            activeTab === 'issue'
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400"
                        )}
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Issue New Card</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* TAB 1: DIRECTORY */}
                    {activeTab === 'directory' && (
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search by Card Number, Mobile, or Patient Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={cn(
                                        "w-full h-11 pl-10 pr-4 rounded-xl text-sm font-medium border outline-none transition-all",
                                        isDark 
                                            ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500" 
                                            : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 shadow-2xs"
                                    )}
                                />
                            </div>

                            {isLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    <span className="text-xs">Loading membership records...</span>
                                </div>
                            ) : cards.length === 0 ? (
                                <div className="py-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 p-6 space-y-3">
                                    <CreditCard className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto" />
                                    <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">No health cards found</p>
                                    <button
                                        onClick={() => setActiveTab('issue')}
                                        className="text-xs font-bold px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                                    >
                                        + Issue First Health Card
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cards.map(card => {
                                        const isCapacityFull = card.availableSlots === 0;
                                        return (
                                            <div 
                                                key={card.cardId}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all space-y-3 shadow-2xs",
                                                    isDark ? "bg-zinc-850/80 border-zinc-750" : "bg-white border-slate-200"
                                                )}
                                            >
                                                {/* Top Row: Card # & Status */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                                                            {card.cardNumber}
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                                            card.isExpired 
                                                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                        )}>
                                                            {card.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-zinc-300">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>{card.configuredDiscountValue}{card.configuredDiscountType === 'Percentage' ? '%' : '₹'} Flat</span>
                                                    </div>
                                                </div>

                                                {/* Primary Subscriber Info */}
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Primary Subscriber</span>
                                                        <span className="font-bold text-slate-800 dark:text-zinc-100">{card.primaryPatientName}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Phone / Household</span>
                                                        <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">{card.primaryPhoneNumber}</span>
                                                    </div>
                                                </div>

                                                {/* Plan & Quota Capacity */}
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-slate-600 dark:text-zinc-300">{card.planName}</span>
                                                        <span className="text-slate-400">•</span>
                                                        <span className={cn(
                                                            "font-bold px-2 py-0.5 rounded-md text-[11px]",
                                                            isCapacityFull 
                                                                ? "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                                                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                                        )}>
                                                            {card.enrolledMembersCount} / {card.maxMembers} Members
                                                        </span>
                                                    </div>

                                                    <div className="text-slate-500 dark:text-zinc-400">
                                                        Valid till: <strong className="text-slate-700 dark:text-zinc-200">{new Date(card.validUntil).toLocaleDateString()}</strong>
                                                    </div>
                                                </div>

                                                {/* Enrolled Beneficiaries List */}
                                                {card.beneficiaries && card.beneficiaries.length > 0 && (
                                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 space-y-1.5">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                                            Covered Family Members
                                                        </span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {card.beneficiaries.map(ben => (
                                                                <span 
                                                                    key={ben.beneficiaryId}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium"
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
                                                    </div>
                                                )}

                                                {/* Action Bar */}
                                                {!isCapacityFull && !card.isExpired && (
                                                    <div className="pt-1 flex justify-end">
                                                        <button
                                                            onClick={() => setSelectedCardForEnroll(card)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                            <span>Enroll Family Member ({card.availableSlots} slot open)</span>
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

                    {/* MODAL: ENROLL FAMILY MEMBER INTO OPEN SLOT */}
                    {selectedCardForEnroll && (
                        <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-indigo-600" />
                                    Enroll Family Member into {selectedCardForEnroll.cardNumber}
                                </h4>
                                <button onClick={() => setSelectedCardForEnroll(null)} className="text-slate-400 hover:text-slate-600">
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
                                            placeholder="e.g. Sunita Kumar"
                                            className="w-full h-9 px-3 rounded-lg text-xs border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Relationship</label>
                                        <select
                                            value={enrollFormData.relationship}
                                            onChange={(e) => setEnrollFormData(prev => ({ ...prev, relationship: e.target.value }))}
                                            className="w-full h-9 px-2 rounded-lg text-xs border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                        >
                                            <option value="Spouse">Spouse / Wife / Husband</option>
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
                                            placeholder="e.g. 36"
                                            className="w-full h-9 px-3 rounded-lg text-xs border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Gender</label>
                                        <select
                                            value={enrollFormData.gender}
                                            onChange={(e) => setEnrollFormData(prev => ({ ...prev, gender: e.target.value }))}
                                            className="w-full h-9 px-2 rounded-lg text-xs border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
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
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isEnrolling}
                                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
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

                            {/* Section 1: Plan Tier Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block">
                                    1. Select Health Card Plan Tier
                                </label>
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
                                                    "p-3 rounded-xl border text-left transition-all cursor-pointer",
                                                    isSelected
                                                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-white shadow-xs"
                                                        : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-800 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm">{p.planName}</span>
                                                    <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                                                        ₹{p.price.toLocaleString()}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-1">
                                                    Capacity: Up to {p.maxMembers} member{p.maxMembers > 1 ? 's' : ''}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 2: Discount & Validity Customization (Full Freedom) */}
                            <div className="p-4 rounded-xl border bg-white dark:bg-zinc-850 border-slate-200 dark:border-zinc-750 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                                        2. Desk Discount Freedom
                                    </label>
                                    {/* Mode Toggle: % vs ₹ Flat */}
                                    <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('Percentage')}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                                                discountType === 'Percentage'
                                                    ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-2xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            % Percentage
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('Flat')}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                                                discountType === 'Flat'
                                                    ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-2xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            ₹ Flat Concession
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 items-center">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                                            Authorized Discount Value {discountType === 'Percentage' ? '(%)' : '(₹)'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                max={discountType === 'Percentage' ? 100 : 10000}
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                className="w-full h-10 px-3 rounded-lg text-sm font-mono font-bold border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
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
                                            className="w-full h-10 px-2 rounded-lg text-xs font-bold border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                        >
                                            <option value={365}>1 Year (365 Days) - Standard</option>
                                            <option value={180}>6 Months (180 Days)</option>
                                            <option value={730}>2 Years (730 Days)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Primary Subscriber */}
                            <div className="space-y-2">
                                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block">
                                    3. Primary Subscriber (Family Head / Member #1)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={primarySubscriber.name}
                                            onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Ramesh Kumar"
                                            className="w-full h-9 px-3 rounded-lg text-xs border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
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
                                            className="w-full h-9 px-3 rounded-lg text-xs font-mono border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Age (Years)</label>
                                        <input
                                            type="number"
                                            value={primarySubscriber.age}
                                            onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, age: e.target.value }))}
                                            placeholder="e.g. 42"
                                            className="w-full h-9 px-3 rounded-lg text-xs border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">Gender</label>
                                        <select
                                            value={primarySubscriber.gender}
                                            onChange={(e) => setPrimarySubscriber(prev => ({ ...prev, gender: e.target.value }))}
                                            className="w-full h-9 px-2 rounded-lg text-xs border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Family Member Quota Slots (If plan > 1) */}
                            {additionalFamilySlotsNeeded > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block">
                                            4. Family Members Quota ({familyMembers.length} Available Slot{familyMembers.length > 1 ? 's' : ''})
                                        </label>
                                        <span className="text-[11px] text-slate-400">Can be left empty and enrolled later</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {familyMembers.map((member, idx) => (
                                            <div 
                                                key={idx}
                                                className="p-3 rounded-xl border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 space-y-2"
                                            >
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                    <span>Member Slot #{idx + 2}</span>
                                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Eligible for {discountValue}% Benefit</span>
                                                </div>
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
                                                            placeholder="Member Name (e.g. Sunita Kumar)"
                                                            className="w-full h-8 px-2.5 rounded-lg text-xs border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
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
                                                            className="w-full h-8 px-2 rounded-lg text-xs border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 outline-none"
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

                            {/* Section 5: POS Tender & Payment */}
                            <div className="p-4 rounded-xl border bg-white dark:bg-zinc-850 border-slate-200 dark:border-zinc-750 flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-slate-500 block">Subscription Fee Due</span>
                                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                                        ₹{selectedPlan.price.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {['Cash', 'UPI', 'Card'].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setPaymentMode(m)}
                                            className={cn(
                                                "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                                paymentMode === m
                                                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                                    : "bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                                            )}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmittingCard}
                                className="w-full h-12 rounded-2xl text-base font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                            >
                                {isSubmittingCard ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                <span>Activate Card & Collect ₹{selectedPlan.price.toLocaleString()}</span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
