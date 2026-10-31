import { cn } from "@/lib/utils";

export function TokenCell({ row, theme, onAction }) {
    return (
        <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAction && onAction(row);
                    }}
                    tabIndex={-1}
                    className={cn(
                        "action-trigger transition-all font-mono font-bold text-sm sm:text-base tracking-tight rounded-md px-2 py-0.5 -mx-1.5 cursor-pointer underline-offset-4",
                        theme === 'dark'
                            ? "text-white hover:text-zinc-300 hover:bg-white/5"
                            : "text-zinc-900 hover:text-zinc-700 hover:bg-zinc-50 hover:underline decoration-zinc-500/50 decoration-2"
                    )}
                >
                    {row.token}
                </button>

                {/* TOKEN PRINT STATUS (Non-Blocking) */}
                {row.isTokenPrinted === false && ( // Explicit false check
                    <span className="text-amber-500 text-xs uppercase font-bold tracking-normal" title="Printer Communication Failed">
                        ⚠️ Print Fail
                    </span>
                )}
                {row.isTokenPrinted === true && (
                    <span className="text-emerald-500/80 text-xs" title="Token Printed">
                        ✅
                    </span>
                )}
            </div>
        </div>
    );
}

export function PatientCell({ row }) {
    return (
        <div className="flex flex-col gap-1.5 items-start justify-center min-h-[3rem] py-1">
            {/* Line 1: Name + Age/Sex Badge */}
            <div className="flex items-center gap-2 w-full">
                <span className="font-bold text-base sm:text-[17px] dark:text-white text-slate-900 truncate leading-tight">
                    {row.patientName}
                </span>
                <span className="shrink-0 dark:bg-zinc-800 bg-slate-100 dark:text-zinc-300 text-slate-700 text-xs px-2 py-0.5 rounded-md border dark:border-zinc-700 border-slate-200 font-mono font-semibold leading-none">
                    {(row.patientAgeGender || "N/A").replace(/\s*\/\s*/g, "/")}
                </span>
            </div>

            {/* Line 2: Test Codes */}
            <div className="flex flex-wrap gap-1.5 w-full">
                {row.testCodes && row.testCodes.map((code, idx) => (
                    <span key={idx} className="bg-synos-primary/10 text-synos-primary border border-synos-primary/25 text-xs px-2 py-0.5 rounded-md font-mono font-semibold leading-none">
                        {code}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function StatusCell({ row }) {
    // SYSTEM STATUS INDICATOR: Final Canonical Implementation
    // Rules: Static Cyan Dot (8px), Body Text (15px), No Badge, No Pulse
    const StatusDot = (
        <div className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
    );

    if (row.assignedResource) {
        return (
            <div className="flex items-center gap-2">
                {StatusDot}
                <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-zinc-200">
                    Assigned: {row.assignedResource}
                </span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2">
            {StatusDot}
            <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-zinc-200">
                {row.operationalStatus || "Processing"}
            </span>
        </div>
    );
}

export function PhlebotomistCell({ row }) {
    // Canon: Muted dash if unassigned, Otherwise primary body text
    const displayValue = row.assignedPhlebotomistName || "—";

    return (
        <span className={cn(
            "text-sm sm:text-base font-medium",
            !row.assignedPhlebotomistName ? "text-zinc-500/50" : "text-slate-800 dark:text-zinc-200"
        )}>
            {displayValue}
        </span>
    );
}

export function TechnicianCell({ row }) {
    // Canon: Muted dash if unassigned, Otherwise primary body text
    const displayValue = row.assignedTechnicianName || "—";

    return (
        <span className={cn(
            "text-sm sm:text-base font-medium",
            !row.assignedTechnicianName ? "text-zinc-500/50" : "text-slate-800 dark:text-zinc-200"
        )}>
            {displayValue}
        </span>
    );
}
