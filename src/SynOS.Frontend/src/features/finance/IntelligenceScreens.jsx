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
    Filter
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

// --- SHARED COMPONENTS ---

const MetricCard = ({ title, value, subtext, icon: Icon, trend, color }) => (
    <div className="p-6 rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden relative group">
        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.08] transition-all ${color}`}>
            <Icon size={96} />
        </div>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
                <Icon size={20} className={color.replace('bg-', 'text-')} />
            </div>
            {trend && (
                <span className={`flex items-center gap-1 text-[10px] font-bold ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(trend)}%
                </span>
            )}
        </div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{title}</h3>
        <p className="text-2xl font-bold dark:text-white text-zinc-900">₹{value.toLocaleString()}</p>
        <p className="text-[10px] text-zinc-500 mt-2">{subtext}</p>
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

    const cashCollected = Number(stats.totalRevenueCash || stats.cashInflow) || 0;
    const totalBilled = Number(stats.totalRevenueAccrual) || cashCollected;
    const doctorPayouts = Number(stats.referralCashOutflow) || 0;
    const materialCosts = Number(stats.consumableCashOutflow) || 0;
    const payrollCosts = Number(stats.payrollCashOutflow) || 0;
    const totalExpenses = Number(stats.totalExpensesCash) || 0;
    const actualProfit = Number(stats.netCashPosition) || 0;

    const handleExportPnl = () => {
        FinanceApi.exportProfitabilityPnl(dateRange, true);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 w-full">
            {/* HEADER WITH SIMPLE TIME SWITCHER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Lab Business Brain</h1>
                    <p className="text-sm text-zinc-500 font-medium">Real-time profitability, test margins, and expense breakdowns.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-black/5 dark:border-white/5">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'month', label: 'This Month' },
                            { id: 'quarter', label: 'This Quarter' },
                            { id: 'year', label: 'This Year' }
                        ].map(r => (
                            <button 
                                key={r.id} onClick={() => setDateRange(r.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${dateRange === r.id ? 'bg-white dark:bg-zinc-800 shadow-sm text-synos-primary' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleExportPnl}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                    >
                        Download P&L (CSV)
                    </button>
                </div>
            </div>

            {/* EXECUTIVE PLAIN-ENGLISH NARRATIVE BANNER */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-synos-primary/10 via-emerald-500/10 to-blue-500/10 border border-synos-primary/20 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-synos-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-synos-primary">Owner Executive Briefing ({dateRange === 'today' ? 'Today' : dateRange === 'year' ? 'This Year' : dateRange === 'quarter' ? 'This Quarter' : 'This Month'})</h2>
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {dateRange === 'today' ? (
                        <>Today your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{cashCollected.toLocaleString()}</strong> in cash. Doctor payouts owed today stand at <strong className="text-synos-primary">₹{doctorPayouts.toLocaleString()}</strong>, leaving <strong className="text-emerald-600 dark:text-emerald-400">₹{(cashCollected - doctorPayouts).toLocaleString()}</strong> Actual Cash Profit for today's settlement.</>
                    ) : (
                        <>Your lab collected <strong className="text-emerald-600 dark:text-emerald-400">₹{cashCollected.toLocaleString()}</strong> in cash against <strong className="text-zinc-900 dark:text-white">₹{totalBilled.toLocaleString()}</strong> total bills created. You spent <strong className="text-amber-600">₹{materialCosts.toLocaleString()}</strong> on reagents/materials, <strong className="text-synos-primary">₹{doctorPayouts.toLocaleString()}</strong> on doctor payouts, and <strong className="text-violet-500">₹{payrollCosts.toLocaleString()}</strong> on staff salaries, leaving <strong className="text-emerald-600 dark:text-emerald-400">₹{actualProfit.toLocaleString()}</strong> Actual Cash Profit.</>
                    )}
                </p>
            </div>

            {/* TOP LEVEL POSITION - SIMPLIFIED TERMINOLOGY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard 
                    title="Actual Cash Profit" value={actualProfit} 
                    subtext="Real money left in hand" icon={Wallet} color="bg-emerald-500" 
                    trend={12.4} 
                />
                <MetricCard 
                    title="Money Collected (Cash)" value={cashCollected} 
                    subtext="Bank & cash cleared" icon={TrendingUp} color="bg-blue-500" 
                />
                <MetricCard 
                    title="Total Bills Created" value={totalBilled} 
                    subtext="Total billed bookings" icon={Activity} color="bg-synos-primary" 
                    trend={8.1} 
                />
                <MetricCard 
                    title="Total Expenses & Bills" value={totalExpenses} 
                    subtext="All cash expenditures" icon={TrendingDown} color="bg-rose-500" 
                />
            </div>

            {/* VISUAL FINANCIAL FLOW WATERFALL */}
            <div className="p-6 rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold dark:text-white text-zinc-900">Visual Financial Flow</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">How revenue flows into Net Cash Profit after expenses.</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-500">{((actualProfit / Math.max(1, cashCollected)) * 100).toFixed(1)}% Profit Margin</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">1. Money Collected</p>
                        <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">₹{cashCollected.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">− Reagents & Materials</p>
                        <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">₹{materialCosts.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-synos-primary/10 border border-synos-primary/20">
                        <p className="text-[10px] font-bold text-synos-primary uppercase">− Doctor Payouts</p>
                        <p className="text-lg font-black text-synos-primary mt-1">₹{doctorPayouts.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase">− Salaries & Rent</p>
                        <p className="text-lg font-black text-violet-600 dark:text-violet-400 mt-1">₹{payrollCosts.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">= Actual Cash Profit</p>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{actualProfit.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: PARTNER ROI & ECONOMIC HEALTH */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 p-6 rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
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
                    <div className="p-8 rounded-3xl border dark:border-zinc-800 border-zinc-200 bg-synos-primary/5 dark:bg-synos-primary/5 border-synos-primary/10 relative overflow-hidden">
                        <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-synos-primary opacity-[0.05]" />
                        <h3 className="text-sm font-bold text-synos-primary uppercase tracking-widest mb-4">Economic Health</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-bold dark:text-zinc-200 mb-2">Liquidity Ratio</p>
                                <p className="text-3xl font-black text-synos-primary">1.84</p>
                                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-tighter">OPTIMAL STRENGTH</p>
                            </div>

                            <div className="pt-6 border-t border-synos-primary/10">
                                <p className="text-xs font-bold dark:text-zinc-200 mb-3">Health Indicators</p>
                                <div className="space-y-3">
                                    <Indicator label="Collection Speed" status="High" />
                                    <Indicator label="Cost Volatility" status="Low" />
                                    <Indicator label="Partner Growth" status="Steady" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleExportPnl} className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all active:scale-[0.98]">
                        <Calendar size={16} /> DOWNLOAD P&L STATEMENT (CSV)
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
