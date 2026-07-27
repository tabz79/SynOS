import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from "@/lib/utils"
import { useFlipGroup } from "@/hooks/useSynOSMotion"
import { Plus, Users, ClipboardList, Bed, Clock, Loader2, ChevronDown, Package } from 'lucide-react'
import { StockRequestPanel } from '../inventory/StockRequestPanel'
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { ActivityStream } from '@/components/layout/ActivityStream'
import { TokenCell, PatientCell, StatusCell } from '@/components/layout/ActionQueueCells'
import { IntentPanel } from '@/features/reception/components/IntentPanel'
import { useReceptionDrawer } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionApi, prewarmReceptionCatalogs } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'
import { useTheme } from '@/context/ThemeContext'

export function ReceptionScreen() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [activeQueue, setActiveQueue] = useState("pending");
    const [summary, setSummary] = useState(null);
    // Unified Drawer State + Helpers
    const { isOpen: isIntentPanelOpen, openCreateIntent, openResumeIntent, openCorrectionIntent } = useReceptionDrawer();

    const [actionQueue, setActionQueue] = useState([]); // Real Data
    const [isLoadingQueue, setIsLoadingQueue] = useState(true);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

    // History State (Phase 5)
    // We use a Ref for SignalR callback access, and State for Render.
    const [showHistory, setShowHistory] = useState(false);
    const showHistoryRef = useRef(false);

    // Sync Ref
    useEffect(() => { showHistoryRef.current = showHistory; }, [showHistory]);

    // New Header State
    const [serverTimeAnchor, setServerTimeAnchor] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState("Not Synced");

    // Helper: Normalize Backend DTO using shared API method
    const normalizeQueueData = ReceptionApi.normalizeQueueData;

    // Wiring: Initial Load + SignalR Subscription
    useEffect(() => {
        // Pre-warm master catalogs in background immediately on mount (< 1 ms start)
        prewarmReceptionCatalogs();

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
                console.log("ReceptionScreen: Received Reality Summary Update", payload);
                setSummary(payload);
            });

            // TARGETED DELTA PAYLOAD (Eliminates Thundering Herd)
            SignalRService.onActionQueueDeltaReceived((deltaRow) => {
                if (!deltaRow) return;

                const normalized = normalizeQueueData([deltaRow])[0];
                console.log("ReceptionScreen: Delta Received", { 
                    visitId: normalized.visitId, 
                    token: normalized.token, 
                    status: normalized.operationalStatus,
                    isFinalized: normalized.isFinalized 
                });

                setActionQueue(prev => {
                    const exists = prev.some(r => r.visitId === normalized.visitId);
                    
                    // Filter: If we are in "Live" mode, we only care about:
                    // 1. Unpaid visits (Backlog)
                    // 2. Today's visits (Paid or Unpaid)
                    const isActionable = !normalized.isFinalized || normalized.dateGroup === "Today";
                    
                    if (exists) {
                        if (!isActionable && !showHistoryRef.current) {
                            // It was finalized and it's not from today - remove it from Live view
                            return prev.filter(r => r.visitId !== normalized.visitId);
                        }
                        return prev.map(r => r.visitId === normalized.visitId ? normalized : r);
                    } else {
                        // Only add new items if they are actionable or we are in history mode
                        if (isActionable || showHistoryRef.current) {
                            return [normalized, ...prev];
                        }
                        return prev;
                    }
                });
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

        // Failsafe Polling (every 5 minutes)
        const interval = setInterval(async () => {
            try {
                const data = await ReceptionApi.getActionQueue(showHistoryRef.current);
                if (Array.isArray(data)) {
                    setActionQueue(normalizeQueueData(data));
                }
            } catch (e) {
                console.error("Queue Poll Failed", e);
            }
        }, 300000);

        // Cleanup
        return () => {
            SignalRService.stopConnection();
            if (window._signalrStatusSubscribers) window._signalrStatusSubscribers = []; // Reset subs
            clearInterval(interval);
        };
    }, []);

    // STAGE 7: FLIP ANIMATION STATE
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(() => window.innerHeight < 700);

    // MOTION CANON: Vertical FLIP Group
    const summaryRef = useRef(null);
    const queueRef = useRef(null);
    useFlipGroup([summaryRef, queueRef], [isSummaryCollapsed], { scaleCompensation: true });

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
        { value: summary.walkInsToday?.toString() || "0", label: "Walk-Ins", qualifier: "Paid/Credit", icon: Users, color: "zinc" },
        { value: `₹${(summary.paymentsCashTotal || 0).toLocaleString()}`, label: "Cash Collected", icon: ClipboardList, color: "emerald" },
        { value: summary.paymentsOnlineCount?.toString() || "0", label: "Online Payments", icon: ClipboardList, color: "blue" },
        { value: `₹${(summary.paymentsOnlineTotal || 0).toLocaleString()}`, label: "Online Total", icon: ClipboardList, color: "blue" },
        { value: summary.prepaidBillsCount?.toString() || "0", label: "Prepaid Bills Issued", shortLabel: "Prepaid Bills", icon: ClipboardList, color: "amber" },
        { value: `₹${(summary.prepaidBillsTotal || 0).toLocaleString()}`, label: "Prepaid Total", icon: ClipboardList, color: "amber" },
        { value: summary.pendingReports?.toString() || "0", label: "Pending Reports", icon: Bed, color: "red" },
        { value: `${summary.avgReportTimeMinutes || 0}m`, label: "Avg Report Time", icon: Clock, color: "default" },
    ] : [
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
            className: "w-32",
            render: (row) => (
                <TokenCell
                    row={row}
                    theme={theme}
                    onAction={(r) => {
                        if (r.isFinalized) {
                            openCorrectionIntent(r.visitId);
                        } else {
                            openResumeIntent(r.visitId);
                        }
                    }}
                />
            )
        },
        {
            header: "Patient",
            accessor: "patientName",
            className: "min-w-[200px]",
            render: (row) => <PatientCell row={row} />
        },
        {
            header: "Payment",
            accessor: "paymentDisplay",
            className: "w-40",
            render: (row) => {
                const isPrepaid = row.paymentMethod === "Prepaid";
                const badgeBase = "text-[10px] px-1 py-0.5 rounded font-mono leading-none border uppercase tracking-wide shrink-0";
                const badgeColor = isPrepaid
                    ? "bg-red-500/10 dark:text-red-400 text-red-600 border-red-500/20"
                    : "bg-emerald-500/10 dark:text-emerald-400 text-emerald-600 border-emerald-500/20";

                const amount = row.totalAmount
                    ? `₹${row.totalAmount.toLocaleString()}`
                    : "₹0";

                return (
                    <div className="flex flex-col gap-1 items-start justify-center min-h-[3rem]">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm dark:text-zinc-200 text-zinc-900 leading-none pt-0.5">{amount}</span>
                            <span className={`${badgeBase} ${badgeColor}`}>
                                {row.paymentMethod || "DUE"}
                            </span>
                        </div>
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
            render: (row) => <StatusCell row={row} />
        }
    ];

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
                <div className="absolute top-[5%] left-[35%] w-[25%] h-[25%]" style={{ background: 'radial-gradient(circle at center, rgba(39, 39, 42, 0.04) 0%, rgba(39, 39, 42, 0) 75%)' }} />
                <div className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]" style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.06) 0%, rgba(52, 211, 153, 0.01) 40%, rgba(52, 211, 153, 0) 80%)' }} />
                <div className="absolute top-[10%] left-[15%] w-[30%] h-[30%]" style={{ background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.03) 0%, rgba(251, 191, 36, 0) 70%)' }} />
            </div>

            <SystemBar serverTime={serverTimeAnchor} syncStatus={connectionStatus} />

            <div className="flex-1 p-4 overflow-hidden relative">
                <div className="flex h-full gap-4">
                    {/* Main Dashboard Panel - STABLE WIDTH, NO CONTRACTION/EXPANSION REF-LOW */}
                    <div className="flex-1 flex flex-col min-h-0 min-w-0">
                        <div className={`flex flex-col h-full transition-opacity duration-200 ${(isIntentPanelOpen || isInventoryModalOpen) ? 'opacity-35 pointer-events-none' : 'opacity-100'}`}>
                            <div
                                ref={summaryRef}
                                className="mb-4 shrink-0"
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

                            <div
                                ref={queueRef}
                                className="flex-1 flex flex-col min-h-0 relative"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <ActionQueueHeader title="Action Queues" count={actionQueue.length} />
                                        <div className="flex items-center gap-2 dark:bg-zinc-900/50 bg-white rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm">
                                            <button
                                                onClick={() => setShowHistory(false)}
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-colors",
                                                    !showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                                )}
                                            >
                                                Live
                                            </button>
                                            <button
                                                onClick={() => setShowHistory(true)}
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-colors",
                                                    showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                                )}
                                            >
                                                History (7d)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate('/admin/patients')}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors duration-200 flex items-center gap-2 pointer-events-auto active:scale-95 border",
                                                theme === 'dark' ? "bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800" : "bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50"
                                            )}
                                        >
                                            <Users className="w-4 h-4" />
                                            Patient Directory
                                        </button>
                                        <button
                                            onClick={() => setIsInventoryModalOpen(true)}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors duration-200 flex items-center gap-2 pointer-events-auto active:scale-95 border",
                                                theme === 'dark' ? "bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800" : "bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50"
                                            )}
                                        >
                                            <Package className="w-4 h-4" />
                                            Request Stock
                                        </button>
                                        <button
                                            onClick={openCreateIntent}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors duration-200 flex items-center gap-2 pointer-events-auto active:scale-95",
                                                theme === 'dark' ? "bg-zinc-100 text-zinc-900 hover:bg-white shadow-black/40" : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-black/20"
                                            )}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Registration
                                        </button>
                                    </div>
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

                    {/* Activity Stream Column when Drawer is closed */}
                    <div className={cn(
                        "w-[220px] md:w-[250px] lg:w-[290px] xl:w-[340px] flex flex-col min-h-0 transition-opacity duration-200 shrink-0",
                        (isIntentPanelOpen || isInventoryModalOpen) ? "hidden" : "flex"
                    )}>
                        <ActivityStream serverTime={serverTimeAnchor} />
                    </div>

                    {/* GPU-Accelerated Registration Panel Drawer */}
                    <IntentPanel />
                    <StockRequestPanel
                        isOpen={isInventoryModalOpen}
                        onClose={() => setIsInventoryModalOpen(false)}
                    />
                </div>
            </div>
        </div>
    )
}
