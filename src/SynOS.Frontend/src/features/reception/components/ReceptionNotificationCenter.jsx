import React, { useState } from 'react';
import { 
    Bell, 
    BellOff,
    ChevronDown, 
    History, 
    X,
    CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationItemCard } from '@/components/notifications/NotificationItemCard';

export function ReceptionNotificationCenter({ 
    isOpen = false, 
    correctionHistory = null, 
    onClose = null 
}) {
    const { 
        notifications, 
        dismiss, 
        markAllAsRead, 
        executeAction,
        isCenterOpen,
        closeCenter,
        toastsEnabled,
        toggleToastsEnabled
    } = useNotifications();

    const [isAuditExpanded, setIsAuditExpanded] = useState(false);

    const activeBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('synos_oversight_branch_id') : null;
    const branchNotifications = notifications.filter(n => !n.branchId || !activeBranchId || String(n.branchId).toLowerCase() === String(activeBranchId).toLowerCase());

    // Effective visibility: explicitly passed or globally toggled via toolbar button
    const shouldShow = isOpen || isCenterOpen;
    if (!shouldShow) return null;

    return (
        <aside 
            aria-label="Notification Center"
            className="fixed left-3 top-[64px] bottom-4 w-[290px] 2xl:w-[310px] hidden xl:flex flex-col gap-2.5 z-40 select-none overflow-y-auto no-scrollbar pointer-events-none animate-in fade-in slide-in-from-left-4 duration-300"
        >
            {/* Top Bar Pill: Notifications Counter + Live Indicator */}
            <div className="pointer-events-auto flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-slate-200/90 dark:border-zinc-700/80 shadow-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Notifications
                    </span>
                    {branchNotifications.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                            {branchNotifications.length}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Live
                        </span>
                    </div>

                    {(onClose || (isCenterOpen && !isOpen)) && (
                        <button
                            type="button"
                            onClick={() => {
                                if (onClose) onClose();
                                else closeCenter();
                            }}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ml-1"
                            title="Close"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Apple iOS-Style Card Flyout Container */}
            <div className="pointer-events-auto rounded-3xl p-3.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800 shadow-[0_12px_40px_rgba(15,35,60,0.08)] space-y-3">
                {/* Header with Title, Popups Toggle, and "Mark all as read" */}
                <div className="flex items-center justify-between px-1 gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight shrink-0">
                        Notifications
                    </h3>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={toggleToastsEnabled}
                            className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer border",
                                toastsEnabled 
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100" 
                                    : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-200"
                            )}
                            title={toastsEnabled ? "Desktop toast popups are ON (click to mute)" : "Desktop toast popups are OFF (click to enable)"}
                        >
                            {toastsEnabled ? <Bell className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> : <BellOff className="w-2.5 h-2.5 text-slate-400" />}
                            <span>{toastsEnabled ? "Popups On" : "Popups Off"}</span>
                        </button>

                        {notifications.length > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors cursor-pointer hover:underline whitespace-nowrap"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications Stack (Strict Calm Apple iOS cards) */}
                <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto no-scrollbar pr-0.5">
                    {branchNotifications.map(notif => (
                        <NotificationItemCard
                            key={notif.id}
                            notif={notif}
                            onDismiss={dismiss}
                            onAction={(n) => {
                                executeAction(n);
                                dismiss(n.id);
                            }}
                        />
                    ))}

                    {/* Collapsed Audit History Card (ss-2 fix in Apple iOS Style) */}
                    {correctionHistory && correctionHistory.length > 0 && (
                        <div className="rounded-2xl p-3 bg-white/95 dark:bg-zinc-850/95 border border-slate-200/90 dark:border-zinc-700/70 shadow-[0_2px_12px_rgba(15,35,60,0.06)] space-y-2 transition-all">
                            <div 
                                onClick={() => setIsAuditExpanded(prev => !prev)}
                                className="flex items-center justify-between cursor-pointer group select-none"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-1 sm:w-1.5 h-6 rounded-full bg-slate-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 truncate tracking-tight">
                                                Audit History ({correctionHistory.length})
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-zinc-400 block truncate">
                                            Latest: {correctionHistory[0]?.createdByName || "Desk"}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-1 rounded-md text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
                                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isAuditExpanded && "rotate-180")} />
                                </div>
                            </div>

                            {/* Collapsible Details */}
                            {isAuditExpanded && (
                                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5 animate-in fade-in duration-200">
                                    {correctionHistory.map((h, idx) => (
                                        <div 
                                            key={h.correctionId || idx}
                                            className="rounded-xl p-2 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 space-y-1 text-xs"
                                        >
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">
                                                    {h.createdByName || "Staff Desk"}
                                                </span>
                                                <span className="font-mono text-slate-400 shrink-0">
                                                    {new Date(h.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="font-medium text-slate-700 dark:text-zinc-300">
                                                {h.actionType ? String(h.actionType).replace(/([A-Z])/g, ' ').trim() : "Visit Amended"}
                                            </div>
                                            {h.reason && (
                                                <p className="text-[11px] text-amber-600 dark:text-amber-400 italic truncate">
                                                    "{h.reason}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer: View all notifications link */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-center">
                    <span 
                        onClick={() => {
                            // View all or focus notifications
                        }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                        View all notifications →
                    </span>
                </div>
            </div>
        </aside>
    );
}
