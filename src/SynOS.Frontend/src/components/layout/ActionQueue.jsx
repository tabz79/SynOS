import { useRef, useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

export function ActionQueueHeader({ title, count }) {
    return (
        <div className="flex items-center gap-3 mb-3 px-1">
            <h2 className="text-lg font-bold dark:text-zinc-200 text-zinc-800">{title}</h2>
        </div>
    );
}

export function ActionQueue({ columns, data, onAction }) {
    const { theme } = useTheme();
    // ROVING TAB INDEX STATE
    const [focusedIndex, setFocusedIndex] = useState(null);
    const rowRefs = useRef([]);

    // Update refs array when data changes
    useEffect(() => {
        rowRefs.current = rowRefs.current.slice(0, data.length);
    }, [data]);

    // Keyboard Handler
    const handleKeyDown = (e, index) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = Math.min(index + 1, data.length - 1);
            setFocusedIndex(nextIndex);
            rowRefs.current[nextIndex]?.focus();
            rowRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = Math.max(index - 1, 0);
            setFocusedIndex(prevIndex);
            rowRefs.current[prevIndex]?.focus();
            rowRefs.current[prevIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            // Trigger Primary Action (Find the button we marked earlier)
            const trigger = rowRefs.current[index]?.querySelector('.action-trigger');
            if (trigger) trigger.click();
        }
    };
    // MODE ISOLATION CONTRACT: High-fidelity Style Mapping
    const isDark = theme === 'dark';

    const ui = {
        container: isDark
            ? "bg-zinc-900 border-white/5 shadow-2xl"
            : "bg-white border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        headerRow: isDark
            ? "bg-zinc-800 border-b border-white/5"
            : "border-b border-black/[0.08]",
        headerText: isDark
            ? "text-[11px] font-semibold text-zinc-400 tracking-wider"
            : "text-[11px] font-bold text-zinc-800 tracking-widest",
        row: (isHistory, isFocused) => isDark
            ? cn(
                "transition-all duration-200 outline-none border border-transparent",
                "focus:bg-zinc-800 hover:bg-zinc-800",
                isHistory ? "bg-black/10 opacity-40 grayscale" : "bg-zinc-950/40"
            )
            : cn(
                "border border-black/[0.1] transition-all duration-200 outline-none",
                "focus:bg-blue-100/30 hover:bg-zinc-100/80",
                isHistory
                    ? "bg-zinc-100/30 opacity-60 grayscale"
                    : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
            )
    };

    return (
        <div
            className={cn(
                "flex-1 flex flex-col rounded-xl border overflow-hidden transition-all duration-300",
                ui.container
            )}
            style={{
                background: isDark ?
                    `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.005'/%3E%3C/svg%3E"), 
                 #18181b` :
                    `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.01'/%3E%3C/svg%3E"), 
                 linear-gradient(to bottom, rgba(252, 254, 255, 0.99) 0%, rgba(248, 252, 255, 0.99) 50%, rgba(245, 250, 255, 0.99) 100%)`
            }}
        >
            {/* Header Row */}
            <div
                className={cn("h-12 flex items-center px-4 shrink-0", ui.headerRow)}
                style={!isDark ? {
                    background: `linear-gradient(to bottom, rgba(248, 253, 255, 0.98) 0%, rgba(238, 245, 248, 0.98) 50%, rgba(228, 235, 238, 0.98) 100%)`
                } : {}}
            >
                <div className="grid flex-1 grid-cols-[1fr_2fr_1fr_1fr_minmax(100px,auto)] gap-4">
                    {columns.map((col, idx) => (
                        <div key={idx} className={cn("uppercase", ui.headerText, col.className)}>
                            {col.header}
                        </div>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div className="overflow-auto flex-1 p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800/50 hover:scrollbar-thumb-zinc-700">
                {data.map((row, rowIdx) => {
                    // GROUPING LOGIC
                    const isHistory = row.dateGroup && row.dateGroup !== "Today";
                    // HIDE HEADER FOR "Today" (Implicit)
                    const showHeader = row.dateGroup !== "Today" && (rowIdx === 0 || (row.dateGroup && data[rowIdx - 1].dateGroup !== row.dateGroup));

                    return (
                        <div key={rowIdx}>
                            {/* DATE GROUP HEADER */}
                            {showHeader && (
                                <div className={cn(
                                    "px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-4 mb-2 flex items-center gap-3",
                                    rowIdx === 0 && "mt-0"
                                )}>
                                    <div className="h-px dark:bg-zinc-800/50 bg-zinc-300/50 flex-1"></div>
                                    <span>{row.dateGroup || "Today"}</span>
                                    <div className="h-px dark:bg-zinc-800/50 bg-zinc-300/50 flex-1"></div>
                                </div>
                            )}

                            <div
                                ref={el => rowRefs.current[rowIdx] = el}
                                tabIndex={focusedIndex === rowIdx ? 0 : -1}
                                onKeyDown={(e) => handleKeyDown(e, rowIdx)}
                                onClick={() => setFocusedIndex(rowIdx)}
                                className={cn(
                                    "rounded-lg p-3 grid grid-cols-[1fr_2fr_1fr_1fr_minmax(100px,auto)] gap-4 items-center group cursor-default",
                                    ui.row(isHistory, focusedIndex === rowIdx)
                                )}
                            >
                                {/* Cell Rendering */}
                                {columns.map((col, colIdx) => (
                                    <div key={colIdx} className={cn("text-sm dark:text-zinc-300 text-zinc-700", col.className)}>
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
