import { cn } from "@/lib/utils";

export function ActionQueueHeader({ title, count }) {
    return (
        <div className="flex items-center gap-3 mb-3 px-1">
            <h2 className="text-lg font-medium text-zinc-200">{title}</h2>
        </div>
    );
}

export function ActionQueue({ columns, data, onAction }) {
    return (
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 shadow-xl">
            {/* Header Row - Light Grey/Glassy */}
            <div className="bg-white/5 border-b border-white/5 px-4 py-3 grid grid-cols-[1fr_2fr_1fr_1fr_minmax(100px,auto)] gap-4">
                {columns.map((col, idx) => (
                    <div key={idx} className={cn("text-xs font-semibold text-zinc-400 uppercase tracking-wider", col.className)}>
                        {col.header}
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className="overflow-auto flex-1 p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800/50 hover:scrollbar-thumb-zinc-700">
                {data.map((row, rowIdx) => (
                    <div key={rowIdx} className="bg-zinc-950/30 hover:bg-white/[0.02] rounded-lg p-3 grid grid-cols-[1fr_2fr_1fr_1fr_minmax(100px,auto)] gap-4 items-center transition-colors duration-150 group border border-white/5 shadow-sm cursor-default">
                        {/* Cell Rendering */}
                        {columns.map((col, colIdx) => (
                            <div key={colIdx} className={cn("text-sm text-zinc-300", col.className)}>
                                {col.render ? col.render(row) : row[col.accessor]}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
