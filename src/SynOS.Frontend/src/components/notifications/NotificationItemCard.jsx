import React from 'react';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NotificationItemCard({ notif, onDismiss, onAction }) {
    if (!notif) return null;

    // Distinctive subtle iOS left vertical accent bar
    const getAccentColor = () => {
        const titleLower = (notif.title || '').toLowerCase();
        if (notif.type === 'milestone' || notif.category === 'billing' || titleLower.includes('₹') || titleLower.includes('cash in counter')) {
            return 'bg-emerald-500';
        }
        if (notif.type === 'feature' || titleLower.includes('options') || titleLower.includes('revamped')) {
            return 'bg-purple-500';
        }
        if (notif.type === 'alert' || notif.priority === 'high' || titleLower.includes('start shift') || notif.id === 'drawer-shortage-alert') {
            return 'bg-rose-500';
        }
        if (titleLower.includes('end shift')) {
            return 'bg-blue-500';
        }
        return 'bg-blue-500';
    };

    // Format timestamp nicely (e.g. "10:56 AM" or "Now")
    const formattedTime = (() => {
        if (!notif.timestamp) return 'Now';
        if (typeof notif.timestamp === 'string' && (notif.timestamp === 'Now' || notif.timestamp.includes('AM') || notif.timestamp.includes('PM'))) {
            return notif.timestamp;
        }
        try {
            const date = new Date(notif.timestamp);
            if (isNaN(date.getTime())) return 'Now';
            const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
            if (diffMin < 2) return 'Now';
            return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch (_) {
            return 'Now';
        }
    })();

    const accentColor = getAccentColor();

    return (
        <div
            onClick={() => {
                if (onAction) onAction(notif);
            }}
            className={cn(
                "group relative flex items-start gap-3 p-3.5 rounded-2xl transition-all duration-200 cursor-pointer select-none",
                "bg-white/95 dark:bg-zinc-850/95 border border-slate-200/90 dark:border-zinc-700/70",
                "shadow-[0_2px_12px_rgba(15,35,60,0.06)] hover:shadow-[0_4px_16px_rgba(15,35,60,0.1)] hover:border-slate-300 dark:hover:border-zinc-600",
                "backdrop-blur-md"
            )}
        >
            {/* Left Vertical Accent Line (Apple iOS Style) */}
            <div className={cn("w-1 sm:w-1.5 self-stretch rounded-full shrink-0 my-0.5", accentColor)} />

            {/* Content Area */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 truncate tracking-tight">
                        {notif.title}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-400">
                            {formattedTime}
                        </span>
                        {notif.dismissible !== false && onDismiss && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDismiss(notif.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white transition-opacity"
                                title="Dismiss notification"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-snug line-clamp-2">
                    {notif.message}
                </p>
            </div>

            {/* Right Chevron for action hint */}
            {notif.action && (
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200 shrink-0 self-center transition-colors ml-0.5" />
            )}
        </div>
    );
}
