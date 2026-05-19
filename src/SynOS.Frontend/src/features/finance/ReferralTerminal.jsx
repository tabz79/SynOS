import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, 
    TrendingUp, 
    DollarSign, 
    History, 
    Settings,
    Plus,
    Search,
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownLeft,
    Filter,
    MoreHorizontal
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { PartnerRegistryTab } from './components/referral/PartnerRegistryTab';
import { PendingPayoutsTab } from './components/referral/PendingPayoutsTab';
import { PartnerReceivablesTab } from './components/referral/PartnerReceivablesTab';
import { SettlementHistoryTab } from './components/referral/SettlementHistoryTab';
import { CommissionRulesTab } from './components/referral/CommissionRulesTab';
import { ReferralOverviewTab } from './components/referral/ReferralOverviewTab';

/**
 * Referral Terminal
 * The command center for Doctor Relationship Finance Infrastructure.
 */
export const ReferralTerminal = () => {
    const { tab = 'overview' } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const tabsRef = React.useRef(null);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'registry', label: 'Partner Registry', icon: Users },
        { id: 'payouts', label: 'Pending Payouts', icon: ArrowUpRight },
        { id: 'receivables', label: 'Partner Receivables', icon: ArrowDownLeft },
        { id: 'history', label: 'Settlement History', icon: History },
        { id: 'rules', label: 'Commission Rules', icon: Settings },
    ];

    useEffect(() => {
        loadSummary();
    }, []);

    useEffect(() => {
        if (tabsRef.current) {
            const activeTabEl = tabsRef.current.querySelector('[data-active-tab="true"]');
            if (activeTabEl) {
                activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [tab]);

    const loadSummary = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReferralSummary();
            setSummary(data);
        } catch (err) {
            console.error("Failed to load referral summary", err);
        } finally {
            setLoading(false);
        }
    };

    const setActiveTab = (id) => {
        navigate(`/finance/referrals/${id}`);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-black overflow-hidden animate-in fade-in duration-700">
            {/* TERMINAL HEADER */}
            <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-zinc-950 border-b dark:border-zinc-900 border-zinc-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-synos-primary/10 text-synos-primary rounded-2xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold dark:text-white text-zinc-900 tracking-tight">Referral Terminal</h1>
                        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Doctor Relationship Finance Infrastructure</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {summary && (
                        <>
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Total Payout Liability</p>
                                <p className="text-sm font-bold text-rose-500">₹{summary.totalPendingPayouts?.toLocaleString()}</p>
                            </div>
                            <div className="w-px h-8 bg-zinc-100 dark:bg-zinc-900" />
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Partner Receivables</p>
                                <p className="text-sm font-bold text-emerald-500">₹{summary.totalPendingReceivables?.toLocaleString()}</p>
                            </div>
                        </>
                    )}
                    <button onClick={loadSummary} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <History size={18} className="text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div ref={tabsRef} className="flex items-center gap-1 px-8 py-2 bg-white dark:bg-zinc-950 border-b dark:border-zinc-900 border-zinc-100 overflow-x-auto scrollbar-thin">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        data-active-tab={tab === t.id ? "true" : "false"}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            tab === t.id 
                            ? 'bg-synos-primary/10 text-synos-primary' 
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {tab === 'overview' && <ReferralOverviewTab summary={summary} loading={loading} />}
                {tab === 'registry' && <PartnerRegistryTab />}
                {tab === 'payouts' && <PendingPayoutsTab />}
                {tab === 'receivables' && <PartnerReceivablesTab />}
                {tab === 'history' && <SettlementHistoryTab />}
                {tab === 'rules' && <CommissionRulesTab />}
            </div>
        </div>
    );
};
