import { useState, useEffect, useRef } from 'react'
import { cn } from "@/lib/utils"
import { useFlipGroup } from "@/hooks/useSynOSMotion"
import { Plus, Users, ClipboardList, Bed, Clock, Loader2, ChevronDown } from 'lucide-react'
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { ActivityStream } from '@/components/layout/ActivityStream'
import { IntentPanel } from '@/features/reception/components/IntentPanel'
import { useReceptionPanelUI } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'
import { useTheme } from '@/context/ThemeContext'

export function ReceptionScreen() {
    const { theme } = useTheme();
    const [activeQueue, setActiveQueue] = useState("pending");
    const [summary, setSummary] = useState(null);
    // Unified Drawer State + Helpers
    const { isOpen: isIntentPanelOpen, openCreateIntent, openResumeIntent, openCorrectionIntent } = useReceptionPanelUI();

    const [actionQueue, setActionQueue] = useState([]); // Real Data
    const [isLoadingQueue, setIsLoadingQueue] = useState(true);

    // History State (Phase 5)
    // We use a Ref for SignalR callback access, and State for Render.
    const [showHistory, setShowHistory] = useState(false);
    const showHistoryRef = useRef(false);

    // Sync Ref
    useEffect(() => { showHistoryRef.current = showHistory; }, [showHistory]);

    // New Header State
    const [serverTimeAnchor, setServerTimeAnchor] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState("Not Synced");

    // Helper: Normalize Backend DTO (PascalCase -> camelCase) using defensive mapping
    const normalizeQueueData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(row => ({
            ...row, // Preserve originals
            visitId: row.visitId || row.VisitId,
            token: row.token || row.Token,
            patientName: row.patientName || row.PatientName,
            patientAgeGender: row.patientAgeGender || row.PatientAgeGender,
            testCodes: row.testCodes || row.TestCodes || [],
            paymentDisplay: row.paymentDisplay || row.PaymentDisplay, // Phase 4 Alignment
            totalAmount: row.totalAmount || row.TotalAmount,
            paymentMethod: row.paymentMethod || row.PaymentMethod,
            referrerName: row.referrerName || row.ReferrerName,
            operationalStatus: row.operationalStatus || row.OperationalStatus,
            isFinalized: row.isFinalized || row.IsFinalized, // 🔹 TRUTH: Explicit Backend Flag
            assignedResource: row.assignedResource || row.AssignedResource,
            isTokenPrinted: row.isTokenPrinted ?? row.IsTokenPrinted,
            dateGroup: row.dateGroup || row.DateGroup || "Today" // Phase 5: History Grouping
        }));
    };

    // Wiring: Initial Load + SignalR Subscription
    useEffect(() => {
        // 1. Initial Snapshot
        const loadInitial = async () => {
            try {
                const [summaryData, queueData] = await Promise.all([
                    ReceptionApi.getDashboardSummary(),
                    ReceptionApi.getActionQueue(showHistoryRef.current) // Initial load
                ]);

                if (summaryData) setSummary(summaryData);
                if (Array.isArray(queueData)) {
                    console.log("DEBUG: Action Queue Raw:", queueData);
                    setActionQueue(normalizeQueueData(queueData));
                }
            } catch (e) {
                console.error("Failed to fetch initial dashboard data", e);
            } finally {
                setIsLoadingQueue(false);
            }
        };

        loadInitial();

        // 2. Connect SignalR
        const connect = async () => {
            // 3. Subscribe BEFORE connecting (to catch initial push)
            SignalRService.onReceptionSummaryUpdated((payload) => {
                setSummary(payload);
            });

            SignalRService.onActionQueueUpdated(() => {
                // SignalR triggers refresh - must respect current filter
                ReceptionApi.getActionQueue(showHistoryRef.current).then(data => {
                    if (Array.isArray(data)) {
                        console.log("SignalR: Action Queue Refreshed");
                        setActionQueue(normalizeQueueData(data));
                    }
                });
            });

            // Anchor Time & Sync Status
            SignalRService.onReceiveServerTime((time) => {
                setServerTimeAnchor(time);
                // setConnectionStatus("Synced"); -> Handled by Status Listener now
            });

            // Status Listener (Handles Disconnects/Reconnects)
            SignalRService.onConnectionStatusChanged((status) => {
                setConnectionStatus(status);
            });

            try {
                await SignalRService.startConnection();
            } catch (err) {
                setConnectionStatus("Not Synced");
            }
        };

        connect();

        // Failsafe Polling (every 30s)
        const interval = setInterval(async () => {
            try {
                const data = await ReceptionApi.getActionQueue(showHistoryRef.current);
                if (Array.isArray(data)) {
                    setActionQueue(normalizeQueueData(data));
                }
            } catch (e) {
                console.error("Queue Poll Failed", e);
            }
        }, 30000);

        // Cleanup
        return () => {
            SignalRService.stopConnection();
            if (window._signalrStatusSubscribers) window._signalrStatusSubscribers = []; // Reset subs
            clearInterval(interval);
        };
    }, []);

    // STAGE 7: FLIP ANIMATION STATE
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

    // MOTION CANON: Vertical FLIP Group
    // We bind the RealitySummary container (height change) and ActionQueue container (position change)
    // into a single physics group. When summary collapses, queue FLIPs.
    const summaryRef = useRef(null);
    const queueRef = useRef(null);

    // FLIP ENGINE: 260ms OS-Bezier
    // When isSummaryCollapsed changes, measures Start, DOM updates (Height Reflow), measures End, Inverts, Plays.
    // We enable scaleCompensation to prevent ActionQueue content jumping during height change.
    useFlipGroup([summaryRef, queueRef], [isSummaryCollapsed], { scaleCompensation: true });

    // We'll use the refs in the JSX below.

    // EFFECT: Reload Queue when Toggle Changes
    useEffect(() => {
        setIsLoadingQueue(true);
        ReceptionApi.getActionQueue(showHistory).then(data => {
            if (Array.isArray(data)) setActionQueue(normalizeQueueData(data));
            setIsLoadingQueue(false);
        }).catch(e => {
            console.error("History Toggle Failed", e);
            setIsLoadingQueue(false);
        });
    }, [showHistory]);

    // STAGE 1: Data Fetching (SignalR + Polling) (Strict DTO)
    const realityTiles = summary ? [
        // ROW 1: Operations & Cash Flow
        { value: summary.walkInsToday?.toString() || "0", label: "Walk-Ins", qualifier: "Paid/Credit", icon: Users, color: "zinc" },
        { value: `₹${(summary.paymentsCashTotal || 0).toLocaleString()}`, label: "Cash Collected", icon: ClipboardList, color: "emerald" },
        { value: summary.paymentsOnlineCount?.toString() || "0", label: "Online Payments", icon: ClipboardList, color: "blue" },
        { value: `₹${(summary.paymentsOnlineTotal || 0).toLocaleString()}`, label: "Online Total", icon: ClipboardList, color: "blue" },

        // ROW 2: Receivables & Lab Performance
        { value: summary.prepaidBillsCount?.toString() || "0", label: "Prepaid Bills Issued", shortLabel: "Prepaid Bills", icon: ClipboardList, color: "amber" }, // Prepaid = Credit
        { value: `₹${(summary.prepaidBillsTotal || 0).toLocaleString()}`, label: "Prepaid Total", icon: ClipboardList, color: "amber" },
        { value: summary.pendingReports?.toString() || "0", label: "Pending Reports", icon: Bed, color: "red" },
        { value: `${summary.avgReportTimeMinutes || 0}m`, label: "Avg Report Time", icon: Clock, color: "default" },
    ] : [
        // Skeleton / Empty State
        { value: "—", label: "Walk-Ins", qualifier: "(Paid/Credit)", icon: Users, color: "default" },
        { value: "—", label: "Cash Collected", icon: ClipboardList, color: "default" },
        { value: "—", label: "Online Payments", icon: ClipboardList, color: "default" },
        { value: "—", label: "Online Total", icon: ClipboardList, color: "default" },
        { value: "—", label: "Credit Bills", icon: ClipboardList, color: "default" },
        { value: "—", label: "Credit Value", icon: ClipboardList, color: "default" },
        { value: "—", label: "Pending Reports", icon: Bed, color: "default" },
        { value: "—", label: "Avg Report Time", icon: Clock, color: "default" },
    ];

    // ACTION QUEUE COLUMNS (Strict Backend Truth)
    const queueColumns = [
        {
            header: "Token ID",
            accessor: "token",
            className: "w-32", // Removed font-mono to prevent Header from inheriting it
            render: (row) => (
                <div className="flex flex-col gap-1 items-start">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // 🔹 FINALIZATION TRUTH:
                                if (row.isFinalized) {
                                    openCorrectionIntent(row.visitId);
                                } else {
                                    openResumeIntent(row.visitId);
                                }
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
            )
        },
        {
            header: "Patient",
            accessor: "patientName",
            className: "min-w-[200px]",
            render: (row) => (
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
            )
        },
        {
            header: "Payment",
            accessor: "paymentDisplay",
            className: "w-40",
            render: (row) => {
                // Determine Badge Logic
                const isPrepaid = row.paymentMethod === "Prepaid";
                // Match Test Code Dimensions/Font exactly
                const badgeBase = "text-[10px] px-1 py-0.5 rounded font-mono leading-none border uppercase tracking-wide shrink-0";
                const badgeColor = isPrepaid
                    ? "bg-red-500/10 dark:text-red-400 text-red-600 border-red-500/20"
                    : "bg-emerald-500/10 dark:text-emerald-400 text-emerald-600 border-emerald-500/20";

                const amount = row.totalAmount
                    ? `₹${row.totalAmount.toLocaleString()}`
                    : "₹0";

                return (
                    <div className="flex flex-col gap-1 items-start justify-center min-h-[3rem]">
                        {/* Line 1: Amount + Badge */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm dark:text-zinc-200 text-zinc-900 leading-none pt-0.5">{amount}</span>
                            <span className={`${badgeBase} ${badgeColor}`}>
                                {row.paymentMethod || "DUE"}
                            </span>
                        </div>

                        {/* Line 2: Referrer Name (Prepaid ONLY) */}
                        {isPrepaid && row.referrerName && (
                            <span className="type-meta text-zinc-500 truncate max-w-[140px]" title={row.referrerName}>
                                {row.referrerName}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Operational Assignment",
            accessor: "operationalStatus",
            className: "w-40",
            render: (row) => {
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
        }
    ];



    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            {/* High-Complexity Atmospheric Accents (Drivers for Frost Aesthetic - STATIC SIMULATION) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                {/* 1. Grain/Noise Base */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />

                {/* 2. Gradient 'Objects' (No Blur - Pure CSS Gradients) */}
                {/* Cyan Pulse */}
                <div
                    className="absolute top-[-10%] left-[5%] w-[35%] h-[40%] animate-pulse"
                    style={{
                        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, rgba(34, 211, 238, 0) 70%)',
                        animationDuration: '8s'
                    }}
                />

                {/* Blue Wash */}
                <div
                    className="absolute top-[-5%] right-[15%] w-[30%] h-[35%]"
                    style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0) 70%)' }}
                />

                {/* Dark Anchor */}
                <div
                    className="absolute top-[2%] left-[40%] w-[15%] h-[15%]"
                    style={{ background: 'radial-gradient(circle, rgba(39, 39, 42, 0.15) 0%, rgba(39, 39, 42, 0) 70%)' }}
                />

                {/* Emerald Glow */}
                <div
                    className="absolute top-[-20%] right-[-5%] w-[50%] h-[50%]"
                    style={{ background: 'radial-gradient(circle, rgba(110, 231, 183, 0.15) 0%, rgba(110, 231, 183, 0) 70%)' }}
                />

                {/* Amber Hint */}
                <div
                    className="absolute top-[5%] left-[20%] w-[20%] h-[20%]"
                    style={{ background: 'radial-gradient(circle, rgba(253, 230, 138, 0.1) 0%, rgba(253, 230, 138, 0) 70%)' }}
                />
            </div>

            {/* 1. Global System Bar */}
            <SystemBar serverTime={serverTimeAnchor} syncStatus={connectionStatus} />

            <div className="flex-1 p-4 overflow-hidden">
                <div className="flex h-full gap-4">

                    {/* Left Column: Reality + Work */}
                    <div
                        className={`
                            flex flex-col min-h-0
                            ${isIntentPanelOpen ? 'w-[60%]' : 'w-[75%]'}
                        `}
                    >
                        <div className={`flex flex-col h-full transition-all duration-500 ease-out ${isIntentPanelOpen ? 'opacity-40 pointer-events-none scale-[0.99]' : 'opacity-100 scale-100'}`}>

                            {/* 
                                VERTICAL OWNERSHIP CONTRACT: BOUNDED CONTEXT
                                Motion Canon: NO CSS TRANSITION on height/layout. Snaps instantly.
                                FLIP engine handles the visual slide.
                            */}
                            <div
                                ref={summaryRef}
                                className="mb-4 shrink-0" // Removed transition-all duration-300
                            >
                                <div className="flex items-center justify-between mb-2 px-3 sticky top-0 dark:bg-synos-background bg-transparent z-10 py-1">
                                    <h2 className="text-lg font-bold dark:text-zinc-200 text-zinc-800">Reality Summary</h2>
                                    <button
                                        onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-white/5"
                                        title={isSummaryCollapsed ? "Expand View" : "Collapse View"}
                                    >
                                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isSummaryCollapsed && "-rotate-90")} />
                                    </button>
                                </div>
                                <RealitySummary tiles={realityTiles} isCollapsed={isSummaryCollapsed} />
                            </div>

                            {/* Action Queues - FLIP Target (Primary Mass) */}
                            <div
                                ref={queueRef}
                                className="flex-1 flex flex-col min-h-0 relative"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <ActionQueueHeader title="Action Queues" count={actionQueue.length} />

                                        {/* HISTORY TOGGLE (UI ONLY) */}
                                        <div className="flex items-center gap-2 dark:bg-zinc-900/50 bg-white rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm">
                                            <button
                                                onClick={() => setShowHistory(false)}
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                                    !showHistory
                                                        ? "bg-zinc-800 text-white shadow-sm"
                                                        : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                                )}
                                            >
                                                Live
                                            </button>
                                            <button
                                                onClick={() => setShowHistory(true)}
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                                    showHistory
                                                        ? "bg-zinc-800 text-white shadow-sm"
                                                        : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                                )}
                                            >
                                                History (7d)
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={openCreateIntent}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all duration-200 flex items-center gap-2 pointer-events-auto active:scale-95",
                                            theme === 'dark'
                                                ? "bg-zinc-100 text-zinc-900 hover:bg-white shadow-black/40"
                                                : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-black/20"
                                        )}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Registration
                                    </button>
                                </div>
                                {isLoadingQueue ? (
                                    <div className="flex-1 flex items-center justify-center border border-dashed dark:border-zinc-800 border-zinc-300 rounded-xl">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin dark:text-zinc-600 text-zinc-400" />
                                            <span className="text-xs dark:text-zinc-600 text-zinc-400">Loading live operational stream...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <ActionQueue columns={queueColumns} data={actionQueue} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Audit Panel OR Intent Panel */}
                    <div
                        className={`
                            min-h-0 relative
                            ${isIntentPanelOpen ? 'w-[40%]' : 'w-[25%]'}
                        `}
                    >
                        {isIntentPanelOpen ? <IntentPanel /> : <ActivityStream serverTime={serverTimeAnchor} />}
                    </div>

                </div>
            </div>
        </div>
    )
}
