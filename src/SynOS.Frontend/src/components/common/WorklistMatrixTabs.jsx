import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Standard 2-Group Matrix Worklist Tabs Component
 * 
 * Label: History (removed 7d)
 * Badge: Cute Mac-style badge for Available count (max 99+)
 * Layout: Ample space -> 1 row: [ Available (N) | Assigned ] | [ Live | History ]
 *         Tight space -> 2 rows: Row 1: [ Available (N) | Assigned ]
 *                                Row 2: [ Live | History ]
 */
export function WorklistMatrixTabs({
    activeAssignmentTab = 'available', // 'available' | 'assigned'
    onAssignmentTabChange,             // (tab: string) => void
    showHistory = false,               // boolean
    onTimeTabChange,                   // (showHistory: boolean) => void
    availableCount = 0,                // number of unclaimed items in pool
    theme = 'dark',
    className = ''
}) {
    const formattedCount = availableCount > 99 ? '99+' : availableCount;

    return (
        <div className={cn("flex flex-wrap items-center gap-1 dark:bg-zinc-900/50 bg-white rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm shrink-0 w-full max-w-full", className)}>
            {/* Group 1: Assignment State */}
            <div className="flex items-center gap-1 flex-1 min-w-[130px]">
                <button
                    type="button"
                    onClick={() => onAssignmentTabChange && onAssignmentTabChange('available')}
                    className={cn(
                        "flex-1 text-center text-[10px] uppercase font-bold px-2 py-1 rounded transition-all whitespace-nowrap flex items-center justify-center gap-1",
                        activeAssignmentTab === 'available'
                            ? "bg-zinc-800 text-white shadow-sm"
                            : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                    )}
                >
                    <span>Available</span>
                    {availableCount > 0 && (
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none inline-flex items-center justify-center transition-all",
                            activeAssignmentTab === 'available'
                                ? "bg-indigo-500 text-white shadow-xs"
                                : "bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30"
                        )}>
                            {formattedCount}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => onAssignmentTabChange && onAssignmentTabChange('assigned')}
                    className={cn(
                        "flex-1 text-center text-[10px] uppercase font-bold px-2 py-1 rounded transition-all whitespace-nowrap",
                        activeAssignmentTab === 'assigned'
                            ? "bg-zinc-800 text-white shadow-sm"
                            : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                    )}
                >
                    Assigned
                </button>
            </div>

            {/* Visual Divider (visible when space permits) */}
            <div className="hidden min-[280px]:block h-3 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-0.5 shrink-0" />

            {/* Group 2: Time Window State */}
            <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                <button
                    type="button"
                    onClick={() => onTimeTabChange && onTimeTabChange(false)}
                    className={cn(
                        "flex-1 text-center text-[10px] uppercase font-bold px-2 py-1 rounded transition-all whitespace-nowrap",
                        !showHistory
                            ? "bg-zinc-800 text-white shadow-sm"
                            : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                    )}
                >
                    Live
                </button>
                <button
                    type="button"
                    onClick={() => onTimeTabChange && onTimeTabChange(true)}
                    className={cn(
                        "flex-1 text-center text-[10px] uppercase font-bold px-2 py-1 rounded transition-all whitespace-nowrap",
                        showHistory
                            ? "bg-zinc-800 text-white shadow-sm"
                            : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                    )}
                >
                    History
                </button>
            </div>
        </div>
    );
}
