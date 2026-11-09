import React, { useState, useMemo } from 'react';
import { 
    Bell, 
    Sparkles, 
    Award, 
    Zap, 
    ShieldCheck, 
    TrendingUp, 
    AlertTriangle, 
    X, 
    History, 
    CheckCircle2, 
    Lightbulb,
    Trash2,
    ChevronDown,
    ChevronRight,
    Clock,
    Wallet,
    Receipt,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

export function ReceptionNotificationCenter({ 
    isOpen = false, 
    correctionHistory = null, 
    realitySummary = null,
    onClose = null 
}) {
    const { user } = useAuth();
    const { 
        notifications, 
        dismiss, 
        clearAll, 
        executeAction,
        isCenterOpen,
        closeCenter 
    } = useNotifications();

    const [isAuditExpanded, setIsAuditExpanded] = useState(false);

    // Personalized User Greeting (e.g. "Dr. Vasudeva" or "Tabrez")
    const userName = useMemo(() => {
        if (!user?.name) return 'Staff';
        const clean = user.name.trim();
        const match = clean.match(/^(Dr\.?|Doctor|Mr\.?|Mrs\.?|Ms\.?)\s+([A-Za-z]+)/i);
        if (match) {
            return `${match[1]} ${match[2]}`;
        }
        const parts = clean.split(/\s+/);
        return parts[0] || 'Staff';
    }, [user?.name]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }, []);

    // Dynamic Real Milestone derived from live Reality Summary / Local storage
    const dynamicMilestone = useMemo(() => {
        let summary = realitySummary;
        if (!summary) {
            try {
                const cached = localStorage.getItem('synos_cached_reality_summary');
                if (cached) summary = JSON.parse(cached);
            } catch (_) {}
        }

        const cashCollected = Number(summary?.paymentsCashTotal || 0);
        const drawerCash = Number(summary?.cashDrawerBalancePool ?? summary?.cashDrawerBalance ?? summary?.paymentsCashTotal ?? 0);
        const walkIns = Number(summary?.walkInsToday || 0);
        const onlineTotal = Number(summary?.paymentsOnlineTotal || 0);

        if (drawerCash > 0 || cashCollected > 0 || walkIns > 0) {
            return {
                title: `₹${drawerCash.toLocaleString('en-IN')} Cash in Counter`,
                description: `${walkIns > 0 ? `${walkIns} bills completed.` : 'Ready for billing.'} ₹${cashCollected.toLocaleString('en-IN')} cash collected today.`,
                tip: onlineTotal > 0 ? `+₹${onlineTotal.toLocaleString('en-IN')} received via UPI/Cards` : 'Cash tally matching 100%'
            };
        }

        return {
            title: "Live Shift Ready",
            description: "Opening shift active. Tariff & doctor commission rules ready.",
            tip: "Use Tab key for rapid check-in"
        };
    }, [realitySummary]);

    // Effective visibility: explicitly passed or globally toggled via toolbar button
    const shouldShow = isOpen || isCenterOpen;
    if (!shouldShow) return null;

    return (
        <aside 
            aria-label="Notification Center"
            className="fixed left-3 top-[64px] bottom-4 w-[244px] 2xl:w-[264px] hidden xl:flex flex-col gap-2.5 z-40 select-none overflow-y-auto no-scrollbar pointer-events-none animate-in fade-in slide-in-from-left-4 duration-300"
        >
            {/* Header: Designated Title + Live Pulse + Clear All Button */}
            <div className="pointer-events-auto flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-zinc-900/95 text-white backdrop-blur-md border border-slate-700/80 dark:border-zinc-700/80 shadow-md">
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/30">
                        <Bell className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-black text-slate-100 uppercase tracking-wider truncate">
                        Notification Center
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {notifications.length > 0 && (
                        <button
                            type="button"
                            onClick={clearAll}
                            className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                            title="Clear all dismissible notifications"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {(onClose || (isCenterOpen && !isOpen)) && (
                        <button
                            type="button"
                            onClick={() => {
                                if (onClose) onClose();
                                else closeCenter();
                            }}
                            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Live
                    </span>
                </div>
            </div>

            {/* Scrollable Container with its own internal scroll */}
            <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto no-scrollbar pointer-events-auto pr-0.5">
                {/* Personalized Contextual Greeting & Dynamic Real Milestone Card */}
                <div className="rounded-2xl p-3 bg-slate-900/95 dark:bg-zinc-900/95 text-white backdrop-blur-xl border border-slate-700/80 dark:border-zinc-700/80 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm select-none">👋</span>
                            <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                {greeting}, {userName}!
                            </h4>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-400 shrink-0">
                            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Dynamic Live Real Shift Update */}
                    <div className="p-2.5 rounded-xl bg-slate-800/90 dark:bg-zinc-800/90 border border-slate-700 dark:border-zinc-700 flex items-start gap-2 shadow-inner">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                            <Wallet className="w-3.5 h-3.5" />
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                                <span className="truncate">{dynamicMilestone.title}</span>
                                <span className="text-[8px] text-slate-400 font-mono">Today</span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-200 dark:text-zinc-200 leading-snug">
                                {dynamicMilestone.description}
                            </p>
                        </div>
                    </div>

                    {/* Context Tip */}
                    <div className="pt-1 border-t border-slate-800 dark:border-zinc-800 flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-zinc-400">
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{dynamicMilestone.tip}</span>
                    </div>
                </div>

                {/* Collapsed Audit History Card (ss-2 fix: collapses multi-amendments into 1 expandable card) */}
                {correctionHistory && correctionHistory.length > 0 && (
                    <div className="rounded-2xl p-3 bg-slate-900/95 dark:bg-zinc-900/95 text-white backdrop-blur-xl border border-slate-700/80 dark:border-zinc-700/80 shadow-xl space-y-2 transition-all">
                        <div 
                            onClick={() => setIsAuditExpanded(prev => !prev)}
                            className="flex items-center justify-between cursor-pointer group select-none"
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/30">
                                    <History className="w-3 h-3" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-black text-white block truncate">
                                        Audit History ({correctionHistory.length})
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                        Latest by {correctionHistory[0]?.createdByName || "Desk"}
                                    </span>
                                </div>
                            </div>
                            <div className="p-1 rounded-md text-slate-400 group-hover:text-white transition-colors">
                                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isAuditExpanded && "rotate-180")} />
                            </div>
                        </div>

                        {/* Collapsible details */}
                        {isAuditExpanded && (
                            <div className="pt-2 border-t border-slate-800 dark:border-zinc-800 space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5 animate-in fade-in duration-200">
                                {correctionHistory.map((h, idx) => (
                                    <div 
                                        key={h.correctionId || idx}
                                        className="rounded-xl p-2 bg-slate-800/80 dark:bg-zinc-800/80 border border-slate-700/60 dark:border-zinc-700/60 space-y-1"
                                    >
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-bold text-slate-200 truncate">
                                                {h.createdByName || "Staff Desk"}
                                            </span>
                                            <span className="font-mono text-slate-400 shrink-0">
                                                {new Date(h.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-[11px] font-semibold text-slate-300 leading-tight">
                                            {h.actionType ? String(h.actionType).replace(/([A-Z])/g, ' ').trim() : "Visit Amended"}
                                        </div>
                                        {h.reason && (
                                            <p className="text-[10px] text-amber-300/90 italic truncate">
                                                "{h.reason}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Active Notifications & Reminders Stack */}
                {notifications.map(notif => {
                    const isAlert = notif.type === 'alert' || notif.priority === 'high' || notif.id === 'drawer-shortage-alert';
                    const isFeature = notif.type === 'feature';
                    const isReminder = notif.type === 'reminder';

                    return (
                        <div 
                            key={notif.id}
                            className={cn(
                                "rounded-2xl p-3 backdrop-blur-xl shadow-xl space-y-2 border transition-all animate-in fade-in slide-in-from-left-4 duration-300",
                                isAlert 
                                    ? "bg-rose-950/95 dark:bg-rose-950/95 border-rose-800 text-rose-50 shadow-rose-950/30"
                                    : "bg-slate-900/95 dark:bg-zinc-900/95 border-slate-700/80 dark:border-zinc-700/80 text-white"
                            )}
                        >
                            {/* Card Header: Icon + Title + Category Pill + Dismiss (X) */}
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={cn(
                                        "w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 border",
                                        isAlert 
                                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                            : isFeature
                                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                                : isReminder
                                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                                    : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                    )}>
                                        {isAlert && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                                        {isFeature && <Sparkles className="w-3 h-3 text-amber-400" />}
                                        {isReminder && <Clock className="w-3 h-3 text-emerald-400" />}
                                        {!isAlert && !isFeature && !isReminder && <Receipt className="w-3 h-3 text-cyan-400" />}
                                    </div>
                                    <span className="text-xs font-black truncate text-white">
                                        {notif.title}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <span className={cn(
                                        "text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded-full border",
                                        isAlert 
                                            ? "bg-rose-900/60 border-rose-700 text-rose-200" 
                                            : isFeature 
                                                ? "bg-amber-900/40 border-amber-700/60 text-amber-200"
                                                : isReminder 
                                                    ? "bg-emerald-900/40 border-emerald-700/60 text-emerald-200"
                                                    : "bg-slate-800 border-slate-700 text-slate-300"
                                    )}>
                                        {isAlert ? 'Alert' : isFeature ? 'New' : isReminder ? 'Shift' : 'Live'}
                                    </span>
                                    {notif.dismissible && (
                                        <button
                                            type="button"
                                            onClick={() => dismiss(notif.id)}
                                            className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
                                            title="Dismiss"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Message Body */}
                            <p className={cn(
                                "text-[11px] font-semibold leading-snug",
                                isAlert ? "text-rose-100/90" : "text-slate-300 dark:text-zinc-300"
                            )}>
                                {notif.message}
                            </p>

                            {/* Action Button (e.g. Open Options, Open Drawer, End Shift) */}
                            {notif.action && (
                                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            executeAction(notif);
                                            dismiss(notif.id);
                                        }}
                                        className={cn(
                                            "w-full py-1 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95",
                                            isAlert 
                                                ? "bg-rose-600 hover:bg-rose-500 text-white" 
                                                : "bg-blue-600 hover:bg-blue-500 text-white"
                                        )}
                                    >
                                        <span>{notif.action.label}</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
