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
    ShieldAlert,
    BarChart3,
    History,
    ArrowRight,
    SlidersHorizontal,
    PieChart
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const DRAFT_STORAGE_KEY = 'synos_reception_expense_draft';

export function ReceptionExpenseDrawer({ isOpen, onClose }) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Primary Drawer Navigation Tabs: 'record' | 'history' | 'metrics'
    const [activeTab, setActiveTab] = useState('record');
    
    // Sub-mode for Recording: 'petty' | 'vendor' | 'overhead'
    const [outflowMode, setOutflowMode] = useState('petty');

    // Time filter for History & Metrics: 'today' | '7d'
    const [historyRange, setHistoryRange] = useState('today');

    // Live Feed & Metrics State
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
        { label: 'Courier & Logistics', icon: Truck, category: 'Courier', defaultDesc: 'Diagnostic Specimen Logistics' },
        { label: 'Cleaning & Housekeeping', icon: Sparkles, category: 'Cleaning', defaultDesc: 'Lab Disinfectants & Supplies' },
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
                    if (parsed.outflowMode) setOutflowMode(parsed.outflowMode);
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
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...updatedForm, outflowMode }));
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

    // Load Feed & Live ERP Vendors
    const loadFeed = useCallback(async () => {
        if (!isOpen) return;
        try {
            setIsLoading(true);
            const userId = user?.id || localStorage.getItem('synos_user_id');
            const [feedData, vendorList] = await Promise.all([
                FinanceApi.getReceptionExpensesFeed(historyRange, userId),
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

            // Normalize vendor objects from ERP database (ImsSupplier has supplierId, name, category)
            const normalizedVendors = (vendorList || []).map(v => ({
                id: v.supplierId || v.SupplierId || v.vendorId || v.VendorId,
                name: v.name || v.Name || v.vendorName || v.VendorName || 'Unknown Vendor',
                category: v.category || v.Category || 'Reagents & Supplies',
                taxId: v.taxId || v.TaxId || ''
            }));
            setVendors(normalizedVendors);
        } catch (err) {
            console.error('Failed to load reception expense feed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, historyRange, user?.id]);

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
        e?.preventDefault();
        const amt = parseFloat(form.amount);
        if (!amt || amt <= 0) {
            alert('Please enter a valid disbursement amount.');
            return;
        }

        try {
            setIsSubmitting(true);

            if (outflowMode === 'vendor') {
                // Record Inward Vendor Bill into ERP (Payables & Inventory Suppliers)
                const selectedVendor = vendors.find(v => v.id === form.vendorId);
                await FinanceApi.createVendorPayable({
                    vendorId: form.vendorId || null,
                    vendorName: selectedVendor ? selectedVendor.name : (form.description || 'Vendor'),
                    amount: amt,
                    invoiceNumber: form.invoiceNumber,
                    description: form.description || 'Diagnostic Reagents & Consumables',
                    isSettledNow: form.isSettledNow,
                    paymentMethod: form.paymentMethod
                });
            } else {
                // Operational Petty Cash or Facility Overhead
                if (form.isSettledNow) {
                    await FinanceApi.recordDailyExpense({
                        category: form.category,
                        amount: amt,
                        description: form.description || (outflowMode === 'petty' ? 'Petty Operational Outflow' : 'Facility Overhead'),
                        paymentMethod: form.paymentMethod
                    });
                } else {
                    await FinanceApi.createOverheadExpense({
                        category: form.category,
                        amount: amt,
                        description: form.description,
                        expenseDate: new Date().toISOString(),
                        userId: user?.id || localStorage.getItem('synos_user_id')
                    });
                }
            }

            // Reset draft and reload
            discardDraft();
            await loadFeed();
            setActiveTab('history');
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
            (item.status && item.status.toLowerCase().includes(q)) ||
            (item.vendorName && item.vendorName.toLowerCase().includes(q))
        );
    }, [feedItems, searchQuery]);

    // Percentage splits for progress bars
    const cashPercent = metrics.netOutflow > 0 ? Math.round((metrics.cashOutflow / metrics.netOutflow) * 100) : 0;
    const digitalPercent = metrics.netOutflow > 0 ? Math.round((metrics.digitalOutflow / metrics.netOutflow) * 100) : 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in">
            {/* Absolute Drawer matching IntentPanel: 80% screen width */}
            <div 
                className={cn(
                    "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[82vw] 2xl:w-[80vw] max-w-[1780px] h-full flex flex-col overflow-hidden rounded-2xl shadow-2xl border-l transition-[width,transform,opacity] duration-300 ease-out z-30",
                    isDark 
                        ? "bg-zinc-950 border-white/10 text-zinc-100" 
                        : "bg-slate-100 border-slate-300 text-zinc-900"
                )}
            >
                {/* 1. NATIVE INTENTPANEL HEADER */}
                <div className="h-14 xl:h-16 flex items-center justify-between px-6 shrink-0 border-b dark:border-white/10 border-slate-200 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg xl:text-xl font-bold tracking-tight flex items-baseline gap-2 dark:text-white text-zinc-900">
                            Accounts Payable Terminal
                            <span className="text-xs font-mono font-normal opacity-60">
                                #EXP-RECEPTION
                            </span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status chip */}
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-synos-primary/10 text-synos-primary border border-synos-primary/20">
                            Station: Reception Desk
                        </span>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-2 rounded-full transition-all duration-200 active:scale-95 cursor-pointer",
                                isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                            )}
                            title="Close Terminal (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. THREE-TAB INTENTPANEL NAVIGATION */}
                <div className="px-6 py-2 border-b dark:border-white/10 border-slate-200 bg-white/40 dark:bg-zinc-900/40 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800/80">
                        <button
                            onClick={() => setActiveTab('record')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                activeTab === 'record'
                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-black"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>1 Record Expense</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                activeTab === 'history'
                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-black"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <History className="w-3.5 h-3.5" />
                            <span>2 Live & 7D History</span>
                            {metrics.totalCount > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-synos-primary/10 text-synos-primary font-mono font-bold">
                                    {metrics.totalCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('metrics')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                activeTab === 'metrics'
                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-black"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>3 Visual Metrics (Argon)</span>
                        </button>
                    </div>

                    {/* In-progress draft indicator */}
                    {hasDraftLoaded && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                                <BookmarkCheck className="w-3.5 h-3.5" />
                                Draft Auto-Saved
                            </span>
                            <button
                                onClick={discardDraft}
                                className="text-xs font-bold uppercase text-zinc-400 hover:text-rose-500 underline transition-colors cursor-pointer"
                            >
                                Discard
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. TAB 1: NATIVE INTENTPANEL RECORD EXPENSE WORKBENCH */}
                {activeTab === 'record' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
                            {/* BLOCK 1: EXPENSE CLASSIFICATION (3 WIDE CARDS MATCHING BILLING & PAYER MODE) */}
                            <div className="p-3.5 rounded-2xl border transition-all shadow-xs bg-white dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                        1 Expense Classification & Stream
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        Select context to configure vendor & ledger attribution
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Card 1: Petty Operational Cash */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOutflowMode('petty');
                                            saveDraft({ ...form, category: 'Tea' });
                                        }}
                                        className={cn(
                                            "p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer",
                                            outflowMode === 'petty'
                                                ? "border-synos-primary bg-synos-primary/5 shadow-xs ring-1 ring-synos-primary"
                                                : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100"
                                        )}
                                    >
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                                            <Coffee className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black dark:text-white">Petty Operational Cash</span>
                                                {outflowMode === 'petty' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-0.5">Tea, logistics, housekeeping, quick repairs, stationery</p>
                                        </div>
                                    </button>

                                    {/* Card 2: Inward Vendor Bill */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOutflowMode('vendor');
                                            saveDraft({ ...form, category: 'Vendor' });
                                        }}
                                        className={cn(
                                            "p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer",
                                            outflowMode === 'vendor'
                                                ? "border-synos-primary bg-synos-primary/5 shadow-xs ring-1 ring-synos-primary"
                                                : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100"
                                        )}
                                    >
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black dark:text-white">Inward Vendor Bill</span>
                                                {outflowMode === 'vendor' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-0.5">Diagnostic reagents, lab consumables, kits & supplies</p>
                                        </div>
                                    </button>

                                    {/* Card 3: Facility Overheads */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOutflowMode('overhead');
                                            saveDraft({ ...form, category: 'Power' });
                                        }}
                                        className={cn(
                                            "p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer",
                                            outflowMode === 'overhead'
                                                ? "border-synos-primary bg-synos-primary/5 shadow-xs ring-1 ring-synos-primary"
                                                : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-100"
                                        )}
                                    >
                                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black dark:text-white">Facility Overheads</span>
                                                {outflowMode === 'overhead' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-0.5">Electricity grid, broadband fiber, waste disposal, rent</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* BLOCK 2: 2-COLUMN INTENT GRID (7 COLS / 5 COLS RATIO MATCHING SCREENSHOT 4) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                {/* LEFT COLUMN (7 COLS): OUTFLOW PARTICULARS */}
                                <div className="lg:col-span-7 space-y-4">
                                    <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 space-y-4 shadow-xs">
                                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-slate-200 pb-3">
                                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                                2 Outflow Particulars
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                {outflowMode === 'petty' ? 'Operational' : outflowMode === 'vendor' ? 'Inventory Supplier' : 'Utility'}
                                            </span>
                                        </div>

                                        {/* Petty Cash Presets */}
                                        {outflowMode === 'petty' && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">Operational Presets</label>
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
                                                                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
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

                                        {/* Facility Overhead Presets */}
                                        {outflowMode === 'overhead' && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">Facility Utilities</label>
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
                                                                    : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                                                )}
                                                        >
                                                            <Zap className="w-4 h-4 shrink-0" />
                                                            <span className="text-xs truncate">{preset.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Vendor Inward Fields - Connected to Real ERP Suppliers */}
                                        {outflowMode === 'vendor' && (
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                                                            Select Vendor / Supplier (Live ERP Database)
                                                        </label>
                                                        <span className="text-xs text-synos-primary font-bold">
                                                            {vendors.length} Verified Suppliers Loaded
                                                        </span>
                                                    </div>
                                                    <select
                                                        value={form.vendorId}
                                                        onChange={(e) => {
                                                            const chosen = vendors.find(v => v.id === e.target.value);
                                                            saveDraft({ 
                                                                ...form, 
                                                                vendorId: e.target.value,
                                                                description: chosen ? `Inward Reagent Supplies: ${chosen.name}` : form.description
                                                            });
                                                        }}
                                                        className="w-full bg-slate-50 dark:bg-zinc-800/60 border dark:border-zinc-700 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-synos-primary dark:text-white"
                                                        required
                                                    >
                                                        <option value="">-- Choose Vendor / Supplier --</option>
                                                        {vendors.map(v => (
                                                            <option key={v.id} value={v.id}>
                                                                {v.name} &bull; {v.category} {v.taxId ? `[GST: ${v.taxId}]` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                                                        Inward Invoice / Challan Reference #
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. INV-2026-9042 or DC-4412"
                                                        value={form.invoiceNumber}
                                                        onChange={(e) => saveDraft({ ...form, invoiceNumber: e.target.value })}
                                                        className="w-full bg-slate-50 dark:bg-zinc-800/60 border dark:border-zinc-700 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-synos-primary dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Amount Field */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                                                Disbursement / Bill Amount (₹) *
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-zinc-400">₹</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    placeholder="0.00"
                                                    value={form.amount}
                                                    onChange={(e) => saveDraft({ ...form, amount: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-zinc-800/60 border dark:border-zinc-700 border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-2xl font-black outline-none focus:ring-2 focus:ring-synos-primary transition-all dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                                                Description & Operational Purpose
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Courier charges for biopsy sample dispatch"
                                                value={form.description}
                                                onChange={(e) => saveDraft({ ...form, description: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-zinc-800/60 border dark:border-zinc-700 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-synos-primary dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN (5 COLS): SETTLEMENT & FINANCIALS (MATCHING INTENTPANEL FINANCIALS BLOCK) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 space-y-4 shadow-xs sticky top-2">
                                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-slate-200 pb-3">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                                3 Settlement & Financials
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                {form.isSettledNow ? 'Immediate Disburse' : 'Accrue Obligation'}
                                            </span>
                                        </div>

                                        {/* Large Net Bill Total */}
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border dark:border-white/5 border-slate-200 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">Net Amount</span>
                                                <p className="text-xs text-zinc-400">Ledger Impact</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-synos-primary">
                                                    ₹{form.amount ? parseFloat(form.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Settlement Options */}
                                        {outflowMode === 'vendor' && (
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border dark:border-white/5 border-slate-200 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold dark:text-white">Settle Invoice Now?</p>
                                                    <p className="text-xs text-zinc-400">Uncheck to log as unpaid accounts payable</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={form.isSettledNow}
                                                    onChange={(e) => saveDraft({ ...form, isSettledNow: e.target.checked })}
                                                    className="w-4 h-4 rounded text-synos-primary focus:ring-0 cursor-pointer"
                                                />
                                            </div>
                                        )}

                                        {/* Payment Modes */}
                                        {form.isSettledNow && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">Disbursement Channel</label>
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
                                                                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                                                )}
                                                            >
                                                                <Icon className="w-4 h-4" />
                                                                <span className="text-xs font-semibold">{mode.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Cash Drawer Preview */}
                                        <div className="p-3.5 rounded-xl border border-dashed dark:border-zinc-800 border-slate-300 text-xs space-y-1">
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Disbursed By:</span>
                                                <span className="font-bold text-zinc-600 dark:text-zinc-300">{user?.name || 'Reception Staff'}</span>
                                            </div>
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Channel Destination:</span>
                                                <span className="font-bold text-zinc-600 dark:text-zinc-300">{form.paymentMethod}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NATIVE INTENTPANEL FIXED FOOTER */}
                        <div className="px-6 py-3.5 border-t dark:border-white/10 border-slate-200 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                {hasDraftLoaded && (
                                    <button
                                        type="button"
                                        onClick={discardDraft}
                                        className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    >
                                        Delete Draft
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitExpense}
                                    disabled={isSubmitting || !form.amount || parseFloat(form.amount) <= 0}
                                    className="px-6 py-3 rounded-xl bg-synos-primary text-white text-xs font-black shadow-lg shadow-synos-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Recording...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Authorize & Disburse ₹{form.amount ? parseFloat(form.amount).toLocaleString() : '0'}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. TAB 2: LIVE & 7D HISTORY AUDIT FEED */}
                {activeTab === 'history' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6 space-y-4">
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setHistoryRange('today')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        historyRange === 'today' ? "bg-synos-primary text-white" : "text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    Live (Today)
                                </button>
                                <button
                                    onClick={() => setHistoryRange('7d')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        historyRange === '7d' ? "bg-synos-primary text-white" : "text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    Past 7 Days
                                </button>
                            </div>

                            <div className="relative w-64">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search vendor, category, reason..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 border dark:border-white/10 border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Feed Table */}
                        <div className="flex-1 overflow-y-auto rounded-2xl border dark:border-zinc-800 border-slate-200 bg-white dark:bg-zinc-900 shadow-xs">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-zinc-800/80 border-b dark:border-zinc-800 border-slate-200 text-slate-600 dark:text-zinc-400 uppercase text-xs font-bold sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="p-3.5">Time</th>
                                        <th className="p-3.5">Stream / Category</th>
                                        <th className="p-3.5">Description / Vendor</th>
                                        <th className="p-3.5">Disbursed Amount</th>
                                        <th className="p-3.5">Channel</th>
                                        <th className="p-3.5">Status</th>
                                        <th className="p-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-zinc-800/60 divide-slate-200">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-zinc-400">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-synos-primary mb-2" />
                                                <span className="text-xs">Loading recorded outflows from ERP ledger...</span>
                                            </td>
                                        </tr>
                                    ) : filteredFeed.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-zinc-400 text-xs">
                                                No expenses recorded for this period. Use the "1 Record Expense" tab to log disbursements.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredFeed.map(item => {
                                            const isCancelled = item.status === 'Cancelled';
                                            const isSettled = item.status === 'Settled';
                                            const amountDisplay = item.amountPaid > 0 ? item.amountPaid : item.amountDue;

                                            return (
                                                <tr key={item.id} className={cn("hover:bg-slate-50 dark:hover:bg-white/5 transition-colors", isCancelled && "opacity-50 line-through")}>
                                                    <td className="p-3.5 whitespace-nowrap text-zinc-500 font-mono text-xs font-medium">
                                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap">
                                                        <span className="font-bold dark:text-zinc-200 text-zinc-800 text-xs sm:text-sm">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 max-w-xs truncate font-medium dark:text-zinc-300 text-zinc-700 text-xs sm:text-sm">
                                                        {item.description}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap font-black text-sm">
                                                        ₹{amountDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap text-zinc-500 font-bold text-xs">
                                                        {item.paymentMethod || 'Cash'}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border",
                                                            isCancelled ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                            isSettled ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                            "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                        )}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-right whitespace-nowrap">
                                                        {!isCancelled && (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleOpenCorrection(item)}
                                                                    className="px-2.5 py-1 rounded-lg border dark:border-white/10 border-slate-200 text-zinc-600 hover:text-synos-primary hover:bg-synos-primary/10 transition-colors text-xs font-bold cursor-pointer"
                                                                >
                                                                    Correct
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenCancellation(item)}
                                                                    className="px-2.5 py-1 rounded-lg border dark:border-white/10 border-slate-200 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 transition-colors text-xs font-bold cursor-pointer"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. TAB 3: DEDICATED ARGON-STYLE VISUAL METRICS DASHBOARD */}
                {activeTab === 'metrics' && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                        {/* Period Filter for Metrics */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black dark:text-white tracking-tight flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-synos-primary" />
                                    <span>Argon Visual Analytics & Outflow Intelligence</span>
                                </h3>
                                <p className="text-xs text-zinc-400 font-medium">Real-time spend velocity, liquidity distribution, and ERP payable trends.</p>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-zinc-800/80 p-1 rounded-xl">
                                <button
                                    onClick={() => setHistoryRange('today')}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        historyRange === 'today' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
                                    )}
                                >
                                    Today's Velocity
                                </button>
                                <button
                                    onClick={() => setHistoryRange('7d')}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        historyRange === '7d' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
                                    )}
                                >
                                    7-Day Aggregate
                                </button>
                            </div>
                        </div>

                        {/* Top Argon Neo-Glass Hero Metric Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Card 1: Total Confirmed Outflow */}
                            <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Confirmed Outflow</span>
                                    <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                        <TrendingDown className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-zinc-400">₹</span>
                                        <span className="text-3xl font-black tracking-tight dark:text-white text-zinc-900">
                                            {metrics.netOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        <b className="text-zinc-600 dark:text-zinc-200">{metrics.totalCount}</b> confirmed transactions logged
                                    </p>
                                </div>
                            </div>

                            {/* Card 2: Cash Drawer Liquidity Outflow */}
                            <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cash Drawer Share</span>
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-zinc-400">₹</span>
                                        <span className="text-3xl font-black tracking-tight text-emerald-500">
                                            {metrics.cashOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-xs font-semibold text-zinc-500">
                                            <span>Physical Currency</span>
                                            <span>{cashPercent}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                                                style={{ width: `${cashPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Digital & UPI Payouts */}
                            <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Digital / UPI Share</span>
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                        <QrCode className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-zinc-400">₹</span>
                                        <span className="text-3xl font-black tracking-tight text-blue-500">
                                            {metrics.digitalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-xs font-semibold text-zinc-500">
                                            <span>Bank / QR Transfers</span>
                                            <span>{digitalPercent}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                                                style={{ width: `${digitalPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Accrued Unpaid Dues */}
                            <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Unsettled Inward Dues</span>
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-zinc-400">₹</span>
                                        <span className="text-3xl font-black tracking-tight text-amber-500">
                                            {metrics.pendingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Accounts payable pending batch settlement
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mid Row: 7-Day Velocity Chart & Stream Category Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* 7-Day Velocity Bars (7 cols) */}
                            <div className="lg:col-span-7 p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b dark:border-white/10 border-slate-200 pb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-synos-primary" />
                                        7-Day Spend Trajectory
                                    </span>
                                    <span className="text-xs font-semibold text-zinc-500">
                                        Daily Disbursed Volatility
                                    </span>
                                </div>

                                <div className="grid grid-cols-7 gap-3 pt-4">
                                    {(metrics.dailyHistory && metrics.dailyHistory.length > 0 ? metrics.dailyHistory : [
                                        { dayLabel: 'Mon', outflow: 0, count: 0 },
                                        { dayLabel: 'Tue', outflow: 0, count: 0 },
                                        { dayLabel: 'Wed', outflow: 0, count: 0 },
                                        { dayLabel: 'Thu', outflow: 0, count: 0 },
                                        { dayLabel: 'Fri', outflow: 0, count: 0 },
                                        { dayLabel: 'Sat', outflow: 0, count: 0 },
                                        { dayLabel: 'Sun', outflow: 0, count: 0 }
                                    ]).map((day, idx) => {
                                        const maxOutflow = Math.max(...(metrics.dailyHistory || []).map(d => d.outflow), 1000);
                                        const barHeightPercent = Math.min(Math.round((day.outflow / maxOutflow) * 100), 100);

                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-2">
                                                <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-zinc-800/60 flex flex-col justify-end p-1.5 relative group">
                                                    <div 
                                                        className="w-full bg-gradient-to-t from-synos-primary to-cyan-400 rounded-lg transition-all duration-500"
                                                        style={{ height: `${Math.max(barHeightPercent, 6)}%` }}
                                                    />
                                                    {/* Tooltip on hover */}
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        ₹{day.outflow.toLocaleString()}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-zinc-500 uppercase">{day.dayLabel}</span>
                                                <span className="text-xs font-bold dark:text-white text-zinc-900">₹{day.outflow.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Category Distribution Breakdown (5 cols) */}
                            <div className="lg:col-span-5 p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b dark:border-white/10 border-slate-200 pb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                                        <PieChart className="w-4 h-4 text-synos-primary" />
                                        Category Allocation
                                    </span>
                                    <span className="text-xs font-semibold text-zinc-500">
                                        Outflow Breakdown
                                    </span>
                                </div>

                                <div className="space-y-3 pt-2">
                                    {(metrics.categories && metrics.categories.length > 0 ? metrics.categories : [
                                        { category: 'Petty Cash', amount: 0, count: 0 },
                                        { category: 'Vendor Inward', amount: 0, count: 0 },
                                        { category: 'Overheads', amount: 0, count: 0 }
                                    ]).map((cat, idx) => {
                                        const pct = metrics.netOutflow > 0 ? Math.round((cat.amount / metrics.netOutflow) * 100) : 0;
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-bold dark:text-zinc-200 text-zinc-700">{cat.category}</span>
                                                    <span className="font-black text-synos-primary">₹{cat.amount.toLocaleString()} ({pct}%)</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-synos-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 1: CORRECTION MODAL (Intent-Style Before & After) */}
                {correctionTarget && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border dark:border-white/10 border-slate-200 overflow-hidden animate-in zoom-in-95">
                            <div className="p-5 border-b dark:border-white/10 border-slate-200 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-synos-primary/10 text-synos-primary">
                                        <Edit3 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black dark:text-white">Correct Recorded Expense</h3>
                                        <p className="text-xs text-zinc-400">Edits create an immutable audit record and adjust ledger facts.</p>
                                    </div>
                                </div>
                                <button onClick={() => setCorrectionTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer">
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCorrection} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border dark:border-white/5 border-slate-200">
                                    <div>
                                        <span className="text-xs uppercase font-bold text-zinc-500">Current Amount</span>
                                        <p className="text-base font-black text-zinc-600 dark:text-zinc-300">
                                            ₹{(correctionTarget.amountPaid > 0 ? correctionTarget.amountPaid : correctionTarget.amountDue).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs uppercase font-bold text-synos-primary">Corrected Amount</span>
                                        <div className="relative mt-0.5">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={correctionForm.newAmount}
                                                onChange={(e) => setCorrectionForm({ ...correctionForm, newAmount: e.target.value })}
                                                className="w-full bg-white dark:bg-zinc-800 border dark:border-white/10 border-slate-300 rounded-lg pl-6 pr-2 py-1 text-sm font-black outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">Corrected Description</label>
                                    <input
                                        type="text"
                                        value={correctionForm.newDescription}
                                        onChange={(e) => setCorrectionForm({ ...correctionForm, newDescription: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-white/5 border dark:border-white/10 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase text-rose-500 tracking-wider">Mandatory Reason for Correction *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Typo in amount, vendor billed ₹250 instead of ₹350"
                                        value={correctionForm.reason}
                                        onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-white/5 border dark:border-white/10 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setCorrectionTarget(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
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
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border dark:border-white/10 border-slate-200 overflow-hidden animate-in zoom-in-95">
                            <div className="p-5 border-b dark:border-white/10 border-slate-200 flex items-center justify-between bg-rose-50/50 dark:bg-rose-500/10">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                                        <Trash2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black dark:text-white">Cancel & Revert Expense</h3>
                                        <p className="text-xs text-zinc-400">Restores cash drawer and records audit fact.</p>
                                    </div>
                                </div>
                                <button onClick={() => setCancellationTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer">
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCancellation} className="p-6 space-y-4">
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border dark:border-white/5 border-slate-200 text-xs space-y-1">
                                    <p className="font-bold dark:text-white">{cancellationTarget.description}</p>
                                    <p className="text-zinc-500">
                                        Amount: <span className="font-bold text-rose-500">₹{(cancellationTarget.amountPaid > 0 ? cancellationTarget.amountPaid : cancellationTarget.amountDue).toLocaleString()}</span>
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase text-rose-500 tracking-wider">Mandatory Reason for Cancellation *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Courier cancelled, vendor invoice duplicate"
                                        value={cancellationForm.reason}
                                        onChange={(e) => setCancellationForm({ ...cancellationForm, reason: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-white/5 border dark:border-white/10 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
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
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
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
