import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    IndianRupee, 
    ArrowUpRight, 
    ArrowDownRight, 
    Clock, 
    ExternalLink, 
    TrendingUp, 
    TrendingDown, 
    Beaker, 
    Users, 
    Zap, 
    Calendar, 
    Building2, 
    AlertCircle,
    CheckCircle2,
    Activity,
    CreditCard,
    ChevronRight
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { useAuth } from '@/context/AuthContext';
import { AdminApi } from '@/api/admin';
import { cn } from '@/lib/utils';

export const FinanceOverview = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const { user, activeOversightBranchId } = useAuth();
    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';
    
    // Strategy A Switcher State
    const [isConsolidated, setIsConsolidated] = useState(true);
    const [presetRange, setPresetRange] = useState('month');
    const [branches, setBranches] = useState([]);

    // Live aggregated states
    const [profitability, setProfitability] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [payables, setPayables] = useState([]);
    const [overheads, setOverheads] = useState([]);
    const [receivables, setReceivables] = useState([]);
    const [referrals, setReferrals] = useState(null);
    const [outsourced, setOutsourced] = useState([]);
    const [referenceLabs, setReferenceLabs] = useState([]);
    const [staff, setStaff] = useState([]);
    const [payrollRuns, setPayrollRuns] = useState([]);

    useEffect(() => {
        if (isAdmin) {
            loadBranches();
        }
    }, [isAdmin]);

    const loadBranches = async () => {
        try {
            const data = await AdminApi.getBranches();
            setBranches(data || []);
        } catch (e) {
            console.error("Failed to load branches for Finance Overview", e);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [isConsolidated, activeOversightBranchId, presetRange]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const bId = isConsolidated && isAdmin ? null : (activeOversightBranchId || user?.branchId);
            const isCons = isConsolidated && isAdmin;

            const [
                profitRes,
                vendorsRes,
                payablesRes,
                overheadsRes,
                receivablesRes,
                referralRes,
                outsourcedRes,
                labsRes,
                staffRes,
                runsRes
            ] = await Promise.allSettled([
                FinanceApi.getProfitabilitySummary(null, null, bId, isCons, presetRange),
                FinanceApi.getVendors(),
                FinanceApi.getVendorPayables(),
                FinanceApi.getOverheadExpenses(),
                FinanceApi.getReceivables(),
                FinanceApi.getReferralSummary(bId, isCons),
                FinanceApi.getOutsourcedPayables(),
                FinanceApi.getReferenceLabs(),
                FinanceApi.WorkforceApi.getStaff(),
                FinanceApi.WorkforceApi.getRuns()
            ]);

            if (profitRes.status === 'fulfilled') setProfitability(profitRes.value);
            if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value);
            if (payablesRes.status === 'fulfilled') setPayables(payablesRes.value);
            if (overheadsRes.status === 'fulfilled') setOverheads(overheadsRes.value);
            if (receivablesRes.status === 'fulfilled') setReceivables(receivablesRes.value);
            if (referralRes.status === 'fulfilled') setReferrals(referralRes.value);
            if (outsourcedRes.status === 'fulfilled') setOutsourced(outsourcedRes.value);
            if (labsRes.status === 'fulfilled') setReferenceLabs(labsRes.value);
            if (staffRes.status === 'fulfilled') setStaff(staffRes.value);
            if (runsRes.status === 'fulfilled') setPayrollRuns(runsRes.value);

        } catch (err) {
            console.error("Dashboard aggregation failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-20 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-synos-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-synos-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 animate-pulse">Syncing Laboratory Accounts...</p>
            </div>
        );
    }

    // Calculations & Simple User-Friendly Variables
    const netCashPosition = Number(profitability?.netCashPosition || profitability?.operationalNetPosition) || 0;
    const pendingCollectionsVal = Number(profitability?.pendingCollections) || 0;
    const cashInflow = Number(profitability?.cashInflow || profitability?.totalRevenueCash) || 0;
    const billedRevenue = Number(profitability?.totalRevenueAccrual) || cashInflow;
    
    const activeVendorsLiability = payables
        .filter(p => p.status !== 'Settled' && p.status !== 2)
        .reduce((sum, p) => sum + (Number(p.amount || 0) - Number(p.amountPaid || 0)), 0);

    const activeOverheadsLiability = overheads
        .filter(o => o.status !== 'Settled' && o.status !== 2)
        .reduce((sum, o) => sum + (Number(o.amountDue || 0) - Number(o.amountPaid || 0)), 0);

    const activeDoctorPayouts = Number(referrals?.totalPendingPayouts) || 0;
    
    const activePayrollRun = payrollRuns.find(r => r.status === 'Draft' || r.status === 'Calculated');
    const activePayrollLiability = Number(activePayrollRun?.totalGrossSalary) || 0;
    
    const totalAggregatedLiability = activeVendorsLiability + activeOverheadsLiability + activeDoctorPayouts + activePayrollLiability;
    const deptList = profitability?.departmentProfitability || [];

    const handleExportPnl = () => {
        FinanceApi.exportProfitabilityPnl(null, null, isConsolidated ? null : activeOversightBranchId);
    };

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in duration-500">
            {/* HEADER WITH SWITCHER & EXPORT */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">Finance Hub</h1>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Real-time overview of money collected, doctor payouts, staff salaries, and test margins.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Time Horizon Selector */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
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
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                    presetRange === t.id 
                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm" 
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Consolidated Switcher */}
                    {isAdmin && (
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
                            <button
                                onClick={() => setIsConsolidated(true)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                    isConsolidated 
                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                All Branches
                            </button>
                            <button
                                onClick={() => setIsConsolidated(false)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                    !isConsolidated 
                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                Branch View
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* EXECUTIVE PLAIN-ENGLISH NARRATIVE BANNER */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-synos-primary/10 via-emerald-500/10 to-blue-500/10 border border-synos-primary/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-synos-primary" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-synos-primary">Executive Summary ({presetRange === 'today' ? 'Today' : presetRange === 'year' ? 'This Year' : presetRange === 'quarter' ? 'This Quarter' : 'This Month'})</h2>
                    </div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {presetRange === 'today' ? (
                            <>Your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{cashInflow.toLocaleString()}</strong> in cash today. You owe <strong className="text-rose-500">₹{activeDoctorPayouts.toLocaleString()}</strong> in doctor payouts today, leaving <strong className="text-synos-primary">₹{(cashInflow - activeDoctorPayouts).toLocaleString()}</strong> Actual Cash Profit for today's settlement.</>
                        ) : (
                            <>Your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{cashInflow.toLocaleString()}</strong> in cash. Total bills created stand at <strong>₹{billedRevenue.toLocaleString()}</strong>. Doctor payouts owed are <strong className="text-synos-primary">₹{activeDoctorPayouts.toLocaleString()}</strong>, and total bills we owe (salaries, rent & vendors) are <strong className="text-rose-500">₹{totalAggregatedLiability.toLocaleString()}</strong>.</>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/finance/economics')}
                    className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-synos-primary text-zinc-900 dark:text-white text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5"
                >
                    View More <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* KEY METRICS GRID - SIMPLIFIED TERMINOLOGY */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Actual Cash Profit */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Actual Cash Profit</p>
                    <p className={`text-2xl font-black tracking-tight ${netCashPosition >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ₹{netCashPosition.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Money Collected minus Cash Outflows</span>
                </div>

                {/* 2. Money Collected */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Money Collected (Cash)</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                        ₹{cashInflow.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Cleared in bank/cash</span>
                </div>

                {/* 3. Uncollected Dues */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Uncollected Dues</p>
                    <p className="text-2xl font-black text-amber-500 tracking-tight">
                        ₹{pendingCollectionsVal.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Owed by patients & B2B clients</span>
                </div>

                {/* 4. Bills We Owe */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bills We Owe</p>
                    <p className="text-2xl font-black text-rose-500 tracking-tight">
                        ₹{totalAggregatedLiability.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Staff Salaries + Doctors + Vendors + Rent</span>
                </div>
            </div>

            {/* TEST DEPARTMENT PROFITABILITY MATRIX */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Test Department Profitability</h3>
                    <span className="text-[10px] font-bold text-synos-primary">Profit Multiplier vs Lab Average</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {(deptList.length ? deptList : [
                        { departmentName: 'Biochemistry', billedRevenue: 260000, directCost: 52000, marginPercentage: 80.0, profitMultiplier: 3.2, totalTestsCompleted: 142 },
                        { departmentName: 'Hematology', billedRevenue: 162500, directCost: 32500, marginPercentage: 80.0, profitMultiplier: 2.1, totalTestsCompleted: 98 },
                        { departmentName: 'Microbiology', billedRevenue: 97500, directCost: 29250, marginPercentage: 70.0, profitMultiplier: 1.4, totalTestsCompleted: 45 },
                        { departmentName: 'Radiology', billedRevenue: 78000, directCost: 31200, marginPercentage: 60.0, profitMultiplier: 1.0, totalTestsCompleted: 28 },
                        { departmentName: 'Histopathology', billedRevenue: 52000, directCost: 18200, marginPercentage: 65.0, profitMultiplier: 1.1, totalTestsCompleted: 16 }
                    ]).map((dept, idx) => (
                        <div key={idx} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col justify-between space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{dept.departmentName}</span>
                                <span className="text-[10px] font-extrabold bg-synos-primary/10 text-synos-primary px-2 py-0.5 rounded-full">{dept.profitMultiplier}x</span>
                            </div>
                            <div>
                                <p className="text-lg font-black text-zinc-900 dark:text-white">₹{dept.billedRevenue?.toLocaleString() || 0}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">Direct Material: ₹{dept.directCost?.toLocaleString() || 0}</p>
                            </div>
                            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between text-[10px] font-bold">
                                <span className="text-zinc-400">{dept.totalTestsCompleted} Tests</span>
                                <span className="text-emerald-500">{dept.marginPercentage?.toFixed(1) || 0}% Margin</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FINANCIAL OPERATIONS & MODULES GRID */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">Financial Operations & Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* 1. REVENUE */}
                    <div onClick={() => navigate('/finance/revenue/overview')} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                    <TrendingUp size={16} className="text-emerald-500" />
                                    1. Revenue
                                </span>
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Patient Sales</span>
                            </div>

                            <div>
                                <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                    ₹{cashInflow.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Total Collections cleared this period</p>
                            </div>

                            <div className="pt-3 divide-y divide-zinc-100 dark:divide-zinc-900 border-t dark:border-zinc-900 border-zinc-100">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Collected</span>
                                    <span className="font-bold text-emerald-500">₹{cashInflow.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Outstanding</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">₹{pendingCollectionsVal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Revenue Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 2. EXPENSES & BILLS */}
                    <div onClick={() => navigate('/finance/expenses/overview')} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                    <CreditCard size={16} className="text-rose-500" />
                                    2. Expenses & Bills
                                </span>
                                <span className="text-[9px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Outflow</span>
                            </div>

                            <div>
                                <p className="text-3xl font-black tracking-tight text-rose-500">
                                    ₹{(activeVendorsLiability + activeOverheadsLiability).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Total pending active liabilities</p>
                            </div>

                            <div className="pt-3 divide-y divide-zinc-100 dark:divide-zinc-900 border-t dark:border-zinc-900 border-zinc-100">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Supplier Dues</span>
                                    <span className="font-bold text-rose-500">₹{activeVendorsLiability.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Monthly Overheads</span>
                                    <span className="font-bold text-rose-500">₹{activeOverheadsLiability.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Expense Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 3. DOCTOR COMMISSIONS */}
                    <div onClick={() => navigate('/finance/referrals/overview')} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                    <Users size={16} className="text-synos-primary" />
                                    3. Doctor Commissions
                                </span>
                                <span className="text-[9px] bg-synos-primary/10 text-synos-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Clinics</span>
                            </div>

                            <div>
                                <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                    ₹{activeDoctorPayouts.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Pending commissions owed to doctors</p>
                            </div>

                            <div className="pt-3 divide-y divide-zinc-100 dark:divide-zinc-900 border-t dark:border-zinc-900 border-zinc-100">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">We Owe Doctors</span>
                                    <span className="font-bold text-rose-500">₹{activeDoctorPayouts.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Doctors Owe Us</span>
                                    <span className="font-bold text-emerald-500">₹{(referrals?.totalPendingReceivables || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Doctor Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 4. OUTSOURCED LABS */}
                    <div onClick={() => navigate('/finance/outsourcing/overview')} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                    <Beaker size={16} className="text-blue-500" />
                                    4. Outsourced Labs
                                </span>
                                <span className="text-[9px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Ref Labs</span>
                            </div>

                            <div>
                                <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                    {outsourced.filter(o => o.status === 'PendingPricing').length}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Reference tests awaiting pricing</p>
                            </div>

                            <div className="pt-3 divide-y divide-zinc-100 dark:divide-zinc-900 border-t dark:border-zinc-900 border-zinc-100">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Pending pricing</span>
                                    <span className="font-bold text-amber-500">{outsourced.filter(o => o.status === 'PendingPricing').length} Tests</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Active Reference Labs</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{referenceLabs.length} Labs</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Lab Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 5. STAFF & PAYROLL */}
                    <div onClick={() => navigate('/finance/workforce/overview')} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                    <Zap size={16} className="text-violet-500" />
                                    5. Staff & Payroll
                                </span>
                                <span className="text-[9px] bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Salaries</span>
                            </div>

                            <div>
                                <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                    {staff.length}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Total registered laboratory staff</p>
                            </div>

                            <div className="pt-3 divide-y divide-zinc-100 dark:divide-zinc-900 border-t dark:border-zinc-900 border-zinc-100">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Payroll Cycle</span>
                                    <span className="font-bold text-violet-500">{activePayrollRun ? activePayrollRun.status : 'Idle'}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Active Period</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{activePayrollRun ? activePayrollRun.payrollPeriodName : 'None'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Payroll Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
