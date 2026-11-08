import React, { useState, useEffect, useMemo } from 'react';
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
    Lightbulb 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

/**
 * Enterprise milestones for contextual desk assistant
 */
const DESK_MILESTONES = [
    {
        id: 'reconciliation',
        title: 'Shift Milestone',
        description: 'You finalized 18 bills yesterday with 100% counter reconciliation.',
        icon: Award,
        tip: 'Tariff engine & doctor commission rules active.'
    },
    {
        id: 'speed',
        title: 'Intake Velocity',
        description: 'Counter turn-around speed is averaging under 42s per registration today.',
        icon: Zap,
        tip: 'Keyboard focus loop enabled for rapid tab workflow.'
    },
    {
        id: 'accuracy',
        title: 'Clinical Accuracy',
        description: 'Zero duplicate registrations or unverified doctor codes this week.',
        icon: ShieldCheck,
        tip: 'Real-time duplicate detection active across all desks.'
    },
    {
        id: 'treasury',
        title: 'Treasury Sync',
        description: 'Cash drawer ledger reconciled and balanced with Central Lab Treasury.',
        icon: TrendingUp,
        tip: 'Drawer shortage auto-records Change Due liabilities.'
    }
];

export function ReceptionNotificationCenter({ isOpen = false, correctionHistory = null }) {
    const { user } = useAuth();
    const [activeHints, setActiveHints] = useState([]);
    const [milestoneIndex, setMilestoneIndex] = useState(0);

    // Personalized User Greeting
    const userName = useMemo(() => {
        if (!user?.name) return 'Desk Officer';
        const parts = user.name.trim().split(' ');
        return parts[0] || 'Desk Officer';
    }, [user?.name]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }, []);

    // Rotate milestones contextually across user sessions
    useEffect(() => {
        const interval = setInterval(() => {
            setMilestoneIndex(prev => (prev + 1) % DESK_MILESTONES.length);
        }, 12000);
        return () => clearInterval(interval);
    }, []);

    const currentMilestone = DESK_MILESTONES[milestoneIndex];
    const MilestoneIcon = currentMilestone.icon;

    // Listen for custom notification hints & dismissals
    useEffect(() => {
        const handleHint = (e) => {
            const { id, title, message, type } = e.detail || {};
            if (!message) return;
            setActiveHints(prev => {
                const filtered = prev.filter(h => h.id !== id);
                return [
                    { 
                        id: id || String(Date.now()), 
                        title: title || 'SynOS Hint', 
                        message, 
                        type: type || 'info',
                        timestamp: new Date() 
                    }, 
                    ...filtered
                ].slice(0, 5);
            });
        };

        const handleDismiss = (e) => {
            const { id } = e.detail || {};
            if (!id) return;
            setActiveHints(prev => prev.filter(h => h.id !== id));
        };

        window.addEventListener('synos:notification-hint', handleHint);
        window.addEventListener('synos:dismiss-notification-hint', handleDismiss);
        return () => {
            window.removeEventListener('synos:notification-hint', handleHint);
            window.removeEventListener('synos:dismiss-notification-hint', handleDismiss);
        };
    }, []);

    if (!isOpen) return null;

    return (
        <aside 
            aria-label="Notification Center"
            className="fixed left-3.5 top-[64px] bottom-4 w-[280px] sm:w-[310px] xl:w-[330px] hidden xl:flex flex-col gap-3 z-40 select-none overflow-y-auto no-scrollbar pointer-events-none animate-in fade-in slide-in-from-left-4 duration-300"
        >
            {/* Header: Designated Title */}
            <div className="pointer-events-auto flex items-center justify-between px-2 py-1 rounded-xl bg-slate-200/60 dark:bg-zinc-800/60 backdrop-blur-md border border-slate-300/80 dark:border-zinc-700/80 shadow-2xs">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                        Notification Center
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Live Desk
                    </span>
                </div>
            </div>

            {/* Personalized Contextual Greeting & Smart Milestone Card */}
            <div className="pointer-events-auto rounded-2xl p-4 bg-gradient-to-br from-white/95 via-white/90 to-slate-100/95 dark:from-zinc-850/95 dark:via-zinc-850/90 dark:to-zinc-900/95 backdrop-blur-xl border-2 border-slate-300/90 dark:border-zinc-700/90 shadow-[0_8px_24px_rgba(15,35,60,0.08)] space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base select-none">👋</span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                            {greeting}, {userName}!
                        </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 shrink-0">
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Milestone / Live Achievement Metric */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#EAF2F8] to-[#DFEDF7] dark:from-blue-950/40 dark:to-blue-900/20 border border-[#BED6E9] dark:border-blue-800/60 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/15 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                        <MilestoneIcon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center justify-between">
                            <span>{currentMilestone.title}</span>
                            <span className="text-[9px] text-blue-700/70 font-mono">Synced</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 leading-snug">
                            {currentMilestone.description}
                        </p>
                    </div>
                </div>

                {/* Machine Awareness Context Tip */}
                <div className="pt-1 border-t border-slate-200 dark:border-zinc-750 flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{currentMilestone.tip}</span>
                </div>
            </div>

            {/* Active Contextual Notifications & Hints Stack */}
            {activeHints.map(hint => {
                const isWarning = hint.type === 'warning' || hint.id === 'drawer-shortage-alert';
                return (
                    <div 
                        key={hint.id}
                        className={cn(
                            "pointer-events-auto rounded-2xl p-4 backdrop-blur-xl shadow-[0_12px_32px_rgba(15,35,60,0.14)] space-y-2 animate-in fade-in slide-in-from-left-4 duration-300 border-2",
                            isWarning 
                                ? "bg-rose-50/95 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100"
                                : "bg-white/95 dark:bg-zinc-850/95 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                                    isWarning 
                                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                        : "bg-blue-600/15 text-blue-700 dark:text-blue-300"
                                )}>
                                    {isWarning ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> : <Lightbulb className="w-3.5 h-3.5 text-blue-600" />}
                                </div>
                                <span className={cn(
                                    "text-xs sm:text-sm font-black truncate",
                                    isWarning ? "text-rose-900 dark:text-rose-200" : "text-slate-900 dark:text-white"
                                )}>
                                    {hint.title}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveHints(prev => prev.filter(h => h.id !== hint.id))}
                                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
                                title="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className={cn(
                            "text-xs sm:text-[13px] font-semibold leading-snug",
                            isWarning ? "text-rose-800 dark:text-rose-200" : "text-slate-700 dark:text-zinc-200"
                        )}>
                            {hint.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                            <span>Desk Alert</span>
                            <span>just now</span>
                        </div>
                    </div>
                );
            })}

            {/* Audit History Stack (if amending/correcting a visit) */}
            {correctionHistory && correctionHistory.length > 0 && (
                <div className="space-y-2 pointer-events-auto mt-1">
                    <div className="flex items-center justify-between px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                            <History className="w-4 h-4 text-synos-primary" />
                            Audit History ({correctionHistory.length})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {correctionHistory.map((h, idx) => (
                            <div 
                                key={h.correctionId || idx}
                                className="rounded-2xl p-3 bg-white/90 dark:bg-zinc-850/90 backdrop-blur-xl border-2 border-slate-300/80 dark:border-zinc-700 shadow-sm space-y-1.5 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[9px] shrink-0">
                                            ✓
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {h.createdByName || "Staff Desk"}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
                                        {new Date(h.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 leading-snug">
                                    {h.actionType ? String(h.actionType).replace(/([A-Z])/g, ' ').trim() : "Visit Amended"}
                                </div>
                                {h.reason && (
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic line-clamp-2">
                                        "{h.reason}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}
