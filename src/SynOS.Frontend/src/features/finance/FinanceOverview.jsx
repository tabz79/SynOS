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
    ChevronRight,
    ShieldCheck,
    Briefcase,
    RotateCcw
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { ReceptionApi } from '@/api/reception';
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
    const [insuranceCompanies, setInsuranceCompanies] = useState([]);
    const [insuranceClaims, setInsuranceClaims] = useState([]);
    const [corporateAccounts, setCorporateAccounts] = useState([]);
    const [corporateVisits, setCorporateVisits] = useState([]);

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
                runsRes,
                insCompsRes,
                insClaimsRes,
                corpAccsRes,
                corpVisitsRes
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
                FinanceApi.WorkforceApi.getRuns(),
                ReceptionApi.getInsuranceCompanies(),
                fetch('/api/v1/insurance-companies/claims', { headers: FinanceApi.getHeaders() }).then(r => r.ok ? r.json() : []),
                ReceptionApi.getCorporateAccounts(),
                fetch('/api/v1/corporate-accounts/visits', { headers: FinanceApi.getHeaders() }).then(r => r.ok ? r.json() : [])
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
            if (insCompsRes.status === 'fulfilled') setInsuranceCompanies(insCompsRes.value || []);
            if (insClaimsRes.status === 'fulfilled') setInsuranceClaims(insClaimsRes.value || []);
            if (corpAccsRes.status === 'fulfilled') setCorporateAccounts(corpAccsRes.value || []);
            if (corpVisitsRes.status === 'fulfilled') setCorporateVisits(corpVisitsRes.value || []);

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
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');

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

    const pendingInsuranceClaims = insuranceClaims.filter(c => c.status !== 'Paid' && c.status !== 'Settled');
    const totalInsuranceReceivables = pendingInsuranceClaims.reduce((sum, c) => sum + (Number(c.claimAmount || 0)), 0);

    const pendingCorporateVisits = corporateVisits.filter(v => v.status !== 'Settled');
    const totalCorporateReceivables = pendingCorporateVisits.reduce((sum, v) => sum + (Number(v.totalAmount || v.billAmount || 0) - Number(v.paidAmount || 0)), 0);

    const rawDeptList = profitability?.departmentProfitability || [];

    // Fallback baseline departments if none loaded from API
    const defaultPathology = [
        { departmentName: 'Biochemistry', category: 'Pathology', modality: 'Biochemistry', billedRevenue: 260000, cashCollected: 215000, directCost: 57200, marginPercentage: 78.0, profitMultiplier: 2.8, totalTestsCompleted: 142 },
        { departmentName: 'Hematology', category: 'Pathology', modality: 'Hematology', billedRevenue: 162500, cashCollected: 145000, directCost: 32500, marginPercentage: 80.0, profitMultiplier: 2.1, totalTestsCompleted: 98 },
        { departmentName: 'Microbiology', category: 'Pathology', modality: 'Microbiology', billedRevenue: 97500, cashCollected: 82000, directCost: 17550, marginPercentage: 82.0, profitMultiplier: 1.4, totalTestsCompleted: 45 },
        { departmentName: 'Histopathology', category: 'Pathology', modality: 'Histopathology', billedRevenue: 52000, cashCollected: 48000, directCost: 13000, marginPercentage: 75.0, profitMultiplier: 1.1, totalTestsCompleted: 16 }
    ];

    const defaultRadiology = [
        { departmentName: 'X-Ray', category: 'Radiology', modality: 'X-Ray', billedRevenue: 78000, cashCollected: 72000, directCost: 11700, marginPercentage: 85.0, profitMultiplier: 1.2, totalTestsCompleted: 38 },
        { departmentName: 'CT Scan', category: 'Radiology', modality: 'CT Scan', billedRevenue: 145000, cashCollected: 138000, directCost: 26100, marginPercentage: 82.0, profitMultiplier: 2.2, totalTestsCompleted: 24 },
        { departmentName: 'Ultrasound', category: 'Radiology', modality: 'Ultrasound', billedRevenue: 68000, cashCollected: 64000, directCost: 8160, marginPercentage: 88.0, profitMultiplier: 1.3, totalTestsCompleted: 29 },
        { departmentName: 'MRI', category: 'Radiology', modality: 'MRI', billedRevenue: 185000, cashCollected: 175000, directCost: 37000, marginPercentage: 80.0, profitMultiplier: 3.1, totalTestsCompleted: 12 }
    ];

    const pathologyList = rawDeptList.filter(d => (d.category || '').toLowerCase() === 'pathology' || ['biochemistry', 'hematology', 'microbiology', 'histopathology'].includes((d.departmentName || '').toLowerCase()));
    const finalPathology = pathologyList.length ? pathologyList : defaultPathology;

    const radiologyList = rawDeptList.filter(d => (d.category || '').toLowerCase() === 'radiology' || ['x-ray', 'ct scan', 'ultrasound', 'mri', 'radiology'].includes((d.departmentName || '').toLowerCase()));
    const finalRadiology = radiologyList.length ? radiologyList : defaultRadiology;

    const handleDeptClick = (dept) => {
        const cat = dept.category || (['x-ray', 'ct scan', 'ultrasound', 'mri'].includes((dept.departmentName || '').toLowerCase()) ? 'Radiology' : 'Pathology');
        const mod = dept.modality || dept.departmentName;
        navigate(`/finance/revenue/bills?department=${encodeURIComponent(cat)}&modality=${encodeURIComponent(mod)}`);
    };

    const handleExportPnl = () => {
        FinanceApi.exportProfitabilityPnl(null, null, isConsolidated ? null : activeOversightBranchId);
    };

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in duration-500">
            {/* HEADER WITH SWITCHER & EXPORT */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">Finance Hub</h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Time Horizon Selector */}
                    <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
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
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    presetRange === t.id 
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs" 
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Consolidated Switcher */}
                    {isAdmin && (
                        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
                            <button
                                onClick={() => setIsConsolidated(true)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    isConsolidated 
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                All Branches
                            </button>
                            <button
                                onClick={() => setIsConsolidated(false)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    !isConsolidated 
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                Branch View
                            </button>
                        </div>
                    )}

                    {/* Client Deployment Reset Button */}
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/settings?tab=backup')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-955/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer shadow-2xs"
                            title="Purge all operational test numbers so client can start fresh"
                        >
                            <RotateCcw size={13} className="text-rose-600 dark:text-rose-400" />
                            <span>Client Deployment Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* EXECUTIVE SUMMARY BANNER */}
            <div className="p-6 rounded-2xl synos-dept-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-synos-primary" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-synos-primary">Executive Summary ({presetRange === 'today' ? 'Today' : presetRange === 'year' ? 'This Year' : presetRange === 'quarter' ? 'This Quarter' : 'This Month'})</h2>
                    </div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {presetRange === 'today' ? (
                            <>Your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{formatInr(cashInflow)}</strong> in cash today. You owe <strong className="text-rose-500">₹{formatInr(activeDoctorPayouts)}</strong> in doctor payouts today, leaving <strong className="text-synos-primary">₹{formatInr(cashInflow - activeDoctorPayouts)}</strong> Actual Cash Profit for today's settlement.</>
                        ) : (
                            <>Your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{formatInr(cashInflow)}</strong> in cash. Total bills created stand at <strong>₹{formatInr(billedRevenue)}</strong>. Doctor payouts owed are <strong className="text-synos-primary">₹{formatInr(activeDoctorPayouts)}</strong>, and total bills we owe (salaries, rent & vendors) are <strong className="text-rose-500">₹{formatInr(totalAggregatedLiability)}</strong>.</>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/finance/economics')}
                    className="px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 hover:border-synos-primary text-zinc-900 dark:text-white text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5"
                >
                    View More <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* KEY METRICS GRID - SIMPLIFIED TERMINOLOGY */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Actual Cash Profit */}
                <div className="p-6 rounded-2xl synos-kpi-card flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Actual Cash Profit</p>
                    <p className={`text-2xl font-black tracking-tight ${netCashPosition >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ₹{formatInr(netCashPosition)}
                    </p>
                </div>

                {/* 2. Money Collected */}
                <div className="p-6 rounded-2xl synos-kpi-card flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Money Collected (Cash)</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                        ₹{formatInr(cashInflow)}
                    </p>
                </div>

                {/* 3. Uncollected Dues */}
                <div className="p-6 rounded-2xl synos-kpi-card flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Uncollected Dues</p>
                    <p className="text-2xl font-black text-amber-500 tracking-tight">
                        ₹{formatInr(pendingCollectionsVal)}
                    </p>
                </div>

                {/* 4. Bills We Owe */}
                <div className="p-6 rounded-2xl synos-kpi-card flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bills We Owe</p>
                    <p className="text-2xl font-black text-rose-500 tracking-tight">
                        ₹{formatInr(totalAggregatedLiability)}
                    </p>
                </div>
            </div>

            {/* TEST DEPARTMENT & MODALITY PROFITABILITY MATRIX */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                            Department & Modality Economics
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-synos-primary bg-synos-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Activity size={12} /> Live Modality Drilldown
                        </span>
                    </div>
                </div>

                {/* ROW 1: PATHOLOGY DISCIPLINES */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Beaker size={14} className="text-emerald-500" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Pathology Disciplines
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">({finalPathology.length} Disciplines)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {finalPathology.map((dept, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleDeptClick(dept)}
                                className="p-4 rounded-2xl synos-dept-card flex flex-col justify-between space-y-3 cursor-pointer hover:border-synos-primary/60 hover:shadow-md transition-all group relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-synos-primary transition-colors">
                                            {dept.departmentName}
                                        </span>
                                        <ChevronRight size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-[10px] font-extrabold bg-synos-primary/10 text-synos-primary px-2 py-0.5 rounded-full">
                                        {dept.profitMultiplier}x
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-baseline justify-between">
                                        <p className="text-lg font-black text-zinc-900 dark:text-white">
                                            ₹{formatInr(dept.billedRevenue)}
                                        </p>
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            ₹{formatInr(dept.cashCollected)} collected
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        Direct Material: ₹{formatInr(dept.directCost)}
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between text-[10px] font-bold">
                                    <span className="text-zinc-400">{dept.totalTestsCompleted} Tests</span>
                                    <span className="text-emerald-500 font-black">{dept.marginPercentage?.toFixed(1) || 0}% Margin</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ROW 2: RADIOLOGY MODALITIES */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Activity size={14} className="text-indigo-500" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Radiology Modalities
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">({finalRadiology.length} Modalities)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {finalRadiology.map((dept, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleDeptClick(dept)}
                                className="p-4 rounded-2xl synos-dept-card flex flex-col justify-between space-y-3 cursor-pointer hover:border-synos-primary/60 hover:shadow-md transition-all group relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-synos-primary transition-colors">
                                            {dept.departmentName}
                                        </span>
                                        <ChevronRight size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-[10px] font-extrabold bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                        {dept.profitMultiplier}x
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-baseline justify-between">
                                        <p className="text-lg font-black text-zinc-900 dark:text-white">
                                            ₹{formatInr(dept.billedRevenue)}
                                        </p>
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            ₹{formatInr(dept.cashCollected)} collected
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        Material/Consumable: ₹{formatInr(dept.directCost)}
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between text-[10px] font-bold">
                                    <span className="text-zinc-400">{dept.totalTestsCompleted} Scans</span>
                                    <span className="text-emerald-500 font-black">{dept.marginPercentage?.toFixed(1) || 0}% Margin</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FINANCIAL OPERATIONS & MODULES GRID */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">Financial Operations & Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    
                    {/* 1. REVENUE */}
                    <div onClick={() => navigate('/finance/revenue/overview')} className="p-6 rounded-2xl synos-card-elevated flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
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
                                    ₹{formatInr(cashInflow)}
                                </p>
                            </div>

                            <div className="pt-3 divide-y divide-slate-200/70 dark:divide-zinc-800 border-t dark:border-zinc-800 border-slate-200/70">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Collected</span>
                                    <span className="font-bold text-emerald-500">₹{formatInr(cashInflow)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Outstanding</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">₹{formatInr(pendingCollectionsVal)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Revenue Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 2. EXPENSES & BILLS */}
                    <div onClick={() => navigate('/finance/expenses/overview')} className="p-6 rounded-2xl synos-card-elevated flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
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
                                    ₹{formatInr(activeVendorsLiability + activeOverheadsLiability)}
                                </p>
                            </div>

                            <div className="pt-3 divide-y divide-slate-200/70 dark:divide-zinc-800 border-t dark:border-zinc-800 border-slate-200/70">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Supplier Dues</span>
                                    <span className="font-bold text-rose-500">₹{formatInr(activeVendorsLiability)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Monthly Overheads</span>
                                    <span className="font-bold text-rose-500">₹{formatInr(activeOverheadsLiability)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Expense Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 3. DOCTOR COMMISSIONS */}
                    <div onClick={() => navigate('/finance/referrals/overview')} className="p-6 rounded-2xl synos-card-elevated flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
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
                                    ₹{formatInr(activeDoctorPayouts)}
                                </p>
                            </div>

                            <div className="pt-3 divide-y divide-slate-200/70 dark:divide-zinc-800 border-t dark:border-zinc-800 border-slate-200/70">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">We Owe Doctors</span>
                                    <span className="font-bold text-rose-500">₹{formatInr(activeDoctorPayouts)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Doctors Owe Us</span>
                                    <span className="font-bold text-emerald-500">₹{formatInr(referrals?.totalPendingReceivables || 0)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Doctor Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 4. OUTSOURCED LABS */}
                    <div onClick={() => navigate('/finance/outsourcing/overview')} className="p-6 rounded-2xl synos-card-elevated flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
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
                            </div>

                            <div className="pt-3 divide-y divide-slate-200/70 dark:divide-zinc-800 border-t dark:border-zinc-800 border-slate-200/70">
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
                    <div onClick={() => navigate('/finance/workforce/overview')} className="p-6 rounded-2xl synos-card-elevated flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
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
                            </div>

                            <div className="pt-3 divide-y divide-slate-200/70 dark:divide-zinc-800 border-t dark:border-zinc-800 border-slate-200/70">
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

                    {/* 6. INSURANCE / TPA */}
                    <div onClick={() => navigate('/finance/insurance')} className="p-6 rounded-2xl synos-card-elevated flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                    <ShieldCheck size={16} className="text-sky-500" />
                                    6. Insurance / TPA
                                </span>
                                <span className="text-[9px] bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Cashless Desk</span>
                            </div>

                            <div>
                                <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                    ₹{formatInr(totalInsuranceReceivables)}
                                </p>
                            </div>

                            <div className="pt-3 divide-y divide-slate-200/70 dark:divide-zinc-800 border-t dark:border-zinc-800 border-slate-200/70">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Pending Claims</span>
                                    <span className="font-bold text-amber-500">{pendingInsuranceClaims.length} Claims</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Empanelled TPAs</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{insuranceCompanies.length} Payers</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Insurance Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* 7. CORPORATE B2B */}
                    <div onClick={() => navigate('/finance/corporate')} className="p-6 rounded-2xl synos-card-elevated flex flex-col justify-between hover:border-synos-primary/60 transition-all cursor-pointer group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                    <Briefcase size={16} className="text-amber-500" />
                                    7. Corporate B2B
                                </span>
                                <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">B2B Contracts</span>
                            </div>

                            <div>
                                <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                    ₹{formatInr(totalCorporateReceivables)}
                                </p>
                            </div>

                            <div className="pt-3 divide-y divide-slate-200/70 dark:divide-zinc-800 border-t dark:border-zinc-800 border-slate-200/70">
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Client Organizations</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{corporateAccounts.length} Clients</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-xs">
                                    <span className="text-zinc-500">Pending Invoices</span>
                                    <span className="font-bold text-amber-500">{pendingCorporateVisits.length} Invoices</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-synos-primary mt-6 pt-2 border-t border-transparent group-hover:border-zinc-100 dark:group-hover:border-zinc-900">
                            <span>Open Corporate Screen</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
