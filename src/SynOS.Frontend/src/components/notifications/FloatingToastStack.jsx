import React from 'react';
import { 
    X, 
    Sparkles, 
    Clock, 
    Coins, 
    AlertTriangle, 
    Receipt, 
    ChevronRight, 
    BellRing,
    Layers
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

export function FloatingToastStack() {
    const { toastNotifications, dismiss, executeAction, openCenter } = useNotifications();

    if (!toastNotifications || toastNotifications.length === 0) return null;

    return (
        <aside 
            aria-label="Floating Desk Notifications"
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-[320px] sm:w-[350px] pointer-events-none select-none"
        >
            {toastNotifications.map((notif, index) => {
                const isAlert = notif.type === 'alert' || notif.priority === 'high' || notif.id === 'drawer-shortage-alert';
                const isFeature = notif.type === 'feature';
                const isReminder = notif.type === 'reminder';

                return (
                    <div
                        key={notif.id}
                        className={cn(
                            "pointer-events-auto rounded-2xl p-3.5 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out border space-y-2 animate-in fade-in slide-in-from-right-4",
                            isAlert
                                ? "bg-rose-950/95 dark:bg-rose-950/95 border-rose-800 text-rose-50 shadow-rose-950/40"
                                : "bg-slate-900/95 dark:bg-zinc-900/95 border-slate-700/80 dark:border-zinc-700/80 text-white"
                        )}
                    >
                        {/* Header Row: Icon + Title + Category Pill + Dismiss (X) */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs",
                                    isAlert 
                                        ? "bg-rose-500/20 text-rose-300"
                                        : isFeature 
                                            ? "bg-amber-500/20 text-amber-300" 
                                            : isReminder 
                                                ? "bg-emerald-500/20 text-emerald-300"
                                                : "bg-blue-500/20 text-blue-300"
                                )}>
                                    {isAlert && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                                    {isFeature && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                                    {isReminder && <Clock className="w-3.5 h-3.5 text-emerald-400" />}
                                    {!isAlert && !isFeature && !isReminder && <Receipt className="w-3.5 h-3.5 text-cyan-400" />}
                                </div>
                                <span className="text-xs sm:text-[13px] font-black truncate tracking-tight text-white">
                                    {notif.title}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={cn(
                                    "text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded-full border",
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dismiss(notif.id);
                                        }}
                                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                                        title="Dismiss notification"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Body Message */}
                        <p className={cn(
                            "text-xs font-semibold leading-snug",
                            isAlert ? "text-rose-100/90" : "text-slate-300 dark:text-zinc-300"
                        )}>
                            {notif.message}
                        </p>

                        {/* Footer: Action Trigger Button + All Notifications Link */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px]">
                            {notif.action ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        executeAction(notif);
                                        dismiss(notif.id);
                                    }}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95",
                                        isAlert 
                                            ? "bg-rose-600 hover:bg-rose-500 text-white" 
                                            : "bg-blue-600 hover:bg-blue-500 text-white"
                                    )}
                                >
                                    <span>{notif.action.label}</span>
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            ) : (
                                <span className="font-mono text-slate-400 text-[9px]">Just now</span>
                            )}

                            {index === 0 && (
                                <button
                                    type="button"
                                    onClick={openCenter}
                                    className="text-slate-400 hover:text-blue-300 transition-colors font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <Layers className="w-3 h-3" />
                                    <span>All ({toastNotifications.length})</span>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </aside>
    );
}
