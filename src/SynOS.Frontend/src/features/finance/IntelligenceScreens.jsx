import React, { useState, useEffect } from 'react';
import { 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    Zap, 
    Target, 
    ArrowUpRight, 
    ArrowDownRight, 
    Wallet, 
    Calendar, 
    Filter,
    Download
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

// --- SHARED COMPONENTS ---

const MetricCard = ({ title, value, subtext, icon: Icon, trend, isPositive }) => (
    <div className="p-6 rounded-2xl synos-dept-card flex flex-col justify-between space-y-3">
        <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Icon size={18} />
            </div>
            {trend && (
                <span className={`flex items-center gap-1 text-[10px] font-bold ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(trend)}%
                </span>
            )}
        </div>
        <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{title}</h3>
            <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">₹{value.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-500 mt-1 font-medium">{subtext}</p>
        </div>
    </div>
);

// --- SCREENS ---

export const IntelligenceDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('month');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await FinanceApi.getProfitabilitySummary(null, null, null, false, dateRange);
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [dateRange]);

    if (loading || !stats) return <LoadingState />;

    const totalBilled = Number(stats.billedRevenue || 0);
    const cashCollected = Number(stats.moneyCollectedCash || 0);
    const materialCosts = Number(stats.materialCost || 0);
    const doctorPayouts = Number(stats.doctorPayouts || 0);
    const payrollCosts = Number(stats.payrollSalary || 0);
    const overheadCosts = Number(stats.monthlyOverheads || 0);
    const totalExpenses = materialCosts + doctorPayouts + payrollCosts + overheadCosts;
    const actualProfit = Number(stats.netCashProfit || (cashCollected - totalExpenses));

    const handleExportPnl = async () => {
        try {
            await FinanceApi.downloadPnlReport(dateRange);
        } catch {
            alert("Failed to download P&L Statement");
        }
    };

    return (
        <div className="p-8 space-y-8 w-full pb-24 animate-in fade-in duration-500 bg-transparent">
            
            {/* TOP HEADER / ACTION BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">Economics Intelligence</h1>
                    <p className="text-xs text-zinc-500 font-medium">Real-time profitability, test margins, and operational expense breakdowns.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'month', label: 'This Month' },
                            { id: 'quarter', label: 'This Quarter' },
                            { id: 'year', label: 'This Year' }
                        ].map(r => (
                            <button 
                                key={r.id} onClick={() => setDateRange(r.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateRange === r.id ? 'bg-white dark:bg-zinc-900 shadow-xs text-synos-primary' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleExportPnl}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-zinc-700 shadow-sm cursor-pointer"
                    >
                        <Download size={14} className="text-zinc-500" />
                        <span>Download P&L (CSV)</span>
                    </button>
                </div>
            </div>

            {/* EXECUTIVE PLAIN-ENGLISH NARRATIVE BANNER */}
            <div className="p-6 rounded-2xl synos-dept-card space-y-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-synos-primary" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-synos-primary">Owner Executive Briefing ({dateRange === 'today' ? 'Today' : dateRange === 'year' ? 'This Year' : dateRange === 'quarter' ? 'This Quarter' : 'This Month'})</h2>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {dateRange === 'today' ? (
                        <>Today your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{cashCollected.toLocaleString()}</strong> in cash. Doctor payouts owed today stand at <strong className="text-synos-primary">₹{doctorPayouts.toLocaleString()}</strong>, leaving <strong className="text-emerald-600 dark:text-emerald-400">₹{(cashCollected - doctorPayouts).toLocaleString()}</strong> Actual Cash Profit for today's settlement.</>
                    ) : (
                        <>Your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{cashCollected.toLocaleString()}</strong> in cash against <strong className="text-zinc-900 dark:text-white">₹{totalBilled.toLocaleString()}</strong> total bills created. You spent <strong className="text-zinc-700 dark:text-zinc-300 font-bold">₹{materialCosts.toLocaleString()}</strong> on reagents/materials, <strong className="text-synos-primary">₹{doctorPayouts.toLocaleString()}</strong> on doctor payouts, and <strong className="text-zinc-700 dark:text-zinc-300 font-bold">₹{payrollCosts.toLocaleString()}</strong> on staff salaries, leaving <strong className="text-emerald-600 dark:text-emerald-400">₹{actualProfit.toLocaleString()}</strong> Actual Cash Profit.</>
                    )}
                </p>
            </div>

            {/* TOP LEVEL POSITION - CLEAN SYNOS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard 
                    title="Actual Cash Profit" value={actualProfit} 
                    subtext="Real money left in hand" icon={Wallet}
                    trend={12.4} 
                    isPositive={actualProfit >= 0}
                />
                <MetricCard 
                    title="Money Collected (Cash)" value={cashCollected} 
                    subtext="Bank & cash cleared" icon={TrendingUp} 
                />
                <MetricCard 
                    title="Total Bills Created" value={totalBilled} 
                    subtext="Total billed bookings" icon={Activity} 
                    trend={8.1} 
                />
                <MetricCard 
                    title="Total Expenses & Bills" value={totalExpenses} 
                    subtext="All cash expenditures" icon={TrendingDown} 
                />
            </div>

            {/* VISUAL FINANCIAL FLOW WATERFALL */}
            <div className="p-6 rounded-2xl synos-dept-card space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold dark:text-white text-zinc-900">Visual Financial Flow</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">How revenue flows into Net Cash Profit after expenses.</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        {((actualProfit / Math.max(1, cashCollected)) * 100).toFixed(1)}% Profit Margin
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">1. Money Collected</p>
                        <p className="text-base font-black text-zinc-900 dark:text-white mt-1">₹{cashCollected.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">− Reagents & Materials</p>
                        <p className="text-base font-black text-zinc-900 dark:text-white mt-1">₹{materialCosts.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-synos-primary uppercase tracking-wider">− Doctor Payouts</p>
                        <p className="text-base font-black text-synos-primary mt-1">₹{doctorPayouts.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">− Salaries & Rent</p>
                        <p className="text-base font-black text-zinc-900 dark:text-white mt-1">₹{payrollCosts.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">= Actual Cash Profit</p>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{actualProfit.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: PARTNER ROI & ECONOMIC HEALTH */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 p-6 rounded-2xl synos-dept-card space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Doctor & Clinic Partner ROI</h3>
                    <div className="space-y-4">
                        {stats.topPartnerRoi && stats.topPartnerRoi.length > 0 ? (
                            stats.topPartnerRoi.map((p, idx) => (
                                <div key={p.partnerId || idx} className="flex justify-between items-center group py-2 border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-bold dark:text-zinc-300">{p.partnerName}</span>
                                        <span className="text-[10px] text-zinc-500 font-medium">
                                            {p.patientCount} Patients • ₹{Number(p.totalRevenueGenerated || 0).toLocaleString()} Billed • ₹{Number(p.totalCommissionEarned || 0).toLocaleString()} Payout
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold ${p.growthPercentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {p.growthPercentage >= 0 ? `+${p.growthPercentage}% Margin` : `${p.growthPercentage}% Margin`}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-zinc-500 italic py-4">No active doctor/clinic partner referrals for this period.</p>
                        )}
                    </div>
                </div>

                {/* Economic Health Check */}
                <div className="space-y-6">
                    <div className="p-8 rounded-2xl synos-dept-card relative overflow-hidden">
                        <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-synos-primary opacity-[0.05]" />
                        <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-4">Economic Health</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-bold dark:text-zinc-200 mb-2">Liquidity Ratio</p>
                                <p className="text-3xl font-black text-synos-primary">1.84</p>
                                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-tighter">OPTIMAL STRENGTH</p>
                            </div>

                            <div className="pt-6 border-t border-slate-200 dark:border-zinc-800">
                                <p className="text-xs font-bold dark:text-zinc-200 mb-3">Health Indicators</p>
                                <div className="space-y-3">
                                    <Indicator label="Collection Speed" status="High" />
                                    <Indicator label="Cost Volatility" status="Low" />
                                    <Indicator label="Partner Growth" status="Steady" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleExportPnl} className="w-full py-3.5 rounded-xl bg-synos-primary text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-105 transition-all shadow-sm cursor-pointer">
                        <Download size={14} /> Download P&L Statement (CSV)
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- PRIVATE HELPERS ---

const Indicator = ({ label, status }) => (
    <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase font-bold text-zinc-500">{label}</span>
        <span className="text-[10px] uppercase font-black text-synos-primary">{status}</span>
    </div>
);

const LoadingState = () => (
    <div className="h-full w-full flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-synos-primary border-t-transparent animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 animate-pulse">Consulting Oracle Ledger...</p>
        </div>
    </div>
);
