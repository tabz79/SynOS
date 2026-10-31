import React, { useState, useEffect, useMemo } from 'react';
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
    Share2,
    Printer,
    ShieldCheck,
    Ban
} from 'lucide-react';
import { RecordCollectionModal } from './components/RecordCollectionModal';
import { BulkSettleModal } from './components/BulkSettleModal';
import { DepartmentOverview } from './components/FinanceShared';
import { FinanceApi } from '@/api/finance';
import { FinanceUtils } from './components/FinanceUtils';
import { useAuth } from '@/context/AuthContext';
import { AdminApi } from '@/api/admin';
import { CommercialDocumentViewer } from './components/documents/CommercialDocumentViewer';
import { DynamicDocumentRenderer } from './components/documents/DynamicDocumentRenderer';
import { FinancePrintableSummaryModal } from './components/FinancePrintableSummaryModal';
import { FinanceFilterBar } from './components/FinanceFilterBar';

import { cn, formatDateCompact } from '@/lib/utils';

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
    <div className="px-6 py-5 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* 4 TOP ELEVATED KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{card.title}</span>
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
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* 2-COLUMN BALANCED MAIN SURFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2 Spans): RECENT COLLECTIONS FEED */}
        <div className="lg:col-span-2 synos-dept-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-normal">Recent Collections & Inflows</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Live payments posted across reception, phlebotomy, and billing desks.</p>
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
                    <tr className="border-b border-slate-200 dark:border-zinc-800 pb-2 text-xs uppercase font-bold text-zinc-500">
                      <th className="pb-3 font-extrabold">Date</th>
                      <th className="pb-3 font-extrabold">Account / Category</th>
                      <th className="pb-3 text-right font-extrabold">Amount</th>
                      <th className="pb-3 text-center font-extrabold">Payment Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                    {recentTransactions.map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 text-zinc-500 font-medium">{new Date(t.occurredAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">{t.sourceType || 'Patient Bill'}</span>
                          {t.reference && <span className="text-xs text-zinc-400 font-mono">{t.reference}</span>}
                        </td>
                        <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Number(t.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-center">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider",
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
            <span className="text-zinc-400 text-xs">Showing latest {recentTransactions.length} receipts</span>
            <button
              onClick={() => navigate('/finance/revenue/history')}
              className="font-bold text-synos-primary hover:underline text-xs cursor-pointer"
            >
              View Full History →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (1 Span): DRAWER BALANCE & ACTION HUB */}
        <div className="space-y-6">
          
          {/* Drawer Reconciliation Card */}
          <div className="synos-dept-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-normal">Active Drawer Balance</h2>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Live Reconciled
              </span>
            </div>

            <div className="space-y-3">
              {/* Physical Cash Drawer Box */}
              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex justify-between items-center hover:border-emerald-500/40 transition-colors">
                <div>
                  <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Physical Cash Drawer</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{formatINR(cashCollected)}</p>
                  <span className="text-xs text-zinc-400 font-medium">Available in front register</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Wallet size={20} />
                </div>
              </div>

              {/* Digital Inflow Box */}
              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex justify-between items-center hover:border-indigo-500/40 transition-colors">
                <div>
                  <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Digital Online Inflow</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">{formatINR(onlineCollected)}</p>
                  <span className="text-xs text-zinc-400 font-medium">UPI, QR, POS & Net Banking</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            {/* Inflow Share Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-bold">
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
          <div className="synos-dept-card rounded-2xl p-6 space-y-3">
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
    { id: 'dues', label: 'Due Bills', icon: AlertCircle },
    { id: 'receivables', label: 'Pending Receivables', icon: Clock },
    { id: 'corrections', label: 'Visit Corrections', icon: ShieldCheck },
    { id: 'cancellations', label: 'Cancellations & Refunds', icon: Ban },
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
        <button onClick={() => loadStats(presetRange)} className="text-xs font-bold text-synos-primary hover:underline uppercase tracking-widest cursor-pointer">Retry Synchronization</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-500">
      {/* TERMINAL HEADER (UNBOXED NATIVE CANVAS STYLE) */}
      <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">Revenue Command Center</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Monitor incoming payments, receivables, and drawer balances.</p>
        </div>

        {/* Time Horizon Selector */}
        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'month', label: 'This Month' },
            { id: 'quarter', label: 'This Quarter' },
            { id: 'year', label: 'This Year' },
            { id: 'all', label: 'All Time' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setPresetRange(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                presetRange === t.id 
                  ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB NAVIGATION (SEGMENTED PILL ON NATIVE CANVAS) */}
      <div ref={tabsRef} className="px-8 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-thin">
        <div className="flex items-center bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/finance/revenue/${t.id}`)}
              data-active-tab={tab === t.id ? "true" : "false"}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                tab === t.id
                  ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
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
        {tab === 'bills' && <BillsCollectionsScreen presetRange={presetRange} setPresetRange={setPresetRange} />}
        {tab === 'dues' && <DueBillsScreen presetRange={presetRange} setPresetRange={setPresetRange} />}
        {tab === 'receivables' && <PendingReceivablesScreen presetRange={presetRange} setPresetRange={setPresetRange} />}
        {tab === 'corrections' && <VisitCorrectionsScreen presetRange={presetRange} setPresetRange={setPresetRange} />}
        {tab === 'cancellations' && <CancellationsRefundsScreen presetRange={presetRange} setPresetRange={setPresetRange} />}
        {tab === 'history' && <CollectionHistoryScreen presetRange={presetRange} setPresetRange={setPresetRange} />}
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
        <span className={`px-2 py-0.5 rounded-full text-xs uppercase tracking-wider border ${styles[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
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

export const BillsCollectionsScreen = ({ presetRange = 'month', setPresetRange }) => {
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
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
    
    // Preset range mapping
    const presetToLabel = useMemo(() => ({
        today: 'Today',
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year',
        all: 'All Time'
    }), []);

    const labelToPreset = useMemo(() => ({
        'Today': 'today',
        'This Month': 'month',
        'This Quarter': 'quarter',
        'This Year': 'year',
        'All Time': 'all'
    }), []);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [departmentFilter, setDepartmentFilter] = useState(initialDept);
    const [modalityFilter, setModalityFilter] = useState(initialMod);
    const [branchFilter, setBranchFilter] = useState(initialBranch);
    const [dateRange, setDateRange] = useState(() => presetToLabel[presetRange] || 'This Month');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [searchQuery, setSearchQuery] = useState('');

    // Keep dateRange in sync with header presetRange
    useEffect(() => {
        if (presetRange && presetToLabel[presetRange] && dateRange !== presetToLabel[presetRange]) {
            setDateRange(presetToLabel[presetRange]);
        }
    }, [presetRange, presetToLabel]);

    const handleDateRangeChange = (newVal) => {
        setDateRange(newVal);
        if (setPresetRange && labelToPreset[newVal]) {
            setPresetRange(labelToPreset[newVal]);
        }
    };

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
            const payload = {};
            if (partnerId) payload.partnerId = partnerId;
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
        } else if (dateRange === 'This Quarter') {
            const currentQuarter = Math.floor(today.getMonth() / 3);
            const quarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
            if (billDate < quarterStart) return false;
        } else if (dateRange === 'This Year') {
            const yearStart = new Date(today.getFullYear(), 0, 1);
            if (billDate < yearStart) return false;
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
        <div className="px-6 py-5 w-full space-y-6 animate-in fade-in duration-500">
            {/* Header & Download Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 tracking-normal leading-tight">Bills & Collections</h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium">
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
                            <span>Doctor Invoice ({partnerBillsWithPending.length})</span>
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

                    <button
                        onClick={() => setIsPrintSummaryOpen(true)}
                        disabled={filteredBills.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Printer size={15} />
                        <span>Print Summary</span>
                    </button>
                </div>
            </div>

            {/* KPI METRIC STRIP (Cash vs Online vs Prepaid vs Referral Cut) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Billed</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white mt-1">₹{totalBilled.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">{filteredBills.length} Invoices</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Cash Collected</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalCash.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Physical Drawer</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Digital / Online</p>
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">₹{totalOnline.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">UPI / POS / Cards</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-500">Prepaid Wallet</p>
                    <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">₹{totalPrepaid.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Token Redemptions</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Referral Cut</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalReferralCut.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Partner Commissions</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Pending Dues</p>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalPending.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Receivables Balance</span>
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
                                    className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-synos-primary"
                                />
                                <span className="text-zinc-400 text-xs">to</span>
                                <input 
                                    type="date" 
                                    value={customDates.end}
                                    onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                                    className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-synos-primary"
                                />
                            </div>
                        )}
                        <select 
                            value={dateRange}
                            onChange={(e) => handleDateRangeChange(e.target.value)}
                            className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-semibold dark:text-zinc-300 outline-none focus:border-synos-primary transition-all cursor-pointer"
                        >
                            <option>Today</option>
                            <option>Yesterday</option>
                            <option>This Week</option>
                            <option>This Month</option>
                            <option>This Quarter</option>
                            <option>This Year</option>
                            <option>All Time</option>
                            <option>Custom Range</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table Surface */}
            <div className="synos-dept-card rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse text-xs font-bold uppercase tracking-wider">
                        Synchronizing bill ledger...
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="p-16 text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No matching bills found</p>
                        <p className="text-xs text-zinc-400">Try adjusting the department, modality, branch, or date range filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse synos-table">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800">
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Bill No</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Patient</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Dept / Modality</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Partner / Account</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Total</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Payment Breakup</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Pending</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Status</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Date</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                                {filteredBills.map((bill) => (
                                    <tr key={bill.billId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-4 text-xs font-bold dark:text-zinc-200">
                                            {bill.billNumber}
                                            {bill.branchName && (
                                                <p className="text-xs font-normal text-zinc-400 mt-0.5">{bill.branchName}</p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                    {(bill.patientName || 'PA').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold dark:text-zinc-200 block">{bill.patientName}</span>
                                                    {bill.token && <span className="text-xs text-zinc-400 font-mono">Token: {bill.token}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-semibold dark:text-zinc-200">
                                                    {bill.department || 'Pathology'}
                                                </span>
                                                {bill.modality && bill.modality !== 'General' && bill.modality !== bill.department && (
                                                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                                                        {bill.modality}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-zinc-500">
                                            <span>{bill.partnerName}</span>
                                            {bill.referralCommissionCut > 0 && (
                                                <p className="text-xs text-amber-500 font-medium mt-0.5">
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
                                            <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-zinc-400 mt-0.5">
                                                {bill.cashAmount > 0 && <span>Cash: ₹{bill.cashAmount.toLocaleString()}</span>}
                                                {bill.onlineAmount > 0 && <span>Online: ₹{bill.onlineAmount.toLocaleString()}</span>}
                                                {bill.prepaidAmount > 0 && <span>Prepaid: ₹{bill.prepaidAmount.toLocaleString()}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-black text-right text-rose-500">
                                            <p className="font-mono">₹{bill.pendingAmount.toLocaleString()}</p>
                                            {bill.pendingAmount > 0 && (
                                                <span className="text-xs font-bold block mt-0.5 tracking-normal text-zinc-400">
                                                    {bill.partnerCategory === 'Partner' 
                                                        ? `Due: ${bill.partnerName}` 
                                                        : (bill.partnerCategory === 'Direct' ? 'Due at Counter' : bill.partnerCategory)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <StatusBadge status={bill.status} />
                                        </td>
                                        <td className="p-4 text-xs text-zinc-400 font-mono whitespace-nowrap">
                                            {formatDateCompact(bill.date)}
                                        </td>
                                        {/* ALWAYS VISIBLE ACTIONS WITH ENTERPRISE DOCUMENT GENERATION */}
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* A4 Patient Tax Invoice */}
                                                <button
                                                    onClick={() => handleOpenInvoiceDoc(bill.billId)}
                                                    title="View & Print A4 Patient Tax Invoice"
                                                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                >
                                                    <FileText size={12} className="text-synos-primary" />
                                                    <span className="hidden sm:inline">A4 Bill</span>
                                                </button>

                                                {/* B2B Doctor Invoice (For Partner bills) */}
                                                {bill.partnerCategory === 'Partner' && (
                                                    <button
                                                        onClick={() => handleOpenPartnerClaim(bill.partnerId || bill.referralPartnerId, [bill.visitId])}
                                                        title="Generate B2B Diagnostic Invoice for this visit"
                                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                                    >
                                                        <Receipt size={12} />
                                                        <span>Invoice</span>
                                                    </button>
                                                )}

                                                {bill.pendingAmount > 0 ? (
                                                    <button 
                                                        onClick={() => handleRecordCollection(bill)}
                                                        className="px-3 py-1.5 rounded-lg bg-synos-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-synos-primary/90 transition-all shadow-sm cursor-pointer"
                                                    >
                                                        {bill.partnerCategory === 'Partner' ? 'Settle' : 'Collect'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRecordCollection(bill)}
                                                        className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
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
                    title={docModalType === 'claim' ? "B2B Diagnostic Tax Invoice" : "Patient Tax Invoice (A4)"}
                    onWhatsAppShare={docModalType === 'claim' ? handleWhatsAppClaimShare : null}
                    defaultLetterheadMode={docData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={docData?.lab?.topMarginMm || 40}
                >
                    <DynamicDocumentRenderer 
                        slotId={docModalType === 'claim' ? "partner_b2b_invoice" : "patient_tax_invoice"} 
                        data={docData} 
                    />
                </CommercialDocumentViewer>
            )}

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_bills_daybook"
                title="Bills & Collections Revenue Ledger"
                subtitle="Operational ledger with branch, department, and modality transaction breakdowns"
                dateRangeText={dateRange === 'Custom Range' ? `${customDates.start} to ${customDates.end}` : dateRange}
                categoryLabel="REVENUE LEDGER AUDIT"
                filterTags={[
                    branchFilter !== 'All' ? `Branch: ${branches.find(b => (b.branchId || b.id) === branchFilter)?.name || branchFilter}` : null,
                    departmentFilter !== 'All' ? `Dept: ${departmentFilter}` : null,
                    modalityFilter !== 'All' ? `Modality: ${modalityFilter}` : null,
                    statusFilter !== 'All' ? `Status: ${statusFilter}` : null,
                    categoryFilter !== 'All' ? `Category: ${categoryFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Billed", value: `₹${totalBilled.toLocaleString()}`, color: "text-zinc-900", subtext: `${filteredBills.length} Invoices` },
                    { label: "Cash Collected", value: `₹${totalCash.toLocaleString()}`, color: "text-emerald-600", subtext: "Physical Currency" },
                    { label: "Online / Digital", value: `₹${totalOnline.toLocaleString()}`, color: "text-sky-600", subtext: "UPI & Cards" },
                    { label: "Wallet / Advance", value: `₹${totalPrepaid.toLocaleString()}`, color: "text-amber-600", subtext: "Prepaid Balances" },
                    { label: "Pending Dues", value: `₹${totalPending.toLocaleString()}`, color: "text-rose-600", subtext: "Receivables Balance" },
                    { label: "Partner Commissions", value: `₹${totalReferralCut.toLocaleString()}`, color: "text-purple-600", subtext: "Referral Liability" }
                ]}
                columns={[
                    { key: 'billNumber', label: 'Bill / Inv No' },
                    { key: 'date', label: 'Date', render: (v) => formatDateCompact(v) },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'branchName', label: 'Branch', render: (v) => v || 'Main Facility' },
                    { key: 'department', label: 'Dept / Modality', render: (_, r) => {
                        const dept = r.department || 'Pathology';
                        const mod = r.modality && r.modality !== 'General' && r.modality !== dept ? ` / ${r.modality}` : '';
                        return `${dept}${mod}`;
                    }},
                    { key: 'partnerCategory', label: 'Billing Model', render: (v) => v || 'Direct Counter' },
                    { key: 'totalAmount', label: 'Billed (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'paidAmount', label: 'Paid (₹)', align: 'right', render: (_, r) => `₹${Number((r.cashAmount || 0) + (r.onlineAmount || 0) + (r.prepaidAmount || 0)).toLocaleString()}` },
                    { key: 'pendingAmount', label: 'Due (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'status', label: 'Status', align: 'center', render: (v) => v || 'Pending' }
                ]}
                data={filteredBills}
                summaryTotals={{
                    totalAmount: `₹${totalBilled.toLocaleString()}`,
                    paidAmount: `₹${(totalCash + totalOnline + totalPrepaid).toLocaleString()}`,
                    pendingAmount: `₹${totalPending.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const DueBillsScreen = ({ presetRange = 'month', setPresetRange }) => {
    const { user } = useAuth();
    const [dueBills, setDueBills] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [branchFilter, setBranchFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Partial' | 'Pending'

    // Collection Modal State
    const [selectedDueBill, setSelectedDueBill] = useState(null);
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [collectAmount, setCollectAmount] = useState('');
    const [collectMethod, setCollectMethod] = useState('Cash');
    const [collectNotes, setCollectNotes] = useState('');
    const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);
    const [collectError, setCollectError] = useState(null);

    // Document Modal State
    const [docData, setDocData] = useState(null);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
        AdminApi.getBranches().then(b => setBranches(b || [])).catch(() => {});
    }, [presetRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getDueBills({ preset: presetRange });
            setDueBills(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load patient due bills:", err);
            setDueBills([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCollectModal = (bill) => {
        setSelectedDueBill(bill);
        setCollectAmount(String(bill.balanceDue || ''));
        setCollectMethod('Cash');
        setCollectNotes('');
        setCollectError(null);
        setIsCollectModalOpen(true);
    };

    const handleConfirmCollect = async (e) => {
        e?.preventDefault();
        if (!selectedDueBill || !collectAmount || Number(collectAmount) <= 0) return;

        try {
            setIsSubmittingCollect(true);
            setCollectError(null);
            await FinanceApi.collectDuePayment(selectedDueBill.invoiceId, {
                amount: Number(collectAmount),
                method: collectMethod,
                notes: collectNotes
            });
            setIsCollectModalOpen(false);
            setSelectedDueBill(null);
            await loadData();
        } catch (err) {
            setCollectError(err.message || "Failed to record payment");
        } finally {
            setIsSubmittingCollect(false);
        }
    };

    const handleViewInvoiceDoc = async (invoiceId) => {
        try {
            setLoadingDoc(true);
            const doc = await FinanceApi.getInvoiceDocument(invoiceId);
            setDocData(doc);
            setIsDocModalOpen(true);
        } catch (err) {
            console.error("Failed to fetch tax invoice:", err);
        } finally {
            setLoadingDoc(false);
        }
    };

    // Filter Logic
    const filteredBills = useMemo(() => {
        return dueBills.filter(b => {
            if (branchFilter !== 'All' && b.branchId && b.branchId !== branchFilter) return false;
            if (statusFilter === 'Partial' && b.status !== 'Partial') return false;
            if (statusFilter === 'Pending' && b.status !== 'Pending') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (b.patientName || '').toLowerCase().includes(q);
                const matchToken = (b.token || '').toLowerCase().includes(q);
                const matchPhone = (b.patientMobile || '').includes(q);
                const matchMrn = (b.patientMrn || '').toLowerCase().includes(q);
                const matchDoc = (b.referralDoctor || '').toLowerCase().includes(q);
                if (!matchName && !matchToken && !matchPhone && !matchMrn && !matchDoc) return false;
            }

            return true;
        });
    }, [dueBills, branchFilter, statusFilter, searchQuery]);

    const totalDue = filteredBills.reduce((sum, b) => sum + (Number(b.balanceDue) || 0), 0);
    const totalPaid = filteredBills.reduce((sum, b) => sum + (Number(b.totalPaid) || 0), 0);
    const totalInvoiced = filteredBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const recoveryRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

    // CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Visit Token",
            "Date",
            "Patient Name",
            "MRN",
            "Phone",
            "Facility / Branch",
            "Referring Doctor",
            "Tests Invoiced",
            "Total Invoiced (INR)",
            "Paid Amount (INR)",
            "Balance Due (INR)",
            "Status",
            "Last Payment Date",
            "Last Payment Method"
        ];

        const rows = filteredBills.map(b => [
            `"${b.token || ''}"`,
            `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}"`,
            `"${(b.patientName || '').replace(/"/g, '""')}"`,
            `"${b.patientMrn || ''}"`,
            `"${b.patientMobile || ''}"`,
            `"${(b.branchName || 'Main Facility').replace(/"/g, '""')}"`,
            `"${(b.referralDoctor || 'Direct Patient').replace(/"/g, '""')}"`,
            `"${(b.tests?.join('; ') || '').replace(/"/g, '""')}"`,
            b.totalAmount || 0,
            b.totalPaid || 0,
            b.balanceDue || 0,
            `"${b.status || ''}"`,
            `"${b.lastPaymentDate ? new Date(b.lastPaymentDate).toLocaleString() : 'N/A'}"`,
            `"${b.lastPaymentMethod || 'N/A'}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Due_Bills_Summary_${presetRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full px-8 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        Patient Due Bills & Counter Balances
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                        Track outstanding patient dues from walk-in and standard billing. Record desk collections and download due reports.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadSummary}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => setIsPrintSummaryOpen(true)}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5 text-synos-primary" />
                        <span>Print Summary</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card border border-rose-500/20 bg-rose-500/5">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Total Patient Dues</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalDue.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">{filteredBills.length} Active Due Bills</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Collected So Far</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalPaid.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Partially Paid at Counter</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Billed Volume</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">₹{totalInvoiced.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Original Invoiced Value</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Recovery Rate</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{recoveryRate}%</p>
                    <span className="text-xs text-zinc-400 font-medium">Realized Settlement Ratio</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {['All', 'Partial', 'Pending'].map(f => (
                            <FilterTab key={f} label={f === 'All' ? 'All Due Bills' : (f === 'Partial' ? 'Partially Paid' : 'Unpaid Counter Dues')} isActive={statusFilter === f} onClick={() => setStatusFilter(f)} />
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Branch Selector */}
                        <div className="relative min-w-[160px]">
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                            >
                                <option value="All">All Facilities / Branches</option>
                                {branches.map(b => (
                                    <option key={b.branchId || b.id} value={b.branchId || b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[220px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search patient, token, phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Due Bills Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>Scanning outstanding patient dues...</span>
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Zero Patient Dues Outstanding</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            All patient counter bills are fully settled for the selected time horizon. Great financial health!
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-xs">
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Token & Patient</th>
                                    <th className="py-3 px-4">Facility</th>
                                    <th className="py-3 px-4">Referring Doctor</th>
                                    <th className="py-3 px-4">Tests</th>
                                    <th className="py-3 px-4 text-right">Total Bill</th>
                                    <th className="py-3 px-4 text-right">Paid So Far</th>
                                    <th className="py-3 px-4 text-right">Balance Due</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredBills.map((b) => (
                                    <tr key={b.invoiceId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                        <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-xs">
                                            {b.createdAt ? new Date(b.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                    {b.token}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-zinc-900 dark:text-white leading-tight">{b.patientName}</p>
                                                    <p className="text-xs text-zinc-400 font-medium">
                                                        {b.patientGender || ''} {b.patientAge ? `• ${b.patientAge}y` : ''} {b.patientMobile ? `• ${b.patientMobile}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                            {b.branchName || 'Main Facility'}
                                        </td>
                                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                                            {b.referralDoctor || 'Direct Patient'}
                                        </td>
                                        <td className="py-3.5 px-4 max-w-[200px] truncate text-zinc-500 text-xs">
                                            {b.tests?.join(', ') || 'Diagnostic Tests'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                                            ₹{Number(b.totalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                            ₹{Number(b.totalPaid || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                ₹{Number(b.balanceDue || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleOpenCollectModal(b)}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                                >
                                                    <IndianRupee className="w-3 h-3" />
                                                    <span>Collect Due</span>
                                                </button>
                                                <button
                                                    onClick={() => handleViewInvoiceDoc(b.invoiceId)}
                                                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                                    title="View Patient Tax Invoice"
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* COLLECT DUE MODAL */}
            {isCollectModalOpen && selectedDueBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <IndianRupee className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Collect Patient Due</h3>
                                    <p className="text-xs text-zinc-400">Token: {selectedDueBill.token} • {selectedDueBill.patientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCollectModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {collectError && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400">
                                {collectError}
                            </div>
                        )}

                        {/* Balance Overview */}
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">Total Invoiced</span>
                                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">₹{selectedDueBill.totalAmount?.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-xs text-emerald-500 uppercase font-bold block">Paid So Far</span>
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">₹{selectedDueBill.totalPaid?.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-xs text-rose-500 uppercase font-bold block">Current Due</span>
                                <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400">₹{selectedDueBill.balanceDue?.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Amount Collecting Now (₹)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedDueBill.balanceDue}
                                    value={collectAmount}
                                    onChange={(e) => setCollectAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-mono font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                                />
                            </div>
                            {Number(collectAmount) < selectedDueBill.balanceDue && Number(collectAmount) > 0 && (
                                <p className="text-xs text-amber-500 font-medium">
                                    * Remaining due after this payment: ₹{(selectedDueBill.balanceDue - Number(collectAmount)).toLocaleString()}
                                </p>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Payment Channel</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Cash', 'UPI', 'Card'].map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setCollectMethod(m)}
                                        className={cn(
                                            "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                                            collectMethod === m
                                                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                                        )}
                                    >
                                        {m === 'Cash' && <IndianRupee className="w-3.5 h-3.5" />}
                                        {m === 'UPI' && <Smartphone className="w-3.5 h-3.5" />}
                                        {m === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                                        <span>{m}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Notes / Transaction Ref (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. UPI txn id or receipt memo"
                                value={collectNotes}
                                onChange={(e) => setCollectNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800 border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setIsCollectModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSubmittingCollect || !collectAmount || Number(collectAmount) <= 0}
                                onClick={handleConfirmCollect}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                {isSubmittingCollect ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Recording...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Confirm Collection (₹{Number(collectAmount || 0).toLocaleString()})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Commercial Document Modal */}
            {isDocModalOpen && docData && (
                <CommercialDocumentViewer
                    isOpen={isDocModalOpen}
                    onClose={() => {
                        setIsDocModalOpen(false);
                        setDocData(null);
                    }}
                    title={`Patient Tax Invoice - ${docData.patient?.name || ''}`}
                    defaultLetterheadMode="digital"
                    paperSize="a4"
                >
                    <DynamicDocumentRenderer
                        slotId="patient_tax_invoice"
                        data={docData}
                        forceRefresh={true}
                    />
                </CommercialDocumentViewer>
            )}

            {/* Printable Summary Modal */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                title="Patient Due Bills & Balances Report"
                timeRange={presetRange}
                columns={[
                    { key: 'token', label: 'Token' },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'patientMobile', label: 'Phone' },
                    { key: 'branchName', label: 'Facility' },
                    { key: 'referralDoctor', label: 'Referring Doctor' },
                    { key: 'totalAmount', label: 'Total Invoiced', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'totalPaid', label: 'Paid Amount', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'balanceDue', label: 'Balance Due', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` }
                ]}
                data={filteredBills}
                summaryTotals={{
                    totalAmount: `₹${totalInvoiced.toLocaleString()}`,
                    paidAmount: `₹${totalPaid.toLocaleString()}`,
                    pendingAmount: `₹${totalDue.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const PendingReceivablesScreen = ({ presetRange = 'month', setPresetRange }) => {
    const { user } = useAuth();
    const [partnerSummaries, setPartnerSummaries] = useState([]);
    const [allBills, setAllBills] = useState([]);
    const [branches, setBranches] = useState([]);
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

    // Multi-dimensional filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [doctorFilter, setDoctorFilter] = useState('All');
    const [dateRange, setDateRange] = useState('All Time');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [branchFilter, setBranchFilter] = useState('All');
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
        AdminApi.getBranches().then(b => setBranches(b || [])).catch(() => {});
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [summaries, bills] = await Promise.all([
                FinanceApi.getPartnerReceivablesSummary(),
                FinanceApi.getReceivables('partner')
            ]);
            setPartnerSummaries(summaries || []);
            setAllBills(bills || []);
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
            alert("Could not load invoice: " + (err.response?.data?.message || err.message));
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
        const msg = `Dear ${claimDocData?.partner?.name || 'Doctor'},\n\nDiagnostic B2B Invoice from ${claimDocData?.lab?.labLegalName || 'SynOS Healthcare'}:\n• Selected Patient Visits: ${count}\n• Total Diagnostic Charges: ₹${netDue.toLocaleString()}\n• Net Amount Payable: ₹${netDue.toLocaleString()}\n\nRemittance details and UPI QR are attached in the invoice. Please verify and settle dues at your earliest convenience. Thank you!`;
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

    // Extract list of all referring doctors / clinical partners for filter dropdown
    const doctorOptions = useMemo(() => {
        const names = new Set();
        partnerSummaries.forEach(p => {
            if (p.partnerName) names.add(p.partnerName);
        });
        allBills.forEach(b => {
            if (b.partnerName) names.add(b.partnerName);
        });
        return Array.from(names).sort();
    }, [partnerSummaries, allBills]);

    // Filter partners based on search, doctor, status, and aging
    const filteredPartnerSummaries = partnerSummaries.filter(p => {
        if (doctorFilter !== 'All' && p.partnerName !== doctorFilter) {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = (p.partnerName || '').toLowerCase().includes(q);
            const matchId = (p.partnerId || '').toString().toLowerCase().includes(q);
            if (!matchName && !matchId) return false;
        }
        if (statusFilter === 'Critical (>30d)' && !(p.aging_30_Plus > 0)) return false;
        if (statusFilter === 'Moderate (7-30d)' && !(p.aging_7_30 > 0)) return false;
        if (statusFilter === 'Recent (0-7d)' && !(p.aging_0_7 > 0)) return false;
        return true;
    });

    const totals = {
        outstanding: filteredPartnerSummaries.reduce((acc, p) => acc + (p.totalOutstanding || 0), 0),
        count: filteredPartnerSummaries.reduce((acc, p) => acc + (p.billCount || 0), 0),
        overdue: filteredPartnerSummaries.reduce((acc, p) => acc + (p.aging_30_Plus || 0), 0)
    };

    // Prepare itemized bills breakdown (including individual tests) for Printable Summary
    const itemizedBillsForPrint = useMemo(() => {
        const partnerNames = new Set(filteredPartnerSummaries.map(p => p.partnerName));
        return allBills
            .filter(b => partnerNames.has(b.partnerName) && !b.settledAt)
            .map(b => ({
                id: b.id || b.receivableFactId,
                partnerName: b.partnerName,
                token: b.token || b.visitToken || '-',
                patientName: b.patientName || 'Unknown Patient',
                testsSummary: b.testsSummary || (b.testNames?.join(', ')) || (b.tests?.join(', ')) || '-',
                date: b.occurredAt || b.date ? new Date(b.occurredAt || b.date).toLocaleDateString() : '-',
                totalAmount: b.totalAmount || b.amount || 0,
                balanceDue: b.balanceDue !== undefined && !isNaN(b.balanceDue) ? b.balanceDue : (b.amount || 0) - (b.amountReceived || 0)
            }));
    }, [filteredPartnerSummaries, allBills]);

    // Tab-Aware CSV Download for Partner Receivables (includes itemized individual tests)
    const handleDownloadSummary = () => {
        const headers = [
            "Referring Doctor / Partner Name",
            "Token / Visit Ref",
            "Patient Name",
            "Tests / Investigations Billed",
            "Bill Date",
            "Gross Amount (INR)",
            "Paid / Recovered (INR)",
            "Balance Due (INR)",
            "Aging (Days)",
            "Overdue Category"
        ];
        const partnerNames = new Set(filteredPartnerSummaries.map(p => p.partnerName));
        const relevantBills = allBills.filter(b => partnerNames.has(b.partnerName) && !b.settledAt);
        
        let rows = [];
        if (relevantBills.length > 0) {
            rows = relevantBills.map(b => {
                const total = b.totalAmount || b.amount || 0;
                const paid = b.paidAmount || b.amountReceived || 0;
                const due = b.balanceDue !== undefined && !isNaN(b.balanceDue) ? b.balanceDue : (total - paid);
                const billDate = b.occurredAt || b.date;
                const agingDays = billDate ? Math.max(0, Math.floor((new Date() - new Date(billDate)) / (1000 * 60 * 60 * 24))) : 0;
                const tests = b.testsSummary || (b.testNames?.join('; ')) || (b.tests?.join('; ')) || 'N/A';
                return [
                    `"${(b.partnerName || '').replace(/"/g, '""')}"`,
                    `"${b.token || b.visitToken || ''}"`,
                    `"${(b.patientName || '').replace(/"/g, '""')}"`,
                    `"${tests.replace(/"/g, '""')}"`,
                    `"${billDate ? new Date(billDate).toLocaleDateString() : 'N/A'}"`,
                    total,
                    paid,
                    due,
                    agingDays,
                    `"${FinanceUtils.getAgingCategory(billDate)}"`
                ];
            });
        } else {
            // Fallback to partner aging rollups if no individual bills
            rows = filteredPartnerSummaries.map(p => [
                `"${(p.partnerName || '').replace(/"/g, '""')}"`,
                `"ALL"`,
                `"ALL"`,
                `"ALL REFERRED TESTS"`,
                `"${p.oldestDueDate ? new Date(p.oldestDueDate).toLocaleDateString() : 'N/A'}"`,
                p.totalOutstanding || 0,
                0,
                p.totalOutstanding || 0,
                `"-"`,
                `"${FinanceUtils.getAgingCategory(p.oldestDueDate)}"`
            ]);
        }

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `synos_partner_receivables_with_tests_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="px-6 py-5 w-full space-y-6 animate-in fade-in duration-500">
            {/* Header & Actions Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 tracking-normal leading-tight">Partner Receivables</h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium">Operational inbox for institutional recovery and B2B settlements.</p>
                </div>
                
                <div className="flex items-center flex-wrap gap-2.5">
                    <button
                        onClick={handleDownloadSummary}
                        disabled={filteredPartnerSummaries.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Download size={15} />
                        <span>Download Summary ({filteredPartnerSummaries.length})</span>
                    </button>

                    <button
                        onClick={() => setIsPrintSummaryOpen(true)}
                        disabled={filteredPartnerSummaries.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Printer size={15} />
                        <span>Print Summary</span>
                    </button>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Outstanding</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{FinanceUtils.formatCurrency(totals.outstanding)}</p>
                    <span className="text-xs text-zinc-400 font-medium">{totals.count} Open Investigation Invoices</span>
                </div>
                <div className="p-5 rounded-2xl synos-kpi-card border-rose-300 dark:border-rose-900/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Critical Overdue (&gt;30d)</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{FinanceUtils.formatCurrency(totals.overdue)}</p>
                    <span className="text-xs text-rose-500/70 font-medium">Overdue Recovery Liabilities</span>
                </div>
                <div className="p-5 rounded-2xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Debtors</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{filteredPartnerSummaries.length}</p>
                    <span className="text-xs text-zinc-400 font-medium">Contracted Clinical Partners</span>
                </div>
            </div>

            {/* Comprehensive Multi-Dimensional Filters Bar */}
            <FinanceFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search partner name or account ID..."
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                statusOptions={['All', 'Critical (>30d)', 'Moderate (7-30d)', 'Recent (0-7d)']}
                doctorFilter={doctorFilter}
                onDoctorChange={setDoctorFilter}
                doctorOptions={doctorOptions}
                branchFilter={branchFilter}
                onBranchChange={setBranchFilter}
                branches={branches}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                customDates={customDates}
                onCustomDatesChange={setCustomDates}
            />

            <div className="synos-dept-card rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Reconciling partner ledgers...</div>
                ) : (
                    <table className="w-full text-left border-collapse synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800">
                                <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-500">Partner / Account</th>
                                <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Open Bills</th>
                                <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Total Outstanding</th>
                                <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-500">Oldest Dues</th>
                                <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-500">Aging Profile</th>
                                <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {filteredPartnerSummaries.map((partner) => (
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
                                                    <span className="text-xs text-zinc-400 uppercase tracking-normal">ID: {partner.partnerId.toString().substring(0, 8)}</span>
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
                                                    title="Generate B2B Diagnostic Tax Invoice for Referral Partner"
                                                    className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                                >
                                                    <Receipt size={12} />
                                                    <span>B2B Invoice</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleBulkSettle(partner)}
                                                    className="px-4 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-synos-primary/30 transition-all cursor-pointer"
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
                                                                        <p className="text-xs text-zinc-500 font-medium">
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
                                                                        className="px-3 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-bold cursor-pointer transition-all"
                                                                    >
                                                                        Clear Selection
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleOpenPartnerClaim(partner, selectedInPartner.map(b => b.receivableFactId))}
                                                                        disabled={generatingClaim}
                                                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                                                                    >
                                                                        <Receipt size={13} />
                                                                        <span>Generate B2B Invoice ({selectedCount})</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b dark:border-zinc-900 pb-2">
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
                                                                    <th className="pb-2">Tests / Investigations</th>
                                                                    <th className="pb-2">Date</th>
                                                                    <th className="pb-2 text-right">Original</th>
                                                                    <th className="pb-2 text-right">Recovered</th>
                                                                    <th className="pb-2 text-right">Outstanding</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
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
                                                                            <td className="py-3 text-xs font-mono text-zinc-500 font-bold">{bill.token || bill.visitToken || bill.receivableFactId?.toString().substring(0, 13)}</td>
                                                                            <td className="py-3 text-xs font-bold dark:text-zinc-300">{bill.patientName || 'Unknown Patient'}</td>
                                                                            <td className="py-3 text-xs text-zinc-600 dark:text-zinc-400 max-w-[220px] truncate" title={bill.testsSummary || (bill.testNames?.join(', ')) || (bill.tests?.join(', ')) || '-'}>
                                                                                {bill.testsSummary || (bill.testNames?.join(', ')) || (bill.tests?.join(', ')) || '-'}
                                                                            </td>
                                                                            <td className="py-3 text-xs text-zinc-400">{new Date(bill.occurredAt || bill.date).toLocaleDateString()}</td>
                                                                            <td className="py-3 text-xs font-bold text-right dark:text-zinc-300">₹{(bill.totalAmount || bill.amount || 0).toLocaleString()}</td>
                                                                            <td className="py-3 text-xs font-bold text-right text-emerald-500">₹{(bill.paidAmount || bill.amountReceived || 0).toLocaleString()}</td>
                                                                            <td className="py-3 text-xs font-bold text-right text-rose-500">₹{(bill.balanceDue !== undefined && !isNaN(bill.balanceDue) ? bill.balanceDue : (bill.amount || 0) - (bill.amountReceived || 0)).toLocaleString()}</td>
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
                    title={`B2B Diagnostic Invoice - ${claimDocData?.partner?.name || 'Partner'}`}
                    onWhatsAppShare={handleWhatsAppClaimShare}
                    defaultLetterheadMode={claimDocData?.lab?.defaultLetterheadMode || "digital"}
                    topMarginMm={claimDocData?.lab?.topMarginMm || 40}
                >
                    <DynamicDocumentRenderer slotId="partner_b2b_invoice" data={claimDocData} />
                </CommercialDocumentViewer>
            )}

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_bills_daybook"
                title="Institutional & Referral Partner Receivables Ledger"
                subtitle="B2B credit balances, aging distribution, and recovery liabilities"
                dateRangeText={dateRange === 'Custom Range' ? `${customDates.start} to ${customDates.end}` : dateRange}
                categoryLabel="RECEIVABLES LEDGER AUDIT"
                filterTags={[
                    statusFilter !== 'All' ? `Status: ${statusFilter}` : null,
                    doctorFilter !== 'All' ? `Doctor / Referrer: ${doctorFilter}` : null,
                    branchFilter !== 'All' ? `Branch: ${branches.find(b => (b.branchId || b.id) === branchFilter)?.name || branchFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Outstanding", value: `₹${totals.outstanding.toLocaleString()}`, color: "text-zinc-900", subtext: `${totals.count} Open Invoices` },
                    { label: "Critical Overdue (>30d)", value: `₹${totals.overdue.toLocaleString()}`, color: "text-rose-600", subtext: "Immediate Action Required" },
                    { label: "Debtor Partners", value: filteredPartnerSummaries.length, color: "text-indigo-600", subtext: "Referred Clinic Accounts" }
                ]}
                columns={[
                    { key: 'partnerName', label: 'Partner / Account Name' },
                    { key: 'partnerId', label: 'Account ID', render: (v) => (v || '').toString().substring(0, 10) },
                    { key: 'billCount', label: 'Open Invoices', align: 'center' },
                    { key: 'totalOutstanding', label: 'Outstanding (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'aging_0_7', label: '0-7 Days (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'aging_7_30', label: '7-30 Days (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'aging_30_Plus', label: '>30 Days Overdue (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'oldestDueDate', label: 'Oldest Due', render: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' }
                ]}
                data={filteredPartnerSummaries}
                summaryTotals={{
                    totalOutstanding: `₹${totals.outstanding.toLocaleString()}`,
                    aging_30_Plus: `₹${totals.overdue.toLocaleString()}`
                }}
                secondaryTable={{
                    title: "Itemized Investigations & Clinical Partner Bills",
                    subtitle: `Complete breakdown of tests referred across ${itemizedBillsForPrint.length} open visit records`,
                    columns: [
                        { key: 'partnerName', label: 'Referring Doctor / Partner' },
                        { key: 'token', label: 'Token / Ref' },
                        { key: 'patientName', label: 'Patient Name' },
                        { key: 'testsSummary', label: 'Tests / Investigations Billed' },
                        { key: 'date', label: 'Date' },
                        { key: 'totalAmount', label: 'Total (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                        { key: 'balanceDue', label: 'Balance Due (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` }
                    ],
                    data: itemizedBillsForPrint,
                    summaryTotals: {
                        totalAmount: `₹${itemizedBillsForPrint.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0).toLocaleString()}`,
                        balanceDue: `₹${itemizedBillsForPrint.reduce((acc, b) => acc + Number(b.balanceDue || 0), 0).toLocaleString()}`
                    }
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const VisitCorrectionsScreen = ({ presetRange = 'month', setPresetRange }) => {
    const { user } = useAuth();
    const [corrections, setCorrections] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [branchFilter, setBranchFilter] = useState('All');
    const [shiftFilter, setShiftFilter] = useState('All'); // 'All' | 'Upward' | 'Downward' | 'Zero'

    // Details Modal State
    const [selectedCorrection, setSelectedCorrection] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Document Modal State
    const [docData, setDocData] = useState(null);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
        AdminApi.getBranches().then(b => setBranches(b || [])).catch(() => {});
    }, [presetRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getVisitCorrections({ preset: presetRange });
            setCorrections(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load visit correction audit trail:", err);
            setCorrections([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoiceDoc = async (invoiceId) => {
        if (!invoiceId) return;
        try {
            setLoadingDoc(true);
            const doc = await FinanceApi.getInvoiceDocument(invoiceId);
            setDocData(doc);
            setIsDocModalOpen(true);
        } catch (err) {
            console.error("Failed to fetch tax invoice for corrected visit:", err);
        } finally {
            setLoadingDoc(false);
        }
    };

    // Filter Logic
    const filteredCorrections = useMemo(() => {
        return corrections.filter(c => {
            if (branchFilter !== 'All' && c.branchId && c.branchId !== branchFilter) return false;
            
            const diff = Number(c.differenceAmount || 0);
            if (shiftFilter === 'Upward' && diff <= 0) return false;
            if (shiftFilter === 'Downward' && diff >= 0) return false;
            if (shiftFilter === 'Zero' && diff !== 0) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchToken = (c.visitToken || '').toLowerCase().includes(q);
                const matchPatient = (c.patientName || '').toLowerCase().includes(q);
                const matchStaff = (c.createdByName || '').toLowerCase().includes(q);
                const matchReason = (c.reason || '').toLowerCase().includes(q);
                const matchPhone = (c.patientPhone || '').includes(q);
                if (!matchToken && !matchPatient && !matchStaff && !matchReason && !matchPhone) return false;
            }

            return true;
        });
    }, [corrections, branchFilter, shiftFilter, searchQuery]);

    const totalAmendments = filteredCorrections.length;
    const netShift = filteredCorrections.reduce((sum, c) => sum + (Number(c.differenceAmount) || 0), 0);
    const upwardCount = filteredCorrections.filter(c => Number(c.differenceAmount || 0) > 0).length;
    const downwardCount = filteredCorrections.filter(c => Number(c.differenceAmount || 0) < 0).length;

    // CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Visit Token",
            "Correction Date",
            "Patient Name",
            "MRN",
            "Phone",
            "Facility / Branch",
            "Amended By Staff",
            "Audit Justification / Reason",
            "Previous Bill (INR)",
            "New Bill (INR)",
            "Net Difference (INR)"
        ];

        const rows = filteredCorrections.map(c => [
            `"${c.visitToken || ''}"`,
            `"${c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}"`,
            `"${(c.patientName || '').replace(/"/g, '""')}"`,
            `"${c.patientMrn || ''}"`,
            `"${c.patientPhone || ''}"`,
            `"${(c.branchName || 'Main Facility').replace(/"/g, '""')}"`,
            `"${(c.createdByName || 'Front Desk Staff').replace(/"/g, '""')}"`,
            `"${(c.reason || '').replace(/"/g, '""')}"`,
            c.previousAmount || 0,
            c.newAmount || 0,
            c.differenceAmount || 0
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Visit_Corrections_Audit_${presetRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to parse audit payload JSON safely
    const parsePayload = (jsonStr) => {
        if (!jsonStr) return null;
        try {
            return JSON.parse(jsonStr);
        } catch {
            return null;
        }
    };

    return (
        <div className="w-full px-8 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-synos-primary" />
                        Visit Corrections & Revision Audit Feed
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                        Immutable forensic log of all amended visits, test revisions, fee adjustments, and referral transfer shifts.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadSummary}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => setIsPrintSummaryOpen(true)}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5 text-synos-primary" />
                        <span>Print Summary</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Amendments</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{totalAmendments}</p>
                    <span className="text-xs text-zinc-400 font-medium">Recorded Revision Events</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-synos-primary">Net Revenue Shift</p>
                    <p className={cn("text-2xl font-black mt-1", netShift >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                        {netShift >= 0 ? `+₹${netShift.toLocaleString()}` : `-₹${Math.abs(netShift).toLocaleString()}`}
                    </p>
                    <span className="text-xs text-zinc-400 font-medium">Cumulative Balance Impact</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Upward Revisions</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{upwardCount}</p>
                    <span className="text-xs text-zinc-400 font-medium">Tests Added / Rates Raised</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Downward / Refunds</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{downwardCount}</p>
                    <span className="text-xs text-zinc-400 font-medium">Tests Cancelled / Rates Lowered</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {['All', 'Upward', 'Downward', 'Zero'].map(f => (
                            <FilterTab 
                                key={f} 
                                label={f === 'All' ? 'All Amendments' : (f === 'Upward' ? 'Value Increases (+)' : (f === 'Downward' ? 'Value Decreases (-)' : 'Zero Shift'))} 
                                isActive={shiftFilter === f} 
                                onClick={() => setShiftFilter(f)} 
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Branch Selector */}
                        <div className="relative min-w-[160px]">
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                            >
                                <option value="All">All Facilities / Branches</option>
                                {branches.map(b => (
                                    <option key={b.branchId || b.id} value={b.branchId || b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[240px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search token, patient, staff, reason..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Corrections Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-synos-primary border-t-transparent rounded-full animate-spin" />
                        <span>Retrieving forensic revision log...</span>
                    </div>
                ) : filteredCorrections.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-zinc-400 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">No Visit Corrections Logged</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            No visits have undergone post-registration amendments or test revisions for the selected time horizon.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-xs">
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Token & Patient</th>
                                    <th className="py-3 px-4">Facility</th>
                                    <th className="py-3 px-4">Amended By</th>
                                    <th className="py-3 px-4">Audit Justification</th>
                                    <th className="py-3 px-4 text-right">Previous → New Bill</th>
                                    <th className="py-3 px-4 text-center">Net Shift</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredCorrections.map((c) => {
                                    const diff = Number(c.differenceAmount || 0);
                                    return (
                                        <tr key={c.correctionId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-xs">
                                                {c.createdAt ? new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                        {c.visitToken}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-zinc-900 dark:text-white leading-tight">{c.patientName}</p>
                                                        <p className="text-xs text-zinc-400 font-medium">
                                                            {c.patientPhone || c.patientMrn || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                                {c.branchName || 'Main Facility'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold">
                                                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <span>{c.createdByName || 'Front Desk Staff'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 min-w-[240px] max-w-[340px]">
                                                <p className="text-zinc-800 dark:text-zinc-200 font-medium" title={c.reason}>
                                                    {c.reason || 'Administrative visit amendment'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                    {Array.isArray(c.changeSummary) && c.changeSummary.length > 0 ? (
                                                        c.changeSummary.map((pill, idx) => (
                                                            <span 
                                                                key={idx}
                                                                className="px-1.5 py-0.5 rounded text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 leading-none"
                                                            >
                                                                {pill}
                                                            </span>
                                                        ))
                                                    ) : c.referralPartnerName ? (
                                                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 leading-none">
                                                            Doctor: {c.referralPartnerName}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold">
                                                <span className="text-zinc-400 line-through mr-1.5">₹{Number(c.previousAmount || 0).toLocaleString()}</span>
                                                <span className="text-zinc-900 dark:text-white">→ ₹{Number(c.newAmount || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={cn(
                                                    "font-mono font-black text-xs px-2.5 py-0.5 rounded-full border",
                                                    diff > 0 
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                        : diff < 0 
                                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                                )}>
                                                    {diff > 0 ? `+₹${diff.toLocaleString()}` : (diff < 0 ? `-₹${Math.abs(diff).toLocaleString()}` : "₹0")}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCorrection(c);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                                    >
                                                        <FileText className="w-3 h-3 text-synos-primary" />
                                                        <span>Audit Details</span>
                                                    </button>
                                                    {c.invoiceId && (
                                                        <button
                                                            onClick={() => handleViewInvoiceDoc(c.invoiceId)}
                                                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                                            title="View Current Tax Invoice"
                                                        >
                                                            <Receipt className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* AUDIT DETAILS MODAL */}
            {isDetailsModalOpen && selectedCorrection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-synos-primary/10 flex items-center justify-center text-synos-primary">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Correction Audit Record</h3>
                                    <p className="text-xs text-zinc-400">Token: {selectedCorrection.visitToken} • {selectedCorrection.patientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Top Meta Grid */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs">
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">Amended By</span>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
                                    <User className="w-3.5 h-3.5 text-zinc-400" />
                                    {selectedCorrection.createdByName || 'Front Desk Staff'}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">Timestamp</span>
                                <span className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                                    {new Date(selectedCorrection.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">Previous Bill</span>
                                <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400 mt-0.5 block">
                                    ₹{Number(selectedCorrection.previousAmount || 0).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">New Bill (After Correction)</span>
                                <span className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5 block">
                                    ₹{Number(selectedCorrection.newAmount || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Reason / Justification */}
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Mandatory Audit Reason</label>
                            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                {selectedCorrection.reason || 'No justification entered.'}
                            </div>
                        </div>

                        {/* Dynamic Change Badges */}
                        {(() => {
                            const p = parsePayload(selectedCorrection.payloadJson);
                            const summaryList = selectedCorrection.changeSummary || p?.ChangeSummary || p?.changeSummary || [];
                            const detailedDiff = selectedCorrection.detailedDiff || p?.DetailedDiff || p?.detailedDiff;

                            return (
                                <div className="space-y-3 pt-1 border-t dark:border-zinc-800 border-zinc-200">
                                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Forensic Audit Diff & System Context</label>
                                    
                                    {summaryList && summaryList.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {summaryList.map((pill, idx) => {
                                                const isDoc = pill.startsWith('Doctor:');
                                                const isRec = pill.startsWith('Partner Receivable:');
                                                const isAdd = pill.startsWith('Added:');
                                                const isCancel = pill.startsWith('Cancelled:') || pill.startsWith('Removed:');
                                                const isMode = pill.startsWith('Mode:');
                                                return (
                                                    <span 
                                                        key={idx}
                                                        className={cn(
                                                            "px-2 py-1 rounded-md text-xs font-bold border",
                                                            isDoc ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" :
                                                            isRec ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                                                            isAdd ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                                                            isCancel ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" :
                                                            isMode ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" :
                                                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                                                        )}
                                                    >
                                                        {pill}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Detailed Diff Cards */}
                                    {detailedDiff ? (
                                        <div className="space-y-2 text-xs">
                                            {detailedDiff.doctorChange && (
                                                <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between">
                                                    <span className="font-bold text-indigo-700 dark:text-indigo-300">Referring Partner / Doctor</span>
                                                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                                        <span className="line-through text-zinc-400 mr-1">{detailedDiff.doctorChange.previous || 'None'}</span>
                                                        <span>→ {detailedDiff.doctorChange.current || 'None'}</span>
                                                    </span>
                                                </div>
                                            )}

                                            {detailedDiff.receivableChange && (
                                                <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
                                                    <span className="font-bold text-amber-700 dark:text-amber-300">Partner Receivable Shift</span>
                                                    <span className="font-mono font-bold">
                                                        <span className="text-zinc-400 line-through mr-1">₹{Number(detailedDiff.receivableChange.previous || 0).toLocaleString()}</span>
                                                        <span className="text-zinc-900 dark:text-white">→ ₹{Number(detailedDiff.receivableChange.current || 0).toLocaleString()}</span>
                                                        <span className={cn("ml-2 text-xs px-1.5 py-0.5 rounded", Number(detailedDiff.receivableChange.shift || 0) >= 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600")}>
                                                            {Number(detailedDiff.receivableChange.shift || 0) >= 0 ? `+₹${detailedDiff.receivableChange.shift}` : `-₹${Math.abs(detailedDiff.receivableChange.shift)}`}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}

                                            {detailedDiff.billingModeChange && (
                                                <div className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between">
                                                    <span className="font-bold text-purple-700 dark:text-purple-300">Billing Mode</span>
                                                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                                        <span className="line-through text-zinc-400 mr-1">{detailedDiff.billingModeChange.previous}</span>
                                                        <span>→ {detailedDiff.billingModeChange.current}</span>
                                                    </span>
                                                </div>
                                            )}

                                            {detailedDiff.addedTests && detailedDiff.addedTests.length > 0 && (
                                                <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                                                    <span className="font-bold text-emerald-700 dark:text-emerald-300 block">Tests Added:</span>
                                                    <div className="space-y-0.5">
                                                        {detailedDiff.addedTests.map((t, idx) => (
                                                            <div key={idx} className="flex justify-between text-xs text-zinc-800 dark:text-zinc-200">
                                                                <span>+{t.name}</span>
                                                                <span className="font-mono font-bold text-emerald-600">+₹{Number(t.price || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {detailedDiff.cancelledTests && detailedDiff.cancelledTests.length > 0 && (
                                                <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-1">
                                                    <span className="font-bold text-rose-700 dark:text-rose-300 block">Tests Cancelled / Removed:</span>
                                                    <div className="space-y-0.5">
                                                        {detailedDiff.cancelledTests.map((t, idx) => (
                                                            <div key={idx} className="flex justify-between text-xs text-zinc-800 dark:text-zinc-200">
                                                                <span className="line-through text-zinc-400">-{t.name}</span>
                                                                <span className="font-mono font-bold text-rose-600">-₹{Number(t.price || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {detailedDiff.demographicsChange && detailedDiff.demographicsChange.length > 0 && (
                                                <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-0.5">
                                                    <span className="font-bold text-zinc-700 dark:text-zinc-300 block">Demographics Updated:</span>
                                                    {detailedDiff.demographicsChange.map((d, idx) => (
                                                        <div key={idx} className="text-xs text-zinc-600 dark:text-zinc-400">
                                                            • {d}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Fallback to raw payload actions */
                                        p && (
                                            <div className="space-y-2">
                                                {p.AddTestCodes && p.AddTestCodes.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Tests Added:</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {p.AddTestCodes.map((code, idx) => (
                                                                <span key={idx} className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                    +{code}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {p.RemoveOrderIds && p.RemoveOrderIds.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Orders Cancelled / Removed:</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {p.RemoveOrderIds.map((id, idx) => (
                                                                <span key={idx} className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 line-through">
                                                                    Order #{idx + 1}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {p.SettlementAction && (
                                                    <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                                        <span className="text-zinc-500 font-medium">Settlement Action:</span>
                                                        <span className="font-bold text-zinc-900 dark:text-white capitalize">{p.SettlementAction}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            );
                        })()}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800 border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                Close
                            </button>
                            {selectedCorrection.invoiceId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailsModalOpen(false);
                                        handleViewInvoiceDoc(selectedCorrection.invoiceId);
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-synos-primary hover:bg-synos-primary/90 text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>View Current Tax Invoice</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Commercial Document Modal */}
            {isDocModalOpen && docData && (
                <CommercialDocumentViewer
                    isOpen={isDocModalOpen}
                    onClose={() => {
                        setIsDocModalOpen(false);
                        setDocData(null);
                    }}
                    title={`Patient Tax Invoice - ${docData.patient?.name || ''}`}
                    defaultLetterheadMode="digital"
                    paperSize="a4"
                >
                    <DynamicDocumentRenderer
                        slotId="patient_tax_invoice"
                        data={docData}
                        forceRefresh={true}
                    />
                </CommercialDocumentViewer>
            )}

            {/* Printable Summary Modal */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                title="Visit Revision & Correction Audit Report"
                timeRange={presetRange}
                columns={[
                    { key: 'visitToken', label: 'Token' },
                    { key: 'patientName', label: 'Patient Name' },
                    { key: 'createdByName', label: 'Amended By' },
                    { key: 'reason', label: 'Audit Reason' },
                    { key: 'previousAmount', label: 'Previous (₹)', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'newAmount', label: 'New (₹)', align: 'right', format: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'differenceAmount', label: 'Difference (₹)', align: 'right', format: (v) => `${Number(v || 0) >= 0 ? '+' : ''}₹${Number(v || 0).toLocaleString()}` }
                ]}
                data={filteredCorrections}
                summaryTotals={{
                    totalAmount: `Net Shift: ${netShift >= 0 ? '+' : ''}₹${netShift.toLocaleString()}`,
                    paidAmount: `${totalAmendments} Events`,
                    pendingAmount: `${upwardCount} Up / ${downwardCount} Down`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const CollectionHistoryScreen = ({ presetRange = 'month', setPresetRange }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const presetToLabel = useMemo(() => ({
        today: 'Today',
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year',
        all: 'All Time'
    }), []);

    const labelToPreset = useMemo(() => ({
        'Today': 'today',
        'This Month': 'month',
        'This Quarter': 'quarter',
        'This Year': 'year',
        'All Time': 'all'
    }), []);

    // Multi-dimensional filters
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentModeFilter, setPaymentModeFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [dateRange, setDateRange] = useState(() => presetToLabel[presetRange] || 'This Month');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        if (presetRange && presetToLabel[presetRange] && dateRange !== presetToLabel[presetRange]) {
            setDateRange(presetToLabel[presetRange]);
        }
    }, [presetRange, presetToLabel]);

    const handleDateRangeChange = (newVal) => {
        setDateRange(newVal);
        if (setPresetRange && labelToPreset[newVal]) {
            setPresetRange(labelToPreset[newVal]);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getRevenueHistory();
            setHistory(data || []);
        } catch (err) {
            console.error("Failed to load collection history:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(row => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchRef = (row.sourceReferenceId || '').toLowerCase().includes(q);
            const matchNotes = (row.notes || '').toLowerCase().includes(q);
            const matchType = (row.sourceType || '').toLowerCase().includes(q);
            if (!matchRef && !matchNotes && !matchType) return false;
        }
        if (paymentModeFilter !== 'All') {
            const mode = (row.paymentMode || '').toLowerCase();
            if (!mode.includes(paymentModeFilter.toLowerCase())) return false;
        }
        if (sourceFilter !== 'All') {
            const src = (row.sourceType || '').toLowerCase();
            if (sourceFilter === 'Doctor Partner' && !src.includes('partner')) return false;
            if (sourceFilter === 'Counter' && (src.includes('partner') || src.includes('corporate') || src.includes('insurance'))) return false;
            if (sourceFilter === 'Corporate' && !src.includes('corporate')) return false;
            if (sourceFilter === 'Insurance' && !src.includes('insurance')) return false;
        }
        if (dateRange !== 'All Time') {
            const d = new Date(row.occurredAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dateRange === 'Today' && d < today) return false;
            if (dateRange === 'Yesterday') {
                const y = new Date(today); y.setDate(y.getDate() - 1);
                if (d < y || d >= today) return false;
            }
            if (dateRange === 'This Week') {
                const w = new Date(today); w.setDate(w.getDate() - 7);
                if (d < w) return false;
            }
            if (dateRange === 'This Month') {
                const m = new Date(today.getFullYear(), today.getMonth(), 1);
                if (d < m) return false;
            }
            if (dateRange === 'This Quarter') {
                const currentQuarter = Math.floor(today.getMonth() / 3);
                const quarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
                if (d < quarterStart) return false;
            }
            if (dateRange === 'This Year') {
                const yearStart = new Date(today.getFullYear(), 0, 1);
                if (d < yearStart) return false;
            }
            if (dateRange === 'Custom Range' && customDates.start && customDates.end) {
                const start = new Date(customDates.start);
                const end = new Date(customDates.end);
                end.setHours(23, 59, 59, 999);
                if (d < start || d > end) return false;
            }
        }
        return true;
    });

    const totalCollected = filteredHistory.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const cashTotal = filteredHistory.filter(r => (r.paymentMode || '').toLowerCase().includes('cash')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const digitalTotal = filteredHistory.filter(r => (r.paymentMode || '').toLowerCase().includes('upi') || (r.paymentMode || '').toLowerCase().includes('online')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const bankTotal = filteredHistory.filter(r => (r.paymentMode || '').toLowerCase().includes('bank') || (r.paymentMode || '').toLowerCase().includes('card') || (r.paymentMode || '').toLowerCase().includes('transfer')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    // Tab-Aware CSV Download for Collection History
    const handleDownloadSummary = () => {
        const headers = ["Date & Time", "Source Category", "Collected Amount (INR)", "Payment Mode", "Reference ID", "Notes"];
        const rows = filteredHistory.map(r => [
            `"${new Date(r.occurredAt).toLocaleString()}"`,
            `"${(r.sourceType || '').replace(/"/g, '""')}"`,
            r.amount || 0,
            `"${(r.paymentMode || '').replace(/"/g, '""')}"`,
            `"${(r.sourceReferenceId || '').replace(/"/g, '""')}"`,
            `"${(r.notes || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `synos_collection_history_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="px-6 py-5 w-full space-y-6 animate-in fade-in duration-500">
            {/* Header & Actions Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 tracking-normal leading-tight">Collection History</h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium">Review completed collections and settlement activity.</p>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                    <button
                        onClick={handleDownloadSummary}
                        disabled={filteredHistory.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold hover:bg-synos-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Download size={15} />
                        <span>Download Summary ({filteredHistory.length})</span>
                    </button>

                    <button
                        onClick={() => setIsPrintSummaryOpen(true)}
                        disabled={filteredHistory.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Printer size={15} />
                        <span>Print Summary</span>
                    </button>
                </div>
            </div>

            {/* KPI Metric Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Collections</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">₹{totalCollected.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">{filteredHistory.length} Receipts Reconciled</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Cash Collections</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{cashTotal.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Physical Intake</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-500">Digital / UPI</p>
                    <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">₹{digitalTotal.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Instant Settlements</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-500">Bank / Card</p>
                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">₹{bankTotal.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">POS & Direct Transfers</span>
                </div>
            </div>

            {/* Comprehensive Multi-Dimensional Filters Bar */}
            <FinanceFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search reference, notes, or category..."
                statusFilter={sourceFilter}
                onStatusChange={setSourceFilter}
                statusOptions={['All', 'Counter', 'Doctor Partner', 'Corporate', 'Insurance']}
                categoryFilter={paymentModeFilter}
                onCategoryChange={setPaymentModeFilter}
                categoryOptions={['All', 'Cash', 'UPI', 'BankTransfer', 'Card']}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                customDates={customDates}
                onCustomDatesChange={setCustomDates}
            />

            {/* Collection History Table */}
            <div className="synos-dept-card rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Scanning history facts...</div>
                ) : (
                    <table className="w-full text-left synos-table">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b dark:border-zinc-800 border-slate-300">
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Date & Time</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Source Category</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Amount</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Payment Mode</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Reference</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                            {filteredHistory.map((row) => (
                                <tr key={row.revenueFactId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 text-xs text-zinc-500 font-mono whitespace-nowrap">{formatDateCompact(row.occurredAt)}</td>
                                    <td className="p-4 text-xs font-bold dark:text-zinc-200 uppercase tracking-normal text-synos-primary">
                                        {row.sourceType === 'Partner' && row.notes?.includes('Partner:') 
                                            ? row.notes.split('|')[0].replace('Partner:', '').trim()
                                            : FinanceUtils.mapRevenueSource(row.sourceType)}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-right dark:text-zinc-300">₹{row.amount.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            {FinanceUtils.mapPaymentMode(row.paymentMode)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-zinc-400">{row.sourceReferenceId}</td>
                                    <td className="p-4 text-xs text-zinc-500">{row.notes}</td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-zinc-500 text-sm italic">No collection history found for the selected period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_bills_daybook"
                title="Revenue Collection & Cashier Receipts Ledger"
                subtitle="Itemized settlement audit trail across counter, digital, and institutional receipts"
                dateRangeText={dateRange === 'Custom Range' ? `${customDates.start} to ${customDates.end}` : dateRange}
                categoryLabel="COLLECTION AUDIT TRAIL"
                filterTags={[
                    sourceFilter !== 'All' ? `Source: ${sourceFilter}` : null,
                    paymentModeFilter !== 'All' ? `Mode: ${paymentModeFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Collections", value: `₹${totalCollected.toLocaleString()}`, color: "text-zinc-900", subtext: `${filteredHistory.length} Receipts` },
                    { label: "Cash Collections", value: `₹${cashTotal.toLocaleString()}`, color: "text-emerald-600", subtext: "Physical Currency" },
                    { label: "Digital / UPI", value: `₹${digitalTotal.toLocaleString()}`, color: "text-sky-600", subtext: "Instant Settlements" },
                    { label: "Bank / POS", value: `₹${bankTotal.toLocaleString()}`, color: "text-purple-600", subtext: "Direct Transfers" }
                ]}
                columns={[
                    { key: 'occurredAt', label: 'Date & Time', render: (v) => formatDateCompact(v) },
                    { key: 'sourceType', label: 'Source Category', render: (v, r) => r.sourceType === 'Partner' && r.notes?.includes('Partner:') ? r.notes.split('|')[0].replace('Partner:', '').trim() : (v || 'Counter') },
                    { key: 'amount', label: 'Collected (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'paymentMode', label: 'Payment Mode', align: 'center', render: (v) => v || 'Cash' },
                    { key: 'sourceReferenceId', label: 'Ref / Fact ID', render: (v) => (v || '').toString().substring(0, 12) },
                    { key: 'notes', label: 'Notes / Attendant', render: (v) => v || '-' }
                ]}
                data={filteredHistory}
                summaryTotals={{
                    amount: `₹${totalCollected.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};

export const CancellationsRefundsScreen = ({ presetRange = 'month', setPresetRange }) => {
    const { user } = useAuth();
    const [cancellations, setCancellations] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [branchFilter, setBranchFilter] = useState('All');
    const [refundFilter, setRefundFilter] = useState('All'); // 'All' | 'WithRefund' | 'WithoutRefund'

    // Details Modal State
    const [selectedCancellation, setSelectedCancellation] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    useEffect(() => {
        loadData();
        AdminApi.getBranches().then(b => setBranches(b || [])).catch(() => {});
    }, [presetRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getVisitCancellations({ preset: presetRange });
            setCancellations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load visit cancellations audit feed:", err);
            setCancellations([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredCancellations = useMemo(() => {
        return cancellations.filter(c => {
            if (branchFilter !== 'All' && c.branchId && c.branchId !== branchFilter) return false;

            const hasRef = Number(c.refundedAmount || 0) > 0;
            if (refundFilter === 'WithRefund' && !hasRef) return false;
            if (refundFilter === 'WithoutRefund' && hasRef) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchToken = (c.visitToken || '').toLowerCase().includes(q);
                const matchPatient = (c.patientName || '').toLowerCase().includes(q);
                const matchStaff = (c.cancelledByName || '').toLowerCase().includes(q);
                const matchReason = (c.reason || '').toLowerCase().includes(q);
                const matchNotes = (c.notes || '').toLowerCase().includes(q);
                const matchPhone = (c.patientPhone || '').includes(q);
                if (!matchToken && !matchPatient && !matchStaff && !matchReason && !matchNotes && !matchPhone) return false;
            }

            return true;
        });
    }, [cancellations, branchFilter, refundFilter, searchQuery]);

    const totalCancelled = filteredCancellations.length;
    const totalRefunded = filteredCancellations.reduce((sum, c) => sum + (Number(c.refundedAmount) || 0), 0);
    const totalBilled = filteredCancellations.reduce((sum, c) => sum + (Number(c.totalBilled) || 0), 0);
    const withRefundCount = filteredCancellations.filter(c => Number(c.refundedAmount || 0) > 0).length;

    // CSV Export
    const handleDownloadSummary = () => {
        const headers = [
            "Visit Token",
            "Cancellation Date",
            "Patient Name",
            "MRN",
            "Phone",
            "Facility / Branch",
            "Cancelled By Staff",
            "Cancellation Reason",
            "Administrative Notes",
            "Original Bill (INR)",
            "Refunded Amount (INR)",
            "Refund Method"
        ];

        const rows = filteredCancellations.map(c => [
            `"${c.visitToken || ''}"`,
            `"${c.cancelledAt ? new Date(c.cancelledAt).toLocaleString() : ''}"`,
            `"${(c.patientName || '').replace(/"/g, '""')}"`,
            `"${c.patientMrn || ''}"`,
            `"${c.patientPhone || ''}"`,
            `"${(c.branchName || 'Main Facility').replace(/"/g, '""')}"`,
            `"${(c.cancelledByName || 'Front Desk Staff').replace(/"/g, '""')}"`,
            `"${(c.reason || '').replace(/"/g, '""')}"`,
            `"${(c.notes || '').replace(/"/g, '""')}"`,
            c.totalBilled || 0,
            c.refundedAmount || 0,
            `"${c.refundMethod || 'None'}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Visit_Cancellations_Refunds_${presetRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full px-8 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Ban className="w-5 h-5 text-rose-500" />
                        Cancelled Visits & Refund Settlements
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                        Comprehensive ledger of voided registrations, order withdrawals, and outbound customer cash/UPI refunds.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadSummary}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => setIsPrintSummaryOpen(true)}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5 text-synos-primary" />
                        <span>Print Summary</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Cancellations</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{totalCancelled}</p>
                    <span className="text-xs text-zinc-400 font-medium">Voided Patient Registrations</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Total Refunds Issued</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalRefunded.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Outbound Customer Settlements</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Visits with Refund</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{withRefundCount}</p>
                    <span className="text-xs text-zinc-400 font-medium">Paid Prior to Cancellation</span>
                </div>
                <div className="p-4 rounded-xl synos-kpi-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Gross Billed Voided</p>
                    <p className="text-2xl font-black text-zinc-600 dark:text-zinc-300 mt-1">₹{totalBilled.toLocaleString()}</p>
                    <span className="text-xs text-zinc-400 font-medium">Gross Reversed Volume</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        {['All', 'WithRefund', 'WithoutRefund'].map(f => (
                            <FilterTab 
                                key={f} 
                                label={f === 'All' ? 'All Cancellations' : (f === 'WithRefund' ? 'Refunds Issued' : 'Zero Refund / Unpaid')} 
                                count={f === 'All' ? cancellations.length : (f === 'WithRefund' ? withRefundCount : (cancellations.length - withRefundCount))} 
                                isActive={refundFilter === f} 
                                onClick={() => setRefundFilter(f)} 
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {branches.length > 0 && (
                            <div className="shrink-0">
                                <select
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
                                    aria-label="Filter cancellations by facility branch"
                                    className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-synos-primary transition-all shadow-xs"
                                >
                                    <option value="All">All Facilities</option>
                                    {branches.map(b => (
                                        <option key={b.branchId || b.id} value={b.branchId || b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search token, patient, reason, staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-synos-primary transition-all shadow-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancellations Table */}
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900/30 shadow-xs">
                {loading ? (
                    <div className="p-16 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <span>Retrieving cancellation records...</span>
                    </div>
                ) : filteredCancellations.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-zinc-400 mx-auto opacity-75" />
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">No Cancelled Visits Logged</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                            No visits have been cancelled or refunded for the selected period.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-xs">
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Token & Patient</th>
                                    <th className="py-3 px-4">Facility</th>
                                    <th className="py-3 px-4">Cancelled By</th>
                                    <th className="py-3 px-4">Cancellation Reason & Notes</th>
                                    <th className="py-3 px-4 text-right">Gross Billed</th>
                                    <th className="py-3 px-4 text-right">Refund Amount</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                {filteredCancellations.map((c) => {
                                    const hasRefund = Number(c.refundedAmount || 0) > 0;
                                    return (
                                        <tr key={c.cancelId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 font-mono text-xs">
                                                {c.cancelledAt ? new Date(c.cancelledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5">
                                                        {c.visitToken}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-zinc-900 dark:text-white leading-tight">{c.patientName}</p>
                                                        <p className="text-xs text-zinc-400 font-medium">
                                                            {c.patientPhone || c.patientMrn || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                                {c.branchName || 'Main Facility'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold">
                                                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <span>{c.cancelledByName || 'Staff Desk'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 min-w-[220px] max-w-[320px]">
                                                <p className="text-zinc-800 dark:text-zinc-200 font-medium" title={c.reason}>
                                                    {c.reason || 'Patient cancelled visit'}
                                                </p>
                                                {c.notes && (
                                                    <p className="text-xs text-zinc-400 italic mt-0.5 truncate" title={c.notes}>
                                                        Note: {c.notes}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-zinc-500 line-through">
                                                ₹{Number(c.totalBilled || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-black">
                                                {hasRefund ? (
                                                    <span className="text-rose-600 dark:text-rose-400">
                                                        -₹{Number(c.refundedAmount || 0).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 font-normal">₹0</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                                                    hasRefund
                                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                                        : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                                )}>
                                                    {hasRefund ? "Refunded" : "Cancelled"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCancellation(c);
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer flex items-center gap-1 shadow-xs mx-auto"
                                                >
                                                    <FileText className="w-3 h-3 text-rose-500" />
                                                    <span>Audit Details</span>
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

            {/* AUDIT DETAILS MODAL */}
            {isDetailsModalOpen && selectedCancellation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <Ban className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Cancellation Audit Particulars</h3>
                                    <p className="text-xs text-zinc-400">Token: {selectedCancellation.visitToken} • {selectedCancellation.patientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Top Meta Grid */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs">
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">Cancelled By</span>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
                                    <User className="w-3.5 h-3.5 text-zinc-400" />
                                    {selectedCancellation.cancelledByName || 'Staff Desk'}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">Timestamp</span>
                                <span className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                                    {new Date(selectedCancellation.cancelledAt).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-zinc-400 uppercase font-bold block">Original Billed</span>
                                <span className="font-mono font-bold text-zinc-500 line-through mt-0.5 block">
                                    ₹{Number(selectedCancellation.totalBilled || 0).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-rose-500 uppercase font-bold block">Refund Settled</span>
                                <span className="font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                                    ₹{Number(selectedCancellation.refundedAmount || 0).toLocaleString()} ({selectedCancellation.refundMethod || 'Cash'})
                                </span>
                            </div>
                        </div>

                        {/* Reason / Justification */}
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Cancellation Reason</label>
                            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {selectedCancellation.reason || 'Patient cancelled visit.'}
                            </div>
                        </div>

                        {selectedCancellation.notes && (
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Administrative Notes</label>
                                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                                    {selectedCancellation.notes}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-zinc-800 border-zinc-200">
                            <button
                                type="button"
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* A4 PRINTABLE FINANCIAL SUMMARY MODAL */}
            <FinancePrintableSummaryModal
                isOpen={isPrintSummaryOpen}
                onClose={() => setIsPrintSummaryOpen(false)}
                slotId="summary_cancellations_daybook"
                title="Cancelled Visits & Customer Refunds Ledger"
                subtitle="Forensic settlement ledger of all revoked orders, visit voidings, and cash/digital refunds"
                dateRangeText={presetRange}
                categoryLabel="CANCELLATION & REFUND AUDIT"
                filterTags={[
                    branchFilter !== 'All' ? `Branch: ${branchFilter}` : null,
                    refundFilter !== 'All' ? `Refunds: ${refundFilter}` : null,
                    searchQuery ? `Search: "${searchQuery}"` : null
                ].filter(Boolean)}
                kpis={[
                    { label: "Total Cancellations", value: totalCancelled.toString(), color: "text-zinc-900", subtext: "Revoked Visits" },
                    { label: "Total Refunds", value: `₹${totalRefunded.toLocaleString()}`, color: "text-rose-600", subtext: "Outbound Settled" },
                    { label: "With Refunds", value: withRefundCount.toString(), color: "text-amber-600", subtext: "Pre-collected Visits" },
                    { label: "Voided Gross", value: `₹${totalBilled.toLocaleString()}`, color: "text-zinc-600", subtext: "Cancelled Billed Volume" }
                ]}
                columns={[
                    { key: 'cancelledAt', label: 'Date & Time', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                    { key: 'visitToken', label: 'Token', render: (v) => v || '—' },
                    { key: 'patientName', label: 'Patient Name', render: (v) => v || 'Direct Patient' },
                    { key: 'reason', label: 'Reason', render: (v) => v || '-' },
                    { key: 'cancelledByName', label: 'Cancelled By', render: (v) => v || 'Staff Desk' },
                    { key: 'totalBilled', label: 'Billed (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` },
                    { key: 'refundedAmount', label: 'Refunded (₹)', align: 'right', render: (v) => `₹${Number(v || 0).toLocaleString()}` }
                ]}
                data={filteredCancellations}
                summaryTotals={{
                    totalBilled: `₹${totalBilled.toLocaleString()}`,
                    refundedAmount: `₹${totalRefunded.toLocaleString()}`
                }}
                onDownloadCsv={handleDownloadSummary}
            />
        </div>
    );
};
