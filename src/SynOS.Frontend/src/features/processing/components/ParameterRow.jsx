
import { cn } from "@/lib/utils";
import { useRef, useEffect } from 'react';

export function ParameterRow({ parameter, value, onChange, onKeyDown, isActive }) {
    const inputRef = useRef(null);

    // Dynamic Input Factory
    const renderInput = () => {
        switch (parameter.dataType) {
            case 'Numeric':
                return (
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        className={cn(
                            "w-24 text-center font-bold font-mono text-base py-1 rounded-md border-2 transition-all outline-none",
                            isActive 
                                ? "dark:bg-zinc-950 bg-white border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.2)]" 
                                : "dark:bg-zinc-900 bg-zinc-50 dark:border-white/5 border-zinc-200"
                        )}
                        placeholder="0.00"
                    />
                );

            case 'Enum':
                const options = (parameter.enumOptions || "").split('|').filter(Boolean);
                return (
                    <div className="flex gap-2" onKeyDown={(e) => {
                        onKeyDown(e);
                        // Quick selection 1-9
                        if (e.key >= '1' && e.key <= '9') {
                            const idx = parseInt(e.key) - 1;
                            if (options[idx]) onChange(options[idx]);
                        }
                    }}>
                        <select
                            ref={inputRef}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className={cn(
                                "w-24 text-center font-bold text-xs py-1 rounded-md border-2 transition-all outline-none",
                                isActive 
                                    ? "dark:bg-zinc-950 bg-white border-cyan-500" 
                                    : "dark:bg-zinc-900 bg-zinc-50 dark:border-white/5 border-zinc-200"
                            )}
                        >
                            <option value="">Select...</option>
                            {options.map((opt, i) => (
                                <option key={i} value={opt}>{opt} ({i+1})</option>
                            ))}
                        </select>
                    </div>
                );

            case 'Boolean':
                return (
                    <div className="flex gap-2 items-center">
                        <button
                            ref={inputRef}
                            onClick={() => onChange(value === 'Positive' ? 'Negative' : 'Positive')}
                            onKeyDown={onKeyDown}
                            className={cn(
                                "w-24 px-3 py-1 rounded-md font-black text-[10px] uppercase border-2 transition-all flex items-center justify-center gap-2",
                                value === 'Positive' 
                                    ? "bg-red-500/20 text-red-500 border-red-500/40" 
                                    : value === 'Negative'
                                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40"
                                        : "dark:bg-zinc-800 bg-zinc-100 border-transparent text-zinc-500",
                                isActive && "ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-zinc-900"
                            )}
                        >
                           <div className={cn("w-1.5 h-1.5 rounded-full", value === 'Positive' ? "bg-red-500" : value === 'Negative' ? "bg-emerald-500" : "bg-zinc-500")} />
                           {value || 'Neutral'}
                        </button>
                    </div>
                );

            case 'Text':
            default:
                return (
                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        className={cn(
                            "w-24 text-[10px] font-medium py-1 px-2 rounded-md border-2 transition-all outline-none resize-none overflow-hidden",
                            isActive 
                                ? "dark:bg-zinc-950 bg-white border-cyan-500" 
                                : "dark:bg-zinc-900 bg-zinc-50 dark:border-white/5 border-zinc-200"
                        )}
                        placeholder="..."
                    />
                );
        }
    };

    return (
        <div className="flex items-center">
            {renderInput()}
        </div>
    );
}
