import { X, ArrowRight, TestTube2, AlertCircle } from 'lucide-react'
// import { usePhlebotomyPanelUI } from '../hooks/usePhlebotomyPanelUI' // Placeholder hook? Or local state?
// Let's use local state for now as requested by "Skeleton" and "No Reception Alteration"
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

export function PhlebotomyIntentPanel({ isOpen, visitId, closePanel, onAssign }) {
    // Determine Theme for Style Branching
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // THEME ISOLATION CONTRACT: Style Branching (From Canon v1)
    const ui = isDark ? {
        panel: "bg-zinc-900 border-l border-white/10 shadow-2xl relative z-20",
        header: "bg-zinc-900 border-b border-white/5",
        footer: "bg-zinc-900 border-t border-white/5",
        title: "text-white",
        subtitle: "text-zinc-500",
        actionBtn: {
            enabled: "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5",
            disabled: "bg-zinc-800 text-zinc-500"
        }
    } : {
        // Knife-Edge Style (Canon v1)
        panel: cn(
            "bg-[linear-gradient(to_bottom,#F5FCFF_0%,#E6F2F5_50%,#D7E1E4_100%)]",
            "border-l border-white shadow-[-20px_0_50px_rgba(0,0,0,0.3)]",
            "border-t border-white/80",
            "relative z-20"
        ),
        header: "bg-[linear-gradient(to_bottom,rgba(248,253,255,0.98)_0%,rgba(238,245,248,0.98)_50%,rgba(228,235,238,0.98)_100%)] border-b border-black/[0.06]",
        footer: "bg-[#D7E1E4] border-t border-black/[0.06] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]",
        title: "text-zinc-900",
        subtitle: "text-zinc-500",
        actionBtn: {
            enabled: "bg-zinc-900 text-white hover:bg-black shadow-lg shadow-black/20 transition-transform active:scale-95",
            disabled: "bg-zinc-100 text-zinc-400 border border-black/[0.05]"
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cn("flex flex-col h-full overflow-hidden rounded-2xl", ui.panel)}>
            {/* Header (Canon v1: h-16) */}
            <div className={cn("h-16 flex items-center justify-between px-4 shrink-0", ui.header)}>
                <div>
                    <h2 className={cn("text-xl font-bold tracking-tight flex items-baseline gap-2", ui.title)}>
                        Sample Collection
                    </h2>
                </div>
                <button
                    onClick={closePanel}
                    className={cn(
                        "p-2 -mr-2 rounded-full transition-all duration-200 active:scale-95",
                        isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                    )}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* PanelBody (Scroll Owner) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
                {/* ASSIGNMENT SCROLL TRIGGER (Phase 1) */}
                <button
                    onClick={() => {
                        onAssign && onAssign();
                    }}
                    className={cn(
                        "w-full py-3 rounded-xl font-bold text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                        ui.actionBtn.enabled
                    )}
                >
                    <Users className="w-4 h-4" />
                    Assign to Me
                </button>

                {/* Placeholder Content Area */}
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <TestTube2 className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="text-sm font-medium text-zinc-400">Intake Process Pending</span>
                    <span className="text-xs text-zinc-500 text-center mt-1 max-w-[200px]">
                        This area will house the patient verification and sample collection workflow.
                    </span>
                </div>

                {/* Example Canon-Compliant Form Field Skeleton */}
                <div className="space-y-2 opacity-50 pointer-events-none grayscale">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Patient Identity</label>
                    <div className="h-10 w-full bg-white/50 border border-black/5 rounded-lg"></div>
                </div>
                <div className="space-y-2 opacity-50 pointer-events-none grayscale">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Barcode Scan</label>
                    <div className="h-10 w-full bg-white/50 border border-black/5 rounded-lg"></div>
                </div>
            </div>

            {/* Footer (Canon v1) */}
            <div className={cn("p-4 space-y-3", ui.footer)}>
                <button
                    disabled
                    className={cn(
                        "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                        ui.actionBtn.disabled
                    )}
                >
                    Confirm Collection <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
