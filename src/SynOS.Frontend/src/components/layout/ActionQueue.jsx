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
            ? "type-section-header text-zinc-400"
            : "type-section-header text-zinc-800",
        row: (isHistory, isFocused) => isDark
            ? cn(
                "transition-all duration-200 outline-none border border-transparent min-h-[72px]",
                "focus:bg-zinc-800 hover:bg-zinc-800",
                isHistory ? "bg-black/10 opacity-40 grayscale" : "bg-zinc-950/40"
            )
            : cn(
                "border border-black/[0.1] transition-all duration-200 outline-none min-h-[72px]",
                "focus:bg-blue-100/30 hover:bg-zinc-100/80",
                isHistory
                    ? "bg-zinc-100/30 opacity-60 grayscale"
                    : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
            )
    };

    return (
        <div
            className={cn(
                "flex-1 flex flex-col rounded-xl border overflow-hidden transition-[background-color,border-color,box-shadow] duration-300",
                ui.container
            )}
            style={{
                background: isDark ?
                    `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
                 #18181b` :
                    `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
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
                        <div key={idx} className={cn(ui.headerText, col.className)}>
                            {col.header}
                        </div>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div className="overflow-auto flex-1 p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800/50 hover:scrollbar-thumb-zinc-700">
                {data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500/40 space-y-3">
                        <div className="p-6 rounded-full dark:bg-zinc-800/20 bg-black/[0.02] shadow-inner">
                            <div className="w-12 h-px bg-current opacity-20" />
                            <div className="w-8 h-px bg-current opacity-10 mt-1 mx-auto" />
                        </div>
                        <span className="text-xs font-medium uppercase tracking-widest italic">Operational Silence</span>
                    </div>
                ) : (
                    data.map((row, rowIdx) => {
                        // GROUPING LOGIC
                        const isHistory = row.dateGroup && row.dateGroup !== "Today";
                        // HIDE HEADER FOR "Today" (Implicit)
                        const showHeader = row.dateGroup !== "Today" && (rowIdx === 0 || (row.dateGroup && data[rowIdx - 1].dateGroup !== row.dateGroup));

                        return (
                            <div key={rowIdx}>
                                {/* DATE GROUP HEADER */}
                                {showHeader && (
                                    <div className={cn(
                                        "px-3 py-1 type-section-header mt-4 mb-2 flex items-center gap-3",
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
                                    onKeyDown={(e) => {
                                        handleKeyDown(e, rowIdx);
                                        if (e.key === 'Enter' && onAction) onAction(row);
                                    }}
                                    onClick={() => {
                                        setFocusedIndex(rowIdx);
                                        if (onAction) onAction(row);
                                    }}
                                    className={cn(
                                        "rounded-lg p-3 grid grid-cols-[1fr_2fr_1fr_1fr_minmax(100px,auto)] gap-4 items-center group cursor-pointer",
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
                    })
                )}
            </div>
        </div>
    );
}
