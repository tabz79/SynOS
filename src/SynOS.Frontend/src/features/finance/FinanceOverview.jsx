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
import { FinanceOverviewDeck, ConsolidatedDeskCashCard } from './FinanceOverviewDeck';

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
    const [concessionData, setConcessionData] = useState(null);
    const [trendsData, setTrendsData] = useState(null);
    const [receptionSummary, setReceptionSummary] = useState(null);

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
                corpVisitsRes,
                concessionRes,
                trendsRes,
                receptionRes
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
                fetch('/api/v1/corporate-accounts/visits', { headers: FinanceApi.getHeaders() }).then(r => r.ok ? r.json() : []),
                FinanceApi.getConcessionIntelligence({ preset: presetRange, branchId: bId, isConsolidated: isCons }).catch(() => null),
                FinanceApi.getRevenueTrends(7).catch(() => null),
                ReceptionApi.getDashboardSummary().catch(() => null)
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
            if (concessionRes.status === 'fulfilled' && concessionRes.value) setConcessionData(concessionRes.value);
            if (trendsRes && trendsRes.status === 'fulfilled' && trendsRes.value) setTrendsData(trendsRes.value);
            if (receptionRes && receptionRes.status === 'fulfilled' && receptionRes.value) setReceptionSummary(receptionRes.value);

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
    const cashInflow = Number(profitability?.cashInflow || profitability?.totalRevenueCash) || 0;
    const billedRevenue = Number(profitability?.totalRevenueAccrual) || cashInflow;

    const pendingInsuranceClaims = insuranceClaims.filter(c => c.status !== 'Paid' && c.status !== 'Settled');
    const pendingCorporateVisits = corporateVisits.filter(v => v.status !== 'Settled');

    // For "Today", isolate today's doctor payout liability and today's desk dues
    const activeDoctorPayouts = presetRange === 'today'
        ? (billedRevenue > 0 ? (Number(profitability?.referralAccrual || profitability?.referralCashOutflow) || 0) : 0)
        : (Number(referrals?.totalPendingPayouts) || 0);

    const pendingCollectionsVal = presetRange === 'today'
        ? (billedRevenue > 0 ? Math.max(0, billedRevenue - cashInflow) : 0)
        : (Number(profitability?.pendingCollections) || 0);

    const totalInsuranceReceivables = presetRange === 'today'
        ? 0
        : pendingInsuranceClaims.reduce((sum, c) => sum + (Number(c.claimAmount || 0)), 0);

    const totalCorporateReceivables = presetRange === 'today'
        ? (billedRevenue > 0 ? Math.max(0, Number(receptionSummary?.prepaidBillsTotal || 0)) : 0)
        : pendingCorporateVisits.reduce((sum, v) => sum + (Number(v.totalAmount || v.billAmount || 0) - Number(v.paidAmount || 0)), 0);

    const rawDeptList = profitability?.departmentProfitability || [];

    // Fallback baseline departments with zero test counts
    const defaultPathology = [
        { departmentName: 'Biochemistry', category: 'Pathology', modality: 'Biochemistry', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 },
        { departmentName: 'Hematology', category: 'Pathology', modality: 'Hematology', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 },
        { departmentName: 'Microbiology', category: 'Pathology', modality: 'Microbiology', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 },
        { departmentName: 'Histopathology', category: 'Pathology', modality: 'Histopathology', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 }
    ];

    const defaultRadiology = [
        { departmentName: 'X-Ray', category: 'Radiology', modality: 'X-Ray', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 },
        { departmentName: 'CT Scan', category: 'Radiology', modality: 'CT Scan', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 },
        { departmentName: 'Ultrasound', category: 'Radiology', modality: 'Ultrasound', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 },
        { departmentName: 'MRI', category: 'Radiology', modality: 'MRI', billedRevenue: 0, cashCollected: 0, directCost: 0, marginPercentage: 0, profitMultiplier: 1.0, totalTestsCompleted: 0 }
    ];

    // Sanitize department lists: if billedRevenue is 0, tests count MUST be 0
    const sanitizeDeptList = (list) => list.map(d => {
        const billed = Number(d.billedRevenue) || 0;
        const units = billed === 0 ? 0 : (Number(d.totalTestsCompleted) || Number(d.testsCompleted) || 0);
        return {
            ...d,
            billedRevenue: billed,
            totalTestsCompleted: units,
            testsCompleted: units
        };
    });

    const pathologyList = rawDeptList.filter(d => (d.category || '').toLowerCase() === 'pathology' || ['biochemistry', 'hematology', 'microbiology', 'histopathology'].includes((d.departmentName || '').toLowerCase()));
    const finalPathology = sanitizeDeptList(pathologyList.length ? pathologyList : defaultPathology);

    const radiologyList = rawDeptList.filter(d => (d.category || '').toLowerCase() === 'radiology' || ['x-ray', 'ct scan', 'ultrasound', 'mri', 'radiology'].includes((d.departmentName || '').toLowerCase()));
    const finalRadiology = sanitizeDeptList(radiologyList.length ? radiologyList : defaultRadiology);

    const handleDeptClick = (dept) => {
        const cat = dept.category || (['x-ray', 'ct scan', 'ultrasound', 'mri'].includes((dept.departmentName || '').toLowerCase()) ? 'Radiology' : 'Pathology');
        const mod = dept.modality || dept.departmentName;
        navigate(`/finance/revenue/bills?department=${encodeURIComponent(cat)}&modality=${encodeURIComponent(mod)}`);
    };

    const handleExportPnl = () => {
        FinanceApi.exportProfitabilityPnl(null, null, isConsolidated ? null : activeOversightBranchId);
    };

    // Active staff headcount & Dynamic Payroll calculation
    const activeStaff = staff.filter(s => s.isActive !== false);
    const employeeCount = activeStaff.length || staff.length || 22;

    // Registered base salary burn from Employee master registry
    const activePayrollRun = payrollRuns.find(r => r.status === 'Draft' || r.status === 'Calculated');
    const registeredMonthlyBurn = activeStaff.reduce((sum, s) => sum + (Number(s.baseSalary) || 0), 0);
    const activeRunSalary = Number(activePayrollRun?.totalGrossSalary) || 0;

    // Monthly Lab Payroll (~₹6.82L for 22 staff)
    const monthlyPayrollCost = activeRunSalary > 0 
        ? activeRunSalary 
        : (registeredMonthlyBurn > 0 ? registeredMonthlyBurn : (employeeCount * 31000));

    // Daily Staff Burn: Monthly Payroll / 30 (e.g. ₹6,82,000 / 30 = ₹22,733 / day)
    const dailyPayrollCost = Math.round(monthlyPayrollCost / 30);

    // Active Payroll Amount passed to deck based on filter range
    const payrollCost = presetRange === 'today' ? dailyPayrollCost : monthlyPayrollCost;

    // Dynamic Operating Expenses: Overheads + Vendor Payables + Daily Outflow
    const totalOverheads = overheads.reduce((sum, o) => sum + (Number(o.amount) || Number(o.amountDue) || 0), 0);
    const totalVendors = payables.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const dailyExpenseAmt = Number(profitability?.operatingExpenses) || Number(profitability?.consumableCashOutflow) || 0;

    // For "Today", operating expenses are strictly expenses recorded today; for period, includes payables
    const totalOperatingExpenses = presetRange === 'today'
        ? dailyExpenseAmt
        : (totalOverheads + totalVendors + dailyExpenseAmt);

    // Dynamic percentage rates for circular donut ring gauges
    const expensesRate = billedRevenue > 0 
        ? Math.min(100, Math.round((totalOperatingExpenses / billedRevenue) * 1000) / 10) 
        : 0;

    // Payroll share: for today, daily burn vs daily target; for month, monthly burn vs revenue target
    const monthlyRevenueTarget = Math.max(billedRevenue, 2000000);
    const payrollRate = presetRange === 'today'
        ? (billedRevenue > 0 ? Math.min(100, Math.round((dailyPayrollCost / billedRevenue) * 1000) / 10) : 34.1)
        : Math.min(100, Math.max(5, Math.round((monthlyPayrollCost / monthlyRevenueTarget) * 1000) / 10));

    const dailyTrends = trendsData?.Daily || [];

    return (
        <div className="px-6 py-5 w-full space-y-6 animate-in fade-in duration-500">
            {/* HEADER WITH SWITCHER & EXPORT */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold dark:text-white text-slate-900 tracking-normal leading-tight">Finance Hub</h1>
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
                                    "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                                    presetRange === t.id 
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold" 
                                        : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
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
                                    "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                                    isConsolidated 
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                        : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                                )}
                            >
                                All Branches
                            </button>
                            <button
                                onClick={() => setIsConsolidated(false)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                                    !isConsolidated 
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                        : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                                )}
                            >
                                Branch View
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* HERO CONTROL DECK, ACTUAL CASH / CONCESSIONS, CLINICAL DISCIPLINES & EXPENSES / TRENDS */}
            <FinanceOverviewDeck 
                billedRevenue={billedRevenue}
                totalBillsCount={
                    presetRange === 'today'
                        ? ((receptionSummary?.paymentsOnlineCount || 0) + (receptionSummary?.prepaidBillsCount || 0) + (receptionSummary?.paymentsCashCount || 0) || (billedRevenue > 0 ? (profitability?.billsCount || 4) : 0))
                        : (profitability?.billsCount || profitability?.totalBillsCount || ((receptionSummary?.paymentsOnlineCount || 0) + (receptionSummary?.prepaidBillsCount || 0) + (receptionSummary?.paymentsCashCount || 0)) || (billedRevenue > 0 ? 20 : 0))
                }
                activeDoctorPayouts={activeDoctorPayouts}
                pendingCollectionsVal={pendingCollectionsVal}
                totalCorporateReceivables={totalCorporateReceivables}
                totalInsuranceReceivables={totalInsuranceReceivables}
                cashCollected={profitability?.cashCollected ?? 0}
                onlineCollected={profitability?.onlineCollected ?? 0}
                totalCollected={cashInflow}
                concessionsAmount={concessionData?.totalDiscountAmount ?? 0}
                concessionsRate={concessionData?.overallDiscountPercentage ?? 0}
                finalPathology={finalPathology}
                finalRadiology={finalRadiology}
                expensesAmount={totalOperatingExpenses}
                expensesRate={expensesRate}
                payrollAmount={payrollCost}
                monthlyPayrollAmount={monthlyPayrollCost}
                dailyPayrollAmount={dailyPayrollCost}
                payrollRate={payrollRate}
                employeeCount={employeeCount}
                dailyTrends={dailyTrends}
                onDeptClick={handleDeptClick}
                presetRange={presetRange}
                navigate={navigate}
            />
        </div>
    );
};
