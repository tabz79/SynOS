import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Search, 
    Filter, 
    Download, 
    MoreHorizontal, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    ArrowRight,
    TrendingDown,
    Building2,
    Users2,
    Truck,
    Coffee,
    Zap,
    Tag,
    ChevronDown,
    ChevronUp,
    IndianRupee,
    Beaker,
    X,
    Plus,
    Mail,
    Phone,
    MapPin,
    UserPlus,
    ShieldCheck,
    History,
    Loader2,
    Settings
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';
import { VendorMasterScreen } from './VendorMasterScreen';
import { OverheadExpensesScreen } from './OverheadScreens';

// --- SHARED COMPONENTS (Finance Screens Pattern) ---

const StatusBadge = ({ status }) => {
    const styles = {
        Settled: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Partial: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        Pending: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        PendingPricing: "bg-amber-600/10 text-amber-600 border-amber-600/20 font-medium",
        Overdue: "bg-rose-600/10 text-rose-600 border-rose-600/20 font-bold"
    };

    const labelMap = {
        PendingPricing: "Awaiting Rate"
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${styles[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
            {labelMap[status] || status}
        </span>
    );
};

const SummaryCard = ({ title, value, type = 'neutral', subtitle }) => (
    <div className="p-4 rounded-xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900/40 bg-white shadow-sm flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</p>
        <div className="flex items-center justify-between">
            <p className="text-xl font-bold dark:text-zinc-100 text-zinc-900">
                <span className="text-xs font-normal text-zinc-400 mr-1">₹</span>{value}
            </p>
            {type === 'positive' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
            {type === 'negative' && <ArrowDownRight className="w-4 h-4 text-rose-500" />}
            {type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
        </div>
        {subtitle && <p className="text-[10px] text-zinc-400 mt-1">{subtitle}</p>}
    </div>
);

const BulkSettleVendorModal = ({ isOpen, onClose, vendor, onSettled }) => {
    const [amount, setAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (vendor) setAmount(vendor.totalOutstanding);
    }, [vendor]);

    if (!isOpen || !vendor) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await FinanceApi.settleBulkVendorPayables(vendor.vendorId, amount, paymentMethod);
            onSettled();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight">Bulk Settlement</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{vendor.vendorName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Settlement Amount (₹)</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-zinc-400">₹</span>
                            <input 
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                                className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl pl-12 pr-6 py-4 text-xl font-black focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                max={vendor.totalOutstanding}
                                min={1}
                            />
                        </div>
                        <p className="text-[10px] text-zinc-400 ml-4">Total Outstanding: ₹{vendor.totalOutstanding.toLocaleString()}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Payment Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Cash', 'UPI', 'BankTransfer'].map(mode => (
                                <button 
                                    key={mode}
                                    type="button"
                                    onClick={() => setPaymentMethod(mode)}
                                    className={`py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-all ${paymentMethod === mode ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 shadow-lg' : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting || amount <= 0}
                        className="w-full bg-synos-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Processing...' : 'Authorize Settlement'}
                        <CheckCircle2 className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- 1. EXPENSE FEED SCREEN (SpendFacts Only) ---

export const ExpenseFeedScreen = () => {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [filterRange, setFilterRange] = useState('30D');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const start = new Date();
            if (filterRange === '7D') start.setDate(start.getDate() - 7);
            else if (filterRange === '30D') start.setDate(start.getDate() - 30);
            else if (filterRange === 'Today') start.setHours(0,0,0,0);
            
            const [facts, profitability] = await Promise.all([
                FinanceApi.getExpenseFeed(start.toISOString(), new Date().toISOString()),
                FinanceApi.getProfitabilitySummary(start.toISOString(), new Date().toISOString())
            ]);
            
            setFeed(facts);
            setStats(profitability);
        } catch (err) {
            console.error("Failed to load expense feed:", err);
        } finally {
            setLoading(false);
        }
    }, [filterRange]);

    useEffect(() => {
        loadData();
    }, [filterRange, loadData]);

    const totalOutflow = useMemo(() => {
        if (Array.isArray(feed) && feed.length > 0) {
            return feed.reduce((sum, item) => sum + Number(item.amount || item.Amount || 0), 0);
        }
        return Number(stats?.totalExpensesCash || stats?.TotalExpensesCash || 0);
    }, [feed, stats]);

    const cashOutflow = useMemo(() => {
        if (Array.isArray(feed) && feed.length > 0) {
            return feed.filter(item => (item.paymentMode || item.PaymentMode || '').toLowerCase() === 'cash')
                       .reduce((sum, item) => sum + Number(item.amount || item.Amount || 0), 0);
        }
        return totalOutflow * 0.4;
    }, [feed, totalOutflow]);

    const digitalOutflow = useMemo(() => {
        if (Array.isArray(feed) && feed.length > 0) {
            return feed.filter(item => (item.paymentMode || item.PaymentMode || '').toLowerCase() !== 'cash')
                       .reduce((sum, item) => sum + Number(item.amount || item.Amount || 0), 0);
        }
        return totalOutflow * 0.6;
    }, [feed, totalOutflow]);

    const pendingObligations = useMemo(() => {
        return Number(stats?.pendingCollections || stats?.PendingCollections || stats?.totalExpensesAccrual || stats?.TotalExpensesAccrual || 0);
    }, [stats]);

    const formatKAmount = (num) => {
        const val = Number(num) || 0;
        if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k`;
        return val.toLocaleString('en-IN');
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                    Expense Feed
                </h1>
                <p className="text-xs text-zinc-500 tracking-tight">Timeline of confirmed money-out events (SpendFacts).</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard 
                    title="Total Outflow" 
                    value={`₹ ${formatKAmount(totalOutflow)}`} 
                    subtitle={`Last ${filterRange === '30D' ? '30' : '7'} Days`}
                />
                <SummaryCard 
                    title="Cash Paid Out" 
                    value={`₹ ${formatKAmount(cashOutflow)}`} 
                    subtitle="Physical Currency"
                />
                <SummaryCard 
                    title="Digital Transfers" 
                    value={`₹ ${formatKAmount(digitalOutflow)}`} 
                    subtitle="Bank/UPI/Card"
                />
                <SummaryCard 
                    title="Pending Obligations" 
                    value={`₹ ${formatKAmount(pendingObligations)}`} 
                    type="warning"
                    subtitle="Accrued Liabilities"
                />
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-zinc-900/20 border dark:border-zinc-800 border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                {/* Table Filter Bar */}
                <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-2">
                        {['Today', '7D', '30D', 'All Time'].map(range => (
                            <button 
                                key={range}
                                onClick={() => setFilterRange(range)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filterRange === range ? 'bg-synos-primary text-white' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input 
                                type="text" 
                                placeholder="Search Payee or Reference..." 
                                className="pl-9 pr-4 py-1.5 bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-synos-primary/50"
                            />
                        </div>
                        <button className="p-2 rounded-lg border dark:border-zinc-800 border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <Filter className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/30 dark:bg-zinc-900/20">
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date & Time</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Payee</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Category</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Amount</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Mode</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-xs text-zinc-500 animate-pulse">Reconstructing operational timeline...</td>
                                </tr>
                            ) : feed.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-xs text-zinc-500">No confirmed money-out events found.</td>
                                </tr>
                            ) : (
                                feed.map((fact) => (
                                    <tr key={fact.spendFactId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                                                    {new Date(fact.occurredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] text-zinc-400">
                                                    {new Date(fact.occurredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-[10px] font-bold text-rose-600">
                                                    {fact.payeeName?.substring(0, 1)}
                                                </div>
                                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{fact.payeeName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Tag className="w-3 h-3 text-zinc-400" />
                                                <span className="text-xs text-zinc-500">{fact.categoryLabel || fact.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">₹{fact.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded border ${fact.paymentMode === 'Cash' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                                                {fact.paymentMode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-[10px] font-mono text-zinc-400">{fact.reference}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- 2. VENDOR PAYABLES SCREEN (Grouped Ledger) ---

export const VendorPayablesScreen = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedVendor, setExpandedVendor] = useState(null);
    const [vendorBills] = useState({});
    const [settlementModal, setSettlementModal] = useState({ isOpen: false, vendor: null });

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getVendorPayablesSummary();
            setSummary(data);
        } catch (err) {
            console.error("Failed to load vendor summary:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleVendor = async (vendorId) => {
        if (expandedVendor === vendorId) {
            setExpandedVendor(null);
            return;
        }

        setExpandedVendor(vendorId);
        
        // Fetch specific bills if not already loaded (Optimization)
        if (!vendorBills[vendorId]) {
            try {
                // In a real app, you'd fetch bills for this vendor
                // For now, we'll assume the API returns enough in summary or we use a sub-fetch
                // const bills = await FinanceApi.getVendorBills(vendorId);
                // setVendorBills(prev => ({ ...prev, [vendorId]: bills }));
            } catch (err) {
                console.error("Failed to load vendor bills:", err);
            }
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-synos-primary" />
                    Vendor Payables
                </h1>
                <p className="text-xs text-zinc-500 tracking-tight">Active liabilities and outstanding obligations to suppliers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard title="Total Payable" value={summary.reduce((acc, v) => acc + v.totalOutstanding, 0).toLocaleString()} subtitle="Across all vendors" />
                <SummaryCard title="Overdue (30d+)" value={summary.reduce((acc, v) => acc + v.aging_30_Plus, 0).toLocaleString()} type="warning" subtitle="Priority Clearance" />
                <SummaryCard title="Upcoming Dues" value={summary.reduce((acc, v) => acc + (v.totalOutstanding - v.aging_30_Plus), 0).toLocaleString()} subtitle="Next 30 Days" />
                <SummaryCard title="Active Vendors" value={summary.length.toString()} subtitle="Supplying Lab" />
            </div>

            <div className="bg-white dark:bg-zinc-900/20 border dark:border-zinc-800 border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/30 dark:bg-zinc-900/20">
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Vendor Name</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Bills</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Oldest Bill</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Total Outstanding</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-xs text-zinc-500 animate-pulse">Calculating vendor liabilities...</td>
                                </tr>
                            ) : summary.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-xs text-zinc-500">No outstanding vendor payables.</td>
                                </tr>
                            ) : (
                                summary.map((vendor) => (
                                    <React.Fragment key={vendor.vendorId}>
                                        <tr 
                                            onClick={() => toggleVendor(vendor.vendorId)}
                                            className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border dark:border-zinc-700 border-zinc-200">
                                                        <Building2 className="w-4 h-4 text-zinc-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{vendor.vendorName}</p>
                                                        <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Verified Supplier</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{vendor.billCount}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                                    <span className="text-xs text-zinc-500">
                                                        {vendor.oldestDueDate ? new Date(vendor.oldestDueDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">₹{vendor.totalOutstanding.toLocaleString()}</p>
                                                {vendor.aging_30_Plus > 0 && (
                                                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">₹{vendor.aging_30_Plus.toLocaleString()} Overdue</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    className="px-3 py-1.5 bg-synos-primary text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-sm hover:bg-synos-primary/90 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSettlementModal({ isOpen: true, vendor });
                                                    }}
                                                >
                                                    Settle Bulk
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Expandable Row Content Placeholder */}
                                        {expandedVendor === vendor.vendorId && (
                                            <tr className="bg-zinc-50/50 dark:bg-zinc-950/40 border-l-2 border-synos-primary">
                                                <td colSpan="5" className="px-6 py-4">
                                                    <div className="flex flex-col gap-4">
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="p-3 rounded-lg border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900">
                                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Current (0-7d)</p>
                                                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">₹{vendor.aging_0_7.toLocaleString()}</p>
                                                            </div>
                                                            <div className="p-3 rounded-lg border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900">
                                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Recent (7-30d)</p>
                                                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">₹{vendor.aging_7_30.toLocaleString()}</p>
                                                            </div>
                                                            <div className="p-3 rounded-lg border dark:border-zinc-800 border-zinc-200 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20">
                                                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Critical (30d+)</p>
                                                                <p className="text-sm font-bold text-rose-600">₹{vendor.aging_30_Plus.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500 italic">
                                                            * Expanding specific bill drill-down requires additional server-side projection.
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <BulkSettleVendorModal 
                isOpen={settlementModal.isOpen}
                vendor={settlementModal.vendor}
                onClose={() => setSettlementModal({ isOpen: false, vendor: null })}
                onSettled={() => loadSummary()}
            />
        </div>
    );
};

// --- 3. DAILY EXPENSES SCREEN (High-Velocity Quick Log) ---

export const DailyExpensesScreen = () => {
    const [isSaving, setIsSaving] = useState(false);
    const [recentLogs, setRecentLogs] = useState([]);
    const [formData, setFormData] = useState({
        amount: '',
        category: 'Misc',
        description: '',
        paymentMethod: 'Cash'
    });

    const categories = [
        { id: 'Misc', label: 'Miscellaneous', icon: Tag },
        { id: 'Tea', label: 'Tea & Snacks', icon: Coffee },
        { id: 'Repairs', label: 'Repairs & Maintenance', icon: Zap },
        { id: 'Logistics', label: 'Courier & Logistics', icon: Truck },
        { id: 'Electricity', label: 'Electricity/Water', icon: Zap },
        { id: 'Rent', label: 'Rent/Lease', icon: Building2 },
        { id: 'Staff', label: 'Staff Welfare', icon: Users2 }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.description) return;

        try {
            setIsSaving(true);
            await FinanceApi.recordDailyExpense({
                ...formData,
                amount: parseFloat(formData.amount)
            });
            
            // Clear form
            setFormData({
                amount: '',
                category: 'Misc',
                description: '',
                paymentMethod: 'Cash'
            });

            // Update recent local list
            setRecentLogs(prev => [
                { id: Date.now(), ...formData, amount: parseFloat(formData.amount), time: new Date().toLocaleTimeString() },
                ...prev.slice(0, 4)
            ]);

        } catch (err) {
            console.error("Failed to record daily expense:", err);
            alert("Failed to record expense. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-emerald-500" />
                    Daily Expenses
                </h1>
                <p className="text-xs text-zinc-500 tracking-tight">Rapid operational logging for overheads and petty cash outflows.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                {/* Entry Form */}
                <div className="bg-white dark:bg-zinc-900/20 border dark:border-zinc-800 border-zinc-200 rounded-2xl p-8 flex flex-col shadow-sm">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">Record New Payout</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Amount Entry (Giant/Fast) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Amount (₹)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-400 group-focus-within:text-emerald-500 transition-colors">₹</span>
                                <input 
                                    type="number"
                                    required
                                    autoFocus
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                    className="w-full pl-10 pr-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-3xl font-black focus:outline-none focus:border-emerald-500/50 focus:bg-white dark:focus:bg-zinc-950 transition-all dark:text-zinc-100"
                                />
                            </div>
                        </div>

                        {/* Category Selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Category</label>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setFormData({...formData, category: cat.id})}
                                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${formData.category === cat.id ? 'bg-synos-primary/10 border-synos-primary text-synos-primary' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'}`}
                                    >
                                        <cat.icon className="w-4 h-4" />
                                        <span className="text-[10px] font-bold">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Description / Notes</label>
                            <input 
                                type="text"
                                required
                                placeholder="e.g. Courier charges for biopsy samples"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-synos-primary/50 dark:text-zinc-300"
                            />
                        </div>

                        {/* Payment Mode */}
                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex-1 flex gap-2">
                                {['Cash', 'UPI', 'BankTransfer'].map(mode => (
                                    <button 
                                        key={mode}
                                        type="button"
                                        onClick={() => setFormData({...formData, paymentMethod: mode})}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${formData.paymentMethod === mode ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            disabled={isSaving}
                            className={`w-full py-4 rounded-2xl bg-synos-primary text-white font-bold text-sm shadow-lg shadow-synos-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-50' : ''}`}
                        >
                            {isSaving ? 'Logging Truth...' : 'Confirm & Log Payout'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                {/* Local History (Just logged) */}
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Just Logged</h3>
                    <div className="space-y-3">
                        {recentLogs.length === 0 ? (
                            <div className="p-8 border-2 border-dashed dark:border-zinc-800 border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-zinc-400">
                                <IndianRupee className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-xs italic">No entries in current session.</p>
                            </div>
                        ) : (
                            recentLogs.map(log => (
                                <div key={log.id} className="p-4 rounded-xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900/40 flex items-center justify-between animate-in slide-in-from-right duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{log.description}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase font-medium">{log.category} • {log.time}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">₹{log.amount.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-synos-primary uppercase">{log.paymentMethod}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-auto p-6 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Session Total</p>
                            <p className="text-2xl font-black">₹{recentLogs.reduce((acc, l) => acc + l.amount, 0).toLocaleString()}</p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 opacity-20" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 4. OUTSOURCED PAYABLES SCREEN (Reference Lab Reconciliation) ---

const SettleOutsourcedModal = ({ isOpen, onClose, payable, onSettled }) => {
    const [amount, setAmount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (payable) setAmount(payable.amountDue - payable.amountPaid);
    }, [payable]);

    if (!isOpen || !payable) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await FinanceApi.settleOutsourcedPayable(payable.id, amount);
            onSettled();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight">Lab Settlement</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{payable.referenceLabName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Patient & Test</p>
                        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-white/5 border dark:border-zinc-800 border-zinc-200">
                            <p className="text-sm font-bold dark:text-zinc-200">{payable.patientName}</p>
                            <p className="text-xs text-zinc-500">{payable.testName}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Payment Amount (₹)</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-zinc-400">₹</span>
                            <input 
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                                className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl pl-12 pr-6 py-4 text-xl font-black focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                max={payable.amountDue - payable.amountPaid}
                                min={1}
                            />
                        </div>
                        <p className="text-[10px] text-zinc-400 ml-4">Balance: ₹{(payable.amountDue - payable.amountPaid).toLocaleString()}</p>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting || amount <= 0}
                        className="w-full bg-synos-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Recording...' : 'Authorize Payout'}
                        <CheckCircle2 className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

const ResolvePricingModal = ({ isOpen, onClose, payable, onResolved }) => {
    const [cost, setCost] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (payable) setCost(payable.amountDue || 0);
    }, [payable]);

    if (!isOpen || !payable) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await FinanceApi.resolvePricing({
                payableId: payable.id,
                cost: parseFloat(cost)
            });
            onResolved();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight">Resolve Vendor Cost</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{payable.referenceLabName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Organic Discovery
                        </p>
                        <p className="text-xs text-amber-700 leading-tight">Setting this cost will create a permanent pricing rule for <b>{payable.testName}</b> at this lab.</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Test & Sample</p>
                        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-white/5 border dark:border-zinc-800 border-zinc-200">
                            <p className="text-sm font-bold dark:text-zinc-200">{payable.testName}</p>
                            <p className="text-xs text-zinc-500">Patient: {payable.patientName}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Actual Vendor Cost (₹)</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-zinc-400">₹</span>
                            <input 
                                type="number"
                                required
                                autoFocus
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl pl-12 pr-6 py-4 text-xl font-black focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                min={0}
                                step={0.01}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting || cost < 0}
                        className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Updating Intel...' : 'Resolve & Create Rule'}
                        <ShieldCheck className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export const OutsourcedPayablesScreen = ({ isTerminal = false }) => {
    const { tab = 'active' } = useParams();
    const navigate = useNavigate();
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settleModal, setSettleModal] = useState({ isOpen: false, payable: null });
    const [pricingModal, setPricingModal] = useState({ isOpen: false, payable: null });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getOutsourcedPayables();
            setPayables(data);
        } catch (err) {
            console.error("Failed to load outsourced payables:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPayables = payables.filter(p => {
        const matchesSearch = p.referenceLabName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.testName.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;
        
        if (tab === 'pricing') return p.status === 'PendingPricing';
        if (tab === 'active') return p.status === 'Pending' || p.status === 'PartiallyPaid';
        if (tab === 'history') return p.status === 'Settled';
        
        return true;
    });

    const stats = {
        totalDue: payables.reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0),
        pendingCount: payables.filter(p => p.status === 'Pending' || p.status === 'PartiallyPaid').length,
        pendingPricing: payables.filter(p => p.status === 'PendingPricing').length,
        settledToday: payables.filter(p => p.status === 'Settled' && new Date(p.settledAt).toDateString() === new Date().toDateString())
            .reduce((acc, p) => acc + p.amountPaid, 0)
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {!isTerminal && (
                <>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                                <Beaker className="w-5 h-5 text-synos-primary" />
                                Outsourced Lab Payables
                            </h1>
                            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/5 p-1 rounded-xl border dark:border-white/10 border-zinc-200">
                                {['active', 'pricing', 'labs', 'history'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => navigate(`/finance/outsourcing/${t}`)}
                                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all relative ${
                                            tab === t 
                                                ? 'bg-white dark:bg-zinc-800 text-synos-primary shadow-sm shadow-black/5' 
                                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                        }`}
                                    >
                                        {t.replace('-', ' ')}
                                        {t === 'pricing' && stats.pendingPricing > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-950 animate-pulse">
                                                {stats.pendingPricing}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 tracking-tight">Reference lab reconciliation and external test settlement management.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <SummaryCard title="Total Lab Liability" value={stats.totalDue.toLocaleString()} subtitle="Aggregate balance due" />
                        <SummaryCard title="Pending Pricing" value={stats.pendingPricing.toString()} type={stats.pendingPricing > 0 ? 'negative' : 'neutral'} subtitle="Missing Vendor Costs" />
                        <SummaryCard title="Pending Payouts" value={stats.pendingCount.toString()} type="warning" subtitle="Awaiting settlement" />
                        <SummaryCard title="Settled Today" value={stats.settledToday.toLocaleString()} type="positive" subtitle="Confirmed money-out" />
                    </div>
                </>
            )}

            <div className="bg-white dark:bg-zinc-900/20 border dark:border-zinc-800 border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="Search Lab, Patient or Test..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-1.5 bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg text-xs w-80 focus:outline-none focus:ring-1 focus:ring-synos-primary/50"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {tab === 'labs' ? (
                        <ReferenceLabsView />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/30 dark:bg-zinc-900/20">
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Patient & Test</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Reference Lab</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Amount</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Status</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-xs text-zinc-500 animate-pulse">Synchronizing with reference lab facts...</td>
                                    </tr>
                                ) : filteredPayables.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-xs text-zinc-500">No {tab} records found.</td>
                                    </tr>
                                ) : (
                                    filteredPayables.map((payable) => (
                                        <tr key={payable.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4 text-xs text-zinc-500">
                                                {new Date(payable.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{payable.patientName}</span>
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-tight">{payable.testName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{payable.referenceLabName}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">₹{payable.amountDue.toLocaleString()}</p>
                                                {payable.amountPaid > 0 && (
                                                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">₹{payable.amountPaid.toLocaleString()} Paid</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={payable.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {payable.status === 'PendingPricing' ? (
                                                    <button 
                                                        onClick={() => setPricingModal({ isOpen: true, payable })}
                                                        className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center gap-1.5"
                                                    >
                                                        <AlertCircle className="w-3 h-3" /> Resolve
                                                    </button>
                                                ) : payable.status !== 'Settled' && tab !== 'history' && (
                                                    <button 
                                                        onClick={() => setSettleModal({ isOpen: true, payable })}
                                                        className="px-3 py-1.5 bg-synos-primary text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-sm hover:bg-synos-primary/90 transition-colors"
                                                    >
                                                        Settle
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <SettleOutsourcedModal 
                isOpen={settleModal.isOpen}
                payable={settleModal.payable}
                onClose={() => setSettleModal({ isOpen: false, payable: null })}
                onSettled={() => loadData()}
            />

            <ResolvePricingModal 
                isOpen={pricingModal.isOpen}
                payable={pricingModal.payable}
                onClose={() => setPricingModal({ isOpen: false, payable: null })}
                onResolved={() => loadData()}
            />
        </div>
    );
};

const ReferenceLabsView = () => {
    const [labs, setLabs] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
    const [selectedLab, setSelectedLab] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchLabs();
    }, []);

    const fetchLabs = async () => {
        try {
            setLoading(true);
            const [labsData, auditData] = await Promise.all([
                FinanceApi.getReferenceLabs(),
                FinanceApi.getLabAuditLogs()
            ]);
            setLabs(labsData || []);
            setAuditLogs(auditData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivateRequest = (lab) => {
        setSelectedLab(lab);
        setIsActivationModalOpen(true);
    };

    return (
        <div className="p-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black dark:text-white uppercase tracking-tight">Reference Partners</h2>
                    <p className="text-xs text-zinc-500 font-medium">Manage external laboratory outsourcing and activations</p>
                </div>
                <button 
                    onClick={() => {
                        setSelectedLab(null);
                        setIsPartnerModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-synos-primary text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all"
                >
                    <UserPlus className="w-4 h-4" /> REGISTER NEW PARTNER
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-zinc-500 animate-pulse">Synchronizing reference partner directory...</div>
                ) : labs.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-[2rem] border-2 border-dashed dark:border-zinc-800 border-zinc-200">
                        <Beaker className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">No reference labs registered.</p>
                    </div>
                ) : (
                    labs.map(lab => (
                        <div key={lab.id} className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-synos-primary/20">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-synos-primary/10 flex items-center justify-center text-synos-primary group-hover:scale-110 transition-transform">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">{lab.name}</h4>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            {lab.status === 1 || lab.status === 'Provisional' ? (
                                                <span className="text-amber-500">Provisional Partner</span>
                                            ) : (
                                                <span className="text-emerald-500">Active Partner</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            setSelectedLab(lab);
                                            setIsPartnerModalOpen(true);
                                        }}
                                        className="p-2 bg-zinc-100 dark:bg-white/5 text-zinc-500 rounded-xl hover:text-synos-primary transition-all"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                    {lab.status === 1 || lab.status === 'Provisional' ? (
                                        <button 
                                            onClick={() => handleActivateRequest(lab)}
                                            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-bold hover:bg-amber-600 transition-all uppercase tracking-widest shadow-lg shadow-amber-500/20"
                                        >
                                            Approve
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                            <ShieldCheck size={10} /> Active
                                        </div>
                                    )}
                                    <button 
                                        onClick={async () => {
                                            if (window.confirm(`Are you sure you want to deactivate ${lab.name}?`)) {
                                                await FinanceApi.deleteReferenceLab(lab.id);
                                                fetchLabs();
                                            }
                                        }}
                                        className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                                        title="Delete Partner"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                                    <Mail className="w-3.5 h-3.5 opacity-50" />
                                    <span>{lab.email || 'No email provided'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                                    <Phone className="w-3.5 h-3.5 opacity-50" />
                                    <span>{lab.phone || 'No phone provided'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                                    <MapPin className="w-3.5 h-3.5 opacity-50" />
                                    <span className="truncate">{lab.address || 'No address provided'}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedLab(lab);
                                    setIsRateModalOpen(true);
                                }}
                                className="w-full mt-6 py-3 bg-zinc-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-synos-primary hover:bg-synos-primary/5 transition-all"
                            >
                                View Rate List
                            </button>
                        </div>
                    ))
                )}
            </div>

            {isPartnerModalOpen && (
                <ReferenceLabPartnerModal 
                    lab={selectedLab} 
                    onClose={() => {
                        setIsPartnerModalOpen(false);
                        setSelectedLab(null);
                    }} 
                    onSave={fetchLabs} 
                />
            )}

            {isRateModalOpen && (
                <ReferenceLabRateListModal 
                    isOpen={isRateModalOpen} 
                    lab={selectedLab} 
                    onClose={() => {
                        setIsRateModalOpen(false);
                        setSelectedLab(null);
                    }} 
                />
            )}

            {isActivationModalOpen && (
                <ReferenceLabActivationModal
                    lab={selectedLab}
                    onClose={() => {
                        setIsActivationModalOpen(false);
                        setSelectedLab(null);
                    }}
                    onSave={fetchLabs}
                />
            )}
        </div>
    );
};

const ReferenceLabActivationModal = ({ lab, onClose, onSave }) => {
    const [pendingTests, setPendingTests] = useState([]);
    const [rates, setRates] = useState({}); // { testId: price }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (lab) fetchPendingTests();
    }, [lab]);

    const fetchPendingTests = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getPendingTestsForLab(lab.id);
            setPendingTests(data || []);
            
            // Pre-fill rates with suggested prices
            const initialRates = {};
            data?.forEach(t => {
                initialRates[t.testId] = t.suggestedPrice || 0;
            });
            setRates(initialRates);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const ratePayload = Object.entries(rates).map(([testId, cost]) => ({
                testId,
                cost: parseFloat(cost)
            }));

            await FinanceApi.activateReferenceLabWithRates(lab.id, {
                userId: localStorage.getItem('synos_user_id') || '00000000-0000-0000-0000-000000000000',
                rates: ratePayload
            });

            onSave();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border dark:border-zinc-900 border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black dark:text-white tracking-tight uppercase">Partner Activation</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{lab.name}</p>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                        Transitioning this partner to <span className="text-emerald-500 font-bold">ACTIVE</span> status. 
                        Please finalize the vendor rates for tests processed during the provisional phase. These will become binding rules.
                    </p>
                </div>

                <div className="p-8 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <div className="py-20 text-center animate-pulse text-zinc-500 text-xs font-bold uppercase tracking-widest">Identifying pending rate resolutions...</div>
                    ) : pendingTests.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <p className="text-sm font-bold dark:text-white">No pending pricing resolutions found.</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">You can proceed with activation immediately.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingTests.map(test => (
                                <div key={test.testId} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border dark:border-zinc-800 border-zinc-100">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black dark:text-white uppercase tracking-tight">{test.testName}</span>
                                        <span className="text-[9px] text-zinc-500 font-bold tracking-widest">{test.testCode}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Suggested (Max)</p>
                                            <p className="text-xs font-bold text-zinc-500 italic">₹{test.suggestedPrice || 0}</p>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                            <input 
                                                type="number"
                                                value={rates[test.testId] || ''}
                                                onChange={(e) => setRates({ ...rates, [test.testId]: e.target.value })}
                                                className="w-24 pl-6 pr-3 py-2 bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl text-xs font-black text-synos-primary focus:ring-2 focus:ring-synos-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t dark:border-zinc-800 border-zinc-200 bg-zinc-50/50 dark:bg-zinc-900/40 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                    >
                        ABORT
                    </button>
                    <button 
                        disabled={submitting || loading}
                        onClick={handleSubmit}
                        className="flex-[2] py-4 bg-synos-primary text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:shadow-xl hover:shadow-synos-primary/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {submitting ? 'COMMITTING RULES...' : 'AUTHORIZE PARTNER & SYNC RATES'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReferenceLabRateListModal = ({ isOpen, onClose, lab }) => {
    const [rates, setRates] = useState([]);
    const [pendingTests, setPendingTests] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newRate, setNewRate] = useState({ testId: '', cost: '' });
    const [isNewTest, setIsNewTest] = useState(false);
    const [testForm, setTestForm] = useState({ name: '', code: '', basePrice: '', department: '' });

    useEffect(() => {
        if (isOpen && lab) fetchData();
    }, [isOpen, lab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rulesData, pendingData, testsData, deptsData] = await Promise.all([
                FinanceApi.getLabRates(lab.id),
                FinanceApi.getPendingTestsForLab(lab.id),
                FinanceApi.getTests(),
                FinanceApi.getDepartments()
            ]);
            setRates(rulesData || []);
            setPendingTests(pendingData || []);
            setAllTests(testsData || []);
            
            // Extract unique departments from operational resources
            const uniqueDepts = Array.from(new Set(deptsData.map(r => r.departmentCode))).filter(Boolean);
            setDepartments(uniqueDepts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRate = async () => {
        try {
            setSubmitting(true);
            let testId = newRate.testId;

            if (isNewTest) {
                if (!testForm.department) {
                    alert("Please assign a clinical department (Workbench) for this test.");
                    return;
                }
                // Tier 1 & 2: Create Test and Define Patient Price (X)
                const newTest = await FinanceApi.createTest({
                    testName: testForm.name,
                    testCode: testForm.code,
                    department: testForm.department,
                    basePrice: parseFloat(testForm.basePrice),
                    isOutsourced: true,
                    tat_Hours: 24
                });
                testId = newTest.testId;
            }

            if (!testId || !newRate.cost) {
                alert("Please select/create a test and enter the vendor cost.");
                return;
            }

            // Tier 3: Define Vendor Cost (Y)
            await FinanceApi.addRateToLab(lab.id, {
                testId: testId,
                cost: parseFloat(newRate.cost)
            });

            setNewRate({ testId: '', cost: '' });
            setTestForm({ name: '', code: '', basePrice: '', department: '' });
            setIsNewTest(false);
            fetchData();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const hasNoData = rates.length === 0 && pendingTests.length === 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border dark:border-zinc-900 border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
                    <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight uppercase">Rate Intelligence</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{lab.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white dark:bg-zinc-950 z-10">
                            <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/30 dark:bg-zinc-900/20">
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Test Detail</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Status</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Vendor Price (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                            {/* Unified Entry Row */}
                            <tr className="bg-synos-primary/5 border-b-2 border-synos-primary/10">
                                <td className="px-6 py-6" colSpan={isNewTest ? 2 : 1}>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <button 
                                                onClick={() => setIsNewTest(false)}
                                                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${!isNewTest ? 'bg-synos-primary text-white shadow-md' : 'bg-zinc-200 text-zinc-500'}`}
                                            >
                                                Existing Catalog
                                            </button>
                                            <button 
                                                onClick={() => setIsNewTest(true)}
                                                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${isNewTest ? 'bg-synos-primary text-white shadow-md' : 'bg-zinc-200 text-zinc-500'}`}
                                            >
                                                + New Definition
                                            </button>
                                        </div>

                                        {!isNewTest ? (
                                            <div className="space-y-2">
                                                <select 
                                                    value={newRate.testId}
                                                    onChange={(e) => setNewRate({...newRate, testId: e.target.value})}
                                                    className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-synos-primary/20"
                                                >
                                                    <option value="">Select Test to Add...</option>
                                                    {allTests.filter(t => !rates.find(r => r.testId === t.testId)).map(t => (
                                                        <option key={t.testId} value={t.testId}>
                                                            {t.testName} ({t.testCode})
                                                        </option>
                                                    ))}
                                                </select>
                                                {newRate.testId && (
                                                    <div className="flex items-center gap-2 px-2 bg-emerald-500/10 py-1 rounded-lg border border-emerald-500/20">
                                                        <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Patient Price (X):</span>
                                                        <span className="text-[10px] font-bold text-emerald-600">₹{allTests.find(t => t.testId === newRate.testId)?.basePrice?.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-left-2 duration-300">
                                                <input 
                                                    placeholder="Test Name"
                                                    value={testForm.name}
                                                    onChange={(e) => setTestForm({...testForm, name: e.target.value})}
                                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <input 
                                                    placeholder="Code"
                                                    value={testForm.code}
                                                    onChange={(e) => setTestForm({...testForm, code: e.target.value})}
                                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <select 
                                                    value={testForm.department}
                                                    onChange={(e) => setTestForm({...testForm, department: e.target.value})}
                                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl text-[10px] font-bold outline-none"
                                                >
                                                    <option value="">Select Workbench...</option>
                                                    {departments.map(d => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500">X: ₹</span>
                                                    <input 
                                                        type="number"
                                                        value={testForm.basePrice}
                                                        onChange={(e) => setTestForm({...testForm, basePrice: e.target.value})}
                                                        className="w-full pl-10 pr-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-600 outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                {!isNewTest && (
                                    <td className="px-6 py-4 text-center">
                                        <div className="w-4 h-4 rounded-full border-2 border-synos-primary/20 mx-auto" />
                                    </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                    <div className="space-y-3">
                                        <div className="relative inline-block w-full">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-500">VENDOR COST (Y): ₹</span>
                                            <input 
                                                type="number"
                                                placeholder="0.00"
                                                value={newRate.cost}
                                                onChange={(e) => setNewRate({...newRate, cost: e.target.value})}
                                                className="w-full pl-32 pr-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] font-black text-amber-600 outline-none focus:ring-2 focus:ring-amber-500/20"
                                            />
                                        </div>
                                        <button 
                                            disabled={submitting || (!isNewTest && !testForm.name && isNewTest) || (!isNewTest && !newRate.testId) || !newRate.cost}
                                            onClick={handleAddRate}
                                            className="w-full py-2.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-xl"
                                        >
                                            {submitting ? 'SYNCING...' : 'COMMIT RULE'}
                                        </button>
                                    </div>
                                </td>
                            </tr>

                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-10 text-center text-xs text-zinc-500 animate-pulse font-bold uppercase tracking-widest">Retrieving pricing facts...</td>
                                </tr>
                            ) : hasNoData ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-10 text-center text-xs text-zinc-500 italic">No pricing data discovered yet for this partner.</td>
                                </tr>
                            ) : (
                                <>
                                    {rates.map(rate => (
                                        <tr key={rate.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-tight">{rate.testName}</span>
                                                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{rate.testCode}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Contracted</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-black text-synos-primary">₹{rate.cost.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingTests.map(test => (
                                        <tr key={test.testId} className="group hover:bg-amber-500/5 transition-colors border-l-4 border-l-amber-500/20">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col opacity-70">
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-tight">{test.testName}</span>
                                                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{test.testCode}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-500/20">Proposed</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-black text-amber-600">₹{test.suggestedPrice.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t dark:border-zinc-800 border-zinc-200 bg-zinc-50/30 dark:bg-zinc-900/20 flex justify-between items-center">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        {pendingTests.length > 0 && <span className="text-amber-500 italic">Contains unconfirmed reception intelligence</span>}
                    </p>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        CLOSE LIST
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReferenceLabPartnerModal = ({ onClose, onSave, lab }) => {
    const isEdit = !!lab;
    const [formData, setFormData] = useState({
        name: lab?.name || '',
        location: lab?.address || '',
        email: lab?.email || '',
        phone: lab?.phone || '',
        status: lab?.status === 2 || lab?.status === 'Active' ? 'Active' : 'Provisional'
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            if (isEdit) {
                await FinanceApi.updateReferenceLab(lab.id, formData);
            } else {
                await FinanceApi.createDraftReferenceLab(formData);
            }
            onSave();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 flex justify-between items-center border-b dark:border-zinc-900 border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-synos-primary/10 text-synos-primary rounded-2xl">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">{isEdit ? 'Update Details' : 'Partner Onboarding'}</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">{isEdit ? 'Modify reference partner metadata' : 'Register a new reference laboratory'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Laboratory Name</label>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                                placeholder="e.g. Metropolis Labs, SRL Diagnostics"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                                <input 
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                                    placeholder="partner@lab.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Phone Number</label>
                                <input 
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Address / Location</label>
                            <textarea 
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-synos-primary/20 outline-none transition-all resize-none"
                                placeholder="Complete lab address..."
                            />
                        </div>
                        {!isEdit && (
                            <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Immediate Activation</p>
                                    <p className="text-[9px] text-emerald-700 opacity-60">Bypass provisional status and activate now.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: formData.status === 'Active' ? 'Provisional' : 'Active' })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.status === 'Active' ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-2xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                        >
                            CANCEL
                        </button>
                        <button 
                            disabled={submitting}
                            className="flex-1 py-4 bg-synos-primary text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-synos-primary/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submitting ? 'PROCESSING...' : (isEdit ? 'SAVE CHANGES' : 'REGISTER PARTNER')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- UNIFIED EXPENSES TERMINAL & OVERVIEW TAB ---

export const ExpenseOverviewTab = () => {
    const [stats, setStats] = useState(null);
    const [recentExpenses, setRecentExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [prof, payablesSum, overheads, feed] = await Promise.all([
                    FinanceApi.getProfitabilitySummary().catch(() => ({})),
                    FinanceApi.getVendorPayablesSummary().catch(() => ({})),
                    FinanceApi.getOverheadExpenses().catch(() => []),
                    FinanceApi.getExpenseFeed().catch(() => [])
                ]);

                const totalOverheadObligation = overheads.reduce((acc, o) => acc + o.amount, 0);
                const unpaidOverheads = overheads.filter(o => o.status !== 'Settled').reduce((acc, o) => acc + o.amount, 0);

                setStats({
                    totalPaid: prof.totalExpensesCash || 0,
                    vendorDue: payablesSum.totalDue || 0,
                    overheadObligation: totalOverheadObligation,
                    unpaidOverheads: unpaidOverheads
                });
                setRecentExpenses(feed.slice(0, 5));
            } catch (err) {
                console.error("Failed to load expense stats:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading || !stats) return <div className="py-20 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Syncing expense ledger...</div>;

    const cards = [
        { title: "Total Paid Out", value: `₹${stats.totalPaid.toLocaleString()}`, description: "Cash outflow (30 days)" },
        { title: "Vendor Liability", value: `₹${stats.vendorDue.toLocaleString()}`, type: "negative", description: "Awaiting settlement" },
        { title: "Active Overheads", value: `₹${stats.overheadObligation.toLocaleString()}`, description: "Total registered monthly template bills" },
        { title: "Unpaid Overheads", value: `₹${stats.unpaidOverheads.toLocaleString()}`, type: "warning", description: "Due in current billing cycle" }
    ];

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="p-6 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{card.title}</h3>
                            {card.type === 'negative' && <ArrowDownRight className="w-4 h-4 text-rose-500 animate-none" />}
                            {card.type === 'warning' && <Clock className="w-4 h-4 text-amber-500 animate-none" />}
                        </div>
                        <p className="text-2xl font-black dark:text-white text-zinc-900 mt-1">{card.value}</p>
                        <p className="text-[10px] text-zinc-400 mt-2 font-medium">{card.description}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl p-8 shadow-sm">
                    <h2 className="text-lg font-bold dark:text-white text-zinc-900 mb-6">Recent Outflows Feed</h2>
                    {recentExpenses.length === 0 ? (
                        <div className="py-16 text-center text-zinc-400 border border-dashed dark:border-zinc-800 rounded-2xl">
                            <p className="text-xs font-semibold">No recent payouts registered.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b dark:border-zinc-900 border-zinc-100 pb-2 text-[10px] uppercase font-bold text-zinc-400">
                                        <th className="pb-3">Date</th>
                                        <th className="pb-3">Description</th>
                                        <th className="pb-3 text-right">Amount</th>
                                        <th className="pb-3 text-center">Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentExpenses.map((t, idx) => (
                                        <tr key={idx} className="border-b dark:border-zinc-900/50 border-zinc-100/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="py-3 text-zinc-500">{new Date(t.occurredAt).toLocaleDateString()}</td>
                                            <td className="py-3 font-semibold dark:text-zinc-200">{t.description || t.notes || 'Operational Payout'}</td>
                                            <td className="py-3 text-right font-black text-rose-500">₹{t.amount?.toLocaleString()}</td>
                                            <td className="py-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold">
                                                    {t.sourceType}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold dark:text-white text-zinc-900 mb-6">Distribution</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border dark:border-zinc-800/50 border-zinc-200/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Vendor settlements</span>
                                    <span className="text-xs font-black dark:text-white">₹{stats.vendorDue.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-synos-primary h-full" style={{ width: '40%' }} />
                                </div>
                            </div>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border dark:border-zinc-800/50 border-zinc-200/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Overhead Payables</span>
                                    <span className="text-xs font-black dark:text-white">₹{stats.unpaidOverheads.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-rose-500 h-full" style={{ width: '60%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ExpenseTerminal = () => {
    const { tab = 'overview' } = useParams();
    const navigate = useNavigate();
    const tabsRef = React.useRef(null);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Settings },
        { id: 'feed', label: 'Expense Feed', icon: History },
        { id: 'payables', label: 'Vendor Payables', icon: IndianRupee },
        { id: 'vendors', label: 'Vendor Master', icon: Building2 },
        { id: 'daily', label: 'Daily Expenses', icon: Zap },
        { id: 'overheads', label: 'Monthly Overheads', icon: Calendar }
    ];

    useEffect(() => {
        if (tabsRef.current) {
            const activeTabEl = tabsRef.current.querySelector('[data-active-tab="true"]');
            if (activeTabEl) {
                activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [tab]);

    return (
        <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50">
            {/* HEADER SECTION */}
            <div className="p-8 pb-4 border-b dark:border-zinc-900 border-zinc-200 bg-white dark:bg-zinc-950 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight flex items-center gap-2">
                        <TrendingDown className="w-6 h-6 text-synos-primary animate-none" />
                        Expenses Command Center
                    </h1>
                    <p className="text-xs text-zinc-500 font-medium">Audit and register daily spending, vendor payouts, and recurring overheads.</p>
                </div>

                {/* TABS STRIP */}
                <div ref={tabsRef} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => navigate(`/finance/expenses/${t.id}`)}
                            data-active-tab={tab === t.id ? "true" : "false"}
                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border shrink-0 ${
                                tab === t.id
                                    ? 'bg-synos-primary/10 border-synos-primary/30 text-synos-primary shadow-sm shadow-synos-primary/5'
                                    : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ACTIVE TAB CONTENT */}
            <div className="flex-1 overflow-y-auto">
                {tab === 'overview' && <ExpenseOverviewTab />}
                {tab === 'feed' && <ExpenseFeedScreen />}
                {tab === 'payables' && <VendorPayablesScreen />}
                {tab === 'vendors' && <VendorMasterScreen />}
                {tab === 'daily' && <DailyExpensesScreen />}
                {tab === 'overheads' && <OverheadExpensesScreen />}
            </div>
        </div>
    );
};

// --- UNIFIED OUTSOURCED TESTS TERMINAL & OVERVIEW TAB ---

export const OutsourcingOverviewTab = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const payables = await FinanceApi.getOutsourcedPayables().catch(() => []);
                const calculatedStats = {
                    totalDue: payables.reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0),
                    pendingCount: payables.filter(p => p.status === 'Pending' || p.status === 'PartiallyPaid').length,
                    pendingPricing: payables.filter(p => p.status === 'PendingPricing').length,
                    settledToday: payables.filter(p => p.status === 'Settled' && new Date(p.settledAt).toDateString() === new Date().toDateString())
                        .reduce((acc, p) => acc + p.amountPaid, 0),
                    recent: payables.slice(0, 5)
                };
                setStats(calculatedStats);
            } catch (err) {
                console.error("Failed to load outsourced stats:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading || !stats) return <div className="py-20 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Syncing reference lab ledger...</div>;

    const cards = [
        { title: "Total Lab Liability", value: `₹${stats.totalDue.toLocaleString()}`, description: "Aggregate balance due" },
        { title: "Pending Pricing", value: stats.pendingPricing.toString(), type: stats.pendingPricing > 0 ? "negative" : "neutral", description: "Missing Vendor Costs" },
        { title: "Pending Payouts", value: stats.pendingCount.toString(), type: "warning", description: "Awaiting settlement" },
        { title: "Settled Today", value: `₹${stats.settledToday.toLocaleString()}`, type: "positive", description: "Confirmed money-out" }
    ];

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="p-6 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{card.title}</h3>
                            {card.type === 'negative' && <ArrowDownRight className="w-4 h-4 text-rose-500 animate-none" />}
                            {card.type === 'warning' && <Clock className="w-4 h-4 text-amber-500 animate-none" />}
                            {card.type === 'positive' && <ArrowUpRight className="w-4 h-4 text-emerald-500 animate-none" />}
                        </div>
                        <p className="text-2xl font-black dark:text-white text-zinc-900 mt-1">{card.value}</p>
                        <p className="text-[10px] text-zinc-400 mt-2 font-medium">{card.description}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-bold dark:text-white text-zinc-900 mb-6">Recent Lab Referrals</h2>
                {stats.recent.length === 0 ? (
                    <div className="py-16 text-center text-zinc-400 border border-dashed dark:border-zinc-800 rounded-2xl">
                        <p className="text-xs font-semibold">No recent outsourced patient referrals.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-900 border-zinc-100 pb-2 text-[10px] uppercase font-bold text-zinc-400">
                                    <th className="pb-3">Reference Lab</th>
                                    <th className="pb-3">Patient</th>
                                    <th className="pb-3">Test</th>
                                    <th className="pb-3 text-right">Balance Due</th>
                                    <th className="pb-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent.map((p, idx) => (
                                    <tr key={idx} className="border-b dark:border-zinc-900/50 border-zinc-100/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="py-3 font-semibold dark:text-zinc-200">{p.referenceLabName}</td>
                                        <td className="py-3 text-zinc-500">{p.patientName}</td>
                                        <td className="py-3 dark:text-zinc-400">{p.testName}</td>
                                        <td className="py-3 text-right font-black text-rose-500">₹{(p.amountDue - p.amountPaid).toLocaleString()}</td>
                                        <td className="py-3 text-center">
                                            <StatusBadge status={p.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export const OutsourcingTerminal = () => {
    const { tab = 'overview' } = useParams();
    const navigate = useNavigate();
    const tabsRef = React.useRef(null);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Settings },
        { id: 'active', label: 'Active Outsourced', icon: Beaker },
        { id: 'pricing', label: 'Pending Pricing', icon: AlertCircle },
        { id: 'labs', label: 'Reference Labs', icon: Building2 },
        { id: 'history', label: 'Settlement History', icon: History }
    ];

    useEffect(() => {
        if (tabsRef.current) {
            const activeTabEl = tabsRef.current.querySelector('[data-active-tab="true"]');
            if (activeTabEl) {
                activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [tab]);

    return (
        <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50">
            {/* HEADER SECTION */}
            <div className="p-8 pb-4 border-b dark:border-zinc-900 border-zinc-200 bg-white dark:bg-zinc-950 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight flex items-center gap-2">
                        <Beaker className="w-6 h-6 text-synos-primary animate-none" />
                        Outsourced Lab Payables
                    </h1>
                    <p className="text-xs text-zinc-500 font-medium">Reference lab reconciliation and external test settlement management.</p>
                </div>

                {/* TABS STRIP */}
                <div ref={tabsRef} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => navigate(`/finance/outsourcing/${t.id}`)}
                            data-active-tab={tab === t.id ? "true" : "false"}
                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border shrink-0 ${
                                tab === t.id
                                    ? 'bg-synos-primary/10 border-synos-primary/30 text-synos-primary shadow-sm shadow-synos-primary/5'
                                    : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ACTIVE TAB CONTENT */}
            <div className="flex-1 overflow-y-auto">
                {tab === 'overview' && <OutsourcingOverviewTab />}
                {tab !== 'overview' && <OutsourcedPayablesScreen isTerminal={true} />}
            </div>
        </div>
    );
};

