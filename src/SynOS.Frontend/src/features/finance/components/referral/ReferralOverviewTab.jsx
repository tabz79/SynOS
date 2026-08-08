import React, { useState, useEffect } from 'react';
import { 
    Users, 
    TrendingUp, 
    DollarSign, 
    ArrowUpRight, 
    ArrowDownLeft,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const ReferralOverviewTab = ({ summary, loading: summaryLoading }) => {
    const [liveData, setLiveData] = useState({ payables: [], history: [] });
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const fetchLiveDetails = async () => {
            try {
                setLoadingData(true);
                const [payablesData, historyData] = await Promise.all([
                    FinanceApi.getReferralPayables().catch(() => []),
                    FinanceApi.getSettlementHistory().catch(() => [])
                ]);
                setLiveData({ payables: payablesData.slice(0, 5), history: historyData.slice(0, 5) });
            } catch (err) {
                console.error("Failed to load live referral details:", err);
            } finally {
                setLoadingData(false);
            }
        };
        if (summary) {
            fetchLiveDetails();
        }
    }, [summary]);

    if (summaryLoading || !summary) {
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
                        </div>
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</h3>
                        <p className="text-2xl font-black dark:text-white text-zinc-900 mt-1">{stat.value}</p>
                        <p className="text-[10px] text-zinc-400 mt-2 font-medium">{stat.description}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ACTIVE COMMISSION LIABILITIES */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Pending Payout Obligations</h2>
                            <p className="text-xs text-zinc-500 font-medium">Outstanding referral commissions awaiting payment authorization</p>
                        </div>
                    </div>
                    
                    {loadingData ? (
                        <div className="py-20 text-center text-zinc-400 animate-pulse">Syncing referral ledger...</div>
                    ) : liveData.payables.length === 0 ? (
                        <div className="py-16 text-center text-zinc-400 border border-dashed dark:border-zinc-800 rounded-2xl">
                            <CheckCircle2 size={32} className="mx-auto mb-3 opacity-20 text-emerald-500" />
                            <p className="text-xs font-semibold">All referral commissions settled!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b dark:border-zinc-900 border-zinc-100 pb-2 text-[10px] uppercase font-bold text-zinc-400">
                                        <th className="pb-3">Doctor</th>
                                        <th className="pb-3">Patient</th>
                                        <th className="pb-3 text-right">Commission Due</th>
                                        <th className="pb-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {liveData.payables.map((p, idx) => (
                                        <tr key={idx} className="border-b dark:border-zinc-900/50 border-zinc-100/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="py-3 font-semibold dark:text-zinc-200">{p.partnerName || 'Unknown Doctor'}</td>
                                            <td className="py-3 text-zinc-500">{p.patientName || 'Walk-In Visit'}</td>
                                            <td className="py-3 text-right font-black text-rose-500">₹{(p.amount ?? 0).toLocaleString()}</td>
                                            <td className="py-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                                                    Pending
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* RECENT SETTLEMENT LOGS */}
                <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-3xl p-8 shadow-sm">
                    <h2 className="text-lg font-bold dark:text-white text-zinc-900 mb-6">Recent Settlements</h2>
                    
                    {loadingData ? (
                        <div className="py-10 text-center text-zinc-400 animate-pulse">Scanning facts...</div>
                    ) : liveData.history.length === 0 ? (
                        <div className="py-10 text-center text-zinc-400 italic">No payout settlements recorded this month.</div>
                    ) : (
                        <div className="space-y-4">
                            {liveData.history.map((h, idx) => (
                                <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border dark:border-zinc-800/50 border-zinc-200/50 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold dark:text-zinc-200">{h.notes?.split('|')[0] || 'Partner Payout'}</p>
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-tighter mt-1">{new Date(h.occurredAt).toLocaleDateString()} • {h.paymentMode || 'UPI'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-emerald-500">₹{h.amount?.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

