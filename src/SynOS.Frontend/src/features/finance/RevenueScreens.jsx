import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Search, 
    Filter, 
    Download, 
    MoreHorizontal, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    User,
    ArrowRight,
    LayoutDashboard,
    IndianRupee,
    History,
    TrendingUp,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    Beaker,
    Activity,
    FileSpreadsheet,
    Receipt,
    FileText,
    Share2
} from 'lucide-react';
import { RecordCollectionModal } from './components/RecordCollectionModal';
import { BulkSettleModal } from './components/BulkSettleModal';
import { DepartmentOverview } from './components/FinanceShared';
import { FinanceApi } from '@/api/finance';
import { FinanceUtils } from './components/FinanceUtils';
import { useAuth } from '@/context/AuthContext';
import { AdminApi } from '@/api/admin';
import { CommercialDocumentViewer } from './components/documents/CommercialDocumentViewer';
import { PatientTaxInvoiceA4 } from './components/documents/PatientTaxInvoiceA4';
import { PartnerClaimStatementA4 } from './components/documents/PartnerClaimStatementA4';

import { cn } from '@/lib/utils';

// --- SCREENS ---

export const RevenueOverviewTab = ({ stats, onRefresh, presetRange, setPresetRange }) => {
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    fetchRecent();
  }, [presetRange]);

  const fetchRecent = async () => {
    try {
      setLoadingTransactions(true);
      const data = await FinanceApi.getRevenueHistory().catch(() => []);
      setRecentTransactions(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (err) {
      console.error("Failed to fetch recent revenue transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const cashInflow = Number(stats?.cashInflow || stats?.totalRevenueCash || stats?.cashCollected) || 0;
  const accrualRevenue = Number(stats?.totalRevenueAccrual) || cashInflow;
  const receivables = Number(stats?.pendingCollections) || Math.max(0, accrualRevenue - cashInflow);
  const cashCollected = Number(stats?.cashCollected) || (cashInflow > 0 ? cashInflow : 0);
  const onlineCollected = Number(stats?.onlineCollected) || 0;
  
  // Realized collection efficiency percentage
  const collectionEfficiency = accrualRevenue > 0 
    ? Math.min(100, Math.round((cashInflow / accrualRevenue) * 100)) 
    : (cashInflow > 0 ? 100 : 0);

  const formatINR = (val) => {
    const num = Math.round(Number(val) || 0);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const cards = [
    { 
      title: "Realized Cash Inflow", 
      value: formatINR(cashInflow), 
      subtitle: "Physical drawer & gateway collections",
      type: 'positive',
      icon: Wallet
    },
    { 
      title: "Accrual Billed Revenue", 
      value: formatINR(accrualRevenue), 
      subtitle: "Total diagnostic services invoiced",
      type: 'neutral',
      icon: IndianRupee
    },
    { 
      title: "Pending Receivables", 
      value: formatINR(receivables), 
      subtitle: "Uncollected patient & corporate dues",
      type: receivables > 0 ? 'negative' : 'neutral',
      icon: Clock
    },
    { 
      title: "Collection Efficiency", 
      value: `${collectionEfficiency}%`, 
      subtitle: `Cash margin: ${(stats?.cashMarginPercentage || 0).toFixed(1)}%`,
      type: collectionEfficiency >= 70 ? 'positive' : 'negative',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* 4 TOP ELEVATED KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{card.title}</span>
                <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{card.value}</p>
              </div>
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                card.type === 'positive' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                card.type === 'negative' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              )}>
                <card.icon size={17} />
              </div>
            </div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* 2-COLUMN BALANCED MAIN SURFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2 Spans): RECENT COLLECTIONS FEED */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">Recent Collections & Inflows</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Live payments posted across reception, phlebotomy, and billing desks.</p>
              </div>
              <button
                onClick={() => navigate('/finance/revenue/bills')}
                className="text-xs font-bold text-synos-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Full Bills Ledger <ArrowRight size={13} />
              </button>
            </div>

            {loadingTransactions ? (
              <div className="py-20 text-center text-zinc-400 animate-pulse text-xs font-bold uppercase tracking-widest">Scanning ledger...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-xs font-semibold text-zinc-400">No recent collections recorded in this window.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-900 pb-2 text-[10px] uppercase font-bold text-zinc-400">
                      <th className="pb-3 font-extrabold">Date</th>
                      <th className="pb-3 font-extrabold">Account / Category</th>
                      <th className="pb-3 text-right font-extrabold">Amount</th>
                      <th className="pb-3 text-center font-extrabold">Payment Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {recentTransactions.map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 text-zinc-500 font-medium">{new Date(t.occurredAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">{t.sourceType || 'Patient Bill'}</span>
                          {t.reference && <span className="text-[10px] text-zinc-400 font-mono">{t.reference}</span>}
                        </td>
                        <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Number(t.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-center">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                            (t.paymentMode || '').toLowerCase().includes('cash')
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                          )}>
                            {t.paymentMode || 'Cash'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
            <span className="text-zinc-400 text-[11px]">Showing latest {recentTransactions.length} receipts</span>
            <button
              onClick={() => navigate('/finance/revenue/history')}
              className="font-bold text-synos-primary hover:underline text-[11px] cursor-pointer"
            >
              View Full History →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (1 Span): DRAWER BALANCE & ACTION HUB */}
        <div className="space-y-6">
          
          {/* Drawer Reconciliation Card */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">Active Drawer Balance</h2>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Live Reconciled
              </span>
            </div>

            <div className="space-y-3">
              {/* Physical Cash Drawer Box */}
              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex justify-between items-center hover:border-emerald-500/40 transition-colors">
                <div>
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Physical Cash Drawer</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{formatINR(cashCollected)}</p>
                  <span className="text-[10px] text-zinc-400 font-medium">Available in front register</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Wallet size={20} />
                </div>
              </div>

              {/* Digital Inflow Box */}
              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex justify-between items-center hover:border-indigo-500/40 transition-colors">
                <div>
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Digital Online Inflow</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{formatINR(onlineCollected)}</p>
                  <span className="text-[10px] text-zinc-400 font-medium">UPI, QR, POS & Net Banking</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            {/* Inflow Share Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  Cash: {cashInflow > 0 ? Math.round((cashCollected / cashInflow) * 100) : 0}%
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  Digital: {cashInflow > 0 ? Math.round((onlineCollected / cashInflow) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${cashInflow > 0 ? (cashCollected / cashInflow) * 100 : 50}%` }} 
                />
                <div 
                  className="bg-indigo-500 h-full transition-all duration-500" 
                  style={{ width: `${cashInflow > 0 ? (onlineCollected / cashInflow) * 100 : 50}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none space-y-3">
            <h3 className="text-xs font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">Quick Actions</h3>
            
            <button
              onClick={() => navigate('/finance/revenue/bills')}
              className="w-full py-2.5 px-4 rounded-xl bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet size={14} /> Open Bills & Collections Ledger
            </button>

            <button
              onClick={() => navigate('/finance/revenue/receivables')}
              className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Clock size={14} /> View Pending Receivables ({formatINR(receivables)})
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export const RevenueTerminal = () => {
  const { tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [presetRange, setPresetRange] = useState('month');
  const tabsRef = React.useRef(null);

  useEffect(() => {
    loadStats(presetRange);
  }, [presetRange]);

  useEffect(() => {
    if (tabsRef.current) {
      const activeTabEl = tabsRef.current.querySelector('[data-active-tab="true"]');
      if (activeTabEl) {
        activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [tab]);

  const loadStats = async (preset = presetRange) => {
    try {
      setLoading(true);
      const data = await FinanceApi.getProfitabilitySummary(null, null, null, true, preset);
      setStats(data);
    } catch (err) {
      console.error("Failed to load revenue overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bills', label: 'Bills & Collections', icon: IndianRupee },
    { id: 'receivables', label: 'Pending Receivables', icon: Clock },
    { id: 'history', label: 'Collection History', icon: History }
  ];

  if (loading) return (
    <div className="p-20 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-synos-primary border-t-transparent rounded-full animate-spin" />
      <span>Synchronizing revenue intelligence...</span>
    </div>
  );
  
  if (!stats) return (
    <div className="p-20 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-rose-500 w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">Economic Position Unavailable</p>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">The system could not retrieve the revenue summary. Please try reconnecting.</p>
        <button onClick={() => loadStats(presetRange)} className="text-[10px] font-bold text-synos-primary hover:underline uppercase tracking-widest cursor-pointer">Retry Synchronization</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50">
      {/* HEADER SECTION */}
      <div className="p-8 pb-4 border-b dark:border-zinc-900 border-zinc-200/90 bg-white dark:bg-zinc-950 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">Revenue Command Center</h1>
            <p className="text-xs text-zinc-500 font-medium">Monitor incoming payments, receivables, and drawer balances.</p>
          </div>

          {/* Time Horizon Selector */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-2xl border border-zinc-200/80 dark:border-white/5 shrink-0 self-start sm:self-auto">
            {[
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
              { id: 'quarter', label: 'This Quarter' },
              { id: 'year', label: 'This Year' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setPresetRange(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  presetRange === t.id 
                    ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-xs" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABS STRIP */}
        <div ref={tabsRef} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/finance/revenue/${t.id}`)}
              data-active-tab={tab === t.id ? "true" : "false"}
              className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border shrink-0 cursor-pointer ${
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
        {tab === 'overview' && (
          <RevenueOverviewTab 
            stats={stats} 
            presetRange={presetRange}
            setPresetRange={setPresetRange}
            onRefresh={() => loadStats(presetRange)} 
          />
        )}
        {tab === 'bills' && <BillsCollectionsScreen />}
        {tab === 'receivables' && <PendingReceivablesScreen />}
        {tab === 'history' && <CollectionHistoryScreen />}
      </div>
    </div>
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
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read pre-filtered parameters from URL query params (e.g. from FinanceOverview clicks)
    const initialDept = searchParams.get('department') || 'All';
    const initialMod = searchParams.get('modality') || 'All';
    const initialBranch = searchParams.get('branchId') || 'All';

    const [bills, setBills] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    
    // Enterprise Document Modal States
    const [docModalType, setDocModalType] = useState(null); // 'invoice' | 'claim' | null
    const [docData, setDocData] = useState(null);
    const [loadingDoc, setLoadingDoc] = useState(false);
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [departmentFilter, setDepartmentFilter] = useState(initialDept);
    const [modalityFilter, setModalityFilter] = useState(initialMod);
    const [branchFilter, setBranchFilter] = useState(initialBranch);
    const [dateRange, setDateRange] = useState('Today');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadBranches();
    }, []);

    useEffect(() => {
        loadBills();
    }, [branchFilter, departmentFilter, modalityFilter, dateRange, customDates]);

    const loadBranches = async () => {
        try {
            const data = await AdminApi.getBranches();
            setBranches(data || []);
        } catch (e) {
            console.error("Failed to load branches for Bills & Collections", e);
        }
    };

    const loadBills = async () => {
        try {
            setLoading(true);
            const params = {};
            if (branchFilter !== 'All') params.branchId = branchFilter;
            if (departmentFilter !== 'All') params.department = departmentFilter;
            if (modalityFilter !== 'All') params.modality = modalityFilter;
            if (dateRange !== 'All Time' && dateRange !== 'Custom Range') params.preset = dateRange;
            if (dateRange === 'Custom Range' && customDates.start && customDates.end) {
                params.startDate = customDates.start;
                params.endDate = customDates.end;
            }
            const data = await FinanceApi.getFinanceBills(params);
            setBills(Array.isArray(data) ? data : (data?.bills || []));
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

    const handleOpenInvoiceDoc = async (billId) => {
        try {
            setLoadingDoc(true);
            const data = await FinanceApi.getInvoiceDocument(billId);
            setDocData(data);
            setDocModalType('invoice');
        } catch (err) {
            alert("Failed to load patient invoice: " + err.message);
        } finally {
            setLoadingDoc(false);
        }
    };

    const handleOpenPartnerClaim = async (partnerId, visitIds = null) => {
        try {
            setLoadingDoc(true);
            const payload = { partnerId };
            if (visitIds && visitIds.length > 0) payload.visitIds = visitIds;
            const data = await FinanceApi.getPartnerClaimStatement(payload);
            setDocData(data);
            setDocModalType('claim');
        } catch (err) {
            alert("Failed to generate doctor claim statement: " + err.message);
        } finally {
            setLoadingDoc(false);
        }
    };

    const handleWhatsAppClaimShare = () => {
        if (!docData) return;
        const partner = docData.partner?.name || "Doctor";
        const net = (docData.summary?.netClaimDue || 0).toLocaleString();
        const count = docData.summary?.totalVisitsCount || 0;
        const upi = docData.lab?.upiId || "";
        const ref = docData.statementNumber || "";
        const msg = `Dear ${partner},\nGreetings from ${docData.lab?.labLegalName || 'SynOS Lab'}.\n\nPlease find your referral settlement claim statement (${ref}) for ${count} patient visits.\n*Net Payable to Lab: ₹${net}*\n\nYou can remit directly via UPI: ${upi}\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const confirmCollection = async (amount) => {
        if (!selectedBill) return;
        const response = await fetch(`/api/v1/visits/${selectedBill.visitId}/payment`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ 
                amount, 
                paymentMethod: 'BankTransfer',
                notes: `Institutional settlement from Finance Hub`
            })
        });

        if (!response.ok) throw new Error("Failed to record payment");
        await loadBills();
    };

    // Client-side filtration for fast reactive updates
    const filteredBills = bills.filter(b => {
        // 1. Status Filter
        if (statusFilter !== 'All') {
            const statusMap = {
                'Pending': 'PENDING',
                'Partial': 'PARTIAL',
                'Settled': 'SETTLED'
            };
            const currentStatus = (b.status || '').toUpperCase();
            if (statusMap[statusFilter] && !currentStatus.includes(statusMap[statusFilter])) return false;
        }

        // 2. Category Filter (Direct, Partner, Corporate, Insurance)
        if (categoryFilter !== 'All') {
            const pCat = b.partnerCategory || (b.partnerName === 'Direct Patient' || b.partnerName === 'Direct Institutional' ? 'Direct' : 'Partner');
            if (categoryFilter === 'Direct' && pCat !== 'Direct') return false;
            if (categoryFilter === 'Partner' && pCat !== 'Partner') return false;
            if (categoryFilter === 'Corporate' && pCat !== 'Corporate') return false;
            if (categoryFilter === 'Insurance' && pCat !== 'Insurance') return false;
        }

        // 3. Department Filter
        if (departmentFilter !== 'All') {
            const bDept = (b.department || '').toLowerCase();
            if (!bDept.includes(departmentFilter.toLowerCase())) return false;
        }

        // 4. Modality Filter
        if (modalityFilter !== 'All') {
            const bMod = (b.modality || '').toLowerCase();
            const targetMod = modalityFilter.toLowerCase();
            if (!bMod.includes(targetMod)) return false;
        }

        // 5. Branch Filter
        if (branchFilter !== 'All') {
            if (b.branchId && b.branchId !== branchFilter) return false;
        }

        // 6. Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matchName = (b.patientName || '').toLowerCase().includes(query);
            const matchBill = (b.billNumber || '').toLowerCase().includes(query);
            const matchPartner = (b.partnerName || '').toLowerCase().includes(query);
            if (!matchName && !matchBill && !matchPartner) return false;
        }

        // 7. Date Filter (client-side safety check)
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
        } else if (dateRange === 'Custom Range' && customDates.start && customDates.end) {
            const start = new Date(customDates.start);
            const end = new Date(customDates.end);
            end.setHours(23,59,59,999);
            if (billDate < start || billDate > end) return false;
        }

        return true;
    });

    // Summary calculation for the filtered dataset
    const totalBilled = filteredBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalCollected = filteredBills.reduce((sum, b) => sum + (Number(b.collectedAmount) || 0), 0);
    const totalCash = filteredBills.reduce((sum, b) => sum + (Number(b.cashAmount) || 0), 0);
    const totalOnline = filteredBills.reduce((sum, b) => sum + (Number(b.onlineAmount) || 0), 0);
    const totalPrepaid = filteredBills.reduce((sum, b) => sum + (Number(b.prepaidAmount) || 0), 0);
    const totalPending = filteredBills.reduce((sum, b) => sum + (Number(b.pendingAmount) || 0), 0);
    const totalReferralCut = filteredBills.reduce((sum, b) => sum + (Number(b.referralCommissionCut) || 0), 0);

    // Download Summary CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Bill Number",
            "Date",
            "Patient Name",
            "Facility / Branch",
            "Department",
            "Modality",
            "Account / Partner",
            "Billing Model",
            "Total Billed (INR)",
            "Cash Collected (INR)",
            "Online / Digital (INR)",
            "Patient Wallet / Advance (INR)",
            "Pending Due (INR)",
            "Pending Due Source",
            "Doctor / Partner Cut (INR)",
            "Status"
        ];

        const rows = filteredBills.map(b => {
            const billingModel = b.partnerCategory === 'Partner' ? 'Partner Prepaid' : (b.partnerCategory === 'Corporate' ? 'Corporate Credit' : 'Direct Counter');
            const dueSource = b.pendingAmount > 0 
                ? (b.partnerCategory === 'Partner' ? `Partner: ${b.partnerName}` : (b.partnerCategory === 'Direct' ? 'Direct Patient Counter' : b.partnerCategory))
                : 'Settled';

            return [
                `"${b.billNumber || ''}"`,
                `"${new Date(b.date).toLocaleDateString()}"`,
                `"${(b.patientName || '').replace(/"/g, '""')}"`,
                `"${(b.branchName || 'Main Facility').replace(/"/g, '""')}"`,
                `"${b.department || ''}"`,
                `"${b.modality || ''}"`,
                `"${(b.partnerName || '').replace(/"/g, '""')}"`,
                `"${billingModel}"`,
                b.totalAmount || 0,
                b.cashAmount || 0,
                b.onlineAmount || 0,
                b.prepaidAmount || 0,
                b.pendingAmount || 0,
                `"${dueSource}"`,
                b.referralCommissionCut || 0,
                `"${b.status || ''}"`
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        const dateTag = dateRange.toLowerCase().replace(/\s+/g, '_');
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `synos_bills_summary_${dateTag}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Find any pending partner for header claim generation
    const partnerBillsWithPending = filteredBills.filter(b => b.partnerCategory === 'Partner' && b.pendingAmount > 0);

    return (
        <div className="p-8 w-full space-y-6 animate-in fade-in duration-500">
            {/* Header & Download Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Bills & Collections</h1>
                    <p className="text-xs text-zinc-500 font-medium">
                        Real-time operational ledger with branch, department, and modality transaction breakdowns.
                    </p>
                </div>
                <div className="flex items-center flex-wrap gap-2.5">
                    {/* B2B DOCTOR CLAIM STATEMENT BUTTON */}
                    {partnerBillsWithPending.length > 0 && (
                        <button
                            onClick={() => {
                                const target = partnerBillsWithPending[0];
                                const samePartnerBills = partnerBillsWithPending.filter(b => b.partnerName === target.partnerName);
                                handleOpenPartnerClaim(target.partnerId || target.referralPartnerId, samePartnerBills.map(b => b.visitId));
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <Receipt size={15} />
                            <span>Doctor Claim Bill ({partnerBillsWithPending.length})</span>
                        </button>
                    )}

                    <button
                        onClick={handleDownloadSummary}
                        disabled={filteredBills.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Download size={15} />
                        <span>Download Summary ({filteredBills.length})</span>
                    </button>
                </div>
            </div>

            {/* KPI METRIC STRIP (Cash vs Online vs Prepaid vs Referral Cut) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Billed</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white mt-1">₹{totalBilled.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">{filteredBills.length} Invoices</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Cash Collected</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalCash.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Physical Drawer</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Digital / Online</p>
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">₹{totalOnline.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">UPI / POS / Cards</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Prepaid Wallet</p>
                    <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">₹{totalPrepaid.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Token Redemptions</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Referral Cut</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalReferralCut.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Partner Commissions</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Pending Dues</p>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalPending.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-400 font-medium">Receivables Balance</span>
                </div>
            </div>

            {/* Comprehensive Multi-Dimensional Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                {/* Top Row: Primary Category & Status Tabs */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {['All', 'Pending', 'Partial', 'Settled'].map(f => (
                            <FilterTab key={f} label={f} isActive={statusFilter === f} onClick={() => setStatusFilter(f)} />
                        ))}
                        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-2 hidden lg:block" />
                        {['All', 'Direct', 'Partner', 'Corporate', 'Insurance'].map(f => (
                            <FilterTab key={f} label={f} isActive={categoryFilter === f} onClick={() => setCategoryFilter(f)} variant="outline" />
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[220px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search patient or bill no..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-synos-primary transition-all"
                        />
                    </div>
                </div>

                {/* Bottom Row: Branch, Department, Modality & Date Selectors */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    {/* Branch Selector */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Building2 size={13} className="text-zinc-400" />
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="All">All Branches</option>
                            {branches.map(b => (
                                <option key={b.branchId} value={b.branchId}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Department Selector */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Beaker size={13} className="text-zinc-400" />
                        <select
                            value={departmentFilter}
                            onChange={(e) => {
                                setDepartmentFilter(e.target.value);
                                setModalityFilter('All');
                            }}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="All">All Departments</option>
                            <option value="Pathology">Pathology</option>
                            <option value="Radiology">Radiology</option>
                        </select>
                    </div>

                    {/* Modality Selector */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Activity size={13} className="text-zinc-400" />
                        <select
                            value={modalityFilter}
                            onChange={(e) => setModalityFilter(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="All">All Modalities / Disciplines</option>
                            {departmentFilter !== 'Radiology' && (
                                <optgroup label="Pathology Disciplines">
                                    <option value="Biochemistry">Biochemistry</option>
                                    <option value="Hematology">Hematology</option>
                                    <option value="Microbiology">Microbiology</option>
                                    <option value="Histopathology">Histopathology</option>
                                </optgroup>
                            )}
                            {departmentFilter !== 'Pathology' && (
                                <optgroup label="Radiology Modalities">
                                    <option value="X-Ray">X-Ray</option>
                                    <option value="CT Scan">CT Scan</option>
                                    <option value="Ultrasound">Ultrasound</option>
                                    <option value="MRI">MRI</option>
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Date Range Selector */}
                    <div className="flex items-center gap-2 ml-auto">
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
                            className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-semibold dark:text-zinc-300 outline-none focus:border-synos-primary transition-all cursor-pointer"
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
            </div>

            {/* Main Table Surface */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse text-xs font-bold uppercase tracking-wider">
                        Synchronizing bill ledger...
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="p-16 text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No matching bills found</p>
                        <p className="text-[11px] text-zinc-400">Try adjusting the department, modality, branch, or date range filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Bill No</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Patient</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Dept / Modality</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Partner / Account</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Total</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Payment Breakup</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Pending</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                                {filteredBills.map((bill) => (
                                    <tr key={bill.billId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-4 text-xs font-bold dark:text-zinc-200">
                                            {bill.billNumber}
                                            {bill.branchName && (
                                                <p className="text-[10px] font-normal text-zinc-400 mt-0.5">{bill.branchName}</p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                                    {(bill.patientName || 'PA').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold dark:text-zinc-200 block">{bill.patientName}</span>
                                                    {bill.token && <span className="text-[9px] text-zinc-400 font-mono">Token: {bill.token}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                                {bill.modality || bill.department || 'General'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-zinc-500">
                                            <span>{bill.partnerName}</span>
                                            {bill.referralCommissionCut > 0 && (
                                                <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                                                    Cut: ₹{bill.referralCommissionCut.toLocaleString()}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs font-black text-right dark:text-zinc-200">
                                            ₹{bill.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-xs font-bold text-emerald-500">
                                                ₹{bill.collectedAmount.toLocaleString()}
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 text-[9px] font-medium text-zinc-400 mt-0.5">
                                                {bill.cashAmount > 0 && <span>Cash: ₹{bill.cashAmount.toLocaleString()}</span>}
                                                {bill.onlineAmount > 0 && <span>Online: ₹{bill.onlineAmount.toLocaleString()}</span>}
                                                {bill.prepaidAmount > 0 && <span>Prepaid: ₹{bill.prepaidAmount.toLocaleString()}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-black text-right text-rose-500">
                                            <p className="font-mono">₹{bill.pendingAmount.toLocaleString()}</p>
                                            {bill.pendingAmount > 0 && (
                                                <span className="text-[9px] font-bold block mt-0.5 tracking-tight text-zinc-400">
                                                    {bill.partnerCategory === 'Partner' 
                                                        ? `Due: ${bill.partnerName}` 
                                                        : (bill.partnerCategory === 'Direct' ? 'Due at Counter' : bill.partnerCategory)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <StatusBadge status={bill.status} />
                                        </td>
                                        <td className="p-4 text-xs text-zinc-400">
                                            {new Date(bill.date).toLocaleDateString()}
                                        </td>
                                        {/* ALWAYS VISIBLE ACTIONS WITH ENTERPRISE DOCUMENT GENERATION */}
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* A4 Patient Tax Invoice */}
                                                <button
                                                    onClick={() => handleOpenInvoiceDoc(bill.billId)}
                                                    title="View & Print A4 Patient Tax Invoice"
                                                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                >
                                                    <FileText size={12} className="text-synos-primary" />
                                                    <span className="hidden sm:inline">A4 Bill</span>
                                                </button>

                                                {/* B2B Doctor Claim Bill (For Partner bills) */}
                                                {bill.partnerCategory === 'Partner' && (
                                                    <button
                                                        onClick={() => handleOpenPartnerClaim(bill.partnerId || bill.referralPartnerId, [bill.visitId])}
                                                        title="Generate B2B Doctor Claim Bill for this visit"
                                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                                    >
                                                        <Receipt size={12} />
                                                        <span>Claim</span>
                                                    </button>
                                                )}

                                                {bill.pendingAmount > 0 ? (
                                                    <button 
                                                        onClick={() => handleRecordCollection(bill)}
                                                        className="px-3 py-1.5 rounded-lg bg-synos-primary text-white text-[10px] font-bold uppercase tracking-wider hover:bg-synos-primary/90 transition-all shadow-sm cursor-pointer"
                                                    >
                                                        {bill.partnerCategory === 'Partner' ? 'Settle' : 'Collect'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRecordCollection(bill)}
                                                        className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
                                                    >
                                                        Details
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

            {/* ENTERPRISE COMMERCIAL DOCUMENT VIEWER & PRINT ENGINE */}
            {docModalType && docData && (
                <CommercialDocumentViewer
                    isOpen={Boolean(docModalType)}
                    onClose={() => { setDocModalType(null); setDocData(null); }}
                    title={docModalType === 'claim' ? "B2B Partner Claim Bill & Statement" : "Patient Tax Invoice (A4)"}
                    onWhatsAppShare={docModalType === 'claim' ? handleWhatsAppClaimShare : null}
                    defaultLetterheadMode={docData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={docData?.lab?.topMarginMm || 40}
                >
                    {docModalType === 'claim' ? (
                        <PartnerClaimStatementA4 data={docData} />
                    ) : (
                        <PatientTaxInvoiceA4 data={docData} />
                    )}
                </CommercialDocumentViewer>
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

    // Enterprise Claim Bill State
    const [claimDocData, setClaimDocData] = useState(null);
    const [isClaimDocOpen, setIsClaimDocOpen] = useState(false);
    const [generatingClaim, setGeneratingClaim] = useState(false);
    const [selectedFactIds, setSelectedFactIds] = useState(new Set());

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

    const handleOpenPartnerClaim = async (partner, specificFactIds = null) => {
        try {
            setGeneratingClaim(true);
            const partnerBills = allBills.filter(b => b.partnerName === partner.partnerName && !b.settledAt);
            const targetFactIds = specificFactIds && specificFactIds.length > 0 
                ? specificFactIds 
                : partnerBills.map(b => b.receivableFactId);

            const res = await FinanceApi.getPartnerClaimStatement({
                partnerId: partner.partnerId,
                receivableFactIds: targetFactIds
            });
            setClaimDocData(res);
            setIsClaimDocOpen(true);
        } catch (err) {
            console.error("Failed to load partner claim:", err);
            alert("Could not load claim bill: " + (err.response?.data?.message || err.message));
        } finally {
            setGeneratingClaim(false);
        }
    };

    const handleWhatsAppClaimShare = () => {
        if (!claimDocData) return;
        const phone = claimDocData?.partner?.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const netDue = claimDocData?.summary?.netClaimDue || 0;
        const count = claimDocData?.items?.length || 0;
        const msg = `Dear ${claimDocData?.partner?.name || 'Doctor'},\n\nDiagnostic claim statement from ${claimDocData?.lab?.labLegalName || 'SynOS Healthcare'}:\n• Selected Patient Visits: ${count}\n• Total Diagnostic Charges: ₹${netDue.toLocaleString()}\n• Net Amount Payable: ₹${netDue.toLocaleString()}\n\nRemittance details and UPI QR are attached in the claim bill. Please verify and settle dues at your earliest convenience. Thank you!`;
        window.open(`https://wa.me/${cleanPhone ? (cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone) : ''}?text=${encodeURIComponent(msg)}`, '_blank');
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenPartnerClaim(partner)}
                                                    disabled={generatingClaim}
                                                    title="Generate A4 B2B Claim Bill for Referral Partner"
                                                    className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                                >
                                                    <Receipt size={12} />
                                                    <span>Claim Bill</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleBulkSettle(partner)}
                                                    className="px-4 py-2 rounded-xl bg-synos-primary text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-synos-primary/30 transition-all cursor-pointer"
                                                >
                                                    Bulk Settle
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedPartnerId === partner.partnerId && (() => {
                                        const partnerBills = allBills.filter(b => b.partnerName === partner.partnerName && !b.settledAt);
                                        const partnerItemIds = partnerBills.map(b => b.receivableFactId);
                                        const selectedInPartner = partnerBills.filter(b => selectedFactIds.has(b.receivableFactId));
                                        const selectedCount = selectedInPartner.length;
                                        const selectedSum = selectedInPartner.reduce((sum, b) => sum + (b.amount - b.amountReceived), 0);
                                        const allPartnerSelected = partnerBills.length > 0 && selectedCount === partnerBills.length;

                                        return (
                                            <tr>
                                                <td colSpan="6" className="p-0 bg-zinc-50/50 dark:bg-zinc-950/50">
                                                    <div className="p-6 border-x border-b dark:border-zinc-900 border-zinc-100">
                                                        
                                                        {/* BATCH ACTION BAR */}
                                                        {selectedCount > 0 && (
                                                            <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 animate-in fade-in duration-200">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                                                        {selectedCount}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                                                            {selectedCount} of {partnerBills.length} Bills Selected
                                                                        </p>
                                                                        <p className="text-[10px] text-zinc-500 font-medium">
                                                                            Total Selected Due: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">₹{selectedSum.toLocaleString()}</strong>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const next = new Set(selectedFactIds);
                                                                            partnerItemIds.forEach(id => next.delete(id));
                                                                            setSelectedFactIds(next);
                                                                        }}
                                                                        className="px-3 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[10px] font-bold cursor-pointer transition-all"
                                                                    >
                                                                        Clear Selection
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleOpenPartnerClaim(partner, selectedInPartner.map(b => b.receivableFactId))}
                                                                        disabled={generatingClaim}
                                                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                                                                    >
                                                                        <Receipt size={13} />
                                                                        <span>Generate Claim Bill ({selectedCount})</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 border-b dark:border-zinc-900 pb-2">
                                                                    <th className="pb-2 w-8 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={allPartnerSelected}
                                                                            onChange={(e) => {
                                                                                const next = new Set(selectedFactIds);
                                                                                if (e.target.checked) {
                                                                                    partnerItemIds.forEach(id => next.add(id));
                                                                                } else {
                                                                                    partnerItemIds.forEach(id => next.delete(id));
                                                                                }
                                                                                setSelectedFactIds(next);
                                                                            }}
                                                                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                            title={allPartnerSelected ? "Deselect all" : "Select all open bills"}
                                                                        />
                                                                    </th>
                                                                    <th className="pb-2">Token / Ref</th>
                                                                    <th className="pb-2">Patient</th>
                                                                    <th className="pb-2">Date</th>
                                                                    <th className="pb-2 text-right">Original</th>
                                                                    <th className="pb-2 text-right">Recovered</th>
                                                                    <th className="pb-2 text-right">Outstanding</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y dark:divide-zinc-900/50 divide-zinc-100">
                                                                {partnerBills.map(bill => {
                                                                    const isChecked = selectedFactIds.has(bill.receivableFactId);
                                                                    return (
                                                                        <tr key={bill.receivableFactId} className={isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''}>
                                                                            <td className="py-3 w-8 text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        const next = new Set(selectedFactIds);
                                                                                        if (e.target.checked) {
                                                                                            next.add(bill.receivableFactId);
                                                                                        } else {
                                                                                            next.delete(bill.receivableFactId);
                                                                                        }
                                                                                        setSelectedFactIds(next);
                                                                                    }}
                                                                                    className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                                />
                                                                            </td>
                                                                            <td className="py-3 text-[10px] font-mono text-zinc-500 font-bold">{bill.token || bill.receivableFactId.toString().substring(0, 13)}</td>
                                                                            <td className="py-3 text-[10px] font-bold dark:text-zinc-300">{bill.patientName || 'Unknown Patient'}</td>
                                                                            <td className="py-3 text-[10px] text-zinc-400">{new Date(bill.occurredAt).toLocaleDateString()}</td>
                                                                            <td className="py-3 text-[10px] font-bold text-right dark:text-zinc-300">₹{bill.amount.toLocaleString()}</td>
                                                                            <td className="py-3 text-[10px] font-bold text-right text-emerald-500">₹{bill.amountReceived.toLocaleString()}</td>
                                                                            <td className="py-3 text-[10px] font-bold text-right text-rose-500">₹{(bill.amount - bill.amountReceived).toLocaleString()}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })()}
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

            {/* ENTERPRISE B2B PARTNER CLAIM BILL VIEWER */}
            {isClaimDocOpen && claimDocData && (
                <CommercialDocumentViewer
                    isOpen={isClaimDocOpen}
                    onClose={() => {
                        setIsClaimDocOpen(false);
                        setClaimDocData(null);
                    }}
                    title={`B2B Partner Claim Bill - ${claimDocData?.partner?.name || 'Partner'}`}
                    onWhatsAppShare={handleWhatsAppClaimShare}
                    defaultLetterheadMode={claimDocData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={claimDocData?.lab?.topMarginMm || 40}
                >
                    <PartnerClaimStatementA4 data={claimDocData} />
                </CommercialDocumentViewer>
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
