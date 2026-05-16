import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    Download, 
    MoreHorizontal, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    User,
    ArrowRight
} from 'lucide-react';
import { RecordCollectionModal } from './components/RecordCollectionModal';
import { BulkSettleModal } from './components/BulkSettleModal';
import { DepartmentOverview } from './components/FinanceShared';
import { FinanceApi } from '@/api/finance';
import { FinanceUtils } from './components/FinanceUtils';
import { useAuth } from '@/context/AuthContext';

// --- SCREENS ---

export const RevenueOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Use last 30 days by default
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const data = await FinanceApi.getProfitabilitySummary(start.toISOString(), new Date().toISOString());
      setStats(data);
    } catch (err) {
      console.error("Failed to load revenue overview:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing economic truth...</div>;
  
  if (!stats) return (
    <div className="p-20 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-rose-500 w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">Economic Position Unavailable</p>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">The system could not retrieve the profitability summary. This may be due to uninitialized financial schemas.</p>
        <button onClick={loadStats} className="text-[10px] font-bold text-synos-primary hover:underline uppercase tracking-widest">Retry Synchronization</button>
    </div>
  );

  return (
    <DepartmentOverview 
      title="Revenue"
      description="Monitor incoming payments and outstanding collections."
      stats={[
        { title: "Cash Collected", value: `₹${(stats.cashInflow / 100000).toFixed(2)}L`, type: 'positive' },
        { title: "Accrual Revenue", value: `₹${(stats.totalRevenueAccrual / 100000).toFixed(2)}L` },
        { title: "Receivables", value: `₹${(stats.pendingCollections / 100000).toFixed(2)}L`, type: 'warning' },
        { title: "Cash Margin", value: `${stats.cashMarginPercentage.toFixed(1)}%`, type: stats.cashMarginPercentage > 20 ? 'positive' : 'warning' }
      ]}
      activity={[
        { title: "Cash Drawer", meta: "Physical cash in hand", amount: `₹${stats.cashCollected.toLocaleString()}`, time: "Today's Drawer" },
        { title: "Online Payments", meta: "UPI, Card, Bank Transfer", amount: `₹${stats.onlineCollected.toLocaleString()}`, time: "Digital Inflow" }
      ]}
      shortcuts={["Record Collection", "Settle Pending Dues", "Review Billing Issues"]}
    />
  );
};

// --- SHARED COMPONENTS ---

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

const FilterTab = ({ label, count, isActive, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-white dark:bg-zinc-900 shadow-sm text-synos-primary' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
    >
        {label} {count !== undefined && <span className="ml-1.5 opacity-50">({count})</span>}
    </button>
);

// --- SCREENS ---

export const BillsCollectionsScreen = () => {
    const { user } = useAuth();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [dateRange, setDateRange] = useState('All Time');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });

    useEffect(() => {
        loadBills();
    }, []);

    const loadBills = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getFinanceBills();
            setBills(data);
        } catch (err) {
            console.error("Failed to load bills:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordCollection = (bill) => {
        setSelectedBill(bill);
        setIsModalOpen(true);
    };

    const confirmCollection = async (amount) => {
        if (!selectedBill) return;
        // Check if it's a visit-based bill or a partner receivable
        // For now, these are all Visit Invoices. 
        // We need a SettleInvoice endpoint in SettlementsController or similar.
        // Actually, VisitsController has RecordPayment.
        // Let's use the visit payment API.
        
        const response = await fetch(`/api/v1/visits/${selectedBill.visitId}/payment`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ 
                amount, 
                paymentMethod: 'BankTransfer', // Default for Finance Hub
                notes: `Institutional settlement from Finance Hub`
            })
        });

        if (!response.ok) throw new Error("Failed to record payment");
        await loadBills();
    };

    const filteredBills = bills.filter(b => {
        // 1. Status Filter
        if (statusFilter !== 'All') {
            const statusMap = {
                'Pending': 'PENDINGPAYMENT',
                'Partial': 'PARTIALLYPAID',
                'Settled': 'PAID'
            };
            if (b.status.toUpperCase() !== statusMap[statusFilter]) return false;
        }

        // 2. Category Filter (Direct, Partner, Corporate, Insurance)
        if (categoryFilter !== 'All') {
            if (categoryFilter === 'Direct' && b.partnerName !== 'Direct Institutional') return false;
            if (categoryFilter === 'Partner' && b.partnerName === 'Direct Institutional') return false;
            if (categoryFilter === 'Corporate' && !b.partnerName.toUpperCase().includes('CORP')) return false;
            if (categoryFilter === 'Insurance' && !b.partnerName.toUpperCase().includes('INSUR')) return false;
        }

        // 3. Date Filter
        const billDate = new Date(b.date);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (dateRange === 'Today') {
            if (billDate < today) return false;
        } else if (dateRange === 'Yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (billDate < yesterday || billDate >= today) return false;
        } else if (dateRange === 'This Week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (billDate < weekAgo) return false;
        } else if (dateRange === 'This Month') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            if (billDate < monthStart) return false;
        } else if (dateRange === 'All Time') {
            return true;
        } else if (dateRange === 'Custom Range' && customDates.start && customDates.end) {
            const start = new Date(customDates.start);
            const end = new Date(customDates.end);
            end.setHours(23,59,59,999);
            if (billDate < start || billDate > end) return false;
        }

        return true;
    });

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Bills & Collections</h1>
                <p className="text-sm text-zinc-500 font-medium">Track institutional billing, pending dues, and collections.</p>
            </div>

            {/* Action/Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                    {['All', 'Pending', 'Partial', 'Settled'].map(f => (
                        <FilterTab key={f} label={f} isActive={statusFilter === f} onClick={() => setStatusFilter(f)} />
                    ))}
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-2 hidden lg:block" />
                    {['All', 'Direct', 'Partner', 'Corporate', 'Insurance'].map(f => (
                        <FilterTab key={f} label={f} isActive={categoryFilter === f} onClick={() => setCategoryFilter(f)} variant="outline" />
                    ))}
                </div>
                <div className="flex items-center gap-2 px-2">
                    {dateRange === 'Custom Range' && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <input 
                                type="date" 
                                value={customDates.start}
                                onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                                className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-bold text-synos-primary"
                            />
                            <span className="text-zinc-400 text-[10px]">to</span>
                            <input 
                                type="date" 
                                value={customDates.end}
                                onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                                className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-bold text-synos-primary"
                            />
                        </div>
                    )}
                    <select 
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium dark:text-zinc-300 outline-none focus:border-synos-primary transition-all"
                    >
                        <option>Today</option>
                        <option>Yesterday</option>
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>All Time</option>
                        <option>Custom Range</option>
                    </select>
                </div>
            </div>

            {/* Main Table Surface */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Synchronizing bill ledger...</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Bill No</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Patient</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Partner/Account</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Total</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Collected</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Pending</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {filteredBills.map((bill) => (
                                <tr key={bill.billId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 text-xs font-bold dark:text-zinc-200">{bill.billNumber}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                                {bill.patientName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-semibold dark:text-zinc-200">{bill.patientName}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-zinc-500">{bill.partnerName}</td>
                                    <td className="p-4 text-xs font-bold text-right dark:text-zinc-300">₹{bill.totalAmount.toLocaleString()}</td>
                                    <td className="p-4 text-xs font-semibold text-right text-emerald-500">₹{bill.collectedAmount.toLocaleString()}</td>
                                    <td className="p-4 text-xs font-bold text-right text-rose-500">₹{bill.pendingAmount.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <StatusBadge status={bill.status} />
                                    </td>
                                    <td className="p-4 text-xs text-zinc-400">{new Date(bill.date).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleRecordCollection(bill)}
                                                className="px-3 py-1.5 rounded-lg bg-synos-primary/10 text-synos-primary text-[10px] font-bold uppercase tracking-wider hover:bg-synos-primary hover:text-white transition-all"
                                            >
                                                Collect
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedBill && (
                <RecordCollectionModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={confirmCollection}
                    entityName={selectedBill.patientName}
                    totalAmount={selectedBill.totalAmount}
                    pendingAmount={selectedBill.pendingAmount}
                />
            )}
        </div>
    );
};

export const PendingReceivablesScreen = () => {
    const { user } = useAuth();
    const [partnerSummaries, setPartnerSummaries] = useState([]);
    const [allBills, setAllBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [selectedBillIds, setSelectedBillIds] = useState([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [expandedPartnerId, setExpandedPartnerId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [summaries, bills] = await Promise.all([
                FinanceApi.getPartnerReceivablesSummary(),
                FinanceApi.getReceivables()
            ]);
            setPartnerSummaries(summaries);
            setAllBills(bills);
        } catch (err) {
            console.error("Failed to load receivables:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSettle = (partner) => {
        setSelectedPartner(partner);
        const partnerBills = allBills.filter(b => b.partnerName === partner.partnerName && !b.settledAt);
        setSelectedBillIds(partnerBills.map(b => b.receivableFactId));
        setIsBulkModalOpen(true);
    };

    const confirmBulkSettlement = async (totalAmount, paymentMode) => {
        try {
            await FinanceApi.settleBulkPartnerReceivables(selectedPartner.partnerId, selectedBillIds, totalAmount, paymentMode);
            setIsBulkModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleExpand = (partnerId) => {
        setExpandedPartnerId(expandedPartnerId === partnerId ? null : partnerId);
    };

    const totals = {
        outstanding: partnerSummaries.reduce((acc, p) => acc + p.totalOutstanding, 0),
        count: partnerSummaries.reduce((acc, p) => acc + p.billCount, 0),
        overdue: partnerSummaries.reduce((acc, p) => acc + p.aging_30_Plus, 0)
    };

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Partner Receivables</h1>
                    <p className="text-sm text-zinc-500 font-medium italic">Operational inbox for institutional recovery and B2B settlements.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Outstanding</div>
                        <div className="text-xl font-bold dark:text-white">{FinanceUtils.formatCurrency(totals.outstanding)}</div>
                    </div>
                    <div className="px-6 py-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20">
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Critical Overdue</div>
                        <div className="text-xl font-bold text-rose-500">{FinanceUtils.formatCurrency(totals.overdue)}</div>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Reconciling partner ledgers...</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Partner / Account</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Open Bills</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Total Outstanding</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Oldest Dues</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Aging Profile</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {partnerSummaries.map((partner) => (
                                <React.Fragment key={partner.partnerId}>
                                    <tr className={`group transition-all ${expandedPartnerId === partner.partnerId ? 'bg-synos-primary/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => toggleExpand(partner.partnerId)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${expandedPartnerId === partner.partnerId ? 'bg-synos-primary text-white rotate-90' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                                                >
                                                    <ArrowRight size={12} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold dark:text-zinc-200">{partner.partnerName}</span>
                                                    <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">ID: {partner.partnerId.toString().substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-sm font-semibold dark:text-zinc-400">{partner.billCount}</td>
                                        <td className="p-6 text-right">
                                            <div className="text-sm font-bold text-rose-500">{FinanceUtils.formatCurrency(partner.totalOutstanding)}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className={`text-xs font-medium ${FinanceUtils.getAgingColor(partner.oldestDueDate)}`}>
                                                {new Date(partner.oldestDueDate).toLocaleDateString()}
                                                <span className="ml-2 opacity-50 italic">({FinanceUtils.getAgingCategory(partner.oldestDueDate)})</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex gap-1 h-1.5 w-32 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                <div style={{ width: `${(partner.aging_0_7 / partner.totalOutstanding) * 100}%` }} className="bg-emerald-500 h-full" />
                                                <div style={{ width: `${(partner.aging_7_30 / partner.totalOutstanding) * 100}%` }} className="bg-amber-500 h-full" />
                                                <div style={{ width: `${(partner.aging_30_Plus / partner.totalOutstanding) * 100}%` }} className="bg-rose-500 h-full" />
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button 
                                                onClick={() => handleBulkSettle(partner)}
                                                className="px-4 py-2 rounded-xl bg-synos-primary text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-synos-primary/30 transition-all"
                                            >
                                                Bulk Settle
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedPartnerId === partner.partnerId && (
                                        <tr>
                                            <td colSpan="6" className="p-0 bg-zinc-50/50 dark:bg-zinc-950/50">
                                                <div className="p-6 border-x border-b dark:border-zinc-900 border-zinc-100">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 border-b dark:border-zinc-900 pb-2">
                                                                <th className="pb-2">Token / Ref</th>
                                                                <th className="pb-2">Patient</th>
                                                                <th className="pb-2">Date</th>
                                                                <th className="pb-2 text-right">Original</th>
                                                                <th className="pb-2 text-right">Recovered</th>
                                                                <th className="pb-2 text-right">Outstanding</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y dark:divide-zinc-900/50 divide-zinc-100">
                                                            {allBills.filter(b => b.partnerName === partner.partnerName && !b.settledAt).map(bill => (
                                                                <tr key={bill.receivableFactId}>
                                                                    <td className="py-3 text-[10px] font-mono text-zinc-500 font-bold">{bill.token || bill.receivableFactId.toString().substring(0, 13)}</td>
                                                                    <td className="py-3 text-[10px] font-bold dark:text-zinc-300">{bill.patientName || 'Unknown Patient'}</td>
                                                                    <td className="py-3 text-[10px] text-zinc-400">{new Date(bill.occurredAt).toLocaleDateString()}</td>
                                                                    <td className="py-3 text-[10px] font-bold text-right dark:text-zinc-300">₹{bill.amount.toLocaleString()}</td>
                                                                    <td className="py-3 text-[10px] font-bold text-right text-emerald-500">₹{bill.amountReceived.toLocaleString()}</td>
                                                                    <td className="py-3 text-[10px] font-bold text-right text-rose-500">₹{(bill.amount - bill.amountReceived).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedPartner && (
                <BulkSettleModal 
                    isOpen={isBulkModalOpen}
                    onClose={() => setIsBulkModalOpen(false)}
                    onConfirm={confirmBulkSettlement}
                    partnerName={selectedPartner.partnerName}
                    selectedBills={allBills.filter(b => b.partnerName === selectedPartner.partnerName && !b.settledAt)}
                />
            )}
        </div>
    );
};

export const CollectionHistoryScreen = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getRevenueHistory();
            setHistory(data);
        } catch (err) {
            console.error("Failed to load collection history:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Collection History</h1>
                <p className="text-sm text-zinc-500 font-medium">Review completed collections and settlement activity.</p>
            </div>

            <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex items-center gap-1 ml-1">
                    {['Latest'].map((f, i) => (
                        <FilterTab key={f} label={f} isActive={i === 0} />
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Scanning history facts...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Source Type</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Amount</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Payment Mode</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reference</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {history.map((row) => (
                                <tr key={row.revenueFactId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 text-xs text-zinc-500 whitespace-nowrap">{new Date(row.occurredAt).toLocaleString()}</td>
                                    <td className="p-4 text-xs font-bold dark:text-zinc-200 uppercase tracking-tighter text-synos-primary">
                                        {row.sourceType === 'Partner' && row.notes?.includes('Partner:') 
                                            ? row.notes.split('|')[0].replace('Partner:', '').trim()
                                            : FinanceUtils.mapRevenueSource(row.sourceType)}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-right dark:text-zinc-300">₹{row.amount.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                            {FinanceUtils.mapPaymentMode(row.paymentMode)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-zinc-400">{row.sourceReferenceId}</td>
                                    <td className="p-4 text-xs text-zinc-500">{row.notes}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-zinc-500 text-sm italic">No collection history found for the selected period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
