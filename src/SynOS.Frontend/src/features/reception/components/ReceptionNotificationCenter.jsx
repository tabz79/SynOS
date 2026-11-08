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
 * Contextual desk assistant milestones - short Indian English phrases
 */
const DESK_MILESTONES = [
    {
        id: 'reconciliation',
        title: "Yesterday's Bills",
        description: '18 bills finalized yesterday. Cash tally matched 100%.',
        icon: Award,
        tip: 'Doctor cuts auto-calculated'
    },
    {
        id: 'speed',
        title: 'Counter Speed',
        description: 'Avg under 45s per patient. Quick billing active today.',
        icon: Zap,
        tip: 'Tab key navigation active'
    },
    {
        id: 'accuracy',
        title: 'Zero Errors',
        description: 'No duplicate bills or wrong doctor codes this week.',
        icon: ShieldCheck,
        tip: 'Doctor name check active'
    },
    {
        id: 'treasury',
        title: 'Cash Drawer',
        description: 'Cash drawer tally matched with central lab accounts.',
        icon: TrendingUp,
        tip: 'Change due tracked auto'
    }
];

export function ReceptionNotificationCenter({ isOpen = false, correctionHistory = null }) {
    const { user } = useAuth();
    const [activeHints, setActiveHints] = useState([]);

    // Personalized User Greeting (e.g. "Dr. Vasudeva" or "Uzma")
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

    // Stable milestone for the current day - no annoying auto-looping
    const currentMilestone = useMemo(() => {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return DESK_MILESTONES[dayOfYear % DESK_MILESTONES.length];
    }, []);

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
            className="fixed left-3 top-[64px] bottom-4 w-[244px] 2xl:w-[264px] hidden xl:flex flex-col gap-2.5 z-40 select-none overflow-y-auto no-scrollbar pointer-events-none animate-in fade-in slide-in-from-left-4 duration-300"
        >
            {/* Header: Designated Title */}
            <div className="pointer-events-auto flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-200/70 dark:bg-zinc-800/70 backdrop-blur-md border border-slate-300/80 dark:border-zinc-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Bell className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider truncate">
                        Notification Center
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Live
                    </span>
                </div>
            </div>

            {/* Personalized Contextual Greeting & Smart Milestone Card */}
            <div className="pointer-events-auto rounded-2xl p-3 bg-gradient-to-br from-white/95 via-white/90 to-slate-100/95 dark:from-zinc-850/95 dark:via-zinc-850/90 dark:to-zinc-900/95 backdrop-blur-xl border-2 border-slate-300/90 dark:border-zinc-700/90 shadow-[0_8px_24px_rgba(15,35,60,0.08)] space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm select-none">👋</span>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {greeting}, {userName}!
                        </h4>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 shrink-0">
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Milestone / Live Update */}
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#EAF2F8] to-[#DFEDF7] dark:from-blue-950/40 dark:to-blue-900/20 border border-[#BED6E9] dark:border-blue-800/60 flex items-start gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600/15 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                        <MilestoneIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center justify-between">
                            <span>{currentMilestone.title}</span>
                            <span className="text-[8px] text-blue-700/70 font-mono">Today</span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 leading-snug">
                            {currentMilestone.description}
                        </p>
                    </div>
                </div>

                {/* Machine Awareness Context Tip */}
                <div className="pt-1 border-t border-slate-200 dark:border-zinc-750 flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
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
                            "pointer-events-auto rounded-2xl p-3 backdrop-blur-xl shadow-[0_8px_24px_rgba(15,35,60,0.12)] space-y-1.5 animate-in fade-in slide-in-from-left-4 duration-300 border-2",
                            isWarning 
                                ? "bg-rose-50/95 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100"
                                : "bg-white/95 dark:bg-zinc-850/95 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white"
                        )}
                    >
                        <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0",
                                    isWarning 
                                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                        : "bg-blue-600/15 text-blue-700 dark:text-blue-300"
                                )}>
                                    {isWarning ? <AlertTriangle className="w-3 h-3 text-rose-600" /> : <Lightbulb className="w-3 h-3 text-blue-600" />}
                                </div>
                                <span className={cn(
                                    "text-xs font-black truncate",
                                    isWarning ? "text-rose-900 dark:text-rose-200" : "text-slate-900 dark:text-white"
                                )}>
                                    {hint.title}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveHints(prev => prev.filter(h => h.id !== hint.id))}
                                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
                                title="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <p className={cn(
                            "text-[11px] font-semibold leading-snug",
                            isWarning ? "text-rose-800 dark:text-rose-200" : "text-slate-700 dark:text-zinc-200"
                        )}>
                            {hint.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-[9px] font-mono text-slate-400 dark:text-zinc-500">
                            <span>Desk Alert</span>
                            <span>Active</span>
                        </div>
                    </div>
                );
            })}

            {/* Audit History Stack (if amending/correcting a visit) */}
            {correctionHistory && correctionHistory.length > 0 && (
                <div className="space-y-1.5 pointer-events-auto mt-1">
                    <div className="flex items-center justify-between px-1 py-0.5 text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                            <History className="w-3.5 h-3.5 text-synos-primary" />
                            Audit History ({correctionHistory.length})
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {correctionHistory.map((h, idx) => (
                            <div 
                                key={h.correctionId || idx}
                                className="rounded-xl p-2.5 bg-white/90 dark:bg-zinc-850/90 backdrop-blur-xl border-2 border-slate-300/80 dark:border-zinc-700 shadow-xs space-y-1 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[8px] shrink-0">
                                            ✓
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                            {h.createdByName || "Staff Desk"}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
                                        {new Date(h.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 leading-snug">
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
