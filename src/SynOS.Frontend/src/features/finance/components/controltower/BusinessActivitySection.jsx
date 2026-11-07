import React, { useState } from 'react';
import { 
    Activity, 
    Bell, 
    CheckCircle2, 
    Clock, 
    ArrowUpRight, 
    Wallet, 
    Users, 
    FileText, 
    Package, 
    AlertCircle, 
    Filter,
    CreditCard,
    Building2,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const BusinessActivitySection = ({
    navigate = () => {}
}) => {
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Chronological laboratory event stream
    const activities = [
        {
            id: 1,
            time: "10 mins ago",
            category: "Finance",
            title: "Cash Handover Submitted",
            description: "Pooja (Counter 1) submitted shift closing cash of ₹14,500. Awaiting safe vault acknowledgment.",
            actionLabel: "Verify Handover",
            route: "/finance/revenue/drawers",
            icon: Wallet,
            iconColor: "text-amber-500",
            iconBg: "bg-amber-500/10",
            badgeStyle: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
        },
        {
            id: 2,
            time: "24 mins ago",
            category: "Workforce",
            title: "Leave Request Submitted",
            description: "Dr. K. Sneha (Pathologist) requested 1-day casual leave for tomorrow (Personal).",
            actionLabel: "Review Leave",
            route: "/finance/workforce/attendance",
            icon: Users,
            iconColor: "text-purple-500",
            iconBg: "bg-purple-500/10",
            badgeStyle: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25"
        },
        {
            id: 3,
            time: "48 mins ago",
            category: "Finance",
            title: "B2B Partner Settlement Recorded",
            description: "KHIMS Hospital settled ₹8,500 outstanding receivables via NEFT remittance.",
            actionLabel: "View Ledger",
            route: "/finance/referrals/receivables",
            icon: Building2,
            iconColor: "text-emerald-500",
            iconBg: "bg-emerald-500/10",
            badgeStyle: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
        },
        {
            id: 4,
            time: "1 hour ago",
            category: "Finance",
            title: "High Concession Audit Flag",
            description: "Bill MAI-084 granted ₹450 (32%) discount under Director Discretionary Tariff.",
            actionLabel: "Inspect Concession",
            route: "/finance/discounts/history",
            icon: AlertCircle,
            iconColor: "text-rose-500",
            iconBg: "bg-rose-500/10",
            badgeStyle: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
        },
        {
            id: 5,
            time: "2 hours ago",
            category: "Inventory",
            title: "Branch Stock Requisition",
            description: "Pathology Workbench requested 10x Vacutainer EDTA tubes from central store.",
            actionLabel: "Fulfill Request",
            route: "/inventory?tab=requests",
            icon: Package,
            iconColor: "text-indigo-500",
            iconBg: "bg-indigo-500/10",
            badgeStyle: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25"
        },
        {
            id: 6,
            time: "3 hours ago",
            category: "Clinical",
            title: "Pathology Verification Surge",
            description: "Dr. Vasudeva Rao authorized 15 hematology & biochemistry reports on Workbench.",
            actionLabel: "Open Control Tower",
            route: "/admin",
            icon: Activity,
            iconColor: "text-sky-500",
            iconBg: "bg-sky-500/10",
            badgeStyle: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25"
        }
    ];

    const categories = ['All', 'Finance', 'Workforce', 'Clinical', 'Inventory'];

    const filteredActivities = selectedCategory === 'All'
        ? activities
        : activities.filter(a => a.category === selectedCategory);

    return (
        <div className="space-y-3 pt-2">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Business Activity & Notification Center
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                            Real-time audit log of counter shifts, clinical authorizations, leave applications, and settlements.
                        </p>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto self-start sm:self-auto py-1">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                selectedCategory === cat
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                                    : "bg-white/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-zinc-700"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notification & Activity Feed Card */}
            <div className="rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] divide-y divide-slate-200/60 dark:divide-zinc-800 overflow-hidden">
                {filteredActivities.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div 
                            key={item.id}
                            className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/40 dark:hover:bg-zinc-800/40 transition-colors group"
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", item.iconBg)}>
                                    <Icon className={cn("w-4 h-4", item.iconColor)} />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            {item.title}
                                        </h4>
                                        <span className={cn("px-2 py-0.2 rounded-full text-[10px] font-extrabold border uppercase tracking-wider", item.badgeStyle)}>
                                            {item.category}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                                            · {item.time}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-zinc-300">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(item.route)}
                                className="self-end sm:self-center px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200/90 dark:border-zinc-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 group/btn cursor-pointer"
                            >
                                <span>{item.actionLabel}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
