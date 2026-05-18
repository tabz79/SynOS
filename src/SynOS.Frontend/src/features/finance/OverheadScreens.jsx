import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    Coins, 
    CreditCard, 
    TrendingDown, 
    PlusCircle, 
    Calendar, 
    ArrowRight, 
    Search, 
    Filter, 
    CheckCircle2, 
    X, 
    AlertCircle, 
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Settings,
    Trash2,
    Pencil
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

const CATEGORY_MAP = {
    1: { label: 'Rent', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
    2: { label: 'Power', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    3: { label: 'Internet', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
    4: { label: 'Courier', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    5: { label: 'IT', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
    6: { label: 'PPE', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    10: { label: 'Tea', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    11: { label: 'Repairs', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    12: { label: 'Logistics', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
    13: { label: 'Electricity', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    14: { label: 'Staff', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
    99: { label: 'Misc', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' }
};

const getCategoryDetails = (cat) => {
    if (typeof cat === 'number' && CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];
    const found = Object.values(CATEGORY_MAP).find(c => c.label.toLowerCase() === String(cat).toLowerCase());
    return found || { label: cat || 'Misc', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
};

const cleanDescription = (desc) => {
    return desc ? desc.replace(/\s*\[Cycle:\s*[^\]]+\]/gi, '') : '';
};

const extractCycle = (desc) => {
    const match = desc ? desc.match(/\[Cycle:\s*([^\]]+)\]/i) : null;
    return match ? match[1] : 'Monthly';
};

const SummaryCard = ({ title, value, type = 'neutral', subtitle, icon: Icon }) => {
    const borders = {
        positive: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.02]',
        warning: 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/[0.02]',
        negative: 'border-rose-500/20 hover:border-rose-500/40 bg-rose-500/[0.02]',
        neutral: 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/10'
    };

    return (
        <div className={`border p-5 rounded-2xl shadow-sm transition-all duration-300 group flex items-center justify-between ${borders[type]}`}>
            <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">{title}</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">{value}</p>
                {subtitle && <p className="text-[10px] text-zinc-500 leading-none">{subtitle}</p>}
            </div>
            {Icon && (
                <div className={`p-3 rounded-xl border ${
                    type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                    type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                    type === 'negative' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                    'bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-400'
                }`}>
                    <Icon className="w-5 h-5" />
                </div>
            )}
        </div>
    );
};

export const OverheadExpensesScreen = () => {
    const [selectedDate, setSelectedDate] = useState(new Date(2026, 4, 1)); // Default May 2026
    const [overheads, setOverheads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, bill: null });
    const [billModal, setBillModal] = useState(false);

    const activeUserId = localStorage.getItem('synos_user_id') || '00000000-0000-0000-0000-000000000000';

    useEffect(() => {
        loadOverheads();
    }, []);

    const loadOverheads = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getOverheadExpenses();
            setOverheads(data);
        } catch (err) {
            console.error("Failed to load overhead bills:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const formattedMonth = selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const apiMonthQuery = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

    // Filter by selected month & year
    const monthlyBills = overheads.filter(o => {
        const oDate = new Date(o.dueDate);
        return oDate.getFullYear() === selectedDate.getFullYear() && oDate.getMonth() === selectedDate.getMonth();
    });

    const filteredBills = monthlyBills.filter(o => 
        o.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryDetails(o.category).label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate Summary Stats
    const totalDue = monthlyBills.reduce((acc, o) => acc + (o.status !== 2 ? (o.amountDue - o.amountPaid) : 0), 0); // 2 represents settled/paid
    const totalPaid = monthlyBills.reduce((acc, o) => acc + o.amountPaid, 0);
    const totalBudget = monthlyBills.reduce((acc, o) => acc + o.amountDue, 0);
    const pendingCount = monthlyBills.filter(o => o.status !== 2).length;

    const getStatusBadge = (status) => {
        if (status === 2 || status === 'Settled') {
            return <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Paid</span>;
        }
        if (status === 1 || status === 'PartiallyPaid') {
            return <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">Partially Paid</span>;
        }
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">Due</span>;
    };

    const handleInitializeTemplates = async () => {
        try {
            setIsInitializing(true);
            await FinanceApi.initializeOverheads(apiMonthQuery, activeUserId);
            await loadOverheads();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to initialize overhead templates.");
        } finally {
            setIsInitializing(false);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header Workspace */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-500" />
                        Monthly Overheads
                    </h1>
                    <p className="text-xs text-zinc-500 tracking-tight">Record operational expenses, subscriptions, leases, and utilities.</p>
                </div>

                {/* Period Controls & Actions */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl p-1 shadow-sm">
                        <button 
                            onClick={handlePrevMonth}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-800 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-1 text-xs font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 min-w-[140px] text-center">
                            {formattedMonth}
                        </span>
                        <button 
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-800 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button 
                        onClick={() => setBillModal(true)}
                        className="px-4 py-2.5 bg-synos-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-synos-primary/10 hover:bg-synos-primary/95 hover:scale-[1.01] active:scale-95 transition-all flex items-center gap-2"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Bill
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard 
                    title="Outstanding Bills" 
                    value={`₹${totalDue.toLocaleString('en-IN')}`} 
                    type={totalDue > 0 ? 'warning' : 'neutral'}
                    icon={Building2}
                />
                <SummaryCard 
                    title="Paid This Month" 
                    value={`₹${totalPaid.toLocaleString('en-IN')}`} 
                    type="positive"
                    icon={CheckCircle2}
                />
                <SummaryCard 
                    title="Monthly Budget" 
                    value={`₹${totalBudget.toLocaleString('en-IN')}`} 
                    icon={Coins}
                />
                <SummaryCard 
                    title="Pending Payments" 
                    value={pendingCount.toString()} 
                    type={pendingCount > 0 ? 'negative' : 'neutral'}
                    icon={CreditCard}
                />
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="p-12 border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900/20 rounded-2xl flex flex-col items-center justify-center gap-2 animate-pulse text-zinc-400">
                    <Building2 className="w-8 h-8 opacity-20" />
                    <p className="text-xs">Synchronizing monthly bills ledger...</p>
                </div>
            ) : monthlyBills.length === 0 ? (
                /* One-Click Initialize State */
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r dark:from-zinc-900/40 dark:to-zinc-900/10 from-zinc-50/50 to-white/10 p-12 text-center flex flex-col items-center justify-center max-w-3xl mx-auto gap-5 animate-in fade-in duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-black dark:text-white text-zinc-900 tracking-tight">No recorded bills for {formattedMonth}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
                            Pre-populate your standard clinical operations overhead templates (Rent, Power, Broadband, LIS SaaS, Bio-medical Waste Contract) with calculated due dates for this period.
                        </p>
                    </div>
                    <button 
                        disabled={isInitializing}
                        onClick={handleInitializeTemplates}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2"
                    >
                        {isInitializing ? "Initializing template registry..." : "Initialize Monthly Bills Template"}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                /* Live Bills Table Register */
                <div className="bg-white dark:bg-zinc-900/20 border dark:border-zinc-800 border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Search and Filters */}
                    <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input 
                                type="text" 
                                placeholder="Search by description or category..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-synos-primary/50 dark:text-zinc-200"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/30 dark:bg-zinc-900/20">
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Due Date</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Category</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Bill Amount</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Amount Paid</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Outstanding</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Status</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-10 text-center text-xs text-zinc-500">No bills match your search criteria.</td>
                                    </tr>
                                ) : (
                                    filteredBills.map((bill) => {
                                        const cat = getCategoryDetails(bill.category);
                                        const isPaid = bill.status === 2 || bill.status === 'Settled';
                                        return (
                                            <tr key={bill.overheadPayableId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                                                            {new Date(bill.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400">
                                                            {new Date(bill.dueDate).getFullYear()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                            {cleanDescription(bill.description)}
                                                        </span>
                                                        <span className="text-[9px] font-semibold text-zinc-400">
                                                            Cycle: {extractCycle(bill.description)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cat.color}`}>
                                                        {cat.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">₹{bill.amountDue.toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">₹{bill.amountPaid.toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-xs font-bold ${isPaid ? 'text-zinc-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                                        ₹{(bill.amountDue - bill.amountPaid).toLocaleString('en-IN')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {getStatusBadge(bill.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {!isPaid ? (
                                                        <button 
                                                            onClick={() => setPaymentModal({ isOpen: true, bill })}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
                                                        >
                                                            Record Payment
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Completed</span>
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

            {/* Record Payment Popup Modal */}
            <RecordPaymentModal 
                isOpen={paymentModal.isOpen}
                bill={paymentModal.bill}
                onClose={() => setPaymentModal({ isOpen: false, bill: null })}
                onSaved={() => {
                    loadOverheads();
                    setPaymentModal({ isOpen: false, bill: null });
                }}
            />

            {/* Unified Inline Add Bill & Cycle Configurator Modal */}
            <AddBillUnifiedModal 
                isOpen={billModal}
                onClose={() => setBillModal(false)}
                onSaved={() => {
                    loadOverheads();
                }}
                activeUserId={activeUserId}
                activeMonthQuery={apiMonthQuery}
            />
        </div>
    );
};

// --- --- SUB COMPONENT: RECORD PAYMENT MODAL --- ---

const RecordPaymentModal = ({ isOpen, bill, onClose, onSaved }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (bill) {
            setAmount(bill.amountDue - bill.amountPaid);
        }
    }, [bill]);

    if (!isOpen || !bill) return null;

    const remaining = bill.amountDue - bill.amountPaid;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0 || numAmount > remaining) {
            alert("Please enter a valid amount.");
            return;
        }

        try {
            setIsSaving(true);
            await FinanceApi.settleOverheadExpense(bill.overheadPayableId, numAmount, paymentMethod);
            onSaved();
        } catch (err) {
            console.error(err);
            alert("Failed to record payment. Reference collision or database error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight">Record Payment</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{cleanDescription(bill.description)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Bill Details</p>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border dark:border-zinc-800 border-zinc-200 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-zinc-500">Obligated Cost</p>
                                <p className="text-sm font-bold dark:text-zinc-200">₹{bill.amountDue.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-zinc-500">Remaining Balance</p>
                                <p className="text-sm font-bold text-rose-500">₹{remaining.toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Amount to Record (₹)</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-zinc-400">₹</span>
                            <input 
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl pl-12 pr-6 py-4 text-xl font-black focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                max={remaining}
                                min={1}
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Payment Mode Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Recorded Mode</label>
                        <div className="flex gap-2">
                            {['Cash', 'UPI', 'BankTransfer'].map(mode => (
                                <button 
                                    key={mode}
                                    type="button"
                                    onClick={() => setPaymentMethod(mode)}
                                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-all ${paymentMethod === mode ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                                >
                                    {mode === 'BankTransfer' ? 'Bank' : mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSaving || !amount}
                        className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? 'Recording Ledger Update...' : 'Save Recorded Payment'}
                        <CheckCircle2 className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- --- SUB COMPONENT: UNIFIED ADD BILL & CYCLES MODAL --- ---

const AddBillUnifiedModal = ({ isOpen, onClose, onSaved, activeUserId, activeMonthQuery }) => {
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState(null); // Guid of template being edited

    // Form inputs (unified for both custom and recurring creation/edit)
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 99,
        dueDate: new Date().toISOString().substring(0, 10),
        cycle: 'One-Time' // One-Time, Monthly, Quarterly, 6 Months, Annual
    });

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        try {
            setTemplatesLoading(true);
            const data = await FinanceApi.getOverheadTemplates();
            setTemplates(data);
        } catch (err) {
            console.error(err);
        } finally {
            setTemplatesLoading(false);
        }
    };

    if (!isOpen) return null;

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = parseFloat(formData.amount);
        if (!formData.description || isNaN(numAmount) || numAmount <= 0) {
            alert("Please fill in all details correctly.");
            return;
        }

        try {
            setIsSaving(true);
            
            if (formData.cycle === 'One-Time') {
                // Scenario 1: One-Time Custom Bill
                await FinanceApi.createOverheadPayable({
                    category: parseInt(formData.category),
                    amount: numAmount,
                    description: formData.description + " [Cycle: One-Time]",
                    expenseDate: new Date(formData.dueDate).toISOString(),
                    userId: activeUserId
                });
            } else {
                // Scenario 2: Recurring template (Creation or Update)
                // Normalize cycle suffix
                const cycleSuffix = formData.cycle === '1 Year' ? 'Annual' : formData.cycle;
                const taggedDescription = `${formData.description} [Cycle: ${cycleSuffix}]`;

                if (editingTemplateId) {
                    // Update template
                    await FinanceApi.updateOverheadTemplate(editingTemplateId, {
                        category: parseInt(formData.category),
                        amount: numAmount,
                        description: taggedDescription,
                        expenseDate: new Date(formData.dueDate).toISOString(),
                        userId: activeUserId
                    });
                    setEditingTemplateId(null);
                } else {
                    // Create new template
                    await FinanceApi.createOverheadTemplate({
                        category: parseInt(formData.category),
                        amount: numAmount,
                        description: taggedDescription,
                        expenseDate: new Date(formData.dueDate).toISOString(),
                        userId: activeUserId
                    });
                }

                // Immediately trigger initialization run for this month so it populates active table instantly
                try {
                    await FinanceApi.initializeOverheads(activeMonthQuery, activeUserId);
                } catch (err) {
                    console.log("Initialization triggered idempotently.", err);
                }
            }

            // Reset form inputs
            setFormData({
                description: '',
                amount: '',
                category: 99,
                dueDate: new Date().toISOString().substring(0, 10),
                cycle: 'One-Time'
            });

            loadTemplates();
            onSaved();
            
            // Only close modal for a One-Time bill. For recurring templates, keep the modal open so they can see the templates table update!
            if (formData.cycle === 'One-Time') {
                onClose();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to save bill: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Pre-fill form when user clicks "Edit" (Pencil)
    const handleStartEdit = (tpl) => {
        const cyl = extractCycle(tpl.description);
        const cycleValue = cyl === 'Annual' ? '1 Year' : cyl;
        
        setEditingTemplateId(tpl.id);
        setFormData({
            description: cleanDescription(tpl.description),
            category: tpl.category,
            amount: tpl.amount.toString(),
            cycle: cycleValue,
            dueDate: new Date(tpl.expenseDate).toISOString().substring(0, 10)
        });
        
        // Scroll to form inside the modal
        const formEl = document.getElementById('unified-bill-form');
        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleCancelEdit = () => {
        setEditingTemplateId(null);
        setFormData({
            description: '',
            amount: '',
            category: 99,
            dueDate: new Date().toISOString().substring(0, 10),
            cycle: 'One-Time'
        });
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Are you sure you want to delete this recurring template? It will no longer generate in new month cycles.")) return;
        try {
            await FinanceApi.deleteOverheadTemplate(id);
            loadTemplates();
            onSaved();
        } catch (err) {
            console.error(err);
            alert("Failed to delete template.");
        }
    };

    const cycleSuggestions = ['One-Time', 'Monthly', 'Quarterly', '6 Months', '1 Year'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-955 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight">
                            {editingTemplateId ? "Edit Recurring Template" : "Add Bill"}
                        </h3>
                        <p className="text-xs text-zinc-500 tracking-tight">Record operational costs and choose recurrence cycles in a single form.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <div className="overflow-y-auto p-8 flex-1 space-y-8">
                    
                    {/* Unified Form */}
                    <form 
                        id="unified-bill-form"
                        onSubmit={handleSubmit} 
                        className={`p-6 rounded-3xl border transition-all duration-300 ${
                            editingTemplateId 
                                ? 'bg-synos-primary/[0.03] border-synos-primary/30 shadow-md' 
                                : 'bg-zinc-50 dark:bg-white/5 dark:border-zinc-800 border-zinc-200 shadow-sm'
                        }`}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            
                            {/* Left Column inputs */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Bill Description</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="e.g. Facility Lease, Power Bill, LIS SaaS Licences..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-850 border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-synos-primary outline-none transition-all dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                        <input 
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-850 border-zinc-200 rounded-xl pl-9 pr-4 py-3 text-xs focus:ring-1 focus:ring-synos-primary outline-none transition-all dark:text-white"
                                            min="1"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column inputs */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Category</label>
                                    <select 
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-850 border-zinc-200 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-synos-primary outline-none transition-all dark:text-zinc-200 dark:bg-zinc-950"
                                    >
                                        {Object.entries(CATEGORY_MAP).map(([id, details]) => (
                                            <option key={id} value={id}>{details.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Due Date / Start Date</label>
                                    <input 
                                        type="date"
                                        required
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-850 border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-synos-primary outline-none transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Recurrence Cycles Picker Below Date (Colspan 2) */}
                            <div className="md:col-span-2 space-y-2 border-t dark:border-zinc-800 border-zinc-200 pt-4 mt-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Repeat Billing Cycle</label>
                                <div className="flex gap-2 flex-wrap">
                                    {cycleSuggestions.map(cycle => {
                                        const isActive = formData.cycle === cycle;
                                        return (
                                            <button
                                                key={cycle}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, cycle })}
                                                className={`px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.01] ${
                                                    isActive 
                                                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 shadow-sm'
                                                        : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                                }`}
                                            >
                                                {cycle}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Submit & Cancels */}
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                {editingTemplateId && (
                                    <button 
                                        type="button" 
                                        onClick={handleCancelEdit} 
                                        className="px-4 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                                <button 
                                    type="submit"
                                    disabled={isSaving || !formData.description || !formData.amount}
                                    className="px-6 py-2.5 bg-synos-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:bg-synos-primary/95 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {isSaving 
                                        ? "Saving..." 
                                        : editingTemplateId 
                                            ? "Save Template Changes" 
                                            : formData.cycle === 'One-Time' 
                                                ? "Add One-Time Bill" 
                                                : "Register & Initialize Recurring Template"
                                    }
                                </button>
                            </div>

                        </div>
                    </form>

                    {/* Active Recurring Registry list at the bottom */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b dark:border-zinc-800 border-zinc-200 pb-2 ml-1">
                            <h4 className="text-[10px] font-black dark:text-zinc-300 text-zinc-700 tracking-widest uppercase">Active Recurring Cycles Register</h4>
                            <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">Templates</span>
                        </div>

                        {templatesLoading ? (
                            <div className="p-8 text-center text-xs text-zinc-500 animate-pulse">Syncing obligations...</div>
                        ) : templates.length === 0 ? (
                            <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl">
                                No active recurring cycles found. Select a cycle like Monthly or 1 Year above to create one.
                            </div>
                        ) : (
                            <div className="border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-zinc-900/10">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-800 border-zinc-200">
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Category</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Obligation Description</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Cost</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Cycle</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Recurrence / Start Date</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                        {templates.map((tpl) => {
                                            const cat = getCategoryDetails(tpl.category);
                                            const cycle = extractCycle(tpl.description);
                                            const nextDate = new Date(tpl.expenseDate);
                                            const isEditingThis = editingTemplateId === tpl.id;
                                            return (
                                                <tr key={tpl.id} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/20 text-xs transition-colors ${isEditingThis ? 'bg-synos-primary/[0.02] border-l-2 border-synos-primary' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cat.color}`}>
                                                            {cat.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold dark:text-zinc-200 text-zinc-850">
                                                        {cleanDescription(tpl.description)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold dark:text-zinc-100 text-zinc-900">
                                                        ₹{tpl.amount.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold uppercase tracking-widest ${
                                                            cycle === 'Annual' ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20' :
                                                            cycle === 'Quarterly' ? 'bg-violet-500/10 text-violet-500 border border-violet-500/20' :
                                                            cycle === '6 Months' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                                                            cycle === 'One-Time' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                            'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                                                        }`}>
                                                            {cycle}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-zinc-500 font-medium">
                                                        {cycle === 'Annual' ? (
                                                            <span>Day {nextDate.getDate()} of {nextDate.toLocaleDateString('en-IN', { month: 'short' })}</span>
                                                        ) : cycle === 'Quarterly' ? (
                                                            <span>Quarterly on Day {nextDate.getDate()}</span>
                                                        ) : cycle === '6 Months' ? (
                                                            <span>Semi-Annually on Day {nextDate.getDate()}</span>
                                                        ) : cycle === 'One-Time' ? (
                                                            <span>Once on {nextDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        ) : (
                                                            <span>Day {nextDate.getDate()} monthly</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-1">
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleStartEdit(tpl)}
                                                            className="p-1.5 text-zinc-400 hover:text-synos-primary rounded-lg hover:bg-synos-primary/10 transition-all"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDeleteTemplate(tpl.id)}
                                                            className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
