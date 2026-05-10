import React from 'react';
import { 
    Users, 
    TrendingUp, 
    DollarSign, 
    ArrowUpRight, 
    ArrowDownLeft,
    Activity,
    Target
} from 'lucide-react';

export const ReferralOverviewTab = ({ summary, loading }) => {
    if (loading || !summary) {
        return (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                    <div key={i} className="h-32 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    const stats = [
        { 
            label: 'Today New Referrals', 
            value: summary.newReferralsToday, 
            icon: Users, 
            color: 'text-blue-500', 
            bg: 'bg-blue-500/10',
            description: 'Patients referred since morning'
        },
        { 
            label: 'Referral Revenue Today', 
            value: `₹${summary.totalReferralRevenueToday.toLocaleString()}`, 
            icon: TrendingUp, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-500/10',
            description: 'Gross bill value from referrals'
        },
        { 
            label: 'Total Liability', 
            value: `₹${summary.totalPendingPayouts.toLocaleString()}`, 
            icon: ArrowUpRight, 
            color: 'text-rose-500', 
            bg: 'bg-rose-500/10',
            description: 'Commission owed to doctors'
        },
        { 
            label: 'Total Receivables', 
            value: `₹${summary.totalPendingReceivables.toLocaleString()}`, 
            icon: ArrowDownLeft, 
            color: 'text-amber-500', 
            bg: 'bg-amber-500/10',
            description: 'Money owed by partner hospitals'
        }
    ];

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="p-6 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-all`}>
                                <stat.icon size={20} />
                            </div>
                            <div className="h-2 w-2 rounded-full bg-synos-primary animate-ping" />
                        </div>
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</h3>
                        <p className="text-2xl font-black dark:text-white text-zinc-900 mt-1">{stat.value}</p>
                        <p className="text-[10px] text-zinc-400 mt-2 font-medium">{stat.description}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* RECENT ACTIVITY MOCK */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Partner Performance Trends</h2>
                            <p className="text-xs text-zinc-500 font-medium">Top performing referring doctors this month</p>
                        </div>
                        <button className="text-[10px] font-bold text-synos-primary uppercase tracking-widest hover:underline">View All Insights</button>
                    </div>
                    
                    <div className="flex items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-dashed dark:border-zinc-800 border-zinc-200">
                        <div className="text-center">
                            <Activity size={32} className="text-zinc-300 mx-auto mb-3" />
                            <p className="text-xs text-zinc-400 font-medium tracking-tight">Intelligence engine is processing latest visit data...</p>
                        </div>
                    </div>
                </div>

                {/* OPERATIONAL ALERTS */}
                <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl p-8 shadow-sm">
                    <h2 className="text-lg font-bold dark:text-white text-zinc-900 mb-6">Operational Alerts</h2>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <Target size={18} className="text-rose-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-rose-600 uppercase tracking-tighter">Overdue Payout</p>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                                        Dr. Mehta has ₹12,400 pending for &gt; 30 days. Payout recommended.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <DollarSign size={18} className="text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Collection Due</p>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                                        City Hospital (Prepaid) has ₹45,000 outstanding. Collection reminder scheduled.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
