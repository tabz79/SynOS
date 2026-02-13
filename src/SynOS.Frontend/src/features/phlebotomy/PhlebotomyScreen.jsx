import { useState, useRef } from 'react'
import { cn } from "@/lib/utils"
// Reusing Shared Canon Layout Components (Safe - No Logic within them)
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { ActivityStream } from '@/components/layout/ActivityStream'
import { useTheme } from '@/context/ThemeContext'
import { Users, TestTube2, AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { PhlebotomyIntentPanel } from './components/PhlebotomyIntentPanel'
import { useFlipGroup } from "@/hooks/useSynOSMotion"

export function PhlebotomyScreen() {
    const { theme } = useTheme();
    // Local UI State for Skeleton (No Context Dependency)
    const [isIntentPanelOpen, setIsIntentPanelOpen] = useState(false);
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

    // Server Time Mock (Can be hooked up to real signal later)
    const [serverTime] = useState(new Date().toISOString());

    // MOTION CANON: FLIP Group for Layout
    const summaryRef = useRef(null);
    const queueRef = useRef(null);
    useFlipGroup([summaryRef, queueRef], [isSummaryCollapsed], { scaleCompensation: true });

    // REALITY TILES (Placeholder Data - Tier 1 Density)
    const realityTiles = [
        { value: "12", label: "Pending Samples", qualifier: "Urgent", icon: AlertCircle, color: "red" },
        { value: "45", label: "Collected Today", icon: TestTube2, color: "emerald" },
        { value: "8", label: "Floored Patients", icon: Users, color: "blue" },
        { value: "98%", label: "Collection Rate", icon: CheckCircle2, color: "zinc" },
    ];

    // ACTION QUEUE COLUMNS (Phlebotomy Specific - Tier 2 Density)
    const queueColumns = [
        { header: "Token ID", accessor: "token", className: "w-32 font-bold font-mono tracking-tight" },
        { header: "Patient", accessor: "patientName", className: "min-w-[200px] font-bold" },
        { header: "Tests", accessor: "testCount", className: "w-40 text-xs font-mono" }, // Phlebo cares about count/tubes
        { header: "Status", accessor: "status", className: "w-40" }
    ];

    // ACTION QUEUE MOCK DATA
    const queueData = [
        { token: "T-1024", patientName: "Arjun Reddy", testCount: "3 Tubes (CBC, LFT)", status: "Pending Collection", dateGroup: "Today" },
        { token: "T-1023", patientName: "Sarah Khan", testCount: "1 Tube (Glu)", status: "Pending Collection", dateGroup: "Today" },
        { token: "T-1021", patientName: "Vihaan Das", testCount: "2 Tubes (T3, T4)", status: "Pending Collection", dateGroup: "Today" },
    ];

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            {/* Atmospheric Layer (Canon v1) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                {/* Simplified Gradients for Phlebo (Same DNA, different tone potentially, but sticking to Canon defaults for now) */}
                <div className="absolute top-[-10%] right-[10%] w-[50%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%)' }} />
            </div>

            {/* Level 1: System Bar */}
            <SystemBar serverTime={serverTime} syncStatus="Synced" />

            {/* Level 2: Workspace */}
            <div className="flex-1 p-4 overflow-hidden">
                <div className="flex h-full gap-4">

                    {/* Work Area (Flex-1) */}
                    <div className={`flex flex-col min-h-0 ${isIntentPanelOpen ? 'w-[60%]' : 'w-[75%]'}`}>

                        {/* Summary Region (Shrink-0) */}
                        <div ref={summaryRef} className="mb-4 shrink-0">
                            <RealitySummary tiles={realityTiles} isCollapsed={isSummaryCollapsed} />
                        </div>

                        {/* Queue Pane (Flex-1, Scroll Owner) */}
                        <div ref={queueRef} className="flex-1 flex flex-col min-h-0 relative">
                            <div className="flex items-center justify-between mb-2">
                                <ActionQueueHeader title="Collection Queue" count={queueData.length} />
                                <button
                                    onClick={() => setIsIntentPanelOpen(true)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all duration-200 flex items-center gap-2 pointer-events-auto active:scale-95",
                                        theme === 'dark'
                                            ? "bg-zinc-100 text-zinc-900 hover:bg-white shadow-black/40"
                                            : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-black/20"
                                    )}
                                >
                                    <Plus className="w-4 h-4" />
                                    Walk-In Collection
                                </button>
                            </div>
                            <ActionQueue columns={queueColumns} data={queueData} />
                        </div>

                    </div>

                    {/* Side Column (Fixed Width) */}
                    <div className={`min-h-0 relative ${isIntentPanelOpen ? 'w-[40%]' : 'w-[25%]'}`}>
                        {isIntentPanelOpen ? (
                            <PhlebotomyIntentPanel isOpen={true} closePanel={() => setIsIntentPanelOpen(false)} />
                        ) : (
                            <ActivityStream serverTime={serverTime} />
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
