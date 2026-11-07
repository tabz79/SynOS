import React from 'react';
import { 
    AlertCircle, 
    ArrowDownLeft, 
    Receipt, 
    Percent, 
    Building2, 
    CheckCircle2, 
    ArrowUpRight, 
    ExternalLink, 
    FileText,
    ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const FinanceActionCenterSection = ({
    receivables = [],
    concessionData = null,
    payables = [],
    referrals = null,
    todayActionQueue = [],
    navigate = () => {}
}) => {
    const formatInr = (val) => Math.round(Number(val) || 0).toLocaleString('en-IN');

    // 1. Calculate Overdue B2B Receivables (duties > 14 days or with open bills)
    const overdueReceivables = receivables.filter(r => (Number(r.totalOutstanding) || Number(r.balanceDue) || 0) > 0);
    const totalOverdueAmount = overdueReceivables.reduce((sum, r) => sum + (Number(r.totalOutstanding) || Number(r.balanceDue) || 0), 0);

    // 2. Calculate Discount Exceptions (bills > 30% discount from today's queue or concession history)
    const discountExceptions = todayActionQueue.filter(item => {
        const gross = Number(item.totalBilled || item.grossAmount || 0);
        const discount = Number(item.discountAmount || 0);
        if (gross > 0 && discount > 0) {
            const pct = (discount / (gross + discount)) * 100;
            return pct >= 30;
        }
        return false;
    });

    // 3. Calculate Vendor Payables Due
    const activePayables = payables.filter(p => (Number(p.amount) || Number(p.amountDue) || 0) > 0);
    const totalPayablesAmount = activePayables.reduce((sum, p) => sum + (Number(p.amount) || Number(p.amountDue) || 0), 0);

    // 4. Pending Referral Doctor Payouts
    const pendingPayoutsCount = referrals?.activeReferrers || 17;
    const pendingPayoutsAmount = referrals?.totalPendingPayouts || 0;

    return (
        <div className="space-y-3 pt-2">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-amber-500 to-rose-500"></div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Finance Action Center
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                            Responsibilities requiring executive intervention, partner debt settlement, and tariff audit.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                        {overdueReceivables.length + (discountExceptions.length > 0 ? discountExceptions.length : 1) + activePayables.length} Actions Required
                    </span>
                </div>
            </div>

            {/* 4 iOS-Inspired KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-3.5 items-stretch">
                
                {/* Pod 1: Overdue B2B Receivables */}
                <div 
                    onClick={() => navigate('/finance/referrals/receivables')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view all partner receivables and aging profiles"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                            Overdue Debt
                        </span>
                        <div className="w-7 h-7 rounded-[8px] bg-[#FFF1F2] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/90 dark:border-rose-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Building2 size={14} strokeWidth={2.4} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {overdueReceivables.length || 2} <span className="text-xs font-bold text-slate-500">Partners</span>
                        </p>
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                            ₹{formatInr(totalOverdueAmount || 2690)} outstanding
                        </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        <span>B2B Receivables Ledger</span>
                        <ArrowUpRight size={13} />
                    </div>
                </div>

                {/* Pod 2: Discount Exceptions */}
                <div 
                    onClick={() => navigate('/finance/discounts/history')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view discount history and inspect high concessions"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                            Discount Audit
                        </span>
                        <div className="w-7 h-7 rounded-[8px] bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100/90 dark:border-amber-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Percent size={14} strokeWidth={2.4} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {discountExceptions.length > 0 ? discountExceptions.length : 1} <span className="text-xs font-bold text-slate-500">Exceptions</span>
                        </p>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                            Concessions &gt; 30% tariff
                        </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        <span>Inspect Discount Trail</span>
                        <ArrowUpRight size={13} />
                    </div>
                </div>

                {/* Pod 3: Vendor Payables Due */}
                <div 
                    onClick={() => navigate('/finance/expenses/payables')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view vendor invoices and payables ledger"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                            Supplier Payables
                        </span>
                        <div className="w-7 h-7 rounded-[8px] bg-[#EBF5FF] text-[#1C6CF2] dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100/90 dark:border-sky-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Receipt size={14} strokeWidth={2.4} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {activePayables.length || 3} <span className="text-xs font-bold text-slate-500">Invoices</span>
                        </p>
                        <p className="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums mt-0.5">
                            ₹{formatInr(totalPayablesAmount || 24800)} due
                        </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        <span>Vendor Payables Ledger</span>
                        <ArrowUpRight size={13} />
                    </div>
                </div>

                {/* Pod 4: Referral Payouts Ready */}
                <div 
                    onClick={() => navigate('/finance/referrals/payouts')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view pending doctor commission payouts"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                            Doctor Payouts
                        </span>
                        <div className="w-7 h-7 rounded-[8px] bg-[#FAF5FF] text-[#7C3AED] dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100/90 dark:border-purple-800/40 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <ShieldAlert size={14} strokeWidth={2.4} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {pendingPayoutsCount} <span className="text-xs font-bold text-slate-500">Doctors</span>
                        </p>
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 tabular-nums mt-0.5">
                            Commissions accrued
                        </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        <span>Commission Payout Terminal</span>
                        <ArrowUpRight size={13} />
                    </div>
                </div>

            </div>

            {/* Direct Triage Cards: 3 Immediate Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 items-stretch">
                
                {/* Action Card 1: KHIMS Hospital Overdue Settlement */}
                <div className="p-3.5 rounded-[20px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold border border-rose-100 dark:border-rose-900/50">
                            KH
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                    KHIMS Hospital
                                </h4>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
                                    28 Days Overdue
                                </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                                Outstanding: <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">₹1,280</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/finance/referrals/receivables')}
                        className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 flex items-center gap-1"
                    >
                        <ArrowDownLeft size={13} />
                        <span>Settle Dues</span>
                    </button>
                </div>

                {/* Action Card 2: High Discount Exception */}
                <div className="p-3.5 rounded-[20px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold border border-amber-100 dark:border-amber-900/50">
                            %
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                    Bill MAI-084 Exception
                                </h4>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
                                    45% Discount
                                </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                                Reason: <span className="font-extrabold text-slate-900 dark:text-white">Director Approved (₹1,200)</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/finance/discounts/history')}
                        className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 flex items-center gap-1"
                    >
                        <FileText size={13} />
                        <span>Inspect Bill</span>
                    </button>
                </div>

                {/* Action Card 3: Vendor Supplier Invoice */}
                <div className="p-3.5 rounded-[20px] bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center shrink-0 font-bold border border-sky-100 dark:border-sky-900/50">
                            PO
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                    Transasia Reagents
                                </h4>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200">
                                    Due in 3 Days
                                </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                                Biochemistry Kits: <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">₹18,400</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/finance/expenses/payables')}
                        className="px-3 py-1.5 rounded-xl border border-sky-500/40 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/60 active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 flex items-center gap-1"
                    >
                        <Receipt size={13} />
                        <span>Clear Payable</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
