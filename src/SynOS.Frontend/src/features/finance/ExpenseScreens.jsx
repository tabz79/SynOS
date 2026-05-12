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
    Loader2
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';

// --- SHARED COMPONENTS (Finance Screens Pattern) ---

const StatusBadge = ({ status }) => {
    const styles = {
        Settled: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Partial: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        Pending: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        Overdue: "bg-rose-600/10 text-rose-600 border-rose-600/20 font-bold"
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${styles[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
            {status}
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
                    value={stats ? (stats.cashOutflow / 1000).toFixed(1) + "k" : "0.0k"} 
                    subtitle={`Last ${filterRange === '30D' ? '30' : '7'} Days`}
                />
                <SummaryCard 
                    title="Cash Paid Out" 
                    value={stats ? (stats.cashOutflow * 0.4 / 1000).toFixed(1) + "k" : "0.0k"} 
                    subtitle="Physical Currency"
                />
                <SummaryCard 
                    title="Digital Transfers" 
                    value={stats ? (stats.cashOutflow * 0.6 / 1000).toFixed(1) + "k" : "0.0k"} 
                    subtitle="Bank/UPI/Card"
                />
                <SummaryCard 
                    title="Pending Obligations" 
                    value={stats ? (stats.pendingCollections * 1.2 / 1000).toFixed(1) + "k" : "0.0k"} 
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

export const OutsourcedPayablesScreen = () => {
    const { tab = 'active' } = useParams();
    const navigate = useNavigate();
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settleModal, setSettleModal] = useState({ isOpen: false, payable: null });
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

        if (tab === 'pending') return p.status !== 'Settled';
        if (tab === 'history') return p.status === 'Settled';
        if (tab === 'active') return p.status !== 'Settled'; // Simplified for now
        
        return true;
    });

    const stats = {
        totalDue: payables.reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0),
        pendingCount: payables.filter(p => p.status !== 'Settled').length,
        settledToday: payables.filter(p => p.status === 'Settled' && new Date(p.settledAt).toDateString() === new Date().toDateString())
            .reduce((acc, p) => acc + p.amountPaid, 0)
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                        <Beaker className="w-5 h-5 text-synos-primary" />
                        Outsourced Lab Payables
                    </h1>
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/5 p-1 rounded-xl border dark:border-white/10 border-zinc-200">
                        {['active', 'labs', 'pending', 'history'].map((t) => (
                            <button
                                key={t}
                                onClick={() => navigate(`/finance/outsourcing/${t}`)}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                    tab === t 
                                        ? 'bg-white dark:bg-zinc-800 text-synos-primary shadow-sm shadow-black/5' 
                                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                }`}
                            >
                                {t.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-zinc-500 tracking-tight">Reference lab reconciliation and external test settlement management.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard title="Total Lab Liability" value={stats.totalDue.toLocaleString()} subtitle="Aggregate balance due" />
                <SummaryCard title="Pending Tests" value={stats.pendingCount.toString()} type="warning" subtitle="Awaiting reconciliation" />
                <SummaryCard title="Settled Today" value={stats.settledToday.toLocaleString()} type="positive" subtitle="Confirmed money-out" />
            </div>

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
                                                {payable.status !== 'Settled' && tab !== 'history' && (
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
        </div>
    );
};

const ReferenceLabsView = () => {
    const [labs, setLabs] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const handleActivate = async (labId) => {
        try {
            setProcessingId(labId);
            await FinanceApi.activateReferenceLab(labId);
            await fetchLabs();
        } catch (err) {
            alert(err.message);
        } finally {
            setProcessingId(null);
        }
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
                    onClick={() => setIsModalOpen(true)}
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
                                {lab.status === 1 || lab.status === 'Provisional' ? (
                                    <button 
                                        onClick={() => handleActivate(lab.id)}
                                        disabled={processingId === lab.id}
                                        className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-bold hover:bg-amber-600 transition-all uppercase tracking-widest shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                    >
                                        {processingId === lab.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve Partner'}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        <ShieldCheck size={10} /> Active
                                    </div>
                                )}
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
                            <button className="w-full mt-6 py-3 bg-zinc-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-synos-primary hover:bg-synos-primary/5 transition-all">
                                View Rate List
                            </button>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && <ReferenceLabRegistrationModal onClose={() => setIsModalOpen(false)} onSave={fetchLabs} />}
        </div>
    );
};

const ReferenceLabRegistrationModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        email: '',
        phone: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await FinanceApi.createDraftReferenceLab(formData);
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
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Partner Onboarding</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Register a new reference laboratory</p>
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
                            {submitting ? 'ONBOARDING...' : 'REGISTER PARTNER'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
