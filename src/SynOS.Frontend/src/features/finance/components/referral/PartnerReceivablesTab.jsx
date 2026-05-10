import React, { useState, useEffect } from 'react';
import { 
    ArrowDownLeft, 
    ChevronRight, 
    Search,
    Filter,
    CheckCircle2,
    X,
    CreditCard,
    Banknote,
    Building2,
    Calendar,
    Clock
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const PartnerReceivablesTab = () => {
    const [receivables, setReceivables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [settling, setSettling] = useState(false);
    const [expandedPartnerId, setExpandedPartnerId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getReceivables();
            const grouped = groupReceivables(data);
            setReceivables(grouped);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const groupReceivables = (data) => {
        const groups = {};
        data.forEach(r => {
            if (!groups[r.referralPartnerId]) {
                groups[r.referralPartnerId] = {
                    partnerId: r.referralPartnerId,
                    partnerName: r.partnerName,
                    totalAmount: 0,
                    billCount: 0,
                    oldestDate: r.occurredAt,
                    items: []
                };
            }
            groups[r.referralPartnerId].totalAmount += (r.amount - r.amountReceived);
            groups[r.referralPartnerId].billCount += 1;
            if (new Date(r.occurredAt) < new Date(groups[r.referralPartnerId].oldestDate)) {
                groups[r.referralPartnerId].oldestDate = r.occurredAt;
            }
            groups[r.referralPartnerId].items.push(r);
        });
        return Object.values(groups).filter(g => g.totalAmount > 0);
    };

    const handleSettleRecovery = async (partner, amount, method) => {
        try {
            setSettling(true);
            const factIds = partner.items.map(i => i.receivableFactId);
            const payload = {
                partnerId: partner.partnerId,
                factIds,
                totalAmount: amount,
                paymentMethod: method
            };
            console.log("Settling Partner Recovery:", payload);
            await FinanceApi.settleReferralRecovery(payload);
            setSelectedPartner(null);
            loadData();
        } catch (err) {
            alert("Settlement failed: " + err.message);
        } finally {
            setSettling(false);
        }
    };

    const filtered = receivables.filter(p => p.partnerName.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search partner receivables..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all">
                        RECORD RECOVERY
                    </button>
                </div>
            </div>

            {/* RECEIVABLES LIST */}
            <div className="rounded-3xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 text-center text-zinc-500 animate-pulse">Reconciling partner ledgers...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-20 text-center">
                        <Building2 size={48} className="text-zinc-200 mx-auto mb-4" />
                        <p className="text-sm font-bold dark:text-zinc-500 text-zinc-400 tracking-tight">No outstanding receivables from partners.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Partner / Account</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Open Bills</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Total Outstanding</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Oldest Dues</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {filtered.map((partner) => (
                                <React.Fragment key={partner.partnerId}>
                                    <tr className={`group transition-all ${expandedPartnerId === partner.partnerId ? 'bg-emerald-500/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => setExpandedPartnerId(expandedPartnerId === partner.partnerId ? null : partner.partnerId)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${expandedPartnerId === partner.partnerId ? 'bg-emerald-500 text-white rotate-90' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                                                >
                                                    <ChevronRight size={12} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold dark:text-white text-zinc-900">{partner.partnerName}</span>
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">PARTNER ID: {partner.partnerId.toString().substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-sm font-semibold dark:text-zinc-400">{partner.billCount}</td>
                                        <td className="p-6 text-right">
                                            <div className="text-sm font-black text-emerald-500">₹{partner.totalAmount.toLocaleString()}</div>
                                        </td>
                                        <td className="p-6 text-xs text-zinc-400 font-medium">{new Date(partner.oldestDate).toLocaleDateString()}</td>
                                        <td className="p-6 text-right">
                                            <button 
                                                onClick={() => setSelectedPartner(partner)}
                                                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all"
                                            >
                                                Record Receipt
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedPartnerId === partner.partnerId && (
                                        <tr>
                                            <td colSpan="5" className="p-0 bg-zinc-50/50 dark:bg-zinc-950/50">
                                                <div className="p-6 border-x border-b dark:border-zinc-900 border-zinc-100 mx-4 mb-4 rounded-b-2xl bg-white dark:bg-zinc-950 shadow-inner">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 border-b dark:border-zinc-900 pb-2">
                                                                <th className="pb-2">Token / Reference</th>
                                                                <th className="pb-2">Patient</th>
                                                                <th className="pb-2">Date</th>
                                                                <th className="pb-2 text-right">Original</th>
                                                                <th className="pb-2 text-right">Outstanding</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y dark:divide-zinc-900/50 divide-zinc-100">
                                                            {partner.items.map(fact => (
                                                                <tr key={fact.receivableFactId}>
                                                                    <td className="py-3 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400">{fact.token || fact.receivableFactId.toString().substring(0, 13)}</td>
                                                                    <td className="py-3 text-[10px] font-bold dark:text-zinc-300">{fact.patientName || 'Unknown Patient'}</td>
                                                                    <td className="py-3 text-[10px] text-zinc-400">{new Date(fact.occurredAt).toLocaleDateString()}</td>
                                                                    <td className="py-3 text-[10px] font-black text-right dark:text-zinc-300">₹{fact.amount.toLocaleString()}</td>
                                                                    <td className="py-3 text-[10px] font-black text-right text-rose-500">₹{(fact.amount - fact.amountReceived).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedPartner && (
                <RecoveryModal 
                    partner={selectedPartner} 
                    onClose={() => setSelectedPartner(null)} 
                    onConfirm={(amount, method) => handleSettleRecovery(selectedPartner, amount, method)}
                    settling={settling}
                />
            )}
        </div>
    );
};

const RecoveryModal = ({ partner, onClose, onConfirm, settling }) => {
    const [amount, setAmount] = useState(partner.totalAmount.toString());
    const [method, setMethod] = useState('BankTransfer');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-900 border-zinc-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 flex justify-between items-center border-b dark:border-zinc-900 border-zinc-100 bg-emerald-500/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                            <ArrowDownLeft size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold dark:text-white text-zinc-900">Partner Recovery</h2>
                            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Collecting dues from {partner.partnerName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl text-center space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">
                            <span>Total Outstanding</span>
                            <span>Bills: {partner.billCount}</span>
                        </div>
                        <div className="text-3xl font-black text-emerald-500">₹{partner.totalAmount.toLocaleString()}</div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Recovery Amount (₹)</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter total amount received"
                                className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-2 border-transparent focus:border-emerald-500 outline-none transition-all dark:text-white font-black text-2xl"
                            />
                            <div className="flex gap-2 pt-2">
                                {[0.5, 1].map(pct => (
                                    <button 
                                        key={pct}
                                        onClick={() => setAmount((partner.totalAmount * pct).toFixed(2))}
                                        className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                                    >
                                        {pct * 100}% Dues
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest ml-1">Received Via</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'BankTransfer', label: 'Bank Transfer', icon: CreditCard },
                                    { id: 'Cash', label: 'Cash Recovery', icon: Banknote },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMethod(m.id)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                                            method === m.id 
                                            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' 
                                            : 'border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 text-zinc-500 hover:border-zinc-300'
                                        }`}
                                    >
                                        <m.icon size={18} />
                                        <span className="text-[11px] font-bold">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-[10px] text-amber-600 leading-relaxed font-bold">
                                <span className="uppercase mr-1">FIFO Distribution:</span>
                                Funds will be applied to the oldest invoices first.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            disabled={settling}
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded-2xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                        >
                            CANCEL
                        </button>
                        <button 
                            disabled={settling || !amount || parseFloat(amount) <= 0}
                            onClick={() => onConfirm(parseFloat(amount), method)}
                            className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {settling ? 'RECOVERING...' : 'RECORD SETTLEMENT'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
