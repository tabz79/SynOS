import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Universal Sub-Tab Navigation Bar for Finance Screens.
 * Features:
 * - Frosted soft pill track with inner shadow (matching user-approved Referral Partners style)
 * - Subtle vertical hairline separators between inactive tabs
 * - Generous breathing room (px-4 sm:px-5 py-2) filling horizontal space gracefully
 * - High-contrast legible text (dark neutral font-medium)
 * - Elevated crisp active pill with SynOS primary accent icon
 * - Screen-aware horizontal scrolling with smooth centering on active tab change
 */
export const FinanceSubTabBar = ({
    tabs = [],
    activeTab = '',
    onTabChange = () => {},
    className = ''
}) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            const activeEl = containerRef.current.querySelector('[data-active-tab="true"]');
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeTab]);

    if (!tabs || tabs.length === 0) return null;

    return (
        <div 
            ref={containerRef}
            className={cn(
                "w-full px-5 sm:px-8 pt-2.5 pb-2 flex items-center overflow-x-auto no-scrollbar shrink-0 border-b border-slate-200/70 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md select-none",
                className
            )}
        >
            <div className="flex items-center bg-[#D6E3EF]/90 dark:bg-zinc-900/90 p-1 sm:p-1.5 rounded-2xl shadow-[inset_0_1px_2px_rgba(15,35,60,0.12)] border border-white/80 dark:border-zinc-800/80 min-w-max gap-0.5 sm:gap-1">
                {tabs.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    const prevIsActive = idx > 0 && activeTab === tabs[idx - 1]?.id;
                    const Icon = tab.icon;
                    const badge = tab.badge !== undefined ? tab.badge : tab.count;

                    return (
                        <React.Fragment key={tab.id}>
                            {/* Subtle vertical hairline separator between adjacent inactive tabs */}
                            {idx > 0 && !isActive && !prevIsActive && (
                                <div className="w-[1px] h-3.5 bg-slate-400/40 dark:bg-zinc-700/60 my-auto shrink-0 transition-opacity" />
                            )}

                            <button
                                type="button"
                                data-active-tab={isActive ? "true" : "false"}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "group relative flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer whitespace-nowrap outline-none",
                                    isActive
                                        ? "bg-white dark:bg-zinc-950 text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(15,35,60,0.12),inset_0_1px_0_#FFFFFF] font-bold border border-white/90 dark:border-zinc-800"
                                        : "text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white font-medium hover:bg-white/40 dark:hover:bg-zinc-800/40"
                                )}
                            >
                                {Icon && (
                                    <Icon
                                        size={15}
                                        className={cn(
                                            "shrink-0 transition-colors",
                                            isActive
                                                ? "text-synos-primary"
                                                : "text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-zinc-200"
                                        )}
                                    />
                                )}
                                <span>{tab.label}</span>

                                {/* Contextual Badge (e.g. Rate Queue 419) */}
                                {badge !== undefined && badge !== null && (
                                    <span
                                        className={cn(
                                            "text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold leading-none shrink-0 transition-colors",
                                            isActive
                                                ? "bg-synos-primary/10 text-synos-primary dark:bg-synos-primary/20 dark:text-blue-300"
                                                : "bg-slate-300/70 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 group-hover:bg-slate-300"
                                        )}
                                    >
                                        {badge}
                                    </span>
                                )}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default FinanceSubTabBar;
