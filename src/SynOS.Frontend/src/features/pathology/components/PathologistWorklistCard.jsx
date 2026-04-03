import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function PathologistWorklistCard({ report, isSelected, onClick }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        card: isSelected 
            ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/20" 
            : "border-white/5 bg-zinc-950/40 hover:bg-zinc-900 shadow-lg",
        name: "text-zinc-200 group-hover:text-white",
        test: "text-zinc-500",
        meta: "text-zinc-600",
        stat: "bg-red-500/10 text-red-400 border-red-500/20"
    } : {
        card: isSelected 
            ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10 shadow-sm" 
            : "bg-black/[0.04] border border-black/5 shadow-inner hover:bg-black/[0.06]",
        name: isSelected ? "text-indigo-900" : "text-zinc-900 group-hover:text-indigo-600",
        test: isSelected ? "text-indigo-600/70" : "text-zinc-500",
        meta: isSelected ? "text-indigo-400" : "text-zinc-400",
        stat: "bg-white/80 text-red-600 border-red-100 shadow-sm"
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-3.5 rounded-xl border transition-all duration-200 group relative",
                ui.card
            )}
        >
            <div className="flex justify-between items-start mb-1.5">
                <h3 className={cn(
                    "font-bold text-sm transition-colors truncate pr-2 tracking-tight",
                    ui.name
                )}>
                    {report.patientName}
                </h3>
                {report.isStat && (
                    <span className={cn(
                        "shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border tracking-widest",
                        ui.stat
                    )}>
                        STAT
                    </span>
                )}
            </div>

            <p className={cn(
                "text-[11px] font-medium tracking-tight mb-3 line-clamp-1",
                ui.test
            )}>
                {report.testName}
            </p>

            <div className="flex items-center justify-between mt-auto pt-2.5 border-t dark:border-white/5 border-zinc-100/50">
                <div className="flex items-center gap-1.5 opacity-80">
                    <Clock className={cn("w-3 h-3", ui.meta)} />
                    <span className={cn("text-[10px] font-mono font-medium", ui.meta)}>
                        {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 opacity-80">
                         <span className={cn("text-[9px] font-black uppercase tracking-tighter opacity-40", ui.meta)}>Token</span>
                         <span className={cn("text-[10px] font-mono font-bold", ui.meta)}>{report.token || "---"}</span>
                    </div>

                    {report.abnormalCount > 0 && (
                        <div className="flex items-center gap-1 text-amber-500">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-[10px] font-black">
                                {report.abnormalCount}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
