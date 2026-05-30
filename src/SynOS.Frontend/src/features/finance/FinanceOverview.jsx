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
    }, [isConsolidated, activeOversightBranchId]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const start = new Date();
            start.setDate(start.getDate() - 30);
            
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
                FinanceApi.getProfitabilitySummary(start.toISOString(), new Date().toISOString(), bId, isCons),
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

    // Calculations
    const netPosition = Number(profitability?.operationalNetPosition) || 0;
    const pendingCollectionsVal = Number(profitability?.pendingCollections) || 0;
    const cashInflow30d = Number(profitability?.cashInflow) || 0;
    
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

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* HEADER WITH SWITCHER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">Finance Hub</h1>
                    <p className="text-xs text-zinc-500 font-medium mt-1">A simple, real-time overview of laboratory revenue, expenses, and workforce liabilities.</p>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 w-fit">
                        <button
                            onClick={() => setIsConsolidated(true)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                isConsolidated 
                                    ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            )}
                        >
                            Consolidated View
                        </button>
                        <button
                            onClick={() => setIsConsolidated(false)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
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

            {/* KEY METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Net Balance */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Balance (This Month)</p>
                    <p className={`text-2xl font-black tracking-tight ${netPosition >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ₹{netPosition.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Cash In minus Cash Out</span>
                </div>

                {/* 2. Collections */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Collections (30 Days)</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                        ₹{cashInflow30d.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Cleared in bank/cash</span>
                </div>

                {/* 3. Patient Outstanding */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Patient Outstanding</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                        ₹{pendingCollectionsVal.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Owed by laboratory patients</span>
                </div>

                {/* 4. Total Owed */}
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-sm flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total We Owe (Dues)</p>
                    <p className="text-2xl font-black text-rose-500 tracking-tight">
                        ₹{totalAggregatedLiability.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1">Vendors + Overheads + Salary</span>
                </div>
            </div>

            {/* HIGH-FIDELITY DEPARTMENTS GRID */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">Laboratory Departments</h3>
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
                                    ₹{cashInflow30d.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Total Collections cleared this month</p>
                            </div>

                            <div className="pt-3 divide-y divide-zinc-100 dark:divide-zinc-900 border-t dark:border-zinc-900 border-zinc-100">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Collected</span>
                                    <span className="font-bold text-emerald-500">₹{cashInflow30d.toLocaleString()}</span>
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
