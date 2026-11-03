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
    ChevronDown,
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

    // THEME ISOLATION CONTRACT: Style Branching matching IntentPanel
    const ui = isDark ? {
        panel: "bg-zinc-950 border-l border-zinc-800 shadow-2xl z-30",
        header: "bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800",
        footer: "bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]",
        card: "bg-zinc-900/90 border border-zinc-800 shadow-xl rounded-2xl",
        recessedPod: "rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
        title: "text-white",
        subtitle: "text-zinc-400"
    } : {
        panel: cn(
            "bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)]",
            "border-l border-white/80 shadow-[-20px_0_60px_rgba(15,35,60,0.18)] z-30"
        ),
        header: "bg-white/70 backdrop-blur-md border-b border-slate-200/80",
        footer: "bg-white/60 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-4px_20px_-10px_rgba(15,35,60,0.05)]",
        card: "bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] border border-white/90 shadow-[0_8px_24px_rgba(15,35,60,0.06),0_1px_3px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF] rounded-2xl",
        recessedPod: "rounded-xl border border-[#CCDCE8] bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)]",
        title: "text-slate-900",
        subtitle: "text-slate-500"
    };

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

    // Native Vendor Combobox Dropdown State
    const [vendorSearch, setVendorSearch] = useState('');
    const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
    const vendorDropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
                setIsVendorDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const filteredVendors = useMemo(() => {
        if (!vendorSearch.trim()) return vendors;
        const q = vendorSearch.toLowerCase();
        return vendors.filter(v => 
            v.name?.toLowerCase().includes(q) || 
            v.category?.toLowerCase().includes(q) || 
            v.taxId?.toLowerCase().includes(q)
        );
    }, [vendors, vendorSearch]);

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
        <div className="fixed inset-0 z-50 flex justify-end p-2 sm:p-3 md:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in">
            {/* Absolute Drawer matching IntentPanel: Dynamic width (Min 40% for Record, Wide for History & Metrics) */}
            <div 
                className={cn(
                    "h-full flex flex-col overflow-hidden rounded-[24px] sm:rounded-[28px] border border-white/80 dark:border-white/10 shadow-2xl transition-all duration-300 ease-in-out z-30",
                    activeTab === 'record'
                        ? "w-full sm:w-[92vw] md:w-[75vw] lg:w-[50vw] xl:w-[44vw] 2xl:w-[40vw] min-w-[580px] max-w-[880px]"
                        : "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px]",
                    ui.panel
                )}
            >
                {/* 1. NATIVE INTENTPANEL HEADER */}
                <div className={cn("px-6 sm:px-8 py-3 shrink-0 border-b flex flex-col gap-2.5", ui.header)}>
                    {/* Top line: Title + Station Badge + Close button */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <h2 className={cn("text-base sm:text-lg lg:text-xl font-bold tracking-normal flex items-baseline gap-2", ui.title)}>
                                Accounts Payable Terminal
                                <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-zinc-700/60">
                                    #EXP-RECEPTION
                                </span>
                            </h2>
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDF7F2] text-[#245E49] dark:bg-emerald-950/40 dark:text-emerald-300 border border-[#CBE5D7] dark:border-emerald-800">
                                Station: Reception Desk
                            </span>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-1.5 sm:p-2 rounded-full transition-all duration-200 active:scale-95 cursor-pointer shrink-0",
                                isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                            )}
                            title="Close Terminal (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Area 2: Three-Tab Navigation positioned directly under the title */}
                    <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800/80 border border-slate-300/40 dark:border-zinc-700/40">
                            <button
                                onClick={() => setActiveTab('record')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeTab === 'record'
                                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>1 Record Expense</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('history')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeTab === 'history'
                                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <History className="w-3.5 h-3.5" />
                                <span>2 Live & 7D History</span>
                                {metrics.totalCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
                                        {metrics.totalCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('metrics')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeTab === 'metrics'
                                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>3 Visual Metrics</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* In-progress draft auto-save indicator */}
                {hasDraftLoaded && (
                    <div className="px-6 sm:px-8 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between shrink-0">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            Draft Auto-Saved locally
                        </span>
                        <button
                            onClick={discardDraft}
                            className="text-[10px] font-black uppercase text-amber-600 hover:text-rose-500 underline transition-colors cursor-pointer"
                        >
                            Discard Draft
                        </button>
                    </div>
                )}

                {/* 3. TAB 1: NATIVE INTENTPANEL RECORD EXPENSE WORKBENCH */}
                {activeTab === 'record' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-4 sm:p-6 w-full flex-1 min-h-0 overflow-y-auto space-y-4 animate-in fade-in duration-300 pr-1.5 sm:pr-3">
                                    {/* STEP 1: EXPENSE CLASSIFICATION & STREAM */}
                                    <div className={cn("p-4 sm:p-5 space-y-3 shrink-0", ui.card)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                    1
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                                    Expense Classification & Stream
                                                </h3>
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-zinc-400">
                                                Attribution Context
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                                        ? (isDark
                                                            ? "bg-zinc-800 border-2 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                                                            : "bg-white border-2 border-blue-600 shadow-[0_4px_16px_rgba(37,99,235,0.15)] ring-1 ring-blue-600/30")
                                                        : (isDark
                                                            ? "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800 shadow-xs"
                                                            : "bg-white/80 border border-[#D5E2EC] hover:bg-white hover:border-slate-300 shadow-[0_1px_3px_rgba(15,35,60,0.04)]")
                                                )}
                                            >
                                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                                                    <Coffee className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">Petty Cash</span>
                                                        {outflowMode === 'petty' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">Tea, courier, rolls, minor repairs</p>
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
                                                        ? (isDark
                                                            ? "bg-zinc-800 border-2 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                                                            : "bg-white border-2 border-blue-600 shadow-[0_4px_16px_rgba(37,99,235,0.15)] ring-1 ring-blue-600/30")
                                                        : (isDark
                                                            ? "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800 shadow-xs"
                                                            : "bg-white/80 border border-[#D5E2EC] hover:bg-white hover:border-slate-300 shadow-[0_1px_3px_rgba(15,35,60,0.04)]")
                                                )}
                                            >
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">Vendor Bill</span>
                                                        {outflowMode === 'vendor' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">Reagents, kits, consumables</p>
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
                                                        ? (isDark
                                                            ? "bg-zinc-800 border-2 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                                                            : "bg-white border-2 border-blue-600 shadow-[0_4px_16px_rgba(37,99,235,0.15)] ring-1 ring-blue-600/30")
                                                        : (isDark
                                                            ? "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800 shadow-xs"
                                                            : "bg-white/80 border border-[#D5E2EC] hover:bg-white hover:border-slate-300 shadow-[0_1px_3px_rgba(15,35,60,0.04)]")
                                                )}
                                            >
                                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">Overhead</span>
                                                        {outflowMode === 'overhead' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">Electricity, internet, waste, rent</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* STEP 2: OUTFLOW PARTICULARS */}
                                    <div className={cn("p-4 sm:p-5 space-y-4 shrink-0", ui.card)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                    2
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                                    Outflow Particulars
                                                </h3>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60">
                                                {outflowMode === 'petty' ? 'Operational Cash' : outflowMode === 'vendor' ? 'Supplier Inward' : 'Facility Utility'}
                                            </span>
                                        </div>

                                        {/* Petty Cash Presets */}
                                        {outflowMode === 'petty' && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Quick Presets
                                                </label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                                                    "p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer font-bold text-xs",
                                                                    isSelected
                                                                        ? (isDark
                                                                            ? "bg-zinc-800 border-2 border-blue-500 text-blue-300 shadow-sm"
                                                                            : "bg-white border-2 border-blue-600 text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.15)] ring-1 ring-blue-600/20")
                                                                        : (isDark
                                                                            ? "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                                                            : "bg-white/90 border-slate-200/90 text-slate-700 hover:bg-white hover:border-slate-300 shadow-2xs")
                                                                )}
                                                            >
                                                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                                                <span className="truncate">{preset.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Facility Overhead Presets */}
                                        {outflowMode === 'overhead' && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Facility Utilities
                                                </label>
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
                                                                "p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer font-bold text-xs",
                                                                form.category === preset.category
                                                                    ? (isDark
                                                                        ? "bg-zinc-800 border-2 border-blue-500 text-blue-300 shadow-sm"
                                                                        : "bg-white border-2 border-blue-600 text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.15)] ring-1 ring-blue-600/20")
                                                                    : (isDark
                                                                        ? "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                                                        : "bg-white/90 border-slate-200/90 text-slate-700 hover:bg-white hover:border-slate-300 shadow-2xs")
                                                            )}
                                                        >
                                                            <Zap className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="truncate">{preset.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Vendor Inward Fields */}
                                        {outflowMode === 'vendor' && (() => {
                                            const selectedVendor = vendors.find(v => v.id === form.vendorId);
                                            return (
                                                <div className="space-y-3">
                                                    <div className="space-y-1.5" ref={vendorDropdownRef}>
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                                Select Supplier (ERP Ledger) *
                                                            </label>
                                                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                                                {vendors.length} Verified Suppliers Loaded
                                                            </span>
                                                        </div>

                                                        {selectedVendor ? (
                                                            /* Selected Vendor Card matching Doctor Referral Card */
                                                            <div className={cn(
                                                                "flex items-center justify-between p-3 rounded-xl border transition-all animate-in fade-in duration-200",
                                                                isDark ? "bg-zinc-800/80 border-zinc-700" : "bg-white border-[#CCDCE8] shadow-2xs"
                                                            )}>
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                                                                        <Building2 className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                                                                {selectedVendor.name}
                                                                            </span>
                                                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 shrink-0">
                                                                                {selectedVendor.category}
                                                                            </span>
                                                                        </div>
                                                                        {selectedVendor.taxId && (
                                                                            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 block mt-0.5">
                                                                                GST: {selectedVendor.taxId}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        saveDraft({ ...form, vendorId: '' });
                                                                        setVendorSearch('');
                                                                        setIsVendorDropdownOpen(true);
                                                                    }}
                                                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                                                    title="Change Supplier"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            /* Searchable Dropdown Input */
                                                            <div className="relative">
                                                                <div className="relative">
                                                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search supplier by name, category, or GST..."
                                                                        value={vendorSearch}
                                                                        onFocus={() => setIsVendorDropdownOpen(true)}
                                                                        onChange={(e) => {
                                                                            setVendorSearch(e.target.value);
                                                                            setIsVendorDropdownOpen(true);
                                                                        }}
                                                                        className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-9 pr-9 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-2xs"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsVendorDropdownOpen(prev => !prev)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                                                    >
                                                                        <ChevronDown className={cn("w-4 h-4 transition-transform", isVendorDropdownOpen && "rotate-180")} />
                                                                    </button>
                                                                </div>

                                                                {isVendorDropdownOpen && (
                                                                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100 dark:divide-zinc-800 animate-in fade-in slide-in-from-top-1 duration-150">
                                                                        {filteredVendors.length === 0 ? (
                                                                            <div className="py-4 px-3 text-center text-xs text-slate-400 dark:text-zinc-500">
                                                                                No suppliers found matching "{vendorSearch}"
                                                                            </div>
                                                                        ) : (
                                                                            filteredVendors.map(v => (
                                                                                <button
                                                                                    key={v.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        saveDraft({ 
                                                                                            ...form, 
                                                                                            vendorId: v.id,
                                                                                            description: form.description || `Inward Supplies: ${v.name}`
                                                                                        });
                                                                                        setIsVendorDropdownOpen(false);
                                                                                        setVendorSearch('');
                                                                                    }}
                                                                                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                                                                                >
                                                                                    <div className="min-w-0 flex items-center gap-2.5">
                                                                                        <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                                            <Building2 className="w-3.5 h-3.5" />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                                                                                {v.name}
                                                                                            </span>
                                                                                            {v.taxId && (
                                                                                                <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 block">
                                                                                                    GST: {v.taxId}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60 shrink-0">
                                                                                        {v.category}
                                                                                    </span>
                                                                                </button>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                            Inward Invoice / Challan Reference #
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. INV-2026-9042 or DC-4412"
                                                            value={form.invoiceNumber}
                                                            onChange={(e) => saveDraft({ ...form, invoiceNumber: e.target.value })}
                                                            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-2xs"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Recessed Pod for Amount */}
                                        <div className={cn("p-3.5 sm:p-4 space-y-1.5", ui.recessedPod)}>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                Disbursement / Bill Amount (₹) *
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-black text-slate-400 dark:text-zinc-500">₹</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    placeholder="0.00"
                                                    value={form.amount}
                                                    onChange={(e) => saveDraft({ ...form, amount: e.target.value })}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-2xl sm:text-3xl font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white tabular-nums shadow-inner"
                                                />
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                Description & Operational Purpose
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Courier charges for biopsy sample dispatch"
                                                value={form.description}
                                                onChange={(e) => saveDraft({ ...form, description: e.target.value })}
                                                className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-2xs"
                                            />
                                        </div>
                            </div>

                            {/* STEP 3: SETTLEMENT & FINANCIALS (Brought to Area 4 under Step 2) */}
                            <div className={cn("p-4 sm:p-5 space-y-4 shrink-0", ui.card)}>
                                <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                            3
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                            Settlement & Financials
                                        </h3>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        {form.isSettledNow ? 'Immediate Disburse' : 'Accrue Obligation'}
                                    </span>
                                </div>

                                {/* Recessed Net Amount Pod */}
                                <div className={cn("p-4 space-y-1", ui.recessedPod)}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                                        Net Disbursement Amount
                                    </span>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xs text-slate-500 dark:text-zinc-400">Ledger Impact</span>
                                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                            ₹{form.amount ? parseFloat(form.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                        </span>
                                    </div>
                                </div>

                                {/* Settle Now Toggle for Vendor Bills */}
                                {outflowMode === 'vendor' && (
                                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-between shadow-2xs">
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">Settle Invoice Now?</p>
                                            <p className="text-[10px] text-slate-500 dark:text-zinc-400">Uncheck to log as unpaid accounts payable</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={form.isSettledNow}
                                            onChange={(e) => saveDraft({ ...form, isSettledNow: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                                        />
                                    </div>
                                )}

                                {/* Disbursement Channels */}
                                {form.isSettledNow && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                            Disbursement Channel
                                        </label>
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
                                                            "py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer font-bold",
                                                            isSelected
                                                                ? (isDark
                                                                    ? "bg-white text-zinc-900 border-white shadow-md"
                                                                    : "bg-slate-900 text-white border-slate-900 shadow-md")
                                                                : (isDark
                                                                    ? "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                                    : "bg-white/90 border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs")
                                                        )}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        <span className="text-[11px]">{mode.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Metadata Pod */}
                                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 text-xs space-y-1.5 shadow-2xs">
                                    <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                                        <span>Disbursed By:</span>
                                        <span className="font-bold text-slate-800 dark:text-zinc-200">{user?.name || 'Reception Staff'}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                                        <span>Disbursement Source:</span>
                                        <span className="font-bold text-slate-800 dark:text-zinc-200">
                                            {form.paymentMethod === 'Cash' ? 'Reception Cash Drawer' : form.paymentMethod}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NATIVE INTENTPANEL FIXED FOOTER */}
                        <div className={cn("h-16 px-6 sm:px-8 border-t flex items-center justify-between shrink-0", ui.footer)}>
                            <div className="flex items-center gap-2">
                                {hasDraftLoaded && (
                                    <button
                                        type="button"
                                        onClick={discardDraft}
                                        className="py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Draft</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitExpense}
                                    disabled={isSubmitting || !form.amount || parseFloat(form.amount) <= 0}
                                    className="py-2.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 bg-synos-primary text-white hover:brightness-105 shadow-md shadow-synos-primary/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <thead className="bg-slate-50 dark:bg-zinc-800/40 border-b dark:border-zinc-800 border-slate-200 text-zinc-500 uppercase text-[10px] font-bold sticky top-0 backdrop-blur-md">
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
                                                <span>Loading recorded outflows from ERP ledger...</span>
                                            </td>
                                        </tr>
                                    ) : filteredFeed.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-zinc-400">
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
                                                    <td className="p-3.5 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap">
                                                        <span className="font-bold dark:text-zinc-200 text-zinc-800">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 max-w-xs truncate font-medium dark:text-zinc-300 text-zinc-700">
                                                        {item.description}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap font-black">
                                                        ₹{amountDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap text-zinc-500 font-bold">
                                                        {item.paymentMethod || 'Cash'}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
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
                                                                    className="px-2 py-1 rounded-lg border dark:border-white/10 border-slate-200 text-zinc-500 hover:text-synos-primary hover:bg-synos-primary/10 transition-colors text-[11px] font-bold cursor-pointer"
                                                                >
                                                                    Correct
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenCancellation(item)}
                                                                    className="px-2 py-1 rounded-lg border dark:border-white/10 border-slate-200 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors text-[11px] font-bold cursor-pointer"
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Confirmed Outflow</span>
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
                                    <p className="text-[11px] text-zinc-400 mt-1">
                                        <b className="text-zinc-600 dark:text-zinc-200">{metrics.totalCount}</b> confirmed transactions logged
                                    </p>
                                </div>
                            </div>

                            {/* Card 2: Cash Drawer Liquidity Outflow */}
                            <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cash Drawer Share</span>
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
                                        <div className="flex justify-between text-[10px] font-bold text-zinc-400">
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Digital / UPI Share</span>
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
                                        <div className="flex justify-between text-[10px] font-bold text-zinc-400">
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Unsettled Inward Dues</span>
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
                                    <p className="text-[11px] text-zinc-400 mt-1">
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
                                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-synos-primary" />
                                        7-Day Spend Trajectory
                                    </span>
                                    <span className="text-[11px] font-bold text-zinc-400">
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
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        ₹{day.outflow.toLocaleString()}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">{day.dayLabel}</span>
                                                <span className="text-[11px] font-black dark:text-white text-zinc-900">₹{day.outflow.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Category Distribution Breakdown (5 cols) */}
                            <div className="lg:col-span-5 p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b dark:border-white/10 border-slate-200 pb-3">
                                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                                        <PieChart className="w-4 h-4 text-synos-primary" />
                                        Category Allocation
                                    </span>
                                    <span className="text-[11px] font-bold text-zinc-400">
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
                                        <p className="text-[10px] text-zinc-400">Edits create an immutable audit record and adjust ledger facts.</p>
                                    </div>
                                </div>
                                <button onClick={() => setCorrectionTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800">
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCorrection} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border dark:border-white/5 border-slate-200">
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
                                                className="w-full bg-white dark:bg-zinc-800 border dark:border-white/10 border-slate-300 rounded-lg pl-6 pr-2 py-1 text-sm font-black outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
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
                                        className="w-full bg-slate-100 dark:bg-white/5 border dark:border-white/10 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-synos-primary dark:text-white"
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
                                        <p className="text-[10px] text-zinc-400">Restores cash drawer and records audit fact.</p>
                                    </div>
                                </div>
                                <button onClick={() => setCancellationTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800">
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
                                    <label className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Mandatory Reason for Cancellation *</label>
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
