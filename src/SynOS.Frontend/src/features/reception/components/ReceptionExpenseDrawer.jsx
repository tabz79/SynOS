import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
    X, 
    Coffee, 
    Truck, 
    Wrench, 
    Sparkles, 
    Building2, 
    Zap, 
    IndianRupee, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    ArrowUpRight, 
    ArrowDownRight, 
    Edit3, 
    Trash2, 
    RotateCcw, 
    Search, 
    Plus, 
    Loader2, 
    BookmarkCheck,
    Receipt,
    Wallet,
    CreditCard,
    QrCode,
    Calendar,
    ChevronRight,
    TrendingDown,
    FileSpreadsheet,
    ShieldAlert
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const DRAFT_STORAGE_KEY = 'synos_reception_expense_draft';

export function ReceptionExpenseDrawer({ isOpen, onClose }) {
    const { user } = useAuth();
    const { theme } = useTheme();

    // Mode & Time Range
    const [timeRange, setTimeRange] = useState('today'); // 'today' | '7d'
    const [activeSection, setActiveSection] = useState('petty'); // 'petty' | 'vendor' | 'overhead'
    
    // Server Feed & Metrics
    const [feedItems, setFeedItems] = useState([]);
    const [metrics, setMetrics] = useState({
        netOutflow: 0,
        cashOutflow: 0,
        digitalOutflow: 0,
        pendingDues: 0,
        totalCount: 0,
        categories: [],
        dailyHistory: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [vendors, setVendors] = useState([]);

    // Form Draft State
    const [form, setForm] = useState({
        amount: '',
        category: 'Tea',
        paymentMethod: 'Cash',
        description: '',
        vendorId: '',
        invoiceNumber: '',
        isSettledNow: true,
        notes: ''
    });
    const [hasDraftLoaded, setHasDraftLoaded] = useState(false);

    // Audit Modals State
    const [correctionTarget, setCorrectionTarget] = useState(null);
    const [correctionForm, setCorrectionForm] = useState({
        newAmount: '',
        newCategory: '',
        newPaymentMethod: 'Cash',
        newDescription: '',
        reason: '',
        notes: ''
    });

    const [cancellationTarget, setCancellationTarget] = useState(null);
    const [cancellationForm, setCancellationForm] = useState({
        reason: '',
        notes: '',
        refundToDrawer: true
    });

    // Preset categories for petty cash
    const pettyPresets = [
        { label: 'Tea & Snacks', icon: Coffee, category: 'Tea', defaultDesc: 'Staff & Patient Refreshments' },
        { label: 'Courier & Samples', icon: Truck, category: 'Courier', defaultDesc: 'Diagnostic Specimen Logistics' },
        { label: 'Cleaning & Supplies', icon: Sparkles, category: 'Cleaning', defaultDesc: 'Lab Disinfectants & Housekeeping' },
        { label: 'Minor Repairs', icon: Wrench, category: 'Repairs', defaultDesc: 'Electrical / Plumbing / AC Repair' },
        { label: 'Stationery & Rolls', icon: Receipt, category: 'Stationery', defaultDesc: 'Thermal Paper Rolls & Print Cartridges' },
        { label: 'Misc Operational', icon: Zap, category: 'Misc', defaultDesc: 'General Petty Cash Disbursement' }
    ];

    const overheadPresets = [
        { label: 'Electricity Grid', category: 'Power', defaultDesc: 'Monthly Electricity Power Bill' },
        { label: 'Broadband / Internet', category: 'Internet', defaultDesc: 'High-speed Fiber Broadband AMC' },
        { label: 'Bio-Medical Waste', category: 'Misc', defaultDesc: 'Biomedical Waste Safe Disposal Fee' },
        { label: 'Facility Lease / Rent', category: 'Rent', defaultDesc: 'Premises Lease Settlement' }
    ];

    // Load Draft from LocalStorage on mount
    useEffect(() => {
        try {
            const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft);
                if (parsed && (parsed.amount || parsed.description)) {
                    setForm(parsed);
                    setHasDraftLoaded(true);
                }
            }
        } catch (e) {
            console.error('Failed to parse draft from localStorage', e);
        }
    }, []);

    // Save Draft to LocalStorage
    const saveDraft = (updatedForm) => {
        setForm(updatedForm);
        try {
            if (updatedForm.amount || updatedForm.description || updatedForm.notes) {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updatedForm));
                setHasDraftLoaded(true);
            } else {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
                setHasDraftLoaded(false);
            }
        } catch (e) {
            console.error('Failed to save draft to localStorage', e);
        }
    };

    const discardDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setForm({
            amount: '',
            category: 'Tea',
            paymentMethod: 'Cash',
            description: '',
            vendorId: '',
            invoiceNumber: '',
            isSettledNow: true,
            notes: ''
        });
        setHasDraftLoaded(false);
    };

    // Load Data
    const loadFeed = useCallback(async () => {
        if (!isOpen) return;
        try {
            setIsLoading(true);
            const userId = user?.id || localStorage.getItem('synos_user_id');
            const [feedData, vendorList] = await Promise.all([
                FinanceApi.getReceptionExpensesFeed(timeRange, userId),
                FinanceApi.getVendors().catch(() => [])
            ]);

            setMetrics(feedData.metrics || {
                netOutflow: 0,
                cashOutflow: 0,
                digitalOutflow: 0,
                pendingDues: 0,
                totalCount: 0,
                categories: [],
                dailyHistory: []
            });
            setFeedItems(feedData.items || []);
            setVendors(vendorList || []);
        } catch (err) {
            console.error('Failed to load reception expense feed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, timeRange, user?.id]);

    useEffect(() => {
        loadFeed();
    }, [loadFeed]);

    // Handle Escape Key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (correctionTarget) {
                    setCorrectionTarget(null);
                } else if (cancellationTarget) {
                    setCancellationTarget(null);
                } else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, correctionTarget, cancellationTarget]);

    // Submit Expense Recording
    const handleSubmitExpense = async (e) => {
        e.preventDefault();
        const amt = parseFloat(form.amount);
        if (!amt || amt <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        try {
            setIsSubmitting(true);
            let finalDesc = form.description;
            if (activeSection === 'vendor') {
                const vendorObj = vendors.find(v => v.vendorId === form.vendorId);
                const vendorName = vendorObj ? vendorObj.vendorName : 'Vendor';
                finalDesc = `Inward Bill: ${vendorName} [Inv #${form.invoiceNumber || 'N/A'}] - ${form.description || 'Reagents & Consumables'}`;
            }

            if (form.isSettledNow) {
                await FinanceApi.recordDailyExpense({
                    category: form.category,
                    amount: amt,
                    description: finalDesc,
                    paymentMethod: form.paymentMethod
                });
            } else {
                // Obligation only (Pending due)
                await FinanceApi.createOverheadExpense({
                    category: form.category,
                    amount: amt,
                    description: finalDesc,
                    expenseDate: new Date().toISOString(),
                    userId: user?.id || localStorage.getItem('synos_user_id')
                });
            }

            // Clean up draft
            discardDraft();
            await loadFeed();
        } catch (err) {
            alert(err.message || 'Failed to record expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open Correction Modal
    const handleOpenCorrection = (item) => {
        setCorrectionTarget(item);
        setCorrectionForm({
            newAmount: item.amountPaid > 0 ? item.amountPaid : item.amountDue,
            newCategory: item.category,
            newPaymentMethod: item.paymentMethod || 'Cash',
            newDescription: item.description,
            reason: '',
            notes: ''
        });
    };

    // Submit Correction
    const handleSubmitCorrection = async (e) => {
        e.preventDefault();
        if (!correctionForm.reason.trim()) {
            alert('A mandatory correction reason is required.');
            return;
        }

        try {
            setIsSubmitting(true);
            await FinanceApi.correctExpense(correctionTarget.id, correctionForm);
            setCorrectionTarget(null);
            await loadFeed();
        } catch (err) {
            alert(err.message || 'Failed to apply correction');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open Cancellation Modal
    const handleOpenCancellation = (item) => {
        setCancellationTarget(item);
        setCancellationForm({
            reason: '',
            notes: '',
            refundToDrawer: true
        });
    };

    // Submit Cancellation
    const handleSubmitCancellation = async (e) => {
        e.preventDefault();
        if (!cancellationForm.reason.trim()) {
            alert('A mandatory cancellation reason is required.');
            return;
        }

        try {
            setIsSubmitting(true);
            await FinanceApi.cancelExpense(cancellationTarget.id, cancellationForm);
            setCancellationTarget(null);
            await loadFeed();
        } catch (err) {
            alert(err.message || 'Failed to cancel expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtered Feed Items
    const filteredFeed = useMemo(() => {
        if (!searchQuery.trim()) return feedItems;
        const q = searchQuery.toLowerCase();
        return feedItems.filter(item => 
            (item.description && item.description.toLowerCase().includes(q)) ||
            (item.category && item.category.toLowerCase().includes(q)) ||
            (item.paymentMethod && item.paymentMethod.toLowerCase().includes(q)) ||
            (item.status && item.status.toLowerCase().includes(q))
        );
    }, [feedItems, searchQuery]);

    // Percentage splits for progress bars
    const cashPercent = metrics.netOutflow > 0 ? Math.round((metrics.cashOutflow / metrics.netOutflow) * 100) : 0;
    const digitalPercent = metrics.netOutflow > 0 ? Math.round((metrics.digitalOutflow / metrics.netOutflow) * 100) : 0;

    if (!isOpen) return null;

    return (
        <div 
            className={cn(
                "fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            )}
        >
            {/* Absolute Drawer matching IntentPanel: 80% screen width */}
            <div 
                className={cn(
                    "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[82vw] 2xl:w-[80vw] max-w-[1780px] h-full flex flex-col overflow-hidden shadow-2xl border-l",
                    theme === 'dark' 
                        ? "bg-zinc-950/95 border-white/10 text-zinc-100" 
                        : "bg-slate-50/95 border-zinc-200 text-zinc-900",
                    "backdrop-blur-xl animate-in slide-in-from-right duration-300"
                )}
            >
                {/* DRAWER TOP BAR */}
                <div className="px-6 py-4 border-b dark:border-white/10 border-zinc-200 flex items-center justify-between shrink-0 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-xs">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-black tracking-tight dark:text-white">Accounts Payable Terminal</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-synos-primary/10 text-synos-primary border border-synos-primary/20">
                                    Reception Desk
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 font-medium">Record petty operational expenses, inward vendor invoices, and facility overheads.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* LIVE vs 7D Toggle */}
                        <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800/80 p-1 rounded-xl border dark:border-white/5 border-zinc-300">
                            <button
                                onClick={() => setTimeRange('today')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    timeRange === 'today'
                                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                LIVE (Today)
                            </button>
                            <button
                                onClick={() => setTimeRange('7d')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    timeRange === '7d'
                                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                HISTORY (7D)
                            </button>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl border dark:border-white/10 border-zinc-300 dark:hover:bg-zinc-800 hover:bg-zinc-200 transition-colors cursor-pointer"
                            title="Close Terminal (Esc)"
                        >
                            <X className="w-5 h-5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* DRAFT RESUMED BANNER */}
                {hasDraftLoaded && (
                    <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
                        <div className="flex items-center gap-2 font-bold">
                            <BookmarkCheck className="w-4 h-4 text-amber-500" />
                            <span>In-progress draft restored. You can continue recording or discard.</span>
                        </div>
                        <button
                            onClick={discardDraft}
                            className="text-[11px] font-black uppercase tracking-wider underline hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
                        >
                            Discard Draft
                        </button>
                    </div>
                )}

                {/* SCROLLABLE TERMINAL CANVAS */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                    {/* ARGON-STYLE VISUAL METRICS HERO (CONCEPT ADAPTATION) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* 1. NET CONFIRMED OUTFLOW */}
                        <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    {timeRange === 'today' ? "Today's Net Outflow" : "7-Day Total Outflow"}
                                </span>
                                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    <IndianRupee className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-zinc-400">₹</span>
                                    <span className="text-2xl font-black tracking-tight dark:text-white">
                                        {metrics.netOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                                    <span className="font-bold text-zinc-600 dark:text-zinc-300">{metrics.totalCount}</span> Confirmed records by you
                                </p>
                            </div>
                        </div>

                        {/* 2. SPLIT CASH DRAWER DISBURSED */}
                        <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cash Drawer Outflow</span>
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <Wallet className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-zinc-400">₹</span>
                                    <span className="text-2xl font-black tracking-tight text-emerald-500">
                                        {metrics.cashOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {/* Capsule Progress Slider */}
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                                        <span>Cash Drawer Share</span>
                                        <span>{cashPercent}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                                            style={{ width: `${cashPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. DIGITAL / UPI PAYOUTS */}
                        <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">UPI & Digital Payouts</span>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    <QrCode className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-zinc-400">₹</span>
                                    <span className="text-2xl font-black tracking-tight text-blue-500">
                                        {metrics.digitalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {/* Capsule Progress Slider */}
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                                        <span>Digital Share</span>
                                        <span>{digitalPercent}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                                            style={{ width: `${digitalPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. PENDING INWARD DUES */}
                        <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Unsettled Dues / Payables</span>
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    <Clock className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-zinc-400">₹</span>
                                    <span className="text-2xl font-black tracking-tight text-amber-500">
                                        {metrics.pendingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1">
                                    Accrued obligations awaiting settlement
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 7-DAY MINI HISTORY CAPSULE (When in 7D mode) */}
                    {timeRange === '7d' && metrics.dailyHistory && metrics.dailyHistory.length > 0 && (
                        <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm">
                            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-synos-primary" />
                                7-Day Outflow Velocity
                            </h4>
                            <div className="grid grid-cols-7 gap-2">
                                {metrics.dailyHistory.map((day, idx) => (
                                    <div key={idx} className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 border dark:border-white/5 border-zinc-200 flex flex-col items-center text-center">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase">{day.dayLabel}</span>
                                        <span className="text-sm font-black mt-1 dark:text-white">₹{day.outflow.toLocaleString()}</span>
                                        <span className="text-[9px] text-zinc-500 mt-0.5">{day.count} records</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SPLIT WORKBENCH: LEFT ENTRY FORM (45%), RIGHT LIVE LOG (55%) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT: EXPENSE ENTRY TERMINAL */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm space-y-5">
                                {/* Segmented Mode Switcher */}
                                <div className="flex items-center justify-between border-b dark:border-white/10 border-zinc-200 pb-4">
                                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setActiveSection('petty')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                                activeSection === 'petty'
                                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            )}
                                        >
                                            <Coffee className="w-3.5 h-3.5" />
                                            Petty Cash
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveSection('vendor')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                                activeSection === 'vendor'
                                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            )}
                                        >
                                            <Building2 className="w-3.5 h-3.5" />
                                            Vendor Inward
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveSection('overhead')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                                activeSection === 'overhead'
                                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                            )}
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                            Overheads
                                        </button>
                                    </div>

                                    {form.amount && (
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            Auto-Saving Draft
                                        </span>
                                    )}
                                </div>

                                {/* Form Body */}
                                <form onSubmit={handleSubmitExpense} className="space-y-4">
                                    {/* Quick Preset Chips for Petty Cash */}
                                    {activeSection === 'petty' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Operational Presets</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {pettyPresets.map(preset => {
                                                    const Icon = preset.icon;
                                                    const isSelected = form.category === preset.category;
                                                    return (
                                                        <button
                                                            key={preset.category}
                                                            type="button"
                                                            onClick={() => {
                                                                saveDraft({
                                                                    ...form,
                                                                    category: preset.category,
                                                                    description: form.description || preset.defaultDesc
                                                                });
                                                            }}
                                                            className={cn(
                                                                "p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer",
                                                                isSelected 
                                                                    ? "bg-synos-primary/10 border-synos-primary text-synos-primary font-bold shadow-xs" 
                                                                    : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                            )}
                                                        >
                                                            <Icon className="w-4 h-4 shrink-0" />
                                                            <span className="text-xs truncate">{preset.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Presets for Monthly Overheads */}
                                    {activeSection === 'overhead' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Facility Utilities</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {overheadPresets.map(preset => (
                                                    <button
                                                        key={preset.label}
                                                        type="button"
                                                        onClick={() => {
                                                            saveDraft({
                                                                ...form,
                                                                category: preset.category,
                                                                description: preset.defaultDesc
                                                            });
                                                        }}
                                                        className={cn(
                                                            "p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer",
                                                            form.category === preset.category
                                                                ? "bg-synos-primary/10 border-synos-primary text-synos-primary font-bold shadow-xs" 
                                                                : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                        )}
                                                    >
                                                        <Zap className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs truncate">{preset.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Vendor Inward Specific Fields */}
                                    {activeSection === 'vendor' && (
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Select Vendor / Supplier</label>
                                                <select
                                                    value={form.vendorId}
                                                    onChange={(e) => saveDraft({ ...form, vendorId: e.target.value, category: 'Vendor' })}
                                                    className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-synos-primary dark:text-white"
                                                    required
                                                >
                                                    <option value="">-- Choose Vendor --</option>
                                                    {vendors.map(v => (
                                                        <option key={v.vendorId} value={v.vendorId}>
                                                            {v.vendorName} ({v.category || 'Reagents & Supplies'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Invoice / Challan Reference #</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. INV-2026-8891"
                                                    value={form.invoiceNumber}
                                                    onChange={(e) => saveDraft({ ...form, invoiceNumber: e.target.value })}
                                                    className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-synos-primary dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Amount Input */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Disbursement / Bill Amount (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">₹</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                value={form.amount}
                                                onChange={(e) => saveDraft({ ...form, amount: e.target.value })}
                                                className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-2xl pl-10 pr-4 py-3 text-xl font-black outline-none focus:ring-2 focus:ring-synos-primary transition-all dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Description & Purpose</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="What was this expense for?"
                                            value={form.description}
                                            onChange={(e) => saveDraft({ ...form, description: e.target.value })}
                                            className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-synos-primary dark:text-white"
                                        />
                                    </div>

                                    {/* Payment Method / Settlement Mode */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Payment Mode</label>
                                            {activeSection === 'vendor' && (
                                                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.isSettledNow}
                                                        onChange={(e) => saveDraft({ ...form, isSettledNow: e.target.checked })}
                                                        className="rounded text-synos-primary focus:ring-0"
                                                    />
                                                    <span>Disburse Immediately</span>
                                                </label>
                                            )}
                                        </div>

                                        {form.isSettledNow && (
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'Cash', label: 'Cash Drawer', icon: Wallet },
                                                    { id: 'UPI', label: 'UPI / Scan', icon: QrCode },
                                                    { id: 'BankTransfer', label: 'Bank / Card', icon: CreditCard }
                                                ].map(mode => {
                                                    const Icon = mode.icon;
                                                    const isSelected = form.paymentMethod === mode.id;
                                                    return (
                                                        <button
                                                            key={mode.id}
                                                            type="button"
                                                            onClick={() => saveDraft({ ...form, paymentMethod: mode.id })}
                                                            className={cn(
                                                                "py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer",
                                                                isSelected
                                                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs font-bold"
                                                                    : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                            )}
                                                        >
                                                            <Icon className="w-3.5 h-3.5" />
                                                            <span className="text-[10px]">{mode.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !form.amount || parseFloat(form.amount) <= 0}
                                        className="w-full bg-synos-primary text-white font-black py-3.5 rounded-xl shadow-lg shadow-synos-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Authorizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Authorize & Record Disbursement</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT: LIVE RECORDED STREAM & CORRECTION HUB */}
                        <div className="lg:col-span-7 space-y-4 flex flex-col">
                            <div className="p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex-1 flex flex-col min-h-0 space-y-4">
                                <div className="flex items-center justify-between border-b dark:border-white/10 border-zinc-200 pb-3">
                                    <div>
                                        <h3 className="text-sm font-black dark:text-white tracking-tight flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-synos-primary" />
                                            <span>{timeRange === 'today' ? "Today's Recorded Outflows" : "7-Day Recorded History"}</span>
                                        </h3>
                                        <p className="text-[11px] text-zinc-400">Strictly scoped to your station. Editable and cancellable with audit trail.</p>
                                    </div>

                                    <div className="relative w-48">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Search entries..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Feed Items List */}
                                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[520px]">
                                    {isLoading ? (
                                        <div className="p-8 text-center text-zinc-400 space-y-2">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-synos-primary" />
                                            <p className="text-xs">Fetching recorded outflows...</p>
                                        </div>
                                    ) : filteredFeed.length === 0 ? (
                                        <div className="p-12 text-center text-zinc-400 space-y-2 border border-dashed dark:border-white/10 border-zinc-200 rounded-xl">
                                            <Coffee className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
                                            <p className="text-xs font-bold dark:text-zinc-300 text-zinc-700">No expenses recorded yet {timeRange === 'today' ? 'today' : 'in the last 7 days'}.</p>
                                            <p className="text-[11px] text-zinc-400">Use the terminal on the left to record tea, courier, supplies, or vendor bills.</p>
                                        </div>
                                    ) : (
                                        filteredFeed.map(item => {
                                            const isCancelled = item.status === 'Cancelled';
                                            const isSettled = item.status === 'Settled';
                                            const amountDisplay = item.amountPaid > 0 ? item.amountPaid : item.amountDue;

                                            return (
                                                <div 
                                                    key={item.id}
                                                    className={cn(
                                                        "p-4 rounded-xl border transition-all flex items-center justify-between gap-4",
                                                        isCancelled 
                                                            ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 opacity-60" 
                                                            : "bg-zinc-50 dark:bg-white/5 border-zinc-200/80 dark:border-white/5 hover:border-synos-primary/30"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={cn(
                                                            "p-2.5 rounded-xl border shrink-0",
                                                            isCancelled
                                                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10"
                                                        )}>
                                                            {item.category === 'Tea' ? <Coffee className="w-4 h-4" /> :
                                                             item.category === 'Courier' ? <Truck className="w-4 h-4" /> :
                                                             item.category === 'Repairs' ? <Wrench className="w-4 h-4" /> :
                                                             item.category === 'Cleaning' ? <Sparkles className="w-4 h-4" /> :
                                                             item.category === 'Power' || item.category === 'Internet' ? <Zap className="w-4 h-4" /> :
                                                             <Receipt className="w-4 h-4" />}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className={cn("text-xs font-black truncate", isCancelled ? "line-through text-zinc-400" : "dark:text-white")}>
                                                                    {item.description || item.category}
                                                                </h4>
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                                    isCancelled ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                                    isSettled ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                                    "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                                )}>
                                                                    {item.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                                                                <span className="font-bold text-zinc-500">{item.paymentMethod || 'Cash'}</span>
                                                                <span>•</span>
                                                                <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                <span>•</span>
                                                                <span className="truncate">{item.category}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <span className={cn(
                                                                "text-sm font-black",
                                                                isCancelled ? "line-through text-zinc-400" : "dark:text-white text-zinc-900"
                                                            )}>
                                                                ₹{amountDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <p className="text-[10px] text-zinc-400">
                                                                {isSettled ? 'Disbursed' : 'Obligation Due'}
                                                            </p>
                                                        </div>

                                                        {!isCancelled && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleOpenCorrection(item)}
                                                                    className="p-1.5 rounded-lg border dark:border-white/10 border-zinc-200 text-zinc-500 hover:text-synos-primary hover:bg-synos-primary/10 transition-colors cursor-pointer"
                                                                    title="Correct Expense Entry"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenCancellation(item)}
                                                                    className="p-1.5 rounded-lg border dark:border-white/10 border-zinc-200 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                                    title="Cancel & Revert Disbursement"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODAL 1: CORRECTION MODAL (Intent-Style Before & After) */}
                {correctionTarget && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border dark:border-white/10 border-zinc-200 overflow-hidden animate-in zoom-in-95">
                            <div className="p-5 border-b dark:border-white/10 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-synos-primary/10 text-synos-primary">
                                        <Edit3 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black dark:text-white">Correct Recorded Expense</h3>
                                        <p className="text-[10px] text-zinc-400">Edits create an immutable audit record and adjust ledger facts.</p>
                                    </div>
                                </div>
                                <button onClick={() => setCorrectionTarget(null)} className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800">
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCorrection} className="p-6 space-y-4">
                                {/* Before vs After Comparison */}
                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-white/5 border dark:border-white/5 border-zinc-200">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-zinc-400">Current Amount</span>
                                        <p className="text-base font-black text-zinc-600 dark:text-zinc-300">
                                            ₹{(correctionTarget.amountPaid > 0 ? correctionTarget.amountPaid : correctionTarget.amountDue).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-synos-primary">Corrected Amount</span>
                                        <div className="relative mt-0.5">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={correctionForm.newAmount}
                                                onChange={(e) => setCorrectionForm({ ...correctionForm, newAmount: e.target.value })}
                                                className="w-full bg-white dark:bg-zinc-800 border dark:border-white/10 border-zinc-300 rounded-lg pl-6 pr-2 py-1 text-sm font-black outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Corrected Description</label>
                                    <input
                                        type="text"
                                        value={correctionForm.newDescription}
                                        onChange={(e) => setCorrectionForm({ ...correctionForm, newDescription: e.target.value })}
                                        className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Mandatory Reason for Correction *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Typo in amount, vendor billed ₹250 instead of ₹350"
                                        value={correctionForm.reason}
                                        onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                                        className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setCorrectionTarget(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !correctionForm.reason.trim()}
                                        className="px-5 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Apply Correction'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: CANCELLATION MODAL */}
                {cancellationTarget && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border dark:border-white/10 border-zinc-200 overflow-hidden animate-in zoom-in-95">
                            <div className="p-5 border-b dark:border-white/10 border-zinc-200 flex items-center justify-between bg-rose-50/50 dark:bg-rose-500/10">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                                        <Trash2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black dark:text-white">Cancel & Revert Expense</h3>
                                        <p className="text-[10px] text-zinc-400">Restores cash drawer and records audit fact.</p>
                                    </div>
                                </div>
                                <button onClick={() => setCancellationTarget(null)} className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800">
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCancellation} className="p-6 space-y-4">
                                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 border dark:border-white/5 border-zinc-200 text-xs space-y-1">
                                    <p className="font-bold dark:text-white">{cancellationTarget.description}</p>
                                    <p className="text-zinc-500">
                                        Amount: <span className="font-bold text-rose-500">₹{(cancellationTarget.amountPaid > 0 ? cancellationTarget.amountPaid : cancellationTarget.amountDue).toLocaleString()}</span>
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Mandatory Reason for Cancellation *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Courier cancelled, tea vendor did not deliver"
                                        value={cancellationForm.reason}
                                        onChange={(e) => setCancellationForm({ ...cancellationForm, reason: e.target.value })}
                                        className="w-full bg-zinc-100 dark:bg-white/5 border dark:border-white/10 border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    />
                                </div>

                                <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer pt-1">
                                    <input
                                        type="checkbox"
                                        checked={cancellationForm.refundToDrawer}
                                        onChange={(e) => setCancellationForm({ ...cancellationForm, refundToDrawer: e.target.checked })}
                                        className="rounded text-rose-500 focus:ring-0"
                                    />
                                    <span>Restore physical cash back to Reception Cash Drawer</span>
                                </label>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setCancellationTarget(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                        Keep Expense
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !cancellationForm.reason.trim()}
                                        className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
