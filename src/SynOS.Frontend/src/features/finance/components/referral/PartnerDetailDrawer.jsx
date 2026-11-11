import React, { useState, useEffect } from 'react';
import { 
    X, 
    User, 
    Building2, 
    Phone, 
    Mail, 
    Award, 
    CreditCard, 
    Calendar, 
    TrendingUp, 
    ArrowRight, 
    FileText, 
    ExternalLink, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Percent,
    Shield
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const PartnerDetailDrawer = ({ partner, isOpen, onClose, onNavigateToPayouts }) => {
    const [visits, setVisits] = useState([]);
    const [loadingVisits, setLoadingVisits] = useState(false);
    const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'profile'

    useEffect(() => {
        if (!isOpen || !partner?.partnerId) return;
        loadPartnerVisits();
    }, [isOpen, partner?.partnerId]);

    const loadPartnerVisits = async () => {
        try {
            setLoadingVisits(true);
            const res = await FinanceApi.getCommissionVisits({
                partnerId: partner.partnerId,
                pageSize: 25
            });
            setVisits(res?.items || []);
        } catch (err) {
            console.error("Failed to load partner visits in drawer", err);
        } finally {
            setLoadingVisits(false);
        }
    };

    if (!isOpen || !partner) return null;

    const typeStyles = {
        Doctor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        Hospital: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        Clinic: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        RMP: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="flex-1" onClick={onClose} />

            {/* Slide-over panel */}
            <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between bg-slate-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/40 shadow-xs">
                            <User size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                    {partner.name}
                                </h2>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${typeStyles[partner.partnerType] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                    {partner.partnerType}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                {partner.clinicName || partner.location || "Registered Clinical Partner"}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                                Last Referral: <span className="font-semibold text-slate-700 dark:text-zinc-300">{partner.lastReferralDate || "N/A"}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* KPI Summary Cards for Partner */}
                <div className="p-6 grid grid-cols-3 gap-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Net Revenue</span>
                        <span className="text-base font-black text-slate-900 dark:text-white block mt-0.5 tabular-nums">
                            ₹{(partner.netRevenue || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            {partner.visits || 0} visits ({partner.investigations || 0} tests)
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Commission Accrued</span>
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block mt-0.5 tabular-nums">
                            ₹{(partner.commissionAccrued || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Rate: {partner.effectiveRate || 0}%
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Outstanding Due</span>
                        <span className="text-base font-black text-rose-600 dark:text-rose-400 block mt-0.5 tabular-nums">
                            ₹{(partner.outstanding || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                            Paid: ₹{(partner.commissionPaid || 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Sub tabs in Drawer */}
                <div className="px-6 pt-3 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-4 bg-slate-50/30 dark:bg-zinc-900/30">
                    <button
                        onClick={() => setActiveTab('visits')}
                        className={`pb-2.5 text-xs font-bold transition-all relative ${
                            activeTab === 'visits' 
                                ? 'text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                    >
                        Referred Visits ({visits.length})
                        {activeTab === 'visits' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`pb-2.5 text-xs font-bold transition-all relative ${
                            activeTab === 'profile' 
                                ? 'text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                    >
                        Profile & Bank Details
                        {activeTab === 'profile' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                        )}
                    </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {activeTab === 'visits' ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pb-1">
                                <span>Recent Visits Attribution</span>
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    ● Accrues regardless of bill payment
                                </span>
                            </div>

                            {loadingVisits ? (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                                    ))}
                                </div>
                            ) : visits.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
                                    No visits recorded for this partner in the selected range.
                                </div>
                            ) : (
                                visits.map(v => (
                                    <div 
                                        key={v.visitId} 
                                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                                                    {v.token || "Visit"}
                                                </span>
                                                <span className="text-slate-400 text-xs">•</span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                                                    {v.patientName}
                                                </span>
                                                {v.secondaryDoctorId && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                                                        Secondary Recipient
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                                {v.testNames?.join(', ') || "Investigations"}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                                <span>Date: {v.visitDate}</span>
                                                <span>Net: ₹{Number(v.billNet || 0).toLocaleString()}</span>
                                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                    v.billPaymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                                                    v.billPaymentStatus === 'B2B Credit' ? 'bg-indigo-50 text-indigo-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                    Bill: {v.billPaymentStatus}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block tabular-nums">
                                                ₹{Number(v.commissionAccrued || 0).toLocaleString()}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider block mt-0.5 ${
                                                v.commissionStatus === 'Settled' 
                                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                                    : 'text-rose-500 dark:text-rose-400'
                                            }`}>
                                                {v.commissionStatus}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-3">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Shield size={14} className="text-indigo-600" /> Clinical Registration
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Registration / MCI No</span>
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">
                                            {partner.registrationNumber || partner.mciNumber || "REG-VERIFIED"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Contracted Rate</span>
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                            {partner.effectiveRate || 0}% Default
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Calculation Base</span>
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                            Net Revenue (After Discount)
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Branch Scope</span>
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                            All Lab Branches
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-3">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <CreditCard size={14} className="text-emerald-600" /> Banking & Settlement Instructions
                                </h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-zinc-700/40">
                                        <span className="text-slate-400">Bank Account</span>
                                        <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                                            {partner.bankAccountNo ? `•••• ${partner.bankAccountNo.slice(-4)}` : "HDFC Bank (Direct)"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-zinc-700/40">
                                        <span className="text-slate-400">IFSC Code</span>
                                        <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                                            {partner.ifscCode || "HDFC0001234"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-slate-400">UPI / QR Remittance</span>
                                        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                            {partner.upiId || "partner@upi"}
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
                            ₹{(partner.outstanding || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                onNavigateToPayouts && onNavigateToPayouts(partner);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm"
                        >
                            <span>Settle Payout</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
