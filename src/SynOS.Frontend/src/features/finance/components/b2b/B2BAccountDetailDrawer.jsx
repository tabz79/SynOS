import React, { useState, useEffect } from 'react';
import { 
    X, 
    Building2, 
    Phone, 
    Mail, 
    Calendar, 
    CreditCard, 
    FileText, 
    Printer, 
    ArrowRight, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Shield, 
    Download,
    DollarSign,
    Layers
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const B2BAccountDetailDrawer = ({ 
    accountId, 
    isOpen, 
    onClose, 
    onRecordPayment,
    onGenerateStatement 
}) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'profile'

    useEffect(() => {
        if (!isOpen || !accountId) return;
        loadAccountDetail();
    }, [isOpen, accountId]);

    const loadAccountDetail = async () => {
        try {
            setLoading(true);
            const res = await FinanceApi.getB2BAccountDetail(accountId);
            setDetail(res);
        } catch (err) {
            console.error("Failed to load account details", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !accountId) return null;

    const profile = detail?.profile || {};
    const financials = detail?.financials || {};
    const bills = detail?.bills || [];

    const typeBadgeStyles = {
        Hospital: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50",
        Clinic: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200/50",
        Corporate: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/50"
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="flex-1" onClick={onClose} />

            {/* Slide-over panel */}
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between bg-slate-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/40 shadow-xs">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                    {profile.name || "B2B Account"}
                                </h2>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeBadgeStyles[profile.type] || "bg-slate-100 text-slate-700"}`}>
                                    {profile.type || "Institution"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                {profile.address || "Institutional Client Account"}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                                Payment Terms: <span className="font-semibold text-slate-700 dark:text-zinc-300">{profile.paymentTermsDays || 30} Days</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* KPI Cards Row */}
                <div className="p-6 grid grid-cols-4 gap-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Net Billed</span>
                        <span className="text-base font-black text-slate-900 dark:text-white block mt-0.5 tabular-nums">
                            ₹{(financials.totalBilled || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Recovered</span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 tabular-nums">
                            ₹{(financials.totalRecovered || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Outstanding</span>
                        <span className="text-base font-black text-rose-600 dark:text-rose-400 block mt-0.5 tabular-nums">
                            ₹{(financials.outstanding || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Overdue</span>
                        <span className="text-base font-black text-amber-600 dark:text-amber-400 block mt-0.5 tabular-nums">
                            ₹{(financials.overdue || 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Sub-tabs inside Drawer */}
                <div className="px-6 pt-3 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-4 bg-slate-50/30 dark:bg-zinc-900/30">
                    <button
                        onClick={() => setActiveTab('bills')}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                            activeTab === 'bills' 
                                ? 'text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                    >
                        Itemized Invoices & Visits ({bills.length})
                        {activeTab === 'bills' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                            activeTab === 'profile' 
                                ? 'text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                    >
                        Account Profile & Terms
                        {activeTab === 'profile' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                        )}
                    </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                            ))}
                        </div>
                    ) : activeTab === 'bills' ? (
                        <div className="space-y-3">
                            {bills.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No invoices or visits found for this account.
                                </div>
                            ) : (
                                bills.map((b) => (
                                    <div 
                                        key={b.factId} 
                                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                                                    {b.token}
                                                </span>
                                                <span className="text-slate-400 text-xs">•</span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                                                    {b.patientName}
                                                </span>
                                                {b.isOverdue && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/50">
                                                        Overdue
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                                {b.investigations?.join(', ') || "Investigations"}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                                <span>Date: {b.date}</span>
                                                <span>Gross: ₹{Number(b.grossTariff || 0).toLocaleString()}</span>
                                                <span>Concession: ₹{Number(b.concession || 0).toLocaleString()}</span>
                                                <span>Due: {b.dueDate}</span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-black text-slate-900 dark:text-white block tabular-nums">
                                                ₹{Number(b.balanceDue || 0).toLocaleString()}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider block mt-0.5 ${
                                                b.status === 'Settled' 
                                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                                    : (b.status === 'Partial' ? 'text-amber-500' : 'text-rose-500')
                                            }`}>
                                                {b.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 text-xs">
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-3">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Shield size={14} className="text-indigo-600" /> Account Terms & Information
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Contact Phone</span>
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                            {profile.phone || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Contact Email</span>
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                            {profile.email || "N/A"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Payment Terms</span>
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                            {profile.paymentTermsDays || 30} Days Contracted
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Credit Limit</span>
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                            {profile.creditLimit > 0 ? `₹${profile.creditLimit.toLocaleString()}` : "Standard"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-zinc-900/80">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Outstanding Balance</span>
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                            ₹{(financials.outstanding || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onGenerateStatement && onGenerateStatement(profile)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            <Printer size={14} className="text-slate-500" />
                            <span>Statement (A4)</span>
                        </button>
                        <button
                            onClick={() => onRecordPayment && onRecordPayment({ accountId: profile.accountId, accountName: profile.name, outstanding: financials.outstanding })}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm cursor-pointer"
                        >
                            <CreditCard size={14} />
                            <span>Record Payment</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
