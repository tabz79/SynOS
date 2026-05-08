import React, { useState, useEffect } from 'react';
import { 
    Users, 
    TrendingUp, 
    DollarSign, 
    History, 
    Settings,
    Plus,
    Search,
    ArrowRight
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { RecordCollectionModal } from './components/RecordCollectionModal';

// --- SHARED COMPONENTS ---

const StatusBadge = ({ status }) => {
    const styles = {
        Settled: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Pending: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        Active: "bg-blue-500/10 text-blue-500 border-blue-500/20"
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${styles[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
            {status}
        </span>
    );
};

// --- SCREENS ---

export const PartnerRegistryScreen = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await FinanceApi.getReferralPartners();
                setPartners(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <Header title="Partner Registry" description="Management of doctors, clinics, and health partners." />
                <button className="flex items-center gap-2 px-4 py-2 bg-synos-primary text-white rounded-xl text-xs font-bold hover:bg-synos-primary/90 transition-all">
                    <Plus size={16} /> ADD PARTNER
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? [1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />) : (
                    partners.map(p => (
                        <div key={p.referralPartnerId} className="p-6 rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-synos-primary/10 text-synos-primary group-hover:bg-synos-primary group-hover:text-white transition-all">
                                    <Users size={20} />
                                </div>
                                <StatusBadge status={p.isActive ? 'Active' : 'Inactive'} />
                            </div>
                            <h3 className="text-sm font-bold dark:text-white text-zinc-900">{p.name}</h3>
                            <p className="text-[10px] text-zinc-500 uppercase font-medium mt-1">{p.partnerType} • {p.collectionModel}</p>
                            <div className="mt-4 pt-4 border-t dark:border-zinc-900 border-zinc-100 flex justify-between items-center">
                                <span className="text-[10px] text-zinc-400">Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                                <button className="text-synos-primary hover:underline text-[10px] font-bold uppercase">View Profile</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export const CommissionPayoutsScreen = () => {
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReferralPayables();
            setPayables(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = (p) => {
        setSelected(p);
        setIsModalOpen(true);
    };

    const confirmSettle = async (amount) => {
        await FinanceApi.settleReferralPayable(selected.factId, amount);
        await loadData();
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <Header title="Commission Payouts" description="Execute payouts for partner commissions and referral bonuses." />
            
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? <LoadingState /> : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Partner</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Commission Amount</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Due Since</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {payables.map(p => (
                                <tr key={p.factId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4">
                                        <p className="text-xs font-bold dark:text-zinc-200">{p.partnerName}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase">{p.description}</p>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-right">₹{p.amount.toLocaleString()}</td>
                                    <td className="p-4 text-center"><StatusBadge status={p.status} /></td>
                                    <td className="p-4 text-xs text-zinc-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleSettle(p)} className="px-3 py-1.5 rounded-lg bg-synos-primary/10 text-synos-primary text-[10px] font-bold uppercase hover:bg-synos-primary hover:text-white transition-all">Issue Payout</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selected && (
                <RecordCollectionModal 
                    isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={confirmSettle}
                    entityName={`Payout to ${selected.partnerName}`}
                    totalAmount={selected.amount} pendingAmount={selected.amount}
                    mode="payout"
                />
            )}
        </div>
    );
};

export const CommissionRulesScreen = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await FinanceApi.getReferralRules();
                setRules(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <Header title="Commission Rules" description="Define and manage automated partner settlement logic." />
                <button className="flex items-center gap-2 px-4 py-2 bg-synos-primary text-white rounded-xl text-xs font-bold hover:bg-synos-primary/90 transition-all">
                    <Plus size={16} /> CREATE RULE
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? [1,2].map(i => <div key={i} className="h-40 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />) : (
                    rules.map(r => (
                        <div key={r.ruleId} className="p-6 rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4">
                                <Settings size={16} className="text-zinc-300 group-hover:text-synos-primary transition-all cursor-pointer" />
                            </div>
                            <h3 className="text-sm font-bold dark:text-white text-zinc-900">{r.ruleName}</h3>
                            <p className="text-xs text-zinc-500 mt-1">{r.description || "No description provided."}</p>
                            
                            <div className="mt-6 flex items-center gap-6">
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Commission</p>
                                    <p className="text-lg font-bold text-synos-primary">{r.percentage}%</p>
                                </div>
                                <div className="h-8 w-px bg-zinc-100 dark:bg-zinc-900" />
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Base</p>
                                    <p className="text-xs font-semibold dark:text-zinc-300">{r.calculationBase || "Net Amount"}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-2">
                                <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} />
                                <span className="text-[10px] text-zinc-400">Applies to: {r.partnerType || "All Partners"}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- PRIVATE HELPERS ---

const Header = ({ title, description }) => (
    <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold dark:text-white text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 font-medium">{description}</p>
    </div>
);

const LoadingState = () => (
    <div className="p-20 text-center text-zinc-500 animate-pulse font-medium">Synchronizing partner ledger...</div>
);
