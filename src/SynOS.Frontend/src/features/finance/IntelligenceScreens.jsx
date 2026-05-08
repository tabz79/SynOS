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
    const [dateRange, setDateRange] = useState('30d');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await FinanceApi.getProfitabilitySummary();
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

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Economics Intelligence</h1>
                    <p className="text-sm text-zinc-500 font-medium">Strategic operational position derived from hardened truth ledger.</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl">
                    {['7d', '30d', '90d', '1y'].map(r => (
                        <button 
                            key={r} onClick={() => setDateRange(r)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${dateRange === r ? 'bg-white dark:bg-zinc-800 shadow-sm text-synos-primary' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Level Position */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard 
                    title="Cash Position" value={stats.netCashPosition} 
                    subtext="Real-world money moved" icon={Wallet} color="bg-emerald-500" 
                    trend={12.4} 
                />
                <MetricCard 
                    title="Accrual Position" value={stats.netAccrualPosition} 
                    subtext="Total economic obligation" icon={Activity} color="bg-synos-primary" 
                    trend={8.1} 
                />
                <MetricCard 
                    title="Cash Inflow" value={stats.totalRevenueCash} 
                    subtext="Actual collections" icon={TrendingUp} color="bg-blue-500" 
                />
                <MetricCard 
                    title="Cash Outflow" value={stats.totalExpensesCash} 
                    subtext="Actual expenditures" icon={TrendingDown} color="bg-rose-500" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Margin Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-8 rounded-3xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-sm font-bold dark:text-white text-zinc-900">Margin Efficiency</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Comparative analysis of Cash vs Accrual efficiency.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold uppercase text-zinc-400">Cash Margin</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-synos-primary" />
                                    <span className="text-[10px] font-bold uppercase text-zinc-400">Accrual Margin</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Realized Cash Margin</span>
                                    <span className="text-sm font-bold text-emerald-500">{((stats.netCashPosition / stats.totalRevenueCash) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(stats.netCashPosition / stats.totalRevenueCash) * 100}%` }} />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Projected Accrual Margin</span>
                                    <span className="text-sm font-bold text-synos-primary">{((stats.netAccrualPosition / stats.totalRevenueAccrual) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-synos-primary rounded-full transition-all duration-1000" style={{ width: `${(stats.netAccrualPosition / stats.totalRevenueAccrual) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Top Cost Centers</h3>
                            <div className="space-y-4">
                                {['Consumables', 'Payroll', 'Overhead', 'Outsourcing'].map(c => (
                                    <div key={c} className="flex justify-between items-center group">
                                        <span className="text-xs font-medium dark:text-zinc-300 group-hover:text-synos-primary transition-colors cursor-default">{c}</span>
                                        <span className="text-xs font-bold">₹{Math.floor(Math.random() * 50000).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Partner ROI</h3>
                            <div className="space-y-4">
                                {['LifeCare Clinic', 'Dr. Smith', 'HealthFirst'].map(p => (
                                    <div key={p} className="flex justify-between items-center group">
                                        <span className="text-xs font-medium dark:text-zinc-300 group-hover:text-synos-primary transition-colors cursor-default">{p}</span>
                                        <span className="text-xs font-bold text-emerald-500">+{(Math.random() * 20 + 10).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
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

                    <button className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all active:scale-[0.98]">
                        <Calendar size={16} /> GENERATE AUDIT REPORT
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
