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
import { DepartmentOverview } from './components/FinanceShared';
import { FinanceApi } from '@/api/finance';
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

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500">Loading economic truth...</div>;

  return (
    <DepartmentOverview 
      title="Revenue"
      description="Monitor incoming payments and outstanding collections."
      stats={[
        { title: "Cash Collected", value: `₹${(stats.cashInflow / 100000).toFixed(2)}L`, type: 'positive' },
        { title: "Accrual Revenue", value: `₹${(stats.grossRevenue / 100000).toFixed(2)}L` },
        { title: "Receivables", value: `₹${(stats.pendingReceivables / 100000).toFixed(2)}L`, type: 'warning' },
        { title: "Cash Margin", value: `${stats.cashMarginPercentage.toFixed(1)}%`, type: stats.cashMarginPercentage > 20 ? 'positive' : 'warning' }
      ]}
      activity={[
        { title: "Accrual Gap", meta: "Revenue recognized but not collected", amount: `₹${(stats.grossRevenue - stats.cashInflow).toLocaleString()}`, time: "Live projection" },
        { title: "Overhead Burn", meta: "Cash spent on operations", amount: `₹${stats.overheadCashOutflow.toLocaleString()}`, time: "Rolling 30d" }
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
    const [activeFilter, setActiveFilter] = useState('All');

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
        if (activeFilter === 'All') return true;
        return b.status === activeFilter;
    });

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Bills & Collections</h1>
                <p className="text-sm text-zinc-500 font-medium">Track institutional billing, pending dues, and collections.</p>
            </div>

            {/* Action/Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex items-center gap-1">
                    {['All', 'Pending', 'Partial', 'Settled'].map(f => (
                        <FilterTab key={f} label={f} isActive={activeFilter === f} onClick={() => setActiveFilter(f)} />
                    ))}
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
    const [receivables, setReceivables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadReceivables();
    }, []);

    const loadReceivables = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReceivables();
            setReceivables(data);
        } catch (err) {
            console.error("Failed to load receivables:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const confirmSettlement = async (amount) => {
        if (!selectedItem) return;
        await FinanceApi.settlePartnerReceivable(selectedItem.receivableFactId, amount, user.id);
        await loadReceivables();
    };

    const totalOutstanding = receivables.reduce((sum, r) => sum + r.pendingAmount, 0);
    const overdueCount = receivables.filter(r => r.status === 'Pending').length;

    return (
        <div className="flex h-full overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 overflow-y-auto p-8 space-y-8 border-r dark:border-zinc-900 border-zinc-200">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Pending Receivables</h1>
                    <p className="text-sm text-zinc-500 font-medium">Track unpaid balances and follow-up collections.</p>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                    <div className="flex items-center gap-1 ml-1">
                        {['All', 'Overdue', 'Partial'].map((f, i) => (
                            <FilterTab key={f} label={f} isActive={i === 0} />
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-20 text-center text-zinc-500 animate-pulse">Loading truth streams...</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Account/Partner</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Outstanding</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Incurred At</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                                {receivables.map((item) => (
                                    <tr key={item.receivableFactId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors group">
                                        <td className="p-4 text-xs font-bold dark:text-zinc-200">{item.partnerName}</td>
                                        <td className="p-4 text-xs font-bold text-right text-rose-500">₹{item.pendingAmount.toLocaleString()}</td>
                                        <td className="p-4 text-xs text-center text-zinc-500">{new Date(item.occurredAt).toLocaleDateString()}</td>
                                        <td className="p-4 text-center"><StatusBadge status={item.status} /></td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleSettle(item)}
                                                className="px-3 py-1.5 rounded-lg bg-synos-primary/10 text-synos-primary text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 hover:bg-synos-primary hover:text-white transition-all"
                                            >
                                                Settle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {receivables.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-zinc-500 text-sm italic">All partner accounts are settled.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Right Side Summary Panel */}
            <aside className="w-80 bg-white dark:bg-zinc-950 p-8 space-y-8">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Receivables Summary</h3>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-1">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Total Pending</p>
                        <p className="text-2xl font-bold dark:text-rose-400 text-rose-600">₹{totalOutstanding.toLocaleString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200 space-y-1">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Unsettled</p>
                            <p className="text-lg font-bold dark:text-zinc-100 text-zinc-900">{overdueCount}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {selectedItem && (
                <RecordCollectionModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={confirmSettlement}
                    entityName={selectedItem.partnerName}
                    totalAmount={selectedItem.amount}
                    pendingAmount={selectedItem.pendingAmount}
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
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
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
                                    <td className="p-4 text-xs font-bold dark:text-zinc-200 uppercase tracking-tighter text-synos-primary">{row.sourceType}</td>
                                    <td className="p-4 text-xs font-bold text-right dark:text-zinc-300">₹{row.amount.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                            {row.paymentMode}
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
