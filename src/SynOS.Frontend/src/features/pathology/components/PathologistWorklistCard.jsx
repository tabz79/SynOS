import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function PathologistWorklistCard({ report, isSelected, onClick }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = isDark ? {
        card: isSelected 
            ? "border-2 border-synos-primary bg-synos-primary/10 ring-1 ring-synos-primary/20 shadow-lg" 
            : "synos-item-card",
        name: "text-zinc-100 group-hover:text-white",
        ageSex: "bg-white/5 text-zinc-400 border-white/10",
        test: "text-zinc-400",
        token: "text-zinc-500 font-mono",
        time: "text-zinc-600",
        stat: "bg-red-500/10 text-red-400 border-red-500/20",
        status: {
            Draft: "text-amber-500 bg-amber-500/10 border-amber-500/20",
            ReadyForVerification: "text-orange-500 bg-orange-500/10 border-orange-500/20",
            Signed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            ManualVerified: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20"
        }
    } : {
        card: isSelected 
            ? "bg-indigo-50/90 border-2 border-synos-primary shadow-md" 
            : "synos-item-card",
        name: "text-zinc-900 group-hover:text-indigo-600",
        ageSex: "bg-zinc-100 text-zinc-600 border-zinc-200",
        test: "text-zinc-600",
        token: "text-zinc-500 font-mono",
        time: "text-zinc-400",
        stat: "bg-white/80 text-red-600 border-red-100 shadow-sm",
        status: {
            Draft: "text-amber-700 bg-amber-50 border-amber-100",
            ReadyForVerification: "text-orange-700 bg-orange-50 border-orange-100",
            Signed: "text-emerald-700 bg-emerald-50 border-emerald-100",
            ManualVerified: "text-cyan-700 bg-cyan-50 border-cyan-100"
        }
    };

    const statusLabels = {
        Draft: "Draft",
        ReadyForVerification: "Verification",
        Signed: "Signed",
        ManualVerified: "Manual"
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-3 rounded-xl border transition-all duration-200 group relative flex flex-col gap-1.5",
                ui.card
            )}
        >
            {/* LINE 1: IDENTITY (Dominant Name + Subtle Time) */}
            <div className="flex justify-between items-center min-w-0">
                <h3 className={cn(
                    "font-bold text-sm transition-colors truncate pr-2 tracking-tight",
                    ui.name
                )}>
                    {report.patientName}
                </h3>
                <div className={cn("shrink-0 text-[10px] font-medium transition-opacity", ui.time)}>
                    {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            {/* LINE 2: CLINICAL GOAL (Age/Sex Container + Test Name) */}
            <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                    "shrink-0 px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-tight transition-colors",
                    ui.ageSex
                )}>
                    {report.patientAgeGender || "N/A"}
                </span>
                <p className={cn(
                    "text-[11px] font-medium tracking-tight line-clamp-1 flex-1 transition-colors",
                    ui.test
                )}>
                    {report.testName}
                </p>
                {report.isStat && (
                    <span className={cn(
                        "shrink-0 text-[8px] font-black uppercase px-1 py-0.5 rounded-sm border tracking-widest",
                        ui.stat
                    )}>
                        STAT
                    </span>
                )}
            </div>

            {/* LINE 3: SYSTEM SPINE (Calm Token ID + Status) */}
            <div className="flex items-center justify-between pt-1 mt-0.5 border-t dark:border-white/5 border-black/5">
                <div className="flex items-center gap-2">
                    <span className={cn("text-[11px] tracking-wider transition-colors", ui.token)}>
                        {report.token || "---"}
                    </span>
                    <span className={cn(
                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm border tracking-tighter",
                        ui.status?.[report.status] || ui.status?.Draft
                    )}>
                        {statusLabels[report.status] || report.status || "Draft"}
                    </span>
                </div>

                {report.abnormalCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-500 transition-all">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span className="text-[10px] font-black">{report.abnormalCount}</span>
                    </div>
                )}
            </div>

            {/* LINE 4: OWNERSHIP (Who is working on this?) */}
            {(report.typedByUserName || report.verifiedByUserName) && (
                <div className="flex items-center gap-1.5 pt-1.5 opacity-60">
                    <div className="w-1.5 h-1.5 rounded-full bg-synos-primary" />
                    <span className="text-[9px] font-bold uppercase tracking-widest truncate">
                        {report.typedByUserName || report.verifiedByUserName}
                    </span>
                </div>
            )}
        </button>
    );
}
