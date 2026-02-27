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
                        "action-trigger transition-all font-mono font-bold tracking-tight rounded-md px-1.5 py-0.5 -mx-1.5 cursor-pointer underline-offset-4",
                        theme === 'dark'
                            ? "text-white hover:text-zinc-300 hover:bg-white/5"
                            : "text-zinc-900 hover:text-zinc-700 hover:bg-zinc-50 hover:underline decoration-zinc-500/50 decoration-2"
                    )}
                >
                    {row.token}
                </button>

                {/* TOKEN PRINT STATUS (Non-Blocking) */}
                {row.isTokenPrinted === false && ( // Explicit false check
                    <span className="text-amber-500 text-[10px] uppercase font-bold tracking-tighter" title="Printer Communication Failed">
                        ⚠️ Print Fail
                    </span>
                )}
                {row.isTokenPrinted === true && (
                    <span className="text-emerald-500/50 text-[10px]" title="Token Printed">
                        ✅
                    </span>
                )}
            </div>
        </div>
    );
}

export function PatientCell({ row }) {
    return (
        <div className="flex flex-col gap-1 items-start justify-center min-h-[3rem]">
            {/* Line 1: Name + Age/Sex Badge */}
            <div className="flex items-center gap-2 w-full">
                <span className="font-bold text-sm dark:text-zinc-200 text-zinc-900 truncate leading-none pt-0.5">
                    {row.patientName}
                </span>
                <span className="shrink-0 dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-400 text-zinc-600 text-[10px] px-1.5 py-0.5 rounded border dark:border-zinc-700 border-zinc-200 font-mono leading-none">
                    {(row.patientAgeGender || "N/A").replace(/\s*\/\s*/g, "/")}
                </span>
            </div>

            {/* Line 2: Test Codes */}
            <div className="flex flex-wrap gap-1 w-full">
                {row.testCodes && row.testCodes.map((code, idx) => (
                    <span key={idx} className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 text-[10px] px-1 py-0.5 rounded font-mono leading-none">
                        {code}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function StatusCell({ row }) {
    // SYSTEM STATUS INDICATOR: Final Canonical Implementation
    // Rules: Static Cyan Dot (6px), Body Text (14px), No Badge, No Pulse
    const StatusDot = (
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
    );

    if (row.assignedResource) {
        return (
            <div className="flex items-center gap-2">
                {StatusDot}
                <span className="type-body text-zinc-900 dark:text-zinc-200">
                    Assigned: {row.assignedResource}
                </span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2">
            {StatusDot}
            <span className="type-body text-zinc-900 dark:text-zinc-200">
                {row.operationalStatus || "Processing"}
            </span>
        </div>
    );
}
