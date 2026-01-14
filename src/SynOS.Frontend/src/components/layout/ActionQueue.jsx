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
        <div className="bg-zinc-900/50 border border-synos-border rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Header Row - Light Grey/Glassy */}
            <div className="bg-white/5 border-b border-synos-border px-4 py-3 grid grid-cols-[1fr_2fr_1fr_1fr_2fr_auto] gap-4">
                {columns.map((col, idx) => (
                    <div key={idx} className={cn("text-xs font-semibold text-zinc-400 uppercase tracking-wider", col.className)}>
                        {col.header}
                    </div>
                ))}
                <div className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</div>
            </div>

            {/* Body */}
            <div className="overflow-auto flex-1 p-2 space-y-1">
                {data.map((row, rowIdx) => (
                    <div key={rowIdx} className="bg-zinc-800/40 hover:bg-zinc-800/80 rounded-lg p-3 grid grid-cols-[1fr_2fr_1fr_1fr_2fr_auto] gap-4 items-center transition-colors group">
                        {/* Cell Rendering */}
                        {columns.map((col, colIdx) => (
                            <div key={colIdx} className={cn("text-sm text-zinc-300", col.className)}>
                                {col.render ? col.render(row) : row[col.accessor]}
                            </div>
                        ))}
                        {/* Action Button */}
                        <div className="text-right">
                            <button
                                className="bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-medium px-3 py-1.5 rounded-md shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => onAction && onAction(row)}
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
