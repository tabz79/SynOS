import React, { useRef } from 'react';
import { 
    X, 
    SlidersHorizontal, 
    ArrowDownLeft, 
    Receipt, 
    Users, 
    Package, 
    Shield, 
    Clock, 
    CalendarCheck, 
    Inbox, 
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { usePanelEntry } from '@/hooks/useSynOSMotion';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export function ReceptionOptionsPanel({
    isOpen,
    onClose,
    onOpenB2BReceivables,
    onOpenExpenseDrawer,
    onOpenPatientDirectory,
    onOpenStockRequest,
    onOpenMyHr,
    onOpenAttendance,
    onOpenLeave,
    onOpenRequests,
    pendingB2BCount = 0
}) {
    const { isDark } = useTheme();
    const panelRef = useRef(null);

    // Synchronize motion & Iron Dome focus trap
    usePanelEntry(panelRef, isOpen);
    useFocusTrap(panelRef, isOpen, onClose);

    if (!isOpen) return null;

    // Atmospheric palette matching IntentPanel facelift design
    const ui = isDark ? {
        panel: "bg-zinc-950 border border-zinc-800 shadow-2xl z-30",
        header: "bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800",
        footer: "bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800",
        title: "text-white",
        subtitle: "text-zinc-400",
        sectionHeader: "text-zinc-400 font-bold",
        card: "bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 shadow-xs",
        cardTitle: "text-zinc-100",
        cardDesc: "text-zinc-400"
    } : {
        panel: cn(
            "bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)]",
            "border-l border-white/80 shadow-[-20px_0_60px_rgba(15,35,60,0.18)]",
            "z-30"
        ),
        header: "bg-transparent border-b border-slate-200/60 backdrop-blur-md",
        footer: "bg-white/60 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-4px_20px_-10px_rgba(15,35,60,0.05)]",
        title: "text-slate-900",
        subtitle: "text-slate-500",
        sectionHeader: "text-slate-600 font-bold",
        card: "bg-white/80 hover:bg-white border-white/90 hover:border-slate-300/80 shadow-xs",
        cardTitle: "text-slate-900",
        cardDesc: "text-slate-500"
    };

    const deskActions = [
        {
            id: 'b2b-receivables',
            title: 'Record B2B Receivables',
            desc: 'Settle and record same-day corporate & referral partner inflow',
            icon: ArrowDownLeft,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
            badge: pendingB2BCount > 0 ? `${pendingB2BCount} Pending` : null,
            badgeClass: 'bg-emerald-600 text-white',
            onClick: onOpenB2BReceivables
        },
        {
            id: 'record-expense',
            title: 'Record Daily Expense',
            desc: 'Log counter cash disbursements and branch petty-cash outflows',
            icon: Receipt,
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
            onClick: onOpenExpenseDrawer
        },
        {
            id: 'patient-directory',
            title: 'Patient Directory',
            desc: 'Search master records, lookup MRNs, and view past clinical history',
            icon: Users,
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
            onClick: onOpenPatientDirectory
        },
        {
            id: 'stock-request',
            title: 'Request Stock & Consumables',
            desc: 'Requisition test vacutainers, reagents, sample swabs, and kits',
            icon: Package,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
            onClick: onOpenStockRequest
        }
    ];

    const workforceActions = [
        {
            id: 'my-hr',
            title: 'My HR Dashboard',
            desc: 'View personal staff file, department profile, and role authorizations',
            icon: Shield,
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
            onClick: onOpenMyHr
        },
        {
            id: 'my-attendance',
            title: 'My Attendance',
            desc: 'Review biometric shift check-ins, monthly punches, and duty logs',
            icon: Clock,
            iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
            onClick: onOpenAttendance
        },
        {
            id: 'apply-leave',
            title: 'Apply Leave',
            desc: 'Submit casual, sick, or planned vacation leave requests',
            icon: CalendarCheck,
            iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
            onClick: onOpenLeave
        },
        {
            id: 'my-requests',
            title: 'My HR Requests',
            desc: 'Track status of loan advances, certificate requests, and tickets',
            icon: Inbox,
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
            onClick: onOpenRequests
        }
    ];

    return (
        <div
            ref={panelRef}
            className={cn(
                "absolute right-0 top-0 bottom-0 flex flex-col h-full overflow-hidden rounded-[24px]",
                "w-[96vw] sm:w-[92vw] md:w-[440px] lg:w-[460px] xl:w-[480px] max-w-[520px]",
                "transition-[width,transform,opacity] duration-300 ease-out shadow-2xl",
                ui.panel
            )}
        >
            {/* Header */}
            <div className={cn("h-13 sm:h-14 flex items-center justify-between px-5 sm:px-6 shrink-0 border-b", ui.header)}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-synos-primary/10 text-synos-primary flex items-center justify-center border border-synos-primary/20 shrink-0">
                        <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className={cn("text-sm sm:text-base font-bold tracking-normal flex items-center gap-2", ui.title)}>
                            Desk Options & Actions
                            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-zinc-700/60">
                                #OPTIONS
                            </span>
                        </h2>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Close Options (Esc)"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
                {/* Section 1: Front Desk Quick Operations */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                        <span className={cn("text-[11px] uppercase tracking-wider", ui.sectionHeader)}>
                            Desk Operations
                        </span>
                        <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 font-mono">
                            4 Workflows
                        </span>
                    </div>

                    <div className="space-y-2">
                        {deskActions.map(action => {
                            const IconComponent = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    type="button"
                                    onClick={action.onClick}
                                    className={cn(
                                        "w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 group cursor-pointer active:scale-[0.99]",
                                        ui.card
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", action.iconBg)}>
                                        <IconComponent className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs sm:text-sm font-bold truncate", ui.cardTitle)}>
                                                {action.title}
                                            </span>
                                            {action.badge && (
                                                <span className={cn("px-1.5 py-0.2 rounded-full text-[9.5px] font-bold font-mono", action.badgeClass)}>
                                                    {action.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className={cn("text-[11px] line-clamp-1 mt-0.5", ui.cardDesc)}>
                                            {action.desc}
                                        </p>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: Staff & Personal Workforce Portal */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                        <span className={cn("text-[11px] uppercase tracking-wider", ui.sectionHeader)}>
                            Staff & HR Portal
                        </span>
                        <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 font-mono">
                            Personal Desk
                        </span>
                    </div>

                    <div className="space-y-2">
                        {workforceActions.map(action => {
                            const IconComponent = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    type="button"
                                    onClick={action.onClick}
                                    className={cn(
                                        "w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 group cursor-pointer active:scale-[0.99]",
                                        ui.card
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", action.iconBg)}>
                                        <IconComponent className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <span className={cn("text-xs sm:text-sm font-bold truncate block", ui.cardTitle)}>
                                            {action.title}
                                        </span>
                                        <p className={cn("text-[11px] line-clamp-1 mt-0.5", ui.cardDesc)}>
                                            {action.desc}
                                        </p>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={cn("px-5 py-3 border-t flex items-center justify-between shrink-0", ui.footer)}>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-medium">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-[10px] font-mono font-bold">Esc</kbd> to close
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
