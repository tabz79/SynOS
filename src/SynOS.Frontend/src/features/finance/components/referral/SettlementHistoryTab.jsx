import React, { useState, useEffect } from 'react';
import { 
    History, 
    Search, 
    Filter, 
    Download, 
    ArrowUpRight, 
    ArrowDownLeft,
    Clock,
    User,
    Calendar,
    Tag
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const SettlementHistoryTab = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getSettlementHistory();
            setHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = history.filter(h => 
        h.payeeName?.toLowerCase().includes(search.toLowerCase()) || 
        h.notes?.toLowerCase().includes(search.toLowerCase()) ||
        h.reference?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search history by name, reference or notes..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-bold hover:bg-zinc-50 transition-all">
                    <Download size={18} className="text-zinc-400" /> EXPORT AUDIT
                </button>
            </div>

            {/* HISTORY TABLE */}
            <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Type</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Partner / Payee</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Reference & Notes</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Amount</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Handled By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                        {loading ? [1,2,3,4,5].map(i => <tr key={i} className="animate-pulse"><td colSpan="5" className="p-8 bg-zinc-50/20" /></tr>) : (
                            filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-zinc-400 text-xs font-medium">No settlement records found.</td>
                                </tr>
                            ) : (
                                filtered.map(h => (
                                    <tr key={h.factId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-6">
                                            {h.direction === 'Inflow' ? (
                                                <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-full w-fit border border-emerald-500/20">
                                                    <ArrowDownLeft size={12} /> Recovery
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-rose-500 font-bold text-[10px] uppercase tracking-widest bg-rose-500/10 px-2 py-1 rounded-full w-fit border border-rose-500/20">
                                                    <ArrowUpRight size={12} /> Payout
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <p className="text-xs font-bold dark:text-zinc-200">{h.payeeName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Tag size={10} className="text-zinc-400" />
                                                <p className="text-[10px] text-zinc-500 font-medium">{h.category}</p>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{h.notes || 'System Settlement'}</p>
                                            <p className="text-[9px] text-zinc-400 uppercase font-black mt-1">Ref: {h.reference}</p>
                                        </td>
                                        <td className="p-6 text-right">
                                            <p className={`text-sm font-black ${h.direction === 'Inflow' ? 'text-emerald-500' : 'dark:text-white text-zinc-900'}`}>
                                                {h.direction === 'Inflow' ? '+' : '-'} ₹{h.amount.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 mt-1 font-bold">{h.paymentMethod || h.paymentMode}</p>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                                                    <User size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold dark:text-zinc-300 text-zinc-700">{h.recordedBy || 'System Admin'}</p>
                                                    <p className="text-[9px] text-zinc-400 uppercase font-medium">{new Date(h.recordedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
