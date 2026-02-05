import { useRef, useState, useEffect } from 'react'; // Added Hooks
import { cn } from "@/lib/utils";

export function ActionQueueHeader({ title, count }) {
    return (
        <div className="flex items-center gap-3 mb-3 px-1">
            <h2 className="text-lg font-medium dark:text-zinc-200 text-zinc-800">{title}</h2>
        </div>
    );
}

export function ActionQueue({ columns, data, onAction }) {
    // ROVING TAB INDEX STATE
    const [focusedIndex, setFocusedIndex] = useState(0);
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

    return (
        <div className="dark:bg-zinc-900/80 glass-elevated-light dark:backdrop-filter-none dark:shadow-xl dark:border-white/10 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Header Row - Light Grey/Glassy */}
            <div className="dark:bg-white/5 glass-surface-light dark:backdrop-filter-none dark:border-white/5 px-4 py-3 grid grid-cols-[1fr_2fr_1fr_1fr_minmax(100px,auto)] gap-4">
                {columns.map((col, idx) => (
                    <div key={idx} className={cn("text-xs font-semibold dark:text-zinc-400 text-zinc-500 uppercase tracking-wider", col.className)}>
                        {col.header}
                    </div>
                ))}
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
                                onClick={() => {
                                    setFocusedIndex(rowIdx);
                                    // Optional: Click on row also triggers primary action? 
                                    // Canon says "Enter" triggers. Mouse click on button triggers naturally.
                                    // Mouse click on ROW usually selects it. Let's strictly follow button click for action.
                                }}
                                className={cn(
                                    "rounded-lg p-3 grid grid-cols-[1fr_2fr_1fr_1fr_minmax(100px,auto)] gap-4 items-center transition-all duration-150 group border dark:border-white/5 border-white/20 shadow-sm cursor-default",
                                    "focus-synos", // CANONICAL FOCUS RING ON ROW
                                    // HISTORY VISUAL HIERARCHY: Secondary, muted, but interactive on hover
                                    isHistory
                                        ? "dark:bg-zinc-900/10 bg-zinc-50/30 dark:opacity-50 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 dark:hover:bg-zinc-900/40 hover:bg-white/60"
                                        : "dark:bg-zinc-950/30 glass-surface-light dark:backdrop-filter-none hover:bg-white/60 dark:hover:bg-white/[0.02]"
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
